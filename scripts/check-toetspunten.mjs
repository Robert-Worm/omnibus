#!/usr/bin/env node
// Controle op volledige en leesbare toetspunten (B-035). Zonder taalmodel; een melding is een
// signaal voor review, geen oordeel. Vijf soorten meldingen:
//
//   onvolledig      De toets (opzet, bestaan, werking) en de bronpassage noemen onderdelen die
//                   in het toetspunt zelf ontbreken, ook niet in een ander toetspunt bij dezelfde
//                   norm. De nuance staat dan wel in de toets, maar niet in wat je selecteert.
//   vaag            Het toetspunt telt of verwijst zonder te noemen: "met de vereiste inhoud",
//                   "de vier gegevenskwaliteiten", "de bedoelde normen".
//   verwijzing      Het toetspunt leunt op een artikelverwijzing ("overeenkomstig 8(2)(b)")
//                   in plaats van te zeggen wat er moet. De lezer moet dan de bron openen.
//   aaneen          Een verwijzing zonder spatie: "artikel8(2)", "titelIII", "uiterlijk24 uur".
//   werktaal        Interne notities of werkwoorden uit de uitwerking: "dit voorstel",
//                   "brongebonden", "HOLD", een verwijzing naar een intern ID (P02), of een
//                   zelfbedachte samenstelling met -route ("kalenderroute").
//   engels          Engelse zinsdelen in Nederlandse tekst.
//
//   npm run check:toetspunten -- --catalogue agent-build/<release>/catalogue.sqlite \
//     [--bron '^(DORA|NOREA)'] [--uit rapport.md] [--csv meldingen.csv]
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { leesCatalogus, meetelt } from "./check-keten.mjs";
import { pakketNotities, standaardzinnen, lezersnotities, lezersbroncontext } from "../lib/reader-notes.mjs";

/** Velden die de lezer ziet bij een toetspunt, in leesvolgorde. */
export const VELDEN = ["title", "body", "parentCriterion", "rationale", "risk", "controlObjective", "control", "testDesign", "testExistence", "testOperation", "documents", "sourceContext"];
const TOETS = ["testDesign", "testExistence", "testOperation"];
const veldNaam = { title: "titel", body: "toetspunt", parentCriterion: "norm", rationale: "doel", risk: "risico", controlObjective: "beheersdoelstelling", control: "beheersmaatregel", testDesign: "opzet", testExistence: "bestaan", testOperation: "werking", documents: "bewijs", sourceContext: "broncontext" };

// Woorden die in bijna elke bron en toets staan en niets zeggen over volledigheid.
const ALGEMEEN = new Set(("waarbij waarin waarop daarbij daarvan daarnaast hiervan hierbij volgens bedoeld bedoelde overeenkomstig " +
  "betreffende desbetreffende artikel artikelen verordening financiële entiteit entiteiten onderdeel worden wordt moeten kunnen " +
  "andere tussen binnen tenminste eerste tweede derde alinea gedelegeerde uitvoeringsverordening richtlijn bepaling bepalingen " +
  "relevant relevante toepasselijk toepasselijke betrokken betrokkene voorwaarden omvang gevallen indien alleen eventueel " +
  "inclusief bijbehorende gebruik gebruikt passende passend vereist vereiste vastgesteld vastgelegd zodanig").split(" "));
const stam = (w) => w.slice(0, 7);
export function termen(t) {
  return new Set((String(t ?? "").toLowerCase().match(/\p{L}{6,}/gu) ?? []).filter((w) => !ALGEMEEN.has(w)).map(stam));
}
/** De brontekst van de passage, zonder de kopregels die de viewer toevoegt (vindplaats, bestand, pagina). */
export function passageTekst(t) {
  return String(t ?? "").split("\n").filter((r) => !/· PDF-pagina|\.(pdf|xlsx?)\b|^(artikel|titel|bijlage|hoofdstuk)\s[\w\s,.()-]{0,40}$|, rij \d/iu.test(r)).join(" ");
}

/** Onderdelen die bronpassage én toets noemen, maar geen toetspunt bij deze norm. */
export function ontbrekendeNuance(item, broers = []) {
  const m = item.material ?? item;
  const gedekt = new Set([m, ...broers].flatMap((b) => [...termen(`${b.title ?? ""} ${b.body ?? ""}`)]));
  const bron = termen(passageTekst(m.sourceText));
  const toets = termen(TOETS.map((v) => m[v]).join(" "));
  return [...toets].filter((w) => bron.has(w) && !gedekt.has(w)).sort();
}

