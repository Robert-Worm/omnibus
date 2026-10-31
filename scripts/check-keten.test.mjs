import test from "node:test";
import assert from "node:assert/strict";
import { aannametaal, beoordeel, meetelt, rapport, totalen } from "./check-keten.mjs";

const item = (material, extra = {}) => ({ key: "BRON|P1", kind: "report", material, ...extra });
const volledig = { body: "De CISO stelt jaarlijks het beleid vast.", risk: "Zonder beleid ontbreekt sturing.", documents: "Vastgesteld beleid." };

test("aannametaal: gissingen wel, onderwerp en grenzen niet", () => {
  assert.deepEqual(aannametaal("Het beleid is waarschijnlijk vastgesteld en zou kunnen werken."), ["waarschijnlijk", "zou kunnen"]);
  assert.deepEqual(aannametaal("Volg een melding van een vermoeden van fraude."), []);
  assert.deepEqual(aannametaal("Een toelating wordt niet verondersteld."), []);
  assert.deepEqual(aannametaal("Naar verwachting ligt dit vast."), ["naar verwachting"]);
  assert.deepEqual(aannametaal("onwaarschijnlijkheid is geen los woord"), []);
});

test("een complete bouwsteen geeft geen melding", () => {
  assert.deepEqual(beoordeel(item(volledig)), { key: "BRON|P1", risico: true, bewijs: true, aannametaal: [] });
});

test("bewijsaanwijzing mag ook in de toets staan; zonder risico of bewijs is het een melding", () => {
  assert.equal(beoordeel(item({ ...volledig, documents: "", testExistence: "Bewijs: notulen." })).bewijs, true);
  const leeg = beoordeel(item({ body: "x", risk: " ", procedure: "Bekijk het beleid." }));
  assert.equal(leeg.risico, false);
  assert.equal(leeg.bewijs, false);
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
  const uitkomsten = [beoordeel(item(volledig)), beoordeel(item({ body: "Geheime brontekst", risk: "" }, { key: "B|P2" }))];
  assert.deepEqual(totalen(uitkomsten), { bouwstenen: 2, compleet: 1, zonderRisico: 1, zonderBewijs: 1, aannametaal: 0 });
  const r = rapport(uitkomsten, { catalogus: "x" });
  assert.match(r, /Bouwstenen: 2\. Met risico en bewijsaanwijzing: 1\. Zonder risico: 1\. Zonder bewijsaanwijzing: 1\. Met aannametaal: 0\./);
  assert.match(r, /\| B\\\|P2 \| \*\*nee\*\* \| \*\*nee\*\* \| – \|/);
  assert.doesNotMatch(r, /Geheime brontekst/);
});
