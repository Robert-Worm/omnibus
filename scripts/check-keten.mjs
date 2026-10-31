#!/usr/bin/env node
// Controle op de keten die de skills eisen (#283, #279, B-029). Leest de agentcatalogus
// (npm run build:agent) en meet per selecteerbare bouwsteen uit een rapport, wet of kader:
//   - heeft hij een bronpassage? Bij een rapport is dat vaak de passage over het risico.
//   - is de hele keten gevuld: norm, doel, risico, beheersdoelstelling, beheersmaatregel,
//     toets en een aanwijzing voor bewijs?
//   - bevat een eigen geformuleerde norm of toets aannametaal, zoals 'waarschijnlijk'?
//   - noemt eigen tekst een extern kader (ISO, AVG, NIST …) zonder te zeggen welk deel?
// Aannametaal en externe verwijzingen zijn meldingen. Letterlijke brontekst telt daar niet
// mee: die wordt nooit herschreven. Het rapport bevat alleen sleutels en velden.
//
//   npm run check:keten -- --catalogue agent-build/<release>/catalogue.sqlite [--uit rapport.md]
//
// Exitcode 1 als een bouwsteen geen bronpassage heeft of een gat in de keten.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Woorden die een gissing uitdrukken. 'Vermoeden' (bij fraude of incidenten) en 'niet
// verondersteld' (een uitdrukkelijke grens) zijn onderwerp, geen gissing, en tellen niet.
const AANNAME = /(?<![\p{L}])(waarschijnlijk|vermoedelijk|naar verwachting|wellicht|misschien|denkelijk|kennelijk|blijkbaar|typisch|meestal|doorgaans|lijkt|lijken|zou(?:den)? kunnen|ervan uitgaande|(?:we|wij) gaan ervan uit|naar alle waarschijnlijkheid)(?![\p{L}])/giu;
// Externe kaders. Een verwijzing is specifiek als er een artikel, paragraaf of nummer bij staat.
const KADER = /(?<![\p{L}])(ISO(?:\/IEC)?\s?\d{4,5}|ISO|NIST|COBIT|COSO|ITIL|NEN\s?\d{4}|BIO2?|AVG|GDPR|NIS2|DORA|CIS Controls?|SOC ?2)(?![\p{L}])/gu;
const SPECIFIEK = /(artikel|art\.|§|lid\s\d|clausule|paragraaf|hoofdstuk|bijlage|annex|control\s[A-Z]?\d|maatregel\s\d|[A-Z]\.\d+(?:\.\d+)*|\b\d+\.\d+(?:\.\d+)*\b)/i;
const NORMVELDEN = ["body", "auditNorm"];
const TOETSVELDEN = ["procedure", "testDesign", "testExistence", "testOperation", "documents"];
const EIGENVELDEN = ["rationale", "risk", "controlObjective", "control", ...TOETSVELDEN];
/** De keten per bouwsteen, met het veld of de velden waar elk onderdeel in staat. */
export const KETEN = {
  bronpassage: ["sourceText"], norm: ["body", "auditNorm"], doel: ["rationale"], risico: ["risk"],
  beheersdoelstelling: ["controlObjective"], beheersmaatregel: ["control"], toets: ["procedure", "testDesign", "testExistence"],
};
const tekst = (v) => typeof v === "string" && v.trim().length > 0;

/** Gevonden aannamewoorden in een tekst, in kleine letters. */
export function aannametaal(t) {
  return tekst(t) ? [...t.matchAll(AANNAME)].map((m) => m[1].toLowerCase()) : [];
}

/** Externe kaders in eigen tekst zonder deel of artikel erbij, en die de bronpassage niet noemt. */
export function algemeneVerwijzingen(t, bron = "") {
  if (!tekst(t)) return [];
  return [...t.matchAll(KADER)].filter((m) => {
    const naam = m[1];
    if (bron.includes(naam.split(/[\s/]/)[0])) return false;
    // 'artikel 32 AVG' of 'ISO 27001, clausule 5.1': kijk kort ervoor en erna.
    const ervoor = t.slice(Math.max(0, m.index - 25), m.index), erna = t.slice(m.index + naam.length, m.index + naam.length + 40);
    return !SPECIFIEK.test(ervoor) && !SPECIFIEK.test(erna);
  }).map((m) => m[1]);
}

