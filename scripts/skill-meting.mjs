#!/usr/bin/env node
// Meet wat een skill kost: hoeveel tekst een AI-assistent moet lezen, en hoe vaak de bron.
// De echte kosten van een run (tijd, tokens) en de kwaliteit legt de beheerder vast in
// docs/beheer/skill-meting.md; dit script vat die metingen ook samen.
//
//   npm run skills:meting                                    vaste leeskosten per skill
//   npm run skills:meting -- --database <catalogue.sqlite>   plus de leeskosten van de testset
//   npm run skills:meting -- --metingen                      samenvatting van de vastgelegde runs
//
// Tokens zijn een schatting: 3,5 tekens per token voor Nederlandse tekst.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const TEKENS_PER_TOKEN = 3.5;
export const tokens = (tekst) => Math.round(tekst.length / TEKENS_PER_TOKEN);

/**
 * Vaste testset: openbare bronnen uit de database, klein, middel en groot.
 * Elke optimalisatie wordt op deze set gemeten (zie besluit B-018).
 */
export const TESTSET = [
  { skill: "omnibus-add-report", bron: "LVVN26", waarom: "klein rapport (14 pagina's)" },
  { skill: "omnibus-add-report", bron: "PROO26", waarom: "middelgroot rapport (19 pagina's, veel tekst)" },
  { skill: "omnibus-add-report", bron: "IVHO25", waarom: "groot rapport (41 pagina's)" },
  { skill: "omnibus-add-framework", bron: "TR-CYBER-20261016-cybersecurity-doc1", waarom: "kort kader (6 pagina's)" },
];

/** Hoe vaak de werkwijze de volledige bron laat lezen, met de plek waar dat staat. */
export const VOLLEDIGE_LEZINGEN = {
  "omnibus-add-report": { aantal: 4, waar: "references/report-method.md, Bronfase: twee lezers, reconciliator, bron-eindreviewer" },
  "omnibus-add-framework": { aantal: 4, waar: "references/framework-method.md: zelfde lezersopzet als rapporten" },
};

/**
 * Welke naslag een skill altijd laat lezen en welke alleen als het nodig is.
 * Altijd: een verwijzing in een zin met 'volledig', of AGENTS.md.
 */
