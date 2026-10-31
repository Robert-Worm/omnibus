// Kwaliteitsmeting van de openbare database (#282, B-028). Haalt de database op die bij
// deze code hoort (scripts/database-release.mjs), controleert het controlegetal, draait
// check:passages en check:questions, en schrijft de uitkomst naar
// docs/beheer/kwaliteitsmeting.md en de kwaliteitsbadge in README.md. Geen brontekst.
// Met --met-keten bouwt het ook de agentcatalogus (vraagt npm ci) en draait check-keten.
//
//   node scripts/kwaliteitsmeting.mjs [--database <map met catalogue.sqlite en local-build.json>] [--met-keten]

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export const PAGINA = "docs/beheer/kwaliteitsmeting.md";

/** Haalt de totalen uit het rapport van check:passages. */
export function leesPassages(tekst) {
  const m = tekst.match(/Passages: (\d+)\. HOLD: (\d+)\./);
  if (!m) throw new Error("Rapport van check:passages niet herkend.");
  return { totaal: Number(m[1]), afwijkend: Number(m[2]) };
}

/** Haalt de totalen uit het rapport van check:questions. */
export function leesVragen(tekst) {
  const totaal = tekst.match(/Vragen: (\d+)\./);
  if (!totaal) throw new Error("Rapport van check:questions niet herkend.");
  const tel = (u) => Number(tekst.match(new RegExp(`^\\| ${u} \\| (\\d+) \\|$`, "m"))?.[1] ?? NaN);
  const uit = { totaal: Number(totaal[1]), door: tel("door"), HOLD: tel("HOLD"), herschrijven: tel("herschrijven"), schrappen: tel("schrappen") };
  if (Object.values(uit).some(Number.isNaN)) throw new Error("Rapport van check:questions mist een uitkomst.");
  return uit;
}

const procent = (deel, geheel) => (geheel ? `${(Math.floor((deel / geheel) * 1000) / 10).toLocaleString("nl-NL")}%` : "–");
const getal = (n) => n.toLocaleString("nl-NL");

/** Haalt de totalen uit het rapport van check-keten. */
export function leesKeten(tekst) {
  const m = tekst.match(/Bouwstenen: (\d+)\. Met risico en bewijsaanwijzing: (\d+)\. Zonder risico: (\d+)\. Zonder bewijsaanwijzing: (\d+)\. Met aannametaal: (\d+)\./);
  if (!m) throw new Error("Rapport van check-keten niet herkend.");
  const [totaal, compleet, zonderRisico, zonderBewijs, aannametaal] = m.slice(1).map(Number);
  return { totaal, compleet, zonderRisico, zonderBewijs, aannametaal };
}

/** Eén regel voor de geschiedenis. */
export function regel({ datum, release, passages, vragen, keten }) {
  const compleet = keten ? `${getal(keten.compleet)} van ${getal(keten.totaal)}` : "–";
  return `| ${datum} | \`${release.slice(0, 8)}\` | ${getal(passages.totaal - passages.afwijkend)} van ${getal(passages.totaal)} (${procent(passages.totaal - passages.afwijkend, passages.totaal)}) | ${getal(vragen.door)} van ${getal(vragen.totaal)} (${procent(vragen.door, vragen.totaal)}) | ${getal(vragen.HOLD)} | ${getal(vragen.herschrijven + vragen.schrappen)} | ${compleet} | ${keten ? getal(keten.aannametaal) : "–"} |`;
}

/** Bouwt de pagina; bestaande geschiedenisregels van andere releases blijven staan. */
export function pagina(meting, vorige = "") {
  const kop = "| Gemeten | Release | Bronpassages letterlijk juist | Vragen zonder vormfout | Vragen op HOLD | Te herschrijven of te schrappen | Bouwstenen met risico en bewijsaanwijzing | Bouwstenen met aannametaal |";
  const oud = vorige.split("\n").filter((r) => /^\| \d{4}-\d{2}-\d{2} \| `/.test(r) && !r.includes(`\`${meting.release.slice(0, 8)}\``));
  const rijen = [regel(meting), ...oud].slice(0, 24);
  return `# Kwaliteitsmeting van de database

<!-- paginatype: data -->

> **In het kort:** hoe goed de inhoud van de openbare database is, gemeten bij elke nieuwe database. Automatisch bijgewerkt door GitHub (\`scripts/kwaliteitsmeting.mjs\`). Het aantal bronnen en bezoekersaantallen zijn bewust geen maatstaf ([B-028](besluiten.md#b-028)).

## Wat er gemeten wordt

- **Bronpassages letterlijk juist:** elke passage staat letterlijk op de opgeslagen plek in de bron (\`check:passages\`).
- **Vragen zonder vormfout:** onderzoeks- en interviewvragen zonder vormfout, zoals twee vragen in één zin of een gesloten vraag (\`check:questions\`). Een vraag met een vormfout staat op HOLD en wordt niet automatisch aangepast; de inhoudelijke beoordeling doet de skill \`omnibus-review-questions\`.
- **Bouwstenen met risico en bewijsaanwijzing:** elke selecteerbare bouwsteen uit een rapport, wet of kader noemt het risico en een aanwijzing voor bewijs in de opzet- of bestaanstoets (\`scripts/check-keten.mjs\`). Modelvragen tellen niet mee.
- **Bouwstenen met aannametaal:** eigen geformuleerde normen en toetsen met een gissing, zoals *waarschijnlijk* of *naar verwachting*. Dit is een melding om te beoordelen. Letterlijke brontekst telt niet mee, want die wordt nooit herschreven ([B-029](besluiten.md#b-029)).

De meting gebruikt de database die bij de huidige code hoort, met een gecontroleerd controlegetal. De pagina bevat geen brontekst.

## Uitkomst per database

${kop}
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
${rijen.join("\n")}

## Volgende stap

Hoe een nieuwe database tot stand komt, staat in [database publiceren](database-publiceren.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
`;
}

