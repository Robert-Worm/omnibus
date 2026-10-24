#!/usr/bin/env node
// Controleert of elke bronpassage in de database letterlijk in de bron staat, op de
// opgeslagen positie (Unicode-codepoints, eind exclusief). Een afwijking wordt HOLD.
// Het script leest alleen; het verschuift of verzint nooit een markering.
//
//   npm run check:passages -- --database local-data/runtime/catalogue.sqlite [--uit rapport.md]
//
// Of een passage inhoudelijk bij de norm past, beoordeelt de skill omnibus-review-audit-quality.
// Het rapport bevat geen brontekst: alleen ID's, pagina's en de uitkomst.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const UITKOMSTEN = {
  exact: "staat letterlijk op de opgeslagen plek",
  doorgeteld: "staat letterlijk op de opgeslagen plek; het paginanummer telt door over de documenten van de bron (geen HOLD)",
  "alleen-xml": "alleen in de XML-tekst; bewust niet in de pdf (geen HOLD)",
  "andere-pagina": "HOLD: staat op dezelfde positie, maar op een andere pagina dan opgeslagen",
  verschoven: "HOLD: staat in de bron, maar niet op de opgeslagen positie",
  ontbreekt: "HOLD: staat niet letterlijk in de bron",
  "geen-bron": "HOLD: de bron zit niet in de database",
};
export const isHold = (uitkomst) => UITKOMSTEN[uitkomst]?.startsWith("HOLD");

const cp = (tekst) => [...tekst];

/**
 * Een bron als lijst pagina's met tekst. Codepoints worden één keer per bron berekend.
 * @param {{number:number,text:string}[]} paginas
 */
export function maakBron(paginas) {
  const perPagina = new Map(paginas.map((p) => [p.number, cp(p.text)]));
  const geheel = paginas.flatMap((p) => perPagina.get(p.number));
  return { perPagina, geheel, tekst: geheel.join("") };
}

/** Beoordeel één passage tegen de kandidaat-bronnen. */
export function controleer(passage, bronnen, { alleenXml = false } = {}) {
  const { quote, start, end, page } = passage;
  if (!bronnen.length) return { uitkomst: "geen-bron" };
  const exact = (tekens) => start != null && end != null && tekens && tekens.slice(start, end).join("") === quote;
  for (const b of bronnen) if (exact(b.geheel) || exact(b.perPagina.get(page))) return { uitkomst: "exact" };
  // Een bron met meer documenten (hoofdtekst, handleiding) kan doorlopend genummerd zijn.
  let eerder = 0;
  for (const b of bronnen) { if (exact(b.perPagina.get(page - eerder))) return eerder ? { uitkomst: "doorgeteld" } : { uitkomst: "exact" }; eerder += b.perPagina.size; }
  for (const b of bronnen) for (const [nummer, tekens] of b.perPagina) if (nummer !== page && exact(tekens)) return { uitkomst: "andere-pagina", pagina: nummer };
  if (alleenXml) return { uitkomst: "alleen-xml" };
  if (bronnen.some((b) => b.tekst.includes(quote))) return { uitkomst: "verschoven" };
  return { uitkomst: "ontbreekt" };
}

/** Alle passages uit één record: rapporten hebben één citaat, wetten en kaders een lijst bronspans. */
export function passagesUit(record) {
  const d = record.data ?? {};
  if (typeof d.quote === "string") return [{ quote: d.quote, start: d.start, end: d.end, page: d.page, document: d.report_id }];
  return (d.source_spans ?? []).filter((s) => typeof s.quote === "string").map((s) => ({ quote: s.quote, start: s.start, end: s.end, page: s.page, alleenXml: d.evidence_kind === "XML_ONLY" }));
}

export function rapport(resultaat, database = "") {
  const tel = (lijst, u) => lijst.filter((r) => r.uitkomst === u).length;
  const alle = resultaat.flatMap((b) => b.passages);
  const r = ["# Bronpassages: controle", "", `Database: ${database || "onbekend"}. Passages: ${alle.length}. HOLD: ${alle.filter((p) => isHold(p.uitkomst)).length}.`, "",
    "| Uitkomst | Aantal |", "| --- | ---: |", ...Object.entries(UITKOMSTEN).map(([u, uitleg]) => `| ${uitleg} | ${tel(alle, u)} |`), ""];
  for (const b of resultaat) {
    const hold = b.passages.filter((p) => isHold(p.uitkomst));
    r.push(`## ${b.bron}`, "", `${b.passages.length} passages, ${hold.length} HOLD.`, "");
    if (!hold.length) continue;
    r.push("| Record | Opgeslagen pagina | Uitkomst |", "| --- | ---: | --- |");
    for (const p of hold) r.push(`| ${p.record} | ${p.page ?? "?"} | ${UITKOMSTEN[p.uitkomst]}${p.pagina ? ` (pagina ${p.pagina})` : ""} |`);
    r.push("");
  }
  return r.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const waarde = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : undefined; };
  const database = waarde("--database");
  if (!database) throw Error("Geef de database mee: --database local-data/runtime/catalogue.sqlite");
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(database, { readOnly: true });
  const documenten = db.prepare("select version, id, metadata from documents").all().map((d) => { const m = JSON.parse(d.metadata); return { ...d, bronId: m.sourceId, rol: m.role }; });
  const paginas = db.prepare("select number, payload from pages where document_version = ? order by number");
  const cache = new Map();
  const bron = (d) => { if (!cache.has(d.version)) cache.set(d.version, maakBron(paginas.all(d.version).map((p) => ({ number: p.number, text: JSON.parse(p.payload).text })))); return cache.get(d.version); };
  const records = db.prepare("select r.id, r.payload, p.source_id from records r join packages p on p.version = r.version join release_packages rp on rp.version = p.version where r.kind in ('evidence', 'source-link') order by p.source_id, r.position").all();
  const perBron = new Map();
  for (const rec of records) {
    for (const passage of passagesUit(JSON.parse(rec.payload))) {
      const kandidaten = documenten.filter((d) => d.id === passage.document || d.id === rec.source_id || d.bronId === rec.source_id || d.id.startsWith(rec.source_id + "-"));
      kandidaten.sort((a, b) => (a.rol === "main" ? 0 : 1) - (b.rol === "main" ? 0 : 1) || a.id.localeCompare(b.id));
      const uitkomst = controleer(passage, kandidaten.map(bron), { alleenXml: passage.alleenXml });
      if (!perBron.has(rec.source_id)) perBron.set(rec.source_id, []);
      perBron.get(rec.source_id).push({ record: rec.id, page: passage.page, ...uitkomst });
    }
  }
  const resultaat = [...perBron].map(([b, passages]) => ({ bron: b, passages }));
  const tekst = rapport(resultaat, database);
  const uit = waarde("--uit");
  if (uit) writeFileSync(uit, tekst + "\n"); else console.log(tekst);
  const hold = resultaat.flatMap((b) => b.passages).filter((p) => isHold(p.uitkomst)).length;
  console.error(hold ? `Bronpassages: ${hold} HOLD.` : "Bronpassages: alles staat letterlijk op de opgeslagen plek.");
  if (hold) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Passagecontrole mislukt: ${fout.message}`); process.exitCode = 1; });
}
