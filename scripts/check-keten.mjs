#!/usr/bin/env node
// Controle op de keten die de skills eisen (#283, #279, B-029). Leest de agentcatalogus
// (npm run build:agent) en meet per selecteerbare bouwsteen uit een rapport, wet of kader:
//   - heeft hij een bronpassage? Bij een rapport is dat vaak de passage over het risico.
//   - is de hele keten gevuld: norm, doel, risico, beheersdoelstelling, beheersmaatregel,
//     toets en een aanwijzing voor bewijs?
//   - bevat een eigen geformuleerde norm of toets aannametaal, zoals 'waarschijnlijk'?
//   - noemt eigen tekst een extern kader (ISO, AVG, NIST …) zonder te zeggen welk deel?
//   - staat een getal, termijn, bedrag of artikel uit eigen tekst niet in de bron? (#280, naar
//     SAAF hallucination-detection-agent: claims uit de tekst halen en tegen de bron houden.)
// Aannametaal, externe verwijzingen en ongedekte getallen zijn meldingen. Letterlijke brontekst telt daar niet
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
// Controleerbare beweringen: een getal met eenheid, een percentage, een bedrag of een artikel.
const BEWERING = /(?<![\p{L}\d])(\d+(?:[.,]\d+)?\s?(?:%|procent|werkdagen|dagen|dag|uur|uren|weken|week|maanden|maand|jaren|jaar|minuten)(?![\p{L}])|€\s?\d[\d.,]*|\d[\d.,]*\s?(?:euro|miljoen|miljard)(?![\p{L}])|(?:artikel|art\.)\s?\d+[a-z]?)/giu;
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
    // Een grens zegt waarom het kader genoemd wordt: 'geen rechtstreeks bewijs van AVG-naleving',
    // 'geen volledige ISO 50001-beoordeling geclaimd'. Dat is geen algemene verwijzing.
    const zin = t.slice(Math.max(0, t.lastIndexOf(".", m.index) + 1, t.lastIndexOf(";", m.index) + 1), m.index);
    if (/(?<![\p{L}])(geen|niet|zonder)(?![\p{L}])/iu.test(zin)) return false;
    return !SPECIFIEK.test(ervoor) && !SPECIFIEK.test(erna);
  }).map((m) => m[1]);
}

const gelijk = (t) => String(t).toLowerCase().replace(/\s+/g, " ").replace(/procent/g, "%").replace(/art\./g, "artikel");
const artikelNummer = (t) => t.match(/artikel\s?(\d+[a-z]?)/i)?.[1]?.toLowerCase();

/** Artikelnummers die in de bron zelf voorkomen: in de vindplaatsen ('Artikel 6', '/Artikel6/Lid3', '15a.1')
 *  en in de passages van alle bouwstenen van die bron. */
export function artikelenPerBron(items) {
  const per = new Map();
  for (const it of items) {
    const bron = String(it.key).split("|")[0], m = it.material ?? {};
    const set = per.get(bron) ?? per.set(bron, new Set()).get(bron);
    const tekst = [m.location, m.sourceText, m.sourceContext].map((x) => String(x ?? "")).join("\n");
    for (const r of tekst.matchAll(/(?:artikel|art\.)\s?(\d+[a-z]?)(?![\d\p{L}])/giu)) set.add(r[1].toLowerCase());
    for (const deel of String(m.location ?? "").split(/;\s*/)) { const r = deel.match(/^(\d+[a-z]?)(?:\.|$)/i); if (r) set.add(r[1].toLowerCase()); }
  }
  return per;
}

/** Getallen, termijnen, bedragen en artikelen in eigen tekst die niet in de bron staan. Een zin met
 *  geen, niet of zonder is een grens ('gebruik geen termijn van 30 dagen') en telt niet. */
export function ongedekteBeweringen(t, bron = "", artikelen = new Set()) {
  if (!tekst(t)) return [];
  const b = gelijk(bron);
  return [...t.matchAll(BEWERING)].filter((m) => {
    const w = gelijk(m[1]), getal = w.match(/\d+(?:[.,]\d+)?/)[0];
    if (b.includes(w)) return false;
    const nr = artikelNummer(w);
    if (nr ? artikelen.has(nr) || new RegExp(`artikel\\s?${nr}(?![\\d\\p{L}])`, "u").test(b) : new RegExp(`(?<![\\d.,])${getal.replace(/[.,]/g, "[.,]")}(?![\\d])`).test(b)) return false;
    const zin = t.slice(Math.max(t.lastIndexOf(".", m.index - 1) + 1, t.lastIndexOf(";", m.index) + 1, t.lastIndexOf("\n", m.index) + 1), m.index);
    return !/(?<![\p{L}])(geen|niet|zonder)(?![\p{L}])/iu.test(zin);
  }).map((m) => m[1]);
}

