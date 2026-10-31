import test from "node:test";
import assert from "node:assert/strict";
import { badge, leesKeten, leesPassages, leesVragen, pagina, regel } from "./kwaliteitsmeting.mjs";

const passagesRapport = "# Bronpassages: controle\n\nDatabase: x. Passages: 6462. HOLD: 0.\n";
const vragenRapport = "# Vraagkwaliteit\n\nDatabase: x. Vragen: 1650. Bronnen met vragen: 42.\n\n| Uitkomst | Aantal |\n| --- | ---: |\n| schrappen | 0 |\n| herschrijven | 1 |\n| HOLD | 152 |\n| door | 1497 |\n";
const meting = { datum: "2026-10-31", release: "ffaf0f56" + "0".repeat(56),
  passages: leesPassages(passagesRapport), vragen: leesVragen(vragenRapport) };

test("de totalen komen uit de bestaande rapporten", () => {
  assert.deepEqual(meting.passages, { totaal: 6462, afwijkend: 0 });
  assert.deepEqual(meting.vragen, { totaal: 1650, door: 1497, HOLD: 152, herschrijven: 1, schrappen: 0 });
  assert.throws(() => leesPassages("iets anders"), /niet herkend/);
  assert.throws(() => leesVragen("Vragen: 3.\n| door | 3 |"), /mist een uitkomst/);
});

test("een regel toont aantallen en percentages, naar beneden afgerond", () => {
  assert.equal(regel(meting), "| 2026-10-31 | `ffaf0f56` | 6.462 van 6.462 (100%) | 1.497 van 1.650 (90,7%) | 152 | 1 | – | – | – |");
  const keten = leesKeten("Catalogus: x. Bouwstenen: 1017. Met complete keten: 1014. Zonder bronpassage: 1. Met gat in de keten: 3. Met aannametaal: 1. Met algemene externe verwijzing: 2.");
  assert.deepEqual(keten, { totaal: 1017, compleet: 1014, zonderPassage: 1, metGat: 3, aannametaal: 1, verwijzingen: 2 });
  assert.match(regel({ ...meting, keten }), /\| 1\.014 van 1\.017 \| 1 \| 2 \|$/);
  assert.throws(() => leesKeten("iets"), /niet herkend/);
});

test("de pagina houdt andere releases bij en vervangt dezelfde release", () => {
  const eerst = pagina({ ...meting, release: "aaaaaaaa" + "0".repeat(56), datum: "2026-10-19" });
  const daarna = pagina(meting, eerst);
  assert.match(daarna, /`ffaf0f56`/);
  assert.match(daarna, /`aaaaaaaa`/);
  assert.equal(pagina(meting, daarna).match(/`ffaf0f56`/g).length, 1);
  assert.match(daarna, /<!-- paginatype: data -->/);
  assert.match(daarna, /Automatisch bijgewerkt/);
});

test("de badge komt na de databasebadge en wordt later vervangen, niet verdubbeld", () => {
  const readme = "<p>\n  <!--badge:database-->\n  <a>db</a>\n  <!--/badge-->\n  <a>skills</a>\n</p>";
  const een = badge(readme, meting.passages);
  assert.match(een, /<!--badge:database-->[\s\S]*<!--\/badge-->\n  <!--badge:kwaliteit-->/);
  assert.match(een, /bronpassages-100%25%20letterlijk/);
  const twee = badge(een, { totaal: 10, afwijkend: 1 });
  assert.equal(twee.match(/badge:kwaliteit/g).length, 1);
  assert.match(twee, /bronpassages-90%25%20letterlijk/);
});
