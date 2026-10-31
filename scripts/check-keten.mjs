#!/usr/bin/env node
// Controle op de keten die de skills eisen (#283, B-029). Leest de agentcatalogus
// (npm run build:agent) en meet per selecteerbare bouwsteen uit een rapport, wet of kader:
//   - heeft hij een risico (AC-4.4)?
//   - heeft hij een aanwijzing voor bewijs in de opzet- of bestaanstoets (AC-4.3)?
//   - bevat een eigen geformuleerde norm of toets aannametaal, zoals 'waarschijnlijk' (AC-3.3)?
// Aannametaal is alleen een melding. Letterlijke brontekst telt niet mee: die wordt nooit
// herschreven. Zonder --met-tekst bevat het rapport alleen sleutels en velden.
//
//   node scripts/check-keten.mjs --catalogue agent-build/<release>/catalogue.sqlite [--uit rapport.md]
//
// Exitcode 1 als een bouwsteen geen risico of geen bewijsaanwijzing heeft.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Woorden die een gissing uitdrukken. 'Vermoeden' (bij fraude of incidenten) en 'niet
// verondersteld' (een uitdrukkelijke grens) zijn onderwerp, geen gissing, en tellen niet.
const AANNAME = /(?<![\p{L}])(waarschijnlijk|vermoedelijk|naar verwachting|wellicht|misschien|denkelijk|kennelijk|blijkbaar|lijkt|lijken|zou(?:den)? kunnen|ervan uitgaande|(?:we|wij) gaan ervan uit|naar alle waarschijnlijkheid)(?![\p{L}])/giu;
const NORMVELDEN = ["body", "auditNorm"];
const TOETSVELDEN = ["procedure", "testDesign", "testExistence", "testOperation", "documents"];
const tekst = (v) => typeof v === "string" && v.trim().length > 0;

/** Gevonden aannamewoorden in een tekst, in kleine letters. */
export function aannametaal(t) {
  return tekst(t) ? [...t.matchAll(AANNAME)].map((m) => m[1].toLowerCase()) : [];
}

/** Beoordeelt één bouwsteen uit de agentcatalogus. */
export function beoordeel(item) {
  const m = item.material ?? {};
  const toets = TOETSVELDEN.map((f) => m[f]).filter(tekst).join("\n");
  const meldingen = [];
  // Brontekst die letterlijk is overgenomen (wordingMode 'source') wordt niet beoordeeld.
  for (const veld of m.wordingMode === "source" ? [] : NORMVELDEN)
    for (const w of aannametaal(m[veld])) meldingen.push({ veld, woord: w });
  for (const veld of TOETSVELDEN) for (const w of aannametaal(m[veld])) meldingen.push({ veld, woord: w });
  return {
    key: item.key,
    risico: tekst(m.risk),
    bewijs: tekst(m.documents) || /bewijs/i.test(toets),
    aannametaal: meldingen,
  };
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
    compleet: uitkomsten.filter((u) => u.risico && u.bewijs).length,
    zonderRisico: uitkomsten.filter((u) => !u.risico).length,
    zonderBewijs: uitkomsten.filter((u) => !u.bewijs).length,
    aannametaal: uitkomsten.filter((u) => u.aannametaal.length).length,
  };
}

export function rapport(uitkomsten, { catalogus = "" } = {}) {
  const t = totalen(uitkomsten);
  const r = [
    "# Keten van de bouwstenen: controle",
    "",
    `Catalogus: ${catalogus || "onbekend"}. Bouwstenen: ${t.bouwstenen}. Met risico en bewijsaanwijzing: ${t.compleet}. Zonder risico: ${t.zonderRisico}. Zonder bewijsaanwijzing: ${t.zonderBewijs}. Met aannametaal: ${t.aannametaal}.`,
    "",
    "Geteld: selecteerbare bouwstenen uit rapporten, wetten en kaders. Modelvragen hebben geen risico of toets en tellen niet mee. Aannametaal is een melding: beoordeel of de zin een gissing is. Letterlijke brontekst telt niet mee.",
    "",
  ];
  const fout = uitkomsten.filter((u) => !u.risico || !u.bewijs || u.aannametaal.length);
  if (!fout.length) r.push("Geen meldingen.", "");
  else {
    r.push("| Bouwsteen | Risico | Bewijsaanwijzing | Aannametaal |", "| --- | --- | --- | --- |");
    for (const u of fout) r.push(`| ${u.key.replace(/\|/g, "\\|")} | ${u.risico ? "ja" : "**nee**"} | ${u.bewijs ? "ja" : "**nee**"} | ${u.aannametaal.map((a) => `${a.woord} (${a.veld})`).join(", ") || "–"} |`);
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
  console.log(`Keten: ${t.bouwstenen} bouwstenen; zonder risico ${t.zonderRisico}, zonder bewijsaanwijzing ${t.zonderBewijs}; aannametaal bij ${t.aannametaal}.`);
  if (t.zonderRisico || t.zonderBewijs) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (fout) { console.error(fout.message); process.exitCode = 2; }
}
