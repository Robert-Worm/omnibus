// Werkt het issue "Overdracht" bij uit de labels van de open issues en de laatste testrun op main.
// Draait in .github/workflows/overdracht.yml.
import { readFileSync } from "node:fs";
import { MARKERING, overdrachtTekst, overbodigeStatussen } from "./overdracht-lib.mjs";

const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GITHUB_REPOSITORY en GITHUB_TOKEN zijn nodig.");
async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, { ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) } });
  if (!res.ok) throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const issues = [];
for (let page = 1; ; page++) {
  const batch = await gh(`/issues?state=open&per_page=100&page=${page}`);
  issues.push(...batch);
  if (batch.length < 100) break;
}
// Eén status per issue: wie `bezig` zet, hoeft `klaar` niet zelf weg te halen.
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
const gezet = event.action === "labeled" ? { issue: event.issue?.number, label: event.label?.name } : {};
for (const i of issues) {
  if (i.pull_request) continue;
  for (const weg of overbodigeStatussen(i, i.number === gezet.issue ? gezet.label : null)) {
    await gh(`/issues/${i.number}/labels/${encodeURIComponent(weg)}`, { method: "DELETE" });
    i.labels = i.labels.filter((l) => (typeof l === "string" ? l : l.name) !== weg);
    console.log(`#${i.number}: status ${weg} weggehaald.`);
  }
}

const runs = (await gh(`/actions/workflows/code-only.yml/runs?branch=main&status=completed&per_page=1`)).workflow_runs;
const tests = runs[0] ? { conclusie: runs[0].conclusion, commit: runs[0].head_sha, url: runs[0].html_url } : { conclusie: null, commit: null, url: null };

const body = overdrachtTekst(issues, tests, { repoUrl: `https://github.com/${repo}` });
const bestaand = issues.find((i) => (i.body || "").startsWith(MARKERING));
if (!bestaand) {
  const nieuw = await gh("/issues", { method: "POST", body: JSON.stringify({ title: "Overdracht: wat pakt wie als volgende op?", body, labels: ["overdracht"] }) });
  console.log(`Overdracht aangemaakt: #${nieuw.number}. Zet het issue vast (Pin issue) op GitHub.`);
} else if (bestaand.body.replace(/\*Automatisch bijgewerkt op[^*]*\*/, "") !== body.replace(/\*Automatisch bijgewerkt op[^*]*\*/, "")) {
  await gh(`/issues/${bestaand.number}`, { method: "PATCH", body: JSON.stringify({ body }) });
  console.log(`Overdracht #${bestaand.number} bijgewerkt.`);
} else console.log("Overdracht ongewijzigd.");
