import assert from "node:assert/strict";
import test from "node:test";
import { controleer, isHold, maakBron, ordenBronnen, passagesUit, rapport } from "./check-passages.mjs";

// Fictieve bron met een emoji: posities tellen in codepoints, niet in UTF-16.
const hoofd = maakBron([{ number: 1, text: "Kop 😀\nDe minister stelt regels." }, { number: 2, text: "Tweede pagina met tekst." }]);
const gids = maakBron([{ number: 1, text: "Inhoud" }, { number: 2, text: "Handleiding: lees dit eerst." }]);
const pos = (tekst, deel) => Array.from(tekst.slice(0, tekst.indexOf(deel))).length;

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

test("pakketvolgorde gaat voor alfabetische documentnamen bij doorlopende pagina's", () => {
  const kandidaten = [{ id: "a-gids", inhoud: gids }, { id: "z-hoofd", inhoud: hoofd }];
  const volgorde = [{ id: "z-hoofd" }, { id: "a-gids" }];
  const passage = { quote: "lees dit", start: 13, end: 21, page: 4 };
  assert.equal(controleer(passage, kandidaten.map((d) => d.inhoud)).uitkomst, "andere-pagina");
  const bronnen = ordenBronnen(kandidaten, volgorde).map((d) => d.inhoud);
  assert.equal(controleer(passage, bronnen).uitkomst, "doorgeteld");
  assert.equal(controleer({ ...passage, start: 12 }, bronnen).uitkomst, "verschoven");
  assert.equal(controleer({ ...passage, quote: "Verzonnen bron" }, bronnen).uitkomst, "ontbreekt");
  assert.deepEqual(kandidaten.map((d) => d.id), ["a-gids", "z-hoofd"]);
});

test("pakketidentiteit wordt behouden en ontbrekende of dubbele documenten blokkeren de controle", () => {
  const document = { id: "public-reader", packageDocumentId: "pakket-bron" };
  assert.deepEqual(ordenBronnen([document], [{ id: "pakket-bron" }]), [document]);
  for (const [kandidaten, volgorde] of [
    [[], [{ id: "ontbreekt" }]],
    [[document, document], [{ id: "pakket-bron" }]],
    [[document], [{ id: "pakket-bron" }, { id: "pakket-bron" }]],
  ]) assert.throws(() => ordenBronnen(kandidaten, volgorde), /onvolledig of niet eenduidig/);
});

test("bestaande bronnen zonder pakketvolgorde behouden de hoofdbron eerst", () => {
  const documenten = [{ id: "b" }, { id: "z", rol: "main" }, { id: "a" }];
  assert.deepEqual(ordenBronnen(documenten).map((d) => d.id), ["z", "a", "b"]);
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
