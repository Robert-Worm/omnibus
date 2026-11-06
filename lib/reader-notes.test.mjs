import assert from "node:assert/strict";
import { test } from "node:test";
import { lezersnotities, pakketNotities, standaardzinnen } from "./reader-notes.mjs";

test("een zin die bij vijf toetspunten terugkomt, is een standaardzin", () => {
  const standaard = standaardzinnen([...Array(5).fill("Geen extra zelfstandige plicht."), "Lid 2 geldt alleen bij uitbesteding."]);
  assert.deepEqual([...standaard], ["Geen extra zelfstandige plicht."]);
  assert.deepEqual(lezersnotities(["Geen extra zelfstandige plicht.", "Lid 2 geldt alleen bij uitbesteding.", ""], standaard), ["Lid 2 geldt alleen bij uitbesteding."]);
});

test("de notities van een pakket komen uit bronkoppelingen en bepalingen", () => {
  const notities = pakketNotities([{ source_links: [{ explanation: "a" }, { explanation: "b" }] }], [{ interpretation_notes: ["c"] }, {}]);
  assert.deepEqual(notities, ["a", "b", "c"]);
});
