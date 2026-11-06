import assert from "node:assert/strict";
import { test } from "node:test";
import { lezersbroncontext, lezersnotities, pakketNotities, standaardzinnen, zonderVoorstel } from "./reader-notes.mjs";

test("een zin die bij vijf toetspunten terugkomt, is een standaardzin", () => {
  const standaard = standaardzinnen([...Array(5).fill("Geen extra zelfstandige plicht."), "Lid 2 geldt alleen bij uitbesteding."]);
  assert.deepEqual([...standaard], ["Geen extra zelfstandige plicht."]);
  assert.deepEqual(lezersnotities(["Geen extra zelfstandige plicht.", "Lid 2 geldt alleen bij uitbesteding.", ""], standaard), ["Lid 2 geldt alleen bij uitbesteding."]);
});

test("de notities van een pakket komen uit bronkoppelingen en bepalingen", () => {
  const notities = pakketNotities([{ source_links: [{ explanation: "a" }, { explanation: "b" }] }], [{ interpretation_notes: ["c"] }, {}]);
  assert.deepEqual(notities, ["a", "b", "c"]);
});

test('lezersbroncontext: geen herleiding of rolcode, wel de grens per fase (#306)', () => {
  const opgeslagen = [
    'Fictieve scope',
    'Financiële entiteit (NORM_ADDRESSEE) — alleen bij uitbesteding',
    'PRIMARY · REC-1\nFictieve bepaling\nAfzonderlijk toetsbaar onderdeel.',
    'werking · Beperk conclusie tot periode en onderbouwde selectie.',
  ].join('\n\n');
  const uit = lezersbroncontext(opgeslagen);
  assert.ok(!uit.includes('NORM_ADDRESSEE'));
  assert.ok(!uit.includes('PRIMARY'));
  assert.ok(!uit.includes('Afzonderlijk toetsbaar'));
  assert.ok(uit.includes('Financiële entiteit — alleen bij uitbesteding'));
  assert.ok(uit.includes('Grens bij werking: Beperk conclusie tot periode en onderbouwde selectie.'));
  assert.equal(zonderVoorstel('Voorstel: Het proces is vastgesteld.'), 'Het proces is vastgesteld.');
});
