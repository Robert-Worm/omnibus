import assert from "node:assert/strict";
import test from "node:test";
import { leesMetingen, leesplan, skillKosten, tokens, vergelijk, TESTSET } from "./skill-meting.mjs";

test("leesplan: 'volledig' en AGENTS.md zijn altijd, de rest alleen als het nodig is", () => {
  const md = "Lees `AGENTS.md`. Lees [methode](references/methode.md) volledig. Lees [gevallen](references/gevallen.md) bij twijfel.";
  assert.deepEqual(leesplan(md), { altijd: ["AGENTS.md", "references/methode.md"], soms: ["references/gevallen.md"] });
});

test("skillKosten telt SKILL.md plus de verplichte naslag", () => {
  const bestanden = { "s/SKILL.md": "Lees [a](references/a.md) volledig. Zie [b](references/b.md).", "s/references/a.md": "x".repeat(350), "s/references/b.md": "y".repeat(700) };
  // The in-memory fixture uses portable names; production uses native paths.
  const k = skillKosten("s", (p) => bestanden[p.replaceAll("\\", "/")]);
  assert.equal(k.altijd, tokens(bestanden["s/SKILL.md"]) + 100);
  assert.equal(k.soms, 200);
});

test("metingen: alleen echte regels onder ## Metingen, niet het voorbeeld in een codeblok", () => {
  const md = "## Metingen\n\n```text\n| 2026-01-01 | x | y | v | m | 1 | 2 | 3 |\n```\n\n| Datum | Skill |\n| --- | --- |\n| 2026-11-02 | omnibus-add-report | LVVN26 | abc | m | 6 | 95 | 1.240.000 | 7,8 |\n\n## Verder\n| 2026-12-01 | niet | dit |";
  assert.deepEqual(leesMetingen(md), [{ datum: "2026-11-02", skill: "omnibus-add-report", bron: "LVVN26", versie: "abc", model: "m", agents: 6, minuten: 95, tokens: 1240000, score: 7.8 }]);
});

test("metingen: onbekend is null, ook bij onvolledige regels, en nooit nul verbruik", () => {
  const metingen = leesMetingen("## Metingen\n| 2026-10-25 | omnibus-add-report | LVVN26 | abc | m | 0 | 2 | null | null |\n| 2026-10-25 | omnibus-add-report | LVVN26 | abc | m | – |\n");
  assert.equal(metingen[0].tokens, null);
  assert.equal(metingen[0].score, null);
  assert.equal(metingen[1].agents, null);
  assert.equal(metingen[1].minuten, null);
  assert.equal(metingen[1].score, null);
});

// Synthetische scores; alleen de vaste bron/skill-identiteiten komen uit het protocol.
const reeks = (versie = "oud") => TESTSET.map(({ skill, bron }) => ({ skill, bron, versie, model: "testmodel", score: 8, tokens: 100 }));

test("B-018: iedere vaste bron moet gelijk blijven of stijgen, onafhankelijk van de volgorde", () => {
  const oud = reeks(), nieuw = reeks("nieuw").reverse();
  nieuw[0].score = 8.2;
  nieuw[0].tokens = 50;
  assert.equal(vergelijk(oud, nieuw).toegestaan, true);
  nieuw.find((r) => r.bron === "LVVN26").score = 7.9;
  assert.match(vergelijk(oud, nieuw).reden, /daalt bij LVVN26/);
});

test("B-018: lege en ontbrekende testsets, subset, extra en dubbele bronnen worden geweigerd", () => {
  for (const ongeldig of [[], undefined, null, {}, reeks().slice(0, 1), reeks().slice(1),
    [...reeks(), reeks()[0]], [reeks()[0], reeks()[0], ...reeks().slice(2)],
    [...reeks(), { ...reeks()[0], bron: "ONBEKEND" }],
    reeks().map((r, i) => i === 3 ? { ...r, skill: "omnibus-add-report" } : r)]) {
    assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false);
    assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false);
  }
  assert.equal(vergelijk([], []).toegestaan, false);
  assert.equal(vergelijk(reeks().slice(0, 1), reeks("nieuw").slice(0, 1)).toegestaan, false);
});

test("B-018: ontbrekende, niet-numerieke en ongeldige scores worden aan beide kanten geweigerd", () => {
  for (const score of [null, undefined, NaN, Infinity, -Infinity, "8", "NaN", 0, 10.1]) {
    const ongeldig = reeks();
    ongeldig[0].score = score;
    assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false, String(score));
    assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false, String(score));
  }
});

test("B-018: versies en modelbasis mogen niet ontbreken of binnen een reeks wisselen", () => {
  for (const veld of ["versie", "model"]) {
    for (const waarde of [undefined, "", " ", 123, "andere-basis"]) {
      const ongeldig = reeks();
      ongeldig[0][veld] = waarde;
      assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false);
      assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false);
    }
  }
  assert.equal(vergelijk(reeks(), reeks("nieuw").map((r) => ({ ...r, model: "ander-model" }))).toegestaan, false);
});

test("B-018: onbekend tokenverbruik is toegestaan bij complete scores; ongeldige tellers niet", () => {
  const nieuw = reeks("nieuw");
  nieuw[0].tokens = null;
  assert.equal(vergelijk(reeks(), nieuw).toegestaan, true);
  for (const tokens of [NaN, Infinity, -1, "100"]) {
    nieuw[0].tokens = tokens;
    assert.equal(vergelijk(reeks(), nieuw).toegestaan, false);
    assert.equal(vergelijk(nieuw, reeks()).toegestaan, false);
  }
});

test("de testset bestaat uit openbare bronnen met een reden", () => {
  assert.deepEqual(TESTSET.map(({ skill, bron }) => [skill, bron]), [
    ["omnibus-add-report", "LVVN26"], ["omnibus-add-report", "PROO26"],
    ["omnibus-add-report", "IVHO25"], ["omnibus-add-framework", "TR-CYBER-20261016-cybersecurity-doc1"],
  ]);
  assert.ok(TESTSET.every((t) => t.waarom));
});