/** Vervangt het blok <!--badge:kwaliteit-->…<!--/badge--> in de README. */
export function badge(readme, passages) {
  const pct = encodeURIComponent(procent(passages.totaal - passages.afwijkend, passages.totaal).replaceAll(",", "."));
  const blok = `<!--badge:kwaliteit-->\n  <a href="${PAGINA}"><img alt="Bronpassages letterlijk juist: ${procent(passages.totaal - passages.afwijkend, passages.totaal)}" src="https://img.shields.io/badge/bronpassages-${pct}%20letterlijk-01689b?style=flat-square&labelColor=15233b"></a>\n  <!--/badge-->`;
  if (readme.includes("<!--badge:kwaliteit-->")) return readme.replace(/<!--badge:kwaliteit-->[\s\S]*?<!--\/badge-->/, blok);
  return readme.replace(/(<!--badge:database-->[\s\S]*?<!--\/badge-->)/, `$1\n  ${blok}`);
}

async function main() {
  const args = process.argv.slice(2);
  const metKeten = args.includes("--met-keten");
  const eigen = args.includes("--database") ? path.resolve(args[args.indexOf("--database") + 1]) : null;
  const tijdelijk = mkdtempSync(path.join(tmpdir(), "omnibus-kwaliteit-"));
  let map = eigen;
  if (!map) {
    const { DATABASE_URL, DATABASE_SHA256 } = await import("./database-release.mjs");
    const { haalDatabase } = await import("./fetch-release-database.mjs");
    map = path.join(tijdelijk, "db");
    await haalDatabase({ url: DATABASE_URL, verwacht: DATABASE_SHA256, out: map });
  }
  try {
    const database = path.join(map, "catalogue.sqlite");
    const { release } = JSON.parse(readFileSync(path.join(map, "local-build.json"), "utf8"));
    const draai = (script, invoer = ["--database", database]) => {
      const uit = path.join(tijdelijk, `${script}.md`);
      try { execFileSync(process.execPath, [path.join(root, "scripts", script), ...invoer, "--uit", uit], { stdio: ["ignore", "ignore", "inherit"] }); }
      catch { /* een afwijking geeft exitcode 1; het rapport is dan toch geschreven */ }
      if (!existsSync(uit)) throw new Error(`${script} gaf geen rapport.`);
      return readFileSync(uit, "utf8");
    };
    const meting = { datum: new Date().toISOString().slice(0, 10), release,
      passages: leesPassages(draai("check-passages.mjs")), vragen: leesVragen(draai("scan-questions.mjs")) };
    if (metKeten) {
      execFileSync(process.execPath, [path.join(root, "scripts", "build-agent-tools.mjs"), "--settings", path.join(map, "local-build.json")], { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
      const agent = JSON.parse(readFileSync(path.join(root, "agent-build", "current.json"), "utf8"));
      if (agent.release !== release) throw new Error("De agentcatalogus hoort niet bij deze database.");
      meting.keten = leesKeten(draai("check-keten.mjs", ["--catalogue", path.join(agent.directory, "catalogue.sqlite")]));
    }
    const pad = path.join(root, PAGINA);
    writeFileSync(pad, pagina(meting, existsSync(pad) ? readFileSync(pad, "utf8") : ""));
    const readme = path.join(root, "README.md");
    writeFileSync(readme, badge(readFileSync(readme, "utf8"), meting.passages));
    console.log(regel(meting));
  } finally {
    rmSync(tijdelijk, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Kwaliteitsmeting mislukt: ${fout.message}`); process.exitCode = 1; });
}