/** Beoordeelt één bouwsteen uit de agentcatalogus. */
export function beoordeel(item) {
  const m = item.material ?? {};
  const toets = TOETSVELDEN.map((f) => m[f]).filter(tekst).join("\n");
  const ontbreekt = Object.entries(KETEN).filter(([, velden]) => !velden.some((v) => tekst(m[v]))).map(([naam]) => naam);
  if (!(tekst(m.documents) || /bewijs/i.test(toets))) ontbreekt.push("bewijsaanwijzing");
  const meldingen = [];
  // Brontekst die letterlijk is overgenomen (wordingMode 'source') wordt niet beoordeeld.
  for (const veld of m.wordingMode === "source" ? [] : NORMVELDEN)
    for (const w of aannametaal(m[veld])) meldingen.push({ veld, woord: w });
  for (const veld of TOETSVELDEN) for (const w of aannametaal(m[veld])) meldingen.push({ veld, woord: w });
  const verwijzingen = [];
  for (const veld of EIGENVELDEN) for (const k of algemeneVerwijzingen(m[veld], m.sourceText ?? "")) verwijzingen.push({ veld, kader: k });
  return { key: item.key, ontbreekt, aannametaal: meldingen, verwijzingen };
}

export const meetelt = (item) => (item.selectionStatus ?? "SELECTABLE") === "SELECTABLE" && item.kind !== "model";

export function leesCatalogus(pad) {
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(pad, { readOnly: true });
  try {
    return db.prepare("SELECT payload FROM agent_items ORDER BY key").all().map((r) => JSON.parse(r.payload));
  } finally {
    db.close();
  }
}

export function totalen(uitkomsten) {
  return {
    bouwstenen: uitkomsten.length,
    compleet: uitkomsten.filter((u) => !u.ontbreekt.length).length,
    zonderPassage: uitkomsten.filter((u) => u.ontbreekt.includes("bronpassage")).length,
    metGat: uitkomsten.filter((u) => u.ontbreekt.some((o) => o !== "bronpassage")).length,
    aannametaal: uitkomsten.filter((u) => u.aannametaal.length).length,
    verwijzingen: uitkomsten.filter((u) => u.verwijzingen.length).length,
  };
}

export function rapport(uitkomsten, { catalogus = "" } = {}) {
  const t = totalen(uitkomsten);
  const r = [
    "# Keten van de bouwstenen: controle",
    "",
    `Catalogus: ${catalogus || "onbekend"}. Bouwstenen: ${t.bouwstenen}. Met complete keten: ${t.compleet}. Zonder bronpassage: ${t.zonderPassage}. Met gat in de keten: ${t.metGat}. Met aannametaal: ${t.aannametaal}. Met algemene externe verwijzing: ${t.verwijzingen}.`,
    "",
    "Geteld: selecteerbare bouwstenen uit rapporten, wetten en kaders. Modelvragen hebben geen risico of toets en tellen niet mee. De keten is bronpassage, norm, doel, risico, beheersdoelstelling, beheersmaatregel, toets en bewijsaanwijzing. Aannametaal en externe verwijzingen zijn meldingen: beoordeel of de zin een gissing is, en of bij een extern kader duidelijk is welk deel bedoeld is of waarom het genoemd wordt. Letterlijke brontekst telt daar niet mee.",
    "",
  ];
  const fout = uitkomsten.filter((u) => u.ontbreekt.length || u.aannametaal.length || u.verwijzingen.length);
  if (!fout.length) r.push("Geen meldingen.", "");
  else {
    r.push("| Bouwsteen | Ontbreekt in de keten | Aannametaal | Algemene externe verwijzing |", "| --- | --- | --- | --- |");
    for (const u of fout) r.push(`| ${u.key.replace(/[\\|]/g, "\\$&")} | ${u.ontbreekt.map((o) => `**${o}**`).join(", ") || "–"} | ${u.aannametaal.map((a) => `${a.woord} (${a.veld})`).join(", ") || "–"} | ${u.verwijzingen.map((v) => `${v.kader} (${v.veld})`).join(", ") || "–"} |`);
    r.push("");
  }
  return r.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const waarde = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const catalogus = waarde("--catalogue");
  if (!catalogus) throw Error("Geef de agentcatalogus mee: --catalogue agent-build/<release>/catalogue.sqlite (maak die met npm run build:agent).");
  const uitkomsten = leesCatalogus(catalogus).filter(meetelt).map(beoordeel);
  const tekstRapport = rapport(uitkomsten, { catalogus });
  const uit = waarde("--uit");
  if (uit) writeFileSync(uit, tekstRapport);
  const t = totalen(uitkomsten);
  console.log(`Keten: ${t.bouwstenen} bouwstenen; compleet ${t.compleet}, zonder bronpassage ${t.zonderPassage}, met gat ${t.metGat}; aannametaal bij ${t.aannametaal}, algemene externe verwijzing bij ${t.verwijzingen}.`);
  if (t.zonderPassage || t.metGat) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (fout) { console.error(fout.message); process.exitCode = 2; }
}
