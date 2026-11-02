// Houdt checklists en labels bij als een issue sluit (beheerder, 1 november 2026).
//   1. Statuslabels (klaar, bezig, wacht-op-…, gepauzeerd) gaan eraf: een gesloten issue heeft geen status meer.
//   2. In elke open epic of story die naar dit issue verwijst ("- [ ] #123"), wordt het vinkje gezet.
//      Bij sluiten als 'niet gepland' blijft het vinkje uit en komt er een opmerking.
//   3. Staan er bij een als voltooid gesloten issue nog open vinkjes, dan komt er één opmerking met die
//      punten: vink ze af of noem waarom ze niet gehaald zijn. Het issue blijft dicht.
//
//   node .github/scripts/issue-gesloten.mjs   (in GitHub Actions; leest GITHUB_EVENT_PATH)
import { readFileSync } from "node:fs";

export const STATUSLABELS = ["klaar", "bezig", "wacht-op-ander", "wacht-op-beheerder", "gepauzeerd"];
const MARKERING = "<!-- checklist-bij-sluiten -->";

/** Open vinkjes zonder verwijzing naar een ander issue (die volgen hun eigen issue). */
export function openPunten(body) {
  return [...String(body ?? "").matchAll(/^\s*[-*] \[ \] (.+)$/gm)].map((m) => m[1].trim()).filter((t) => !/^#\d+\b/.test(t));
}

/** Zet het vinkje voor #nummer in een checklist; geeft null als er niets verandert. */
export function vinkAf(body, nummer) {
  const nieuw = String(body ?? "").replace(new RegExp(`^(\\s*[-*] )\\[ \\]( #${nummer}\\b)`, "gm"), "$1[x]$2");
  return nieuw === body ? null : nieuw;
}

export function opmerking(punten) {
  return [MARKERING, "**Checklist bij sluiten.** Dit issue is gesloten als voltooid, maar deze punten zijn nog niet afgevinkt:", "",
    ...punten.map((p) => `- ${p.slice(0, 160)}`), "",
    "Vink af wat gehaald is. Wat niet gehaald is: noem hier kort waarom, of maak er een nieuw issue van."].join("\n");
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  const { issue } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (!issue || issue.pull_request) return;
  const gh = async (pad, opties = {}) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${pad}`, { ...opties,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    if (!r.ok && r.status !== 404) throw new Error(`GitHub ${opties.method || "GET"} ${pad}: ${r.status}`);
    return r.status === 204 || r.status === 404 ? null : r.json();
  };
  // 1. Statuslabels weg.
  for (const l of issue.labels.map((x) => x.name).filter((n) => STATUSLABELS.includes(n)))
    await gh(`/issues/${issue.number}/labels/${encodeURIComponent(l)}`, { method: "DELETE" });
  // 2. Vinkjes in verwijzende open issues.
  const voltooid = issue.state_reason !== "not_planned";
  const verwijst = (body) => new RegExp(`^\\s*[-*] \\[ \\] #${issue.number}\\b`, "m").test(body ?? "");
  const gevonden = [];
  for (let pagina = 1; ; pagina++) {
    const deel = (await gh(`/issues?state=open&per_page=100&page=${pagina}`)) ?? [];
    gevonden.push(...deel);
    if (deel.length < 100) break;
  }
  for (const ander of gevonden.filter((i) => !i.pull_request && i.number !== issue.number)) {
    if (!verwijst(ander.body)) continue;
    if (voltooid) {
      // Vlak voor het bijwerken opnieuw lezen: een ander issue kan net een vinkje in dezelfde epic hebben gezet.
      const vers = await gh(`/issues/${ander.number}`);
      if (verwijst(vers?.body)) await gh(`/issues/${ander.number}`, { method: "PATCH", body: JSON.stringify({ body: vinkAf(vers.body, issue.number) }) });
    } else await gh(`/issues/${ander.number}/comments`, { method: "POST", body: JSON.stringify({ body: `#${issue.number} is gesloten als *niet gepland*. Het vinkje blijft daarom uit; haal het punt weg of vervang het.` }) });
  }
  // 3. Open punten bij een voltooid issue: één opmerking.
  const punten = voltooid ? openPunten(issue.body) : [];
  if (punten.length) {
    const reacties = await gh(`/issues/${issue.number}/comments?per_page=100`);
    if (!(reacties ?? []).some((c) => c.body?.includes(MARKERING)))
      await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: opmerking(punten) }) });
  }
  console.log(`#${issue.number}: statuslabels weg, ${punten.length} open punten.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