/** Beoordeelt één bouwsteen uit de agentcatalogus. */
export function beoordeel(item, artikelen = new Set()) {
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
  const bron = [m.sourceText, m.sourceContext, m.location, m.sourceTitle, m.title, m.parentCriterion, m.controlObjectiveTitle].filter(tekst).join("\n");
  const beweringen = [];
  for (const veld of [...(m.wordingMode === "source" ? [] : NORMVELDEN), ...EIGENVELDEN])
    for (const w of new Set(ongedekteBeweringen(m[veld], bron, artikelen))) beweringen.push({ veld, bewering: w });
  return { key: item.key, ontbreekt, aannametaal: meldingen, verwijzingen, beweringen };
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
    beweringen: uitkomsten.filter((u) => u.beweringen?.length).length,
  };
}

export function rapport(uitkomsten, { catalogus = "" } = {}) {
  const t = totalen(uitkomsten);
  const r = [
    "# Keten van de bouwstenen: controle",
    "",
    `Catalogus: ${catalogus || "onbekend"}. Bouwstenen: ${t.bouwstenen}. Met complete keten: ${t.compleet}. Zonder bronpassage: ${t.zonderPassage}. Met gat in de keten: ${t.metGat}. Met aannametaal: ${t.aannametaal}. Met algemene externe verwijzing: ${t.verwijzingen}. Met getal of artikel dat niet in de bron staat: ${t.beweringen}.`,
    "",
    "Geteld: selecteerbare bouwstenen uit rapporten, wetten en kaders. Modelvragen hebben geen risico of toets en tellen niet mee. De keten is bronpassage, norm, doel, risico, beheersdoelstelling, beheersmaatregel, toets en bewijsaanwijzing. Aannametaal en externe verwijzingen zijn meldingen: beoordeel of de zin een gissing is, en of bij een extern kader duidelijk is welk deel bedoeld is of waarom het genoemd wordt. Letterlijke brontekst telt daar niet mee. Een getal, termijn, bedrag of artikel in eigen tekst hoort in de bronpassage of de context te staan; een artikel mag ook elders in dezelfde bron staan. Staat het er niet, kijk dan of het klopt.",
    "",
  ];
  const fout = uitkomsten.filter((u) => u.ontbreekt.length || u.aannametaal.length || u.verwijzingen.length || u.beweringen?.length);
  if (!fout.length) r.push("Geen meldingen.", "");
  else {
    r.push("| Bouwsteen | Ontbreekt in de keten | Aannametaal | Algemene externe verwijzing | Niet in de bron |", "| --- | --- | --- | --- | --- |");
    for (const u of fout) r.push(`| ${u.key.replace(/[\\|]/g, "\\$&")} | ${u.ontbreekt.map((o) => `**${o}**`).join(", ") || "–"} | ${u.aannametaal.map((a) => `${a.woord} (${a.veld})`).join(", ") || "–"} | ${u.verwijzingen.map((v) => `${v.kader} (${v.veld})`).join(", ") || "–"} | ${(u.beweringen ?? []).map((v) => `${v.bewering} (${v.veld})`).join(", ") || "–"} |`);
    r.push("");
  }
  return r.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const waarde = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const catalogus = waarde("--catalogue");
  if (!catalogus) throw Error("Geef de agentcatalogus mee: --catalogue agent-build/<release>/catalogue.sqlite (maak die met npm run build:agent).");
  const items = leesCatalogus(catalogus);
  const artikelen = artikelenPerBron(items);
  const uitkomsten = items.filter(meetelt).map((it) => beoordeel(it, artikelen.get(String(it.key).split("|")[0])));
  const tekstRapport = rapport(uitkomsten, { catalogus });
  const uit = waarde("--uit");
  if (uit) writeFileSync(uit, tekstRapport);
  const t = totalen(uitkomsten);
  console.log(`Keten: ${t.bouwstenen} bouwstenen; compleet ${t.compleet}, zonder bronpassage ${t.zonderPassage}, met gat ${t.metGat}; aannametaal bij ${t.aannametaal}, algemene externe verwijzing bij ${t.verwijzingen}, getal of artikel niet in de bron bij ${t.beweringen}.`);
  if (t.zonderPassage || t.metGat) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (fout) { console.error(fout.message); process.exitCode = 2; }
}