export function leesplan(skillMd) {
  const zinnen = skillMd.split(/(?<=[.!?:])\s+/);
  const altijd = new Set(), soms = new Set();
  for (const zin of zinnen) {
    for (const [, bestand] of zin.matchAll(/\]\((references\/[^)#\s]+)/g)) (/volledig/i.test(zin) ? altijd : soms).add(bestand);
    if (/\blees\b[^.]*`AGENTS\.md`/i.test(zin) || /`AGENTS\.md`[^.]*volledig/i.test(zin)) altijd.add("AGENTS.md");
  }
  for (const b of altijd) soms.delete(b);
  return { altijd: [...altijd], soms: [...soms] };
}

export function skillKosten(map, lees = (p) => readFileSync(p, "utf8")) {
  const skillMd = lees(path.join(map, "SKILL.md"));
  const plan = leesplan(skillMd);
  const grootte = (b) => tokens(lees(b === "AGENTS.md" ? path.join(root, "AGENTS.md") : path.join(map, b)));
  const altijd = tokens(skillMd) + plan.altijd.reduce((n, b) => n + grootte(b), 0);
  const soms = plan.soms.reduce((n, b) => n + grootte(b), 0);
  return { altijd, soms, plan };
}

/** Leest de tabel 'Metingen' uit docs/beheer/skill-meting.md. */
export function leesMetingen(markdown) {
  const zonderCode = markdown.replace(/^ *```[\s\S]*?^ *```/gm, "");
  const deel = zonderCode.split(/^## Metingen\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  const regels = deel.split("\n").filter((r) => /^\|\s*\d{4}-\d{2}-\d{2}/.test(r));
  return regels.map((r) => {
    const [datum, skill, bron, versie, model, agents, minuten, tokensRun, score] = r.split("|").slice(1, -1).map((c) => c.trim());
    const getal = (v) => (v === "" || v === "–" ? null : Number(v.replace(/\./g, "").replace(",", ".")));
    return { datum, skill, bron, versie, model, agents: getal(agents), minuten: getal(minuten), tokens: getal(tokensRun), score: getal(score) };
  });
}

/** Een optimalisatie gaat alleen door als de kwaliteit op geen enkele bron daalt (B-018). */
export function vergelijk(oud, nieuw) {
  const perBron = nieuw.map((n) => {
    const o = oud.find((x) => x.bron === n.bron && x.skill === n.skill);
    return { bron: n.bron, oud: o?.score ?? null, nieuw: n.score, tokensOud: o?.tokens ?? null, tokensNieuw: n.tokens };
  });
  const onvolledig = perBron.some((r) => r.oud == null || r.nieuw == null);
  const daling = perBron.filter((r) => r.oud != null && r.nieuw != null && r.nieuw < r.oud);
  return { perBron, toegestaan: !onvolledig && daling.length === 0, reden: onvolledig ? "niet elke bron uit de testset is gemeten" : daling.length ? `kwaliteit daalt bij ${daling.map((r) => r.bron).join(", ")}` : "kwaliteit gelijk of beter op de hele testset" };
}

const fmt = (n) => n.toLocaleString("nl-NL");

async function main() {
  const args = process.argv.slice(2);
  const skills = readdirSync(path.join(root, "skills")).filter((d) => existsSync(path.join(root, "skills", d, "SKILL.md"))).sort();
  if (args.includes("--metingen")) {
    const metingen = leesMetingen(readFileSync(path.join(root, "docs/beheer/skill-meting.md"), "utf8"));
    if (!metingen.length) { console.log("Nog geen runs vastgelegd in docs/beheer/skill-meting.md."); return; }
    for (const m of metingen) console.log(`${m.datum} · ${m.skill} · ${m.bron} · versie ${m.versie} · ${m.model}: ${m.agents ?? "?"} agents, ${m.minuten ?? "?"} min, ${m.tokens != null ? fmt(m.tokens) : "?"} tokens, score ${m.score ?? "?"}`);
    return;
  }
  console.log("Vaste leeskosten per skill (geschat in tokens)\n");
  console.log("| Skill | Altijd | Alleen als nodig |");
  console.log("| --- | ---: | ---: |");
  for (const s of skills) { const k = skillKosten(path.join(root, "skills", s)); console.log(`| ${s} | ${fmt(k.altijd)} | ${fmt(k.soms)} |`); }
  const i = args.indexOf("--database");
  if (i < 0) return;
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(args[i + 1], { readOnly: true });
  const tekst = db.prepare("select d.page_count pages, sum(p.end_cp - p.start_cp) cp from documents d join pages p on p.document_version = d.version where d.id = ? group by d.version");
  console.log("\nLeeskosten van de bron in de testset (alleen de tekstlaag)\n");
  console.log("| Skill | Bron | Pagina's | Eén lezing | Lezingen | Samen |");
  console.log("| --- | --- | ---: | ---: | ---: | ---: |");
  for (const t of TESTSET) {
    const d = tekst.get(t.bron) ?? tekst.get(`${t.bron}-main`);
    if (!d) { console.log(`| ${t.skill} | ${t.bron} | niet in deze database | | | |`); continue; }
    const een = Math.round(d.cp / TEKENS_PER_TOKEN), n = VOLLEDIGE_LEZINGEN[t.skill]?.aantal ?? 1;
    console.log(`| ${t.skill} | ${t.bron} | ${d.pages} | ${fmt(een)} | ${n} | ${fmt(een * n)} |`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Skillmeting mislukt: ${fout.message}`); process.exitCode = 1; });
}
