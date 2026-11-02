// Eén regel voor Windows-namen die geen bestand mogen zijn (#296). fetch-release-database.mjs
// draait los en houdt een kopie; deze test houdt die gelijk. De skill-kopie in stage-receipts.mjs
// blijft ongewijzigd: een wijziging vraagt een nieuwe goedkeuring van de rapportkit, en elk pakket
// gaat daarna toch door content-tools/intake.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reserved } from "../content-tools/intake.mjs";

const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("de padregel is overal gelijk", () => {
  const bron = reserved.source;
  for (const p of ["scripts/fetch-release-database.mjs"])
    assert.ok(lees(p).includes(bron), p);
  for (const p of ["content-tools/evidence-paths.mjs", "content-tools/analysis-only.mjs"])
    assert.match(lees(p), /reserved\.test\(part\)/, p);
});

test("de padregel weigert ook de minder bekende namen", () => {
  for (const naam of ["CON", "nul.txt", "conin$", "CONOUT$.log", "com0", "COM¹.txt", "lpt9"]) assert.ok(reserved.test(naam), naam);
  for (const naam of ["console.txt", "company", "null", "lptx"]) assert.ok(!reserved.test(naam), naam);
});
