import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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
  const md = "## Metingen\n\n```text\n| 2026-01-01 | x | y | v | m | 1 | 2 | 3 |\n```\n\n| Datum | Skill |\n| --- | --- |\n| 2026-11-02 | omnibus-add-report | LVVN26 | abc | m | 95 | 1.240.000 | 7,8 |\n\n## Verder\n| 2026-12-01 | niet | dit |";
  assert.deepEqual(leesMetingen(md), [{ datum: "2026-11-02", skill: "omnibus-add-report", bron: "LVVN26", versie: "abc", model: "m", minuten: 95, tokens: 1240000, score: 7.8 }]);
  assert.deepEqual(leesMetingen(readFileSync(new URL("../docs/beheer/skill-meting.md", import.meta.url), "utf8")), []);
});

test("B-018: een optimalisatie gaat alleen door als de kwaliteit op de hele testset gelijk blijft of stijgt", () => {
  const run = (bron, score, t = 100) => ({ skill: "omnibus-add-report", bron, score, tokens: t });
  assert.equal(vergelijk([run("A", 7), run("B", 8)], [run("A", 7, 50), run("B", 8.2, 60)]).toegestaan, true);
  assert.match(vergelijk([run("A", 7), run("B", 8)], [run("A", 7.5), run("B", 7.9)]).reden, /daalt bij B/);
  assert.equal(vergelijk([run("A", 7)], [run("A", 7), run("B", 8)]).toegestaan, false);
});

test("de testset bestaat uit openbare bronnen met een reden", () => {
  assert.ok(TESTSET.length >= 3 && TESTSET.every((t) => t.skill && t.bron && t.waarom));
});
