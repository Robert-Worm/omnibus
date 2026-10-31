import test from "node:test";
import assert from "node:assert/strict";
import { DOELSTELLINGEN, BESTANDEN } from "./criteria.mjs";
import { beoordeel, bundel, controleerBewijs, leesAntwoord, normaliseer, prompt, rapport } from "./agent-auditor.mjs";

test("de criteria hebben unieke codes en elke meting bestaat als npm-opdracht", async () => {
  const codes = DOELSTELLINGEN.flatMap((d) => d.criteria.map((c) => c.code));
  assert.equal(new Set(codes).size, codes.length);
  const { readFileSync } = await import("node:fs");
  const scripts = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url))).scripts;
  for (const c of DOELSTELLINGEN.flatMap((d) => d.criteria)) if (c.meting) assert.ok(scripts[c.meting], c.meting);
});

test("alle bestanden van de bundel bestaan", () => {
  assert.deepEqual(bundel(BESTANDEN).ontbreekt, []);
});

test("een citaat uit meerdere commentaarregels telt als letterlijk", () => {
  const inhoud = { "a.mjs": "// Controleert of elke passage\n// letterlijk in de bron staat.\nconst x = 1;" };
  const [goed, fout, weg] = controleerBewijs([
    { bestand: "a.mjs", citaat: "Controleert of elke passage letterlijk in de bron staat." },
    { bestand: "a.mjs", citaat: "Controleert elke passage." },
    { bestand: "b.mjs", citaat: "x" },
  ], inhoud);
  assert.equal(goed.gevonden, true);
  assert.equal(fout.gevonden, false);
  assert.equal(weg.notitie, "bestand niet in de bundel");
  assert.equal(normaliseer("- Lever “de keten”"), 'lever "de keten"');
});

test("het antwoord wordt ook gelezen met een codeblok of een losse backslash", () => {
  assert.deepEqual(leesAntwoord('```json\n{"oordelen":[]}\n```'), { oordelen: [] });
  assert.equal(leesAntwoord('{"a":"pad \\d+ en \\|"}').a, "pad \\d+ en \\|");
});

test("de beoordeling volgt de criteria, vult ontbrekende oordelen als onbekend en probeert één keer opnieuw", () => {
  const d = DOELSTELLINGEN[1];
  const b = { xml: "<file/>", inhoud: { "scripts/check-passages.mjs": "Een afwijking wordt HOLD." } };
  let n = 0;
  const vraag = () => (++n === 1 ? { tekst: "geen json", model: "m" } : { tekst: JSON.stringify({ oordelen: [
    { code: "OC-2.2", oordeel: "voldoet", onderbouwing: "Draait.", bewijs: [{ bestand: "scripts/check-passages.mjs", citaat: "Een afwijking wordt HOLD." }] },
    { code: "OC-2.1", oordeel: "raar", onderbouwing: "x", bewijs: [] }] }), model: "m" });
  const uit = beoordeel(d, b, { vraag });
  assert.equal(n, 2);
  assert.deepEqual(uit.map((u) => u.oordeel), ["onbekend", "voldoet", "onbekend", "onbekend"]);
  assert.equal(uit[1].bewijs[0].gevonden, true);
  assert.match(rapport(uit, { commit: "abc" }), /☑ voldoet 1 · ◐ deels 0 · ☐ voldoet niet 0 · – n\.v\.t\. 0 · \? onbekend 3/);
});

test("de vraag noemt elk criterium en de meting, en geeft de repository als gegevens", () => {
  const p = prompt(DOELSTELLINGEN[2], "<file path=\"x\">y</file>");
  for (const c of DOELSTELLINGEN[2].criteria) assert.ok(p.includes(c.code));
  assert.match(p, /check:keten/);
  assert.match(p, /<repo>\n<file path="x">y<\/file>\n<\/repo>/);
});
