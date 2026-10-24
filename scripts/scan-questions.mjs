#!/usr/bin/env node
// Scant alle vragen in de database op vormfouten en maakt een rapport per bron.
// De voorcontrole staat in lib/question-quality.mjs; de inhoudelijke beoordeling doet
// de skill omnibus-review-questions op basis van dit rapport.
//
//   npm run check:questions -- --database local-data/runtime/catalogue.sqlite [--uit rapport.md] [--met-tekst]
//
// Zonder --met-tekst bevat het rapport alleen ID's, plekken, uitkomsten en redenen,
// geen vraagteksten. Zo kan het rapport veilig in een issue of pull request.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { UITKOMSTEN, voorcontrole } from "../lib/question-quality.mjs";

export function leesOpties(args) {
  const waarde = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : undefined; };
  const database = waarde("--database");
  if (!database) throw Error("Geef de database mee: --database local-data/runtime/catalogue.sqlite");
  return { database, uit: waarde("--uit"), metTekst: args.includes("--met-tekst") };
}

/** Alle vragen uit één record of pakket, met plek en soort. Pure functie, ook bruikbaar in tests. */
export function vragenUit(soortRecord, id, gegevens) {
  const uit = [];
  const voeg = (plek, soort, tekst) => { if (typeof tekst === "string") uit.push({ id, plek, soort, tekst }); };
  const d = gegevens?.data ?? {};
  if (soortRecord === "norm") {
    voeg("toetsvraag", "toetsvraag", d.auditQuestion?.text);
    voeg("vraag", "toetsvraag", d.question);
  } else if (soortRecord === "dimension") {
    voeg("onderzoeksvraag", "onderzoeksvraag", d.question);
    if (d.researchQuestion !== d.question) voeg("onderzoeksvraag", "onderzoeksvraag", d.researchQuestion);
    for (const v of d.questions ?? []) {
      const qid = v.id || id;
      const basis = v.variants?.operational === v.question ? null : v.question;
      if (basis) uit.push({ id: qid, plek: "interviewvraag", soort: "interview", tekst: basis });
      for (const [niveau, tekst] of Object.entries(v.variants ?? {})) if (typeof tekst === "string") uit.push({ id: qid, plek: `interviewvraag ${niveau}`, soort: "interview", tekst });
      if (typeof v.probes === "string" && v.probes.trim()) uit.push({ id: qid, plek: "doorvragen", soort: "doorvraag", tekst: v.probes });
    }
  } else if (soortRecord === "model") {
    const m = gegevens?.metadata ?? {};
    voeg("centrale vraag", "onderzoeksvraag", m.question);
    for (const s of m.researchSubquestions ?? []) if (typeof s.question === "string") uit.push({ id: s.id || id, plek: "deelvraag", soort: "onderzoeksvraag", tekst: s.question });
  }
  return uit;
}

/** Beoordeel alle vragen en groepeer per bron. */
export function scan(bronnen) {
  return bronnen.map((bron) => {
    const vragen = bron.vragen.map((v) => ({ ...v, ...voorcontrole(v.tekst, v.soort) }));
    const telling = Object.fromEntries(UITKOMSTEN.map((u) => [u, vragen.filter((v) => v.uitkomst === u).length]));
    return { ...bron, vragen, telling };
  });
}

export function rapport(resultaat, { metTekst = false, database = "" } = {}) {
  const totaal = Object.fromEntries(UITKOMSTEN.map((u) => [u, resultaat.reduce((n, b) => n + b.telling[u], 0)]));
  const alle = Object.values(totaal).reduce((a, b) => a + b, 0);
  const r = [
    "# Vraagkwaliteit: voorcontrole",
    "",
    `Database: ${database || "onbekend"}. Vragen: ${alle}. Bronnen met vragen: ${resultaat.filter((b) => b.vragen.length).length}.`,
    "",
    "‘Door’ betekent: geen vormfout gevonden. De inhoudelijke beoordeling volgt met de skill omnibus-review-questions.",
    "",
    "| Uitkomst | Aantal |",
    "| --- | ---: |",
    ...UITKOMSTEN.map((u) => `| ${u} | ${totaal[u]} |`),
    "",
  ];
  for (const b of resultaat.filter((x) => x.vragen.length)) {
    r.push(`## ${b.titel} (${b.bron})`, "", UITKOMSTEN.map((u) => `${u}: ${b.telling[u]}`).join(" · "), "");
    const fout = b.vragen.filter((v) => v.uitkomst !== "door");
    if (!fout.length) { r.push("Geen vormfouten.", ""); continue; }
    r.push(metTekst ? "| ID | Plek | Uitkomst | Reden | Vraag |" : "| ID | Plek | Uitkomst | Reden |", metTekst ? "| --- | --- | --- | --- | --- |" : "| --- | --- | --- | --- |");
    for (const v of fout) {
      const reden = v.meldingen.map((m) => m.reden).join("; ");
      r.push(`| ${v.id} | ${v.plek} | ${v.uitkomst} | ${reden} |${metTekst ? ` ${v.tekst.replace(/\|/g, "\\|").replace(/\s+/g, " ")} |` : ""}`);
    }
    r.push("");
  }
  return r.join("\n");
}

async function main() {
  const { database, uit, metTekst } = leesOpties(process.argv.slice(2));
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(database, { readOnly: true });
  const pakketten = db.prepare("select p.version, p.source_id, p.kind, p.title, p.payload from packages p join release_packages r on r.version = p.version order by p.kind, p.source_id").all();
  const records = db.prepare("select kind, id, payload from records where version = ? and kind in ('norm','dimension') order by position");
  const bronnen = pakketten.map((p) => ({
    bron: p.source_id,
    titel: p.title,
    vragen: [
      ...(p.kind === "model" ? vragenUit("model", p.source_id, JSON.parse(p.payload)) : []),
      ...records.all(p.version).flatMap((r) => vragenUit(r.kind, r.id, JSON.parse(r.payload))),
    ],
  }));
  const tekst = rapport(scan(bronnen), { metTekst, database });
  if (uit) { writeFileSync(uit, tekst + "\n"); console.log(`Rapport geschreven naar ${uit}.`); } else console.log(tekst);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Vraagscan mislukt: ${fout.message}`); process.exitCode = 1; });
}