// Een artikelverwijzing in de vorm 8(2), 8(2)(b), 6(8)(b) of artikel 8, lid 2: de lezer moet de bron erbij pakken.
const VERWIJZING = /(?<![\p{L}\d])(?:(?:DORA|RTS|ITS)[-\s]?)?(?:artikel\s?)?\d{1,3}[a-z]?\s?\(\d{1,2}\)(?:\s?\([a-z]{1,4}\)|[a-z]{1,2}(?![\p{L}]))?(?:\s?\([ivx–-]+\))?/giu;
export function verwijzingen(t) {
  return [...String(t ?? "").matchAll(VERWIJZING)].map((m) => m[0].trim());
}

// Aan elkaar: een woord direct gevolgd door een nummer of Romeins cijfer (artikel8, titelIII, uiterlijk24, in11(6)).
const AANEEN = /(?<![\p{L}\d-])(artikel(?:en)?|titel|hoofdstuk(?:ken)?|afdeling(?:en)?|lid|leden|bijlage|verordening|richtlijn|DORA|RTS|ITS|uiterlijk|binnen|naast|volgens|in|uit|van|en|of|tot)(\d{1,4}[a-z]?(?:\(\d+\))?(?![\d]|-[A-Z0-9])|(?:I{1,3}|IV|VI{0,3}|IX|X)(?![\p{L}]))/gu;
// Algemeen (#303): elk woord van drie of meer kleine letters direct gevolgd door een nummer
// (uitzondering26(1), evenredigheid4(2), kader6). Vaste ID's met hoofdletters vallen erbuiten.
const AANEEN_ALGEMEEN = /(?<![\p{L}\d_])\p{Ll}{3,}\d{1,3}(?:\(\d+\))?(?![\d]|-[A-Z0-9])/gu;
export function aaneen(t) {
  const s = String(t ?? "");
  return [...new Set([...s.matchAll(AANEEN)].map((m) => m[0]).concat([...s.matchAll(AANEEN_ALGEMEEN)].map((m) => m[0])))];
}

// Werktaal: notities over de uitwerking zelf, interne statussen en ID's, en -route-samenstellingen.
const WERKTAAL = [
  [/(?<![\p{L}])(dit|het|deze) voorstel(?![\p{L}])/giu, "notitie over 'het voorstel'"],
  [/(?<![\p{L}])(brongebonden|bronconform|bronbinding|bronvoorwaarden?|bronbasis|bronrecord|brongrens\p{L}*|beoordeelde object|inhoudelijke verwijzing)(?![\p{L}])/giu, "werkwoord uit de uitwerking"],
  [/(?<![\p{L}])(HOLD|SELECTABLE|CONTEXT_ONLY|ANALYST_PROPOSAL|PILOT\d+)(?![\p{L}])/gu, "interne status of code"],
  [/(?<![\p{L}\d])[A-Z]+(?:_[A-Z]+)+(?![\p{L}\d])/gu, "interne code"],
  [/(?<![\p{L}\d])(?:EX|T|B)\d{1,3}(?:\([\d–-]+\))?(?![\p{L}\d-])/gu, "interne afkorting"],
  [/(?<![\p{L}\d-])[NP]\d{2,3}(?![\p{L}\d-])/gu, "intern ID"],
  [/\((?:[A-Z][A-Z0-9]*-){2,}[A-Z0-9-]+\)/gu, "record-ID tussen haakjes"],
  [/(?<![\p{L}])(normadressaat|taakdrager|batch|analistenvoorstel\p{L}*|kandidaat\p{L}*)(?![\p{L}])/giu, "vakjargon van de uitwerking"],
  [/(?<![\p{L}])\p{L}*[a-z]route(?![\p{L}])/gu, "samenstelling met -route"],
];
// Gewone woorden die op -route eindigen.
const GEWONE_ROUTE = new Set(["vluchtroute", "looproute", "vaarroute", "reisroute"]);
export function werktaal(t) {
  const s = String(t ?? ""), uit = [];
  for (const [re, soort] of WERKTAAL) for (const m of s.matchAll(re)) {
    if (soort === "samenstelling met -route" && GEWONE_ROUTE.has(m[0].toLowerCase())) continue;
    uit.push({ soort, woord: m[0] });
  }
  return uit;
}

// Engels: alleen woorden die in het Nederlands niet voorkomen.
const ENGELS = /(?<![\p{L}])(the|shall|which|should|must|unresolved|remains?|whether|without|within|between|are|is not|does not)(?![\p{L}])/giu;
export function engels(t) {
  const w = String(t ?? "").match(ENGELS) ?? [];
  return w.length >= 2 ? [...new Set(w.map((x) => x.toLowerCase()))] : [];
}

