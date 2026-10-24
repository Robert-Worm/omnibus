import assert from "node:assert/strict";
import test from "node:test";
import { controleer, isHold, maakBron, passagesUit, rapport } from "./check-passages.mjs";

// Fictieve bron met een emoji: posities tellen in codepoints, niet in UTF-16.
const hoofd = maakBron([{ number: 1, text: "Kop 😀\nDe minister stelt regels." }, { number: 2, text: "Tweede pagina met tekst." }]);
const gids = maakBron([{ number: 1, text: "Inhoud" }, { number: 2, text: "Handleiding: lees dit eerst." }]);
const pos = (tekst, deel) => { const i = [...tekst].join("").indexOf(deel); return [...tekst.slice(0, i)].length; };

test("exact op de opgeslagen plek, documentbreed of per pagina", () => {
  const s = pos(hoofd.tekst, "De minister");
  assert.equal(controleer({ quote: "De minister", start: s, end: s + 11, page: 1 }, [hoofd]).uitkomst, "exact");
  assert.equal(controleer({ quote: "met tekst", start: 14, end: 23, page: 2 }, [hoofd]).uitkomst, "exact");
});

test("doorlopende paginanummering over hoofdtekst en handleiding is geen HOLD", () => {
  const r = controleer({ quote: "lees dit", start: 13, end: 21, page: 4 }, [hoofd, gids]);
  assert.equal(r.uitkomst, "doorgeteld");
  assert.equal(isHold(r.uitkomst), false);
});

test("afwijkingen worden HOLD en de markering wordt nooit verschoven", () => {
  assert.equal(controleer({ quote: "met tekst", start: 14, end: 23, page: 1 }, [hoofd]).uitkomst, "andere-pagina");
  assert.equal(controleer({ quote: "De minister", start: 0, end: 11, page: 1 }, [hoofd]).uitkomst, "verschoven");
  assert.equal(controleer({ quote: "De staatssecretaris", start: 0, end: 19, page: 1 }, [hoofd]).uitkomst, "ontbreekt");
  assert.equal(controleer({ quote: "x", start: 0, end: 1, page: 1 }, []).uitkomst, "geen-bron");
  for (const u of ["andere-pagina", "verschoven", "ontbreekt", "geen-bron"]) assert.ok(isHold(u));
});

test("tekst die alleen in XML staat, telt apart en is geen HOLD", () => {
  assert.equal(controleer({ quote: "Alleen in XML", start: 0, end: 13, page: 1 }, [hoofd], { alleenXml: true }).uitkomst, "alleen-xml");
});

test("passages uit rapporten en uit wetten en kaders", () => {
  assert.deepEqual(passagesUit({ data: { quote: "a", start: 1, end: 2, page: 3, report_id: "R" } }), [{ quote: "a", start: 1, end: 2, page: 3, document: "R" }]);
  assert.equal(passagesUit({ data: { evidence_kind: "XML_ONLY", source_spans: [{ quote: "b", start: 0, end: 1, page: 1 }] } })[0].alleenXml, true);
});

test("het rapport bevat geen brontekst", () => {
  const tekst = rapport([{ bron: "TEST", passages: [{ record: "T-E1", page: 1, uitkomst: "ontbreekt" }] }]);
  assert.match(tekst, /\| T-E1 \| 1 \| HOLD: staat niet letterlijk in de bron \|/);
  assert.doesNotMatch(tekst, /minister/);
});
