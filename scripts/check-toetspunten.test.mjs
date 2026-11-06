import assert from "node:assert/strict";
import { test } from "node:test";
import { aaneen, beoordeel, engels, ontbrekendeNuance, vaag, verwijzingen, werktaal, samenvatting } from "./check-toetspunten.mjs";

test("nuance die alleen in bron en toets staat, valt op; een ander toetspunt bij de norm telt mee", () => {
  const punt = { title: "Contractrisico's", body: "Het orgaan evalueert de risico's op de brongebonden basis.",
    sourceText: "artikel 28, 2\ndora.pdf · PDF-pagina 40\nHet orgaan evalueert regelmatig de risico's op basis van algeheel risicoprofiel, schaal en complexiteit.",
    testDesign: "Vergelijk met algeheel risicoprofiel, schaal en complexiteit.", testExistence: "", testOperation: "" };
  assert.deepEqual(ontbrekendeNuance(punt), ["algehee", "complex", "risicop", "schaal"]);
  assert.deepEqual(ontbrekendeNuance(punt, [{ title: "", body: "Rekening met algeheel risicoprofiel, schaal en complexiteit." }]), []);
});

test("vage plaatshouders, verwijzingen en aaneengeschreven nummers", () => {
  assert.deepEqual(vaag("De tester verstrekt een waarborg met de vereiste inhoud en de vier gegevenskwaliteiten; de zes maanden gelden."), ["met de vereiste inhoud", "de vier gegevenskwaliteiten"]);
  assert.deepEqual(verwijzingen("Getest overeenkomstig artikel8(2)b(v–vii) en bedoeld in 6(8)."), ["artikel8(2)b(v–vii)", "6(8)"]);
  assert.deepEqual(aaneen("Zie artikel8(2), titelIII, uiterlijk24 uur en artikel 9."), ["artikel8(2)", "titelIII", "uiterlijk24"]);
  assert.deepEqual(aaneen("Een vluchtroute in 2026 en Bijlage II."), []);
});

test("werktaal en Engels", () => {
  const w = werktaal("Geen nieuw document vereist door dit voorstel; de kalenderroute en HOLD; zie P02. Een vluchtroute is gewoon.");
  assert.deepEqual(w.map((x) => x.woord), ["dit voorstel", "HOLD", "P02", "kalenderroute"]);
  assert.deepEqual(engels("The entity shall report."), ["the", "shall"]);
  assert.deepEqual(engels("Beoordeel of de entiteit meldt."), []);
});

test("beoordeel telt per soort en per bron, alleen selecteerbare toetspunten", () => {
  const item = (id, body, status = "SELECTABLE") => ({ key: `DORA-X|${id}`, sourceId: "DORA-X", kind: "framework", selectionStatus: status,
    material: { title: id, body, parentCriterion: "Norm", testDesign: "", testExistence: "", testOperation: "" } });
  const uit = beoordeel([item("P1", "Getest overeenkomstig artikel8(2)."), item("P2", "Dit voorstel.", "HOLD")], { bron: /^DORA/ });
  const s = samenvatting(uit);
  assert.equal(s.toetspunten, 1);
  assert.equal(s.perSoort.verwijzing, 1);
  assert.equal(s.perSoort.aaneen, 1);
  assert.equal(s.perSoort.werktaal, 0);
});

test("aaneen en werktaal vangen ook wat de export toont (#303)", () => {
  assert.deepEqual(aaneen("met eigen uitzondering26(1) en hoofdstuk V-I-evenredigheid4(2); verwijzing naar kader6"), ["uitzondering26(1)", "evenredigheid4(2)", "kader6"]);
  assert.deepEqual(aaneen("RTS1774-N104-P01 en sha256 blijven"), ["sha256"]);
  assert.ok(werktaal("Aanvullend ANALYST_PROPOSAL bij de bevroren bronbasis").some((w) => w.woord === "ANALYST_PROPOSAL"));
  assert.ok(werktaal("Financiële entiteit (NORM_ADDRESSEE)").some((w) => w.soort === "interne code"));
  assert.ok(werktaal("Geen uitbreiding van EX16(5–15)").some((w) => w.soort === "interne afkorting"));
});
