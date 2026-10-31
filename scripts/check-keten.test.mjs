import test from "node:test";
import assert from "node:assert/strict";
import { aannametaal, algemeneVerwijzingen, beoordeel, meetelt, rapport, totalen } from "./check-keten.mjs";

const item = (material, extra = {}) => ({ key: "BRON|P1", kind: "report", material, ...extra });
const volledig = { sourceText: "De CISO stelt het beleid vast.", body: "De CISO stelt jaarlijks het beleid vast.", rationale: "Sturing op informatiebeveiliging.", risk: "Zonder beleid ontbreekt sturing.",
  controlObjective: "Er is vastgesteld beleid.", control: "Beleid vaststellen.", testExistence: "Bekijk het besluit.", documents: "Vastgesteld beleid." };

test("aannametaal: gissingen wel, onderwerp en grenzen niet", () => {
  assert.deepEqual(aannametaal("Het beleid is waarschijnlijk vastgesteld en zou kunnen werken."), ["waarschijnlijk", "zou kunnen"]);
  assert.deepEqual(aannametaal("Volg een melding van een vermoeden van fraude."), []);
  assert.deepEqual(aannametaal("Een toelating wordt niet verondersteld."), []);
  assert.deepEqual(aannametaal("Naar verwachting ligt dit vast."), ["naar verwachting"]);
  assert.deepEqual(aannametaal("Dit gebeurt meestal, typisch per kwartaal."), ["meestal", "typisch"]);
  assert.deepEqual(aannametaal("onwaarschijnlijkheid is geen los woord"), []);
});

test("een complete bouwsteen geeft geen melding", () => {
  assert.deepEqual(beoordeel(item(volledig)), { key: "BRON|P1", ontbreekt: [], aannametaal: [], verwijzingen: [] });
});

test("elk ontbrekend deel van de keten wordt genoemd; bewijs mag ook in de toets staan", () => {
  assert.deepEqual(beoordeel(item({ ...volledig, sourceText: "", control: " " })).ontbreekt, ["bronpassage", "beheersmaatregel"]);
  assert.deepEqual(beoordeel(item({ ...volledig, documents: "", testExistence: "Bewijs: notulen." })).ontbreekt, []);
  assert.deepEqual(beoordeel(item({ ...volledig, documents: "", testExistence: "Bekijk het." })).ontbreekt, ["bewijsaanwijzing"]);
  assert.deepEqual(beoordeel(item({ ...volledig, body: "", auditNorm: "De norm." })).ontbreekt, []);
});

test("een extern kader zonder deel of reden is een melding; met artikel, of als de bron het noemt, niet", () => {
  assert.deepEqual(algemeneVerwijzingen("Toets conform ISO 27001."), ["ISO 27001"]);
  assert.deepEqual(algemeneVerwijzingen("Toets aan ISO 27001, clausule 5.1."), []);
  assert.deepEqual(algemeneVerwijzingen("Zie artikel 32 AVG."), []);
  assert.deepEqual(algemeneVerwijzingen("Zie de AVG.", "Verwerking volgens de AVG."), []);
  assert.deepEqual(beoordeel(item({ ...volledig, procedure: "Volg NIST." })).verwijzingen, [{ veld: "procedure", kader: "NIST" }]);
});

test("letterlijke brontekst wordt niet op aannametaal beoordeeld, eigen toetstekst wel", () => {
  const bron = beoordeel(item({ ...volledig, wordingMode: "source", body: "Dit is waarschijnlijk nodig.", procedure: "Wellicht volstaat een steekproef." }));
  assert.deepEqual(bron.aannametaal, [{ veld: "procedure", woord: "wellicht" }]);
});

test("alleen selecteerbare bouwstenen uit rapporten, wetten en kaders tellen", () => {
  assert.equal(meetelt({ kind: "report" }), true);
  assert.equal(meetelt({ kind: "law", selectionStatus: "HOLD" }), false);
  assert.equal(meetelt({ kind: "model", selectionStatus: "SELECTABLE" }), false);
});

test("het rapport noemt totalen en alleen sleutels, geen brontekst", () => {
  const uitkomsten = [beoordeel(item(volledig)), beoordeel(item({ ...volledig, body: "Geheime brontekst", risk: "" }, { key: "B|P2" }))];
  assert.deepEqual(totalen(uitkomsten), { bouwstenen: 2, compleet: 1, zonderPassage: 0, metGat: 1, aannametaal: 0, verwijzingen: 0 });
  const r = rapport(uitkomsten, { catalogus: "x" });
  assert.match(r, /Bouwstenen: 2\. Met complete keten: 1\. Zonder bronpassage: 0\. Met gat in de keten: 1\. Met aannametaal: 0\. Met algemene externe verwijzing: 0\./);
  assert.match(r, /\| B\\\|P2 \| \*\*risico\*\* \| – \| – \|/);
  assert.doesNotMatch(r, /Geheime brontekst/);
  assert.match(rapport([beoordeel(item({ ...volledig, risk: "" }, { key: "A\\|B" }))]), /\| A\\\\\\\|B \|/);
});