// Tellen of verwijzen zonder te noemen. Een getal met een tijdseenheid ('de zes maanden') is wel concreet.
const VAAG = /(?<![\p{L}])(?:(?:met|volgens|binnen|op|aan|van) )?(?:de|het|alle) (?:vereiste|genoemde|bedoelde|daar geregelde|daar genoemde|brongebonden|voorgeschreven) \p{L}+|(?<![\p{L}])beide \p{L}+typen|(?<![\p{L}])de (?:twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf) (?!(?:dagen|weken|maanden|jaren|jaar|uur|werkdagen|kalenderdagen)\b)(?:genoemde |bedoelde )?\p{L}+/giu;
export function vaag(t) {
  return [...String(t ?? "").matchAll(VAAG)].map((m) => m[0]);
}

/** Wat de viewer uit de bronkoppeling toont: toepassing, voorwaarden en notities die geen standaardzin zijn. */
export function viewerTekst(item, standaard = new Set()) {
  let spoor;
  try { spoor = JSON.parse(item.material?.topicalTrace || "null"); } catch { spoor = null; }
  const p = spoor?.point;
  if (!p) return [];
  const records = spoor.records ?? [];
  return [
    ["toepassing", [p.scope, ...lezersnotities((p.addressees ?? []).map((a) => a.condition), standaard), ...(p.conditions ?? []), ...(p.exceptions ?? [])]],

    ["context", records.flatMap((r) => [...(r.conditions ?? []), ...(r.exceptions ?? []), ...lezersnotities(r.interpretation_notes ?? [], standaard)])],
  ].map(([veld, teksten]) => [veld, teksten.filter(Boolean).join("\n")]);
}

/** Drempel: vanaf zoveel ontbrekende onderdelen melden we 'mogelijk onvolledig'. */
export const DREMPEL = 6;

export function beoordeel(items, { bron = /./ } = {}) {
  const gekozen = items.filter((i) => meetelt(i) && bron.test(i.sourceId ?? String(i.key).split("|")[0]));
  const perNorm = new Map();
  for (const i of gekozen) {
    const k = `${i.sourceId}|${i.material?.parentCriterion ?? ""}`;
    if (!perNorm.has(k)) perNorm.set(k, []);
    perNorm.get(k).push(i.material ?? i);
  }
  // Standaardzinnen per bron, zoals de viewer ze weglaat.
  const standaard = new Map();
  for (const bronId of new Set(gekozen.map((i) => i.sourceId))) {
    const sporen = gekozen.filter((i) => i.sourceId === bronId).map((i) => { try { return JSON.parse(i.material?.topicalTrace || "null"); } catch { return null; } }).filter(Boolean);
    standaard.set(bronId, standaardzinnen([...pakketNotities(sporen.map((s) => s.point), sporen.flatMap((s) => s.records ?? [])), ...sporen.flatMap((s) => (s.point.addressees ?? []).map((a) => a.condition))]));
  }
  const meldingen = [];
  for (const i of gekozen) {
    const m = i.material ?? i, broers = perNorm.get(`${i.sourceId}|${m.parentCriterion ?? ""}`).filter((b) => b !== m);
    const voeg = (soort, veld, wat) => meldingen.push({ key: i.key, bron: i.sourceId, soort, veld: veldNaam[veld] ?? veld, wat });
    const nuance = ontbrekendeNuance(m, broers);
    if (nuance.length >= DREMPEL) voeg("onvolledig", "body", `${nuance.length} onderdelen alleen in bron en toets: ${nuance.slice(0, 12).join(", ")}${nuance.length > 12 ? " …" : ""}`);
    const v = vaag(m.body);
    if (v.length) voeg("vaag", "body", [...new Set(v)].join("; "));
    const ref = verwijzingen(m.body);
    if (ref.length) voeg("verwijzing", "body", ref.join("; "));
    for (const veld of VELDEN) {
      // De broncontext zoals de export haar toont (#303).
      const tekst = veld === "sourceContext" ? lezersbroncontext(m[veld] ?? "") : m[veld];
      const a = aaneen(tekst);
      if (a.length) voeg("aaneen", veld, [...new Set(a)].join(", "));
      const w = werktaal(tekst);
      if (w.length) voeg("werktaal", veld, [...new Set(w.map((x) => `${x.woord} (${x.soort})`))].join(", "));
      const e = engels(tekst);
      if (e.length) voeg("engels", veld, e.join(", "));
    }
    for (const [veld, t] of viewerTekst(i, standaard.get(i.sourceId))) {
      const a = aaneen(t);
      if (a.length) voeg("aaneen", veld, [...new Set(a)].join(", "));
      const w = werktaal(t);
      if (w.length) voeg("werktaal", veld, [...new Set(w.map((x) => `${x.woord} (${x.soort})`))].join(", "));
    }
  }
  return { toetspunten: gekozen.length, meldingen };
}

