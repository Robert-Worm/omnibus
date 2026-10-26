// Werkt de voortgangspagina's bij op basis van de werklijsten en de claims (issues).
//
// Lokaal draaien:
//   node .github/scripts/voortgang.mjs
// Zonder GITHUB_TOKEN of met --offline verandert het script niets. In GitHub Actions verwerkt het ook de opdrachten
// /inleveren en /vrijgeven. De logica staat in voortgang-lib.mjs.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { maakVoortgang, readCsv, werkTellingenBij } from "./voortgang-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = join(root, ".github", "voortgang");
const repo = process.env.GITHUB_REPOSITORY || "Robert-Worm/omnibus";
const token = process.env.GITHUB_TOKEN;
const offline = process.argv.includes("--offline");
if (offline || !token) {
  console.log("Alleen lezen: geen GitHub- of bestandswijzigingen; actuele evidence is nodig om lijsten te vernieuwen.");
  process.exit(0);
}

// Pagina's met tellingen tussen <!--n:…--> markeringen (zie database-publiceren.md).
const MET_TELLINGEN = ["README.md", "docs/routekaart.md", "docs/begrippen.md", "docs/bijdragen/README.md"];

const json = (f) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));
const data = {
  rapporten: readCsv(readFileSync(join(dataDir, "rapporten.csv"), "utf8")),
  verwerkt: json("verwerkt.json"),
  kaders: json("wetten-en-kaders.json"),
  modellen: json("modellen.json"),
  dubbelingen: json("dubbelingen.json"),
  voorstellen: json("voorgestelde-rapporten.json"),
};

async function gh(path, options = {}) {
  if (!token && (options.method || "GET") !== "GET") throw new Error("Schrijven naar GitHub kan alleen met GITHUB_TOKEN.");
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// Haalt een bijlage op, met een harde bovengrens. Alleen bijlagen op github.com.
async function download(url, maxBytes) {
  if (!/^https:\/\/github\.com\//.test(url)) throw new Error("alleen bijlagen op github.com");
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`download mislukt (${res.status})`);
  if (Number(res.headers.get("content-length") || 0) > maxBytes) throw new Error("groter dan 25 MB");
  const delen = [];
  let totaal = 0;
  for await (const deel of res.body) {
    totaal += deel.length;
    if (totaal > maxBytes) throw new Error("groter dan 25 MB");
    delen.push(deel);
  }
  return Buffer.concat(delen);
}

async function proposalRevision(number) {
  const [owner, name] = repo.split("/");
  const result = await graphql(`query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){issue(number:$number){lastEditedAt}}}`, { owner, name, number });
  const issue = result?.repository?.issue;
  if (!issue || !("lastEditedAt" in issue)) throw new Error("Voorstelrevisie ontbreekt.");
  return issue.lastEditedAt;
}
const v = maakVoortgang({ data, repo, gh, proposalRevision, download });
// Lees eerst claims: een API-fout mag geen bestaande claims wissen.
await v.loadClaims();
const eventName = process.env.GITHUB_EVENT_NAME || "";
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
const voorstellen = await v.reviewProposals({ event, eventName });
await v.ensureLabels();
let claims = await v.loadClaims();
await v.reconcile(claims);
claims = await v.loadClaims();
const { bestanden, tellingen, stats } = v.build(claims);
writeFileSync(join(dataDir, "voorgestelde-rapporten.json"), JSON.stringify(voorstellen, null, 2) + "\n");
for (const [rel, tekst] of Object.entries(bestanden)) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), tekst);
}
// De werklijsten per soort en ministerie zijn allemaal gegenereerd: een pagina die niet meer
// gemaakt wordt (bijvoorbeeld na een andere opsplitsing), gaat weg.
const WERKLIJST = "docs/bijdragen/werklijst";
if (existsSync(join(root, WERKLIJST)))
  for (const naam of readdirSync(join(root, WERKLIJST)))
    if (naam.endsWith(".md") && !(`${WERKLIJST}/${naam}` in bestanden)) rmSync(join(root, WERKLIJST, naam));
for (const rel of MET_TELLINGEN) {
  const pad = join(root, rel);
  const oud = readFileSync(pad, "utf8");
  const nieuw = werkTellingenBij(oud, tellingen, v.repoUrl);
  if (nieuw !== oud) writeFileSync(pad, nieuw);
}
// Elke maandag (geplande run): een weekoverzicht in Discussions, alleen als er iets gebeurde.
// Discussions kun je alleen via GraphQL maken. Een verborgen markering voorkomt dubbele berichten.
let weekoverzicht = "niet gepland";
if (token && process.env.GITHUB_EVENT_NAME === "schedule") {
  const week = v.samenvatting(claims);
  weekoverzicht = week ? await plaatsWeekoverzicht(week) : "niets gebeurd";
}

async function graphql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const uit = await res.json();
  if (!res.ok || uit.errors) throw new Error(`GraphQL: ${res.status} ${JSON.stringify(uit.errors || uit).slice(0, 200)}`);
  return uit.data;
}

async function plaatsWeekoverzicht(week) {
  const [owner, name] = repo.split("/");
  const { repository } = await graphql(`query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id
    discussionCategories(first:25){nodes{id slug}} discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{body}}}}`, { owner, name });
  if (repository.discussions.nodes.some((d) => d.body.includes(`<!-- omnibus:${week.sleutel} -->`))) return "al geplaatst";
  const categorie = repository.discussionCategories.nodes.find((c) => c.slug === "general");
  if (!categorie) return "geen categorie General";
  await graphql(`mutation($r:ID!,$c:ID!,$t:String!,$b:String!){createDiscussion(input:{repositoryId:$r,categoryId:$c,title:$t,body:$b}){discussion{url}}}`,
    { r: repository.id, c: categorie.id, t: week.titel, b: week.tekst });
  return "geplaatst";
}

console.log(JSON.stringify({ ...stats, tellingen, claims: claims.length, weekoverzicht, modus: token ? "schrijven" : offline ? "offline" : "alleen lezen" }));
