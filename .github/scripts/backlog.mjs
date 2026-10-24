// Maakt GitHub-issues uit de backlogbestanden in .github/backlog/*.mjs:
// één issue per epic, met de user stories als sub-issues. Idempotent: een
// verborgen markering in elk issue voorkomt dat het twee keer wordt gemaakt.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { controleerNieuweStory } from "./backlog-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GITHUB_REPOSITORY en GITHUB_TOKEN zijn nodig.");

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const mark = (id) => `<!-- backlog:${id} -->`;

const LABELS = [
  { name: "epic", color: "5319e7", description: "Groot doel, opgedeeld in user stories" },
  { name: "story", color: "0e8a16", description: "User story: een afgebakend stuk werk" },
  { name: "kwaliteit", color: "1d76db", description: "Kwaliteit van de repository en documentatie" },
  { name: "presentatie", color: "c5def5", description: "Hoe de documentatie eruitziet: hiërarchie, tabellen, beeld" },
  { name: "routekaart", color: "fbca04", description: "Een stap op de routekaart: wat we gaan bouwen" },
  { name: "Opus 5.5", color: "d4a373", description: "Licht werk voor Claude Opus 5.5: pagina's, epics en stories, besluiten, skills zoeken" },
  { name: "ChatGPT Astra", color: "10a37f", description: "Tokenintensief werk voor ChatGPT Astra: bronnen verwerken, grote reviews, code in de applicatie" },
  { name: "P1", color: "b60205", description: "Prioriteit 1: blokkeert ander werk of de beheerder" },
  { name: "P2", color: "d93f0b", description: "Prioriteit 2: als volgende" },
  { name: "P3", color: "fbca04", description: "Prioriteit 3: later" },
  { name: "klaar", color: "0e8a16", description: "Klaar om op te pakken door de assistent met het werklabel" },
  { name: "bezig", color: "1d76db", description: "Een assistent werkt eraan" },
  { name: "wacht-op-ander", color: "c5def5", description: "Wacht op het deel van de andere assistent" },
  { name: "wacht-op-beheerder", color: "5319e7", description: "Wacht op een besluit of handeling van de beheerder" },
  { name: "overdracht", color: "ededed", description: "Het automatische overzicht van wat wie als volgende oppakt" },
];
const existing = new Set((await gh("/labels?per_page=100")).map((l) => l.name));
for (const l of LABELS) if (!existing.has(l.name)) await gh("/labels", { method: "POST", body: JSON.stringify(l) });

// Bestaande backlog-issues ophalen.
const known = new Map();
for (const label of ["epic", "story"]) for (let page = 1; ; page++) {
  const batch = await gh(`/issues?labels=${label}&state=all&per_page=100&page=${page}`);
  for (const i of batch) { const m = (i.body || "").match(/<!-- backlog:([\w-]+) -->/); if (m) known.set(m[1], i); }
  if (batch.length < 100) break;
}

// Eerst alles controleren, zodat een fout in één story niet halverwege een deel aanmaakt.
const backlogs = [];
for (const file of readdirSync(join(root, ".github", "backlog")).filter((f) => f.endsWith(".mjs")).sort())
  backlogs.push((await import(pathToFileURL(join(root, ".github", "backlog", file)))).default);
for (const b of backlogs) for (const e of b.epics) for (const s of e.stories) if (!known.has(s.id)) controleerNieuweStory(s);

const create = (title, body, labels) => gh("/issues", { method: "POST", body: JSON.stringify({ title, body, labels }) });

for (const backlog of backlogs) {
  for (const epic of backlog.epics) {
    let epicIssue = known.get(epic.id);
    if (!epicIssue) {
      epicIssue = await create(`Epic: ${epic.titel}`, `${mark(epic.id)}\n**Doel:** ${epic.doel}\n\n${epic.dod}\n\n*Wordt aangevuld met de user stories.*`, ["epic", ...backlog.labels, ...(epic.labels ?? [])]);
      console.log(`epic #${epicIssue.number} ${epic.id}`);
    }
    const stories = [];
    for (const s of epic.stories) {
      let issue = known.get(s.id);
      if (!issue) {
        const body = [
          mark(s.id),
          `**User story** · onderdeel van #${epicIssue.number}`,
          "",
          `> ${s.verhaal}`,
          "",
          // Optionele velden, zodat iemand de story zonder voorkennis kan oppakken.
          ...(s.bron ? ["**Bron van het idee**", s.bron, ""] : []),
          ...(s.waar ? ["**Waar in Omnibus**", ...s.waar.map((w) => `- ${w}`), ""] : []),
          ...(s.aanpak ? ["**Aanpak**", ...s.aanpak.map((a, i) => `${i + 1}. ${a}`), ""] : []),
          "**Acceptatiecriteria**",
          ...s.criteria.map((c) => `- [ ] ${c}`),
          ...(s.niet ? ["", "**Niet doen**", ...s.niet.map((n) => `- ${n}`)] : []),
        ].join("\n");
        issue = await create(`[${epic.onderdeel}] ${s.titel}`, body, ["story", ...backlog.labels, ...(s.labels ?? [])]);
        console.log(`  story #${issue.number} ${s.id}`);
        try { await gh(`/issues/${epicIssue.number}/sub_issues`, { method: "POST", body: JSON.stringify({ sub_issue_id: issue.id }) }); }
        catch (e) { console.log(`  (sub-issue koppelen lukte niet: ${e.message.slice(0, 120)})`); }
      }
      stories.push(issue);
    }
    const body = [
      mark(epic.id),
      `**Doel:** ${epic.doel}`,
      "",
      epic.dod,
      ...(epic.toelichting ? ["", epic.toelichting] : []),
      "",
      "**User stories**",
      ...stories.map((i) => `- [${i.state === "closed" ? "x" : " "}] #${i.number}`),
    ].join("\n");
    const title = `Epic: ${epic.titel}`;
    if ((epicIssue.body || "") !== body || epicIssue.title !== title) await gh(`/issues/${epicIssue.number}`, { method: "PATCH", body: JSON.stringify({ title, body }) });
  }
}