const SOORTEN = ["onvolledig", "vaag", "verwijzing", "aaneen", "werktaal", "engels"];
const uitleg = {
  onvolledig: "Mogelijk onvolledig: de bronpassage en de toets noemen onderdelen die in geen toetspunt bij deze norm staan.",
  vaag: "Het toetspunt telt of verwijst zonder te noemen, zoals 'met de vereiste inhoud'.",
  verwijzing: "Het toetspunt leunt op een artikelverwijzing in plaats van de inhoud te noemen.",
  aaneen: "Verwijzing zonder spatie, zoals artikel8(2) of titelIII.",
  werktaal: "Interne notitie, status, ID of zelfbedacht woord in tekst die de lezer ziet.",
  engels: "Engelse zinsdelen in Nederlandse tekst.",
};

export function samenvatting({ toetspunten, meldingen }) {
  const perSoort = Object.fromEntries(SOORTEN.map((s) => [s, new Set(meldingen.filter((m) => m.soort === s).map((m) => m.key)).size]));
  const bronnen = [...new Set(meldingen.map((m) => m.bron))].sort();
  const perBron = bronnen.map((b) => [b, ...SOORTEN.map((s) => new Set(meldingen.filter((m) => m.bron === b && m.soort === s).map((m) => m.key)).size)]);
  return { toetspunten, perSoort, perBron };
}

export function rapport(uitkomst, { catalogus = "", bron = "" } = {}) {
  const s = samenvatting(uitkomst);
  const r = ["# Toetspunten: volledigheid en leesbaarheid", "",
    `Catalogus: ${catalogus || "onbekend"}. Bronnen: ${bron || "alle"}. Selecteerbare toetspunten: ${s.toetspunten}.`, "",
    "Een melding is een signaal voor review, geen oordeel. Het aantal is het aantal toetspunten met minstens één melding van die soort.", "",
    "| Soort | Toetspunten | Wat het betekent |", "| --- | ---: | --- |",
    ...SOORTEN.map((k) => `| ${k} | ${s.perSoort[k]} | ${uitleg[k]} |`), "",
    "## Per bron", "", `| Bron | ${SOORTEN.join(" | ")} |`, `| --- | ${SOORTEN.map(() => "---:").join(" | ")} |`,
    ...s.perBron.map(([b, ...n]) => `| ${b} | ${n.join(" | ")} |`), ""];
  for (const soort of SOORTEN) {
    const lijst = uitkomst.meldingen.filter((m) => m.soort === soort);
    if (!lijst.length) continue;
    r.push(`## ${soort}`, "", "| Toetspunt | Veld | Melding |", "| --- | --- | --- |");
    for (const m of lijst) r.push(`| ${m.key.replace(/[|]/g, "\\|")} | ${m.veld} | ${m.wat.replace(/[|\n]/g, " ")} |`);
    r.push("");
  }
  return r.join("\n");
}

export function csv({ meldingen }) {
  const cel = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return ["toetspunt;bron;soort;veld;melding", ...meldingen.map((m) => [m.key, m.bron, m.soort, m.veld, m.wat].map(cel).join(";"))].join("\n") + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const waarde = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const catalogus = waarde("--catalogue");
  if (!catalogus) throw Error("Geef de agentcatalogus mee: --catalogue agent-build/<release>/catalogue.sqlite (maak die met npm run build:agent).");
  const bronTekst = waarde("--bron") ?? "";
  const uitkomst = beoordeel(leesCatalogus(catalogus), { bron: new RegExp(bronTekst || ".") });
  if (waarde("--uit")) writeFileSync(waarde("--uit"), rapport(uitkomst, { catalogus, bron: bronTekst }));
  if (waarde("--csv")) writeFileSync(waarde("--csv"), csv(uitkomst));
  const s = samenvatting(uitkomst);
  console.log(`Toetspunten: ${s.toetspunten}. Met melding: ${SOORTEN.map((k) => `${k} ${s.perSoort[k]}`).join(", ")}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (fout) { console.error(fout.message); process.exitCode = 2; }
}
