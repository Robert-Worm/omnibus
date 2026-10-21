// Werkt de voortgangspagina's bij op basis van de werklijsten en de claims (issues).
//
// Lokaal draaien:
//   node .github/scripts/voortgang.mjs
// Zonder GITHUB_TOKEN leest het script de openbare claims alleen; het plaatst geen
// reacties en wijzigt geen labels. In GitHub Actions verwerkt het ook de opdrachten
// /inleveren en /vrijgeven. De logica staat in voortgang-lib.mjs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { maakVoortgang, readCsv, werkTellingenBij } from "./voortgang-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = join(root, ".github", "voortgang");
const repo = process.env.GITHUB_REPOSITORY || "Robert-Worm/omnibus";
const token = process.env.GITHUB_TOKEN;
const offline = process.argv.includes("--offline");

// Pagina's met tellingen tussen <!--n:…--> markeringen (zie database-publiceren.md).
const MET_TELLINGEN = ["README.md", "docs/routekaart.md", "docs/begrippen.md", "docs/bijdragen/README.md"];

const json = (f) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));
const data = {
  rapporten: readCsv(readFileSync(join(dataDir, "rapporten.csv"), "utf8")),
  verwerkt: json("verwerkt.json"),
  kaders: json("wetten-en-kaders.json"),
  modellen: json("modellen.json"),
  dubbelingen: json("dubbelingen.json"),
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
  if (!res.ok && res.status !== 422) throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
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

const v = maakVoortgang({ data, repo, gh, download: token ? download : null });
let claims = [];
if (!offline) {
  try {
    claims = await v.loadClaims();
  } catch (fout) {
    if (token) throw fout;
    console.warn(`Claims konden niet worden gelezen (${fout.message.split(":")[0]}); de pagina's tonen nu geen claims.`);
  }
}
if (token) {
  await v.ensureLabels();
  await v.reconcile(claims);
  claims = await v.loadClaims();
}
const { bestanden, tellingen, stats } = v.build(claims);
for (const [rel, tekst] of Object.entries(bestanden)) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), tekst);
}
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
