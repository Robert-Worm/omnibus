import test from "node:test";
import assert from "node:assert/strict";
import { aannametaal, algemeneVerwijzingen, artikelenPerBron, beoordeel, meetelt, ongedekteBeweringen, rapport, totalen } from "./check-keten.mjs";

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
  assert.deepEqual(beoordeel(item(volledig)), { key: "BRON|P1", ontbreekt: [], aannametaal: [], verwijzingen: [], beweringen: [] });
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
  // Een grens noemt de reden: dat de toets geen naleving van het andere kader aantoont.
  assert.deepEqual(algemeneVerwijzingen("Rol is facultatief. Geen rechtstreeks bewijs van AVG-naleving; externe eisen apart vaststellen."), []);
  assert.deepEqual(algemeneVerwijzingen("Geen volledige ISO 50001-beoordeling geclaimd."), []);
  assert.deepEqual(algemeneVerwijzingen("Niet getoetst. Toets daarna conform ISO 27001."), ["ISO 27001"]);
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
  assert.deepEqual(totalen(uitkomsten), { bouwstenen: 2, compleet: 1, zonderPassage: 0, metGat: 1, aannametaal: 0, verwijzingen: 0, beweringen: 0 });
  const r = rapport(uitkomsten, { catalogus: "x" });
  assert.match(r, /Bouwstenen: 2\. Met complete keten: 1\. Zonder bronpassage: 0\. Met gat in de keten: 1\. Met aannametaal: 0\. Met algemene externe verwijzing: 0\./);
  assert.match(r, /\| B\\\|P2 \| \*\*risico\*\* \| – \| – \|/);
  assert.doesNotMatch(r, /Geheime brontekst/);
  assert.match(rapport([beoordeel(item({ ...volledig, risk: "" }, { key: "A\\|B" }))]), /\| A\\\\\\\|B \|/);
});

test("een getal of artikel uit eigen tekst moet in de bron staan (#280)", () => {
  const bron = "Meld een incident binnen 72 uur. Zie artikel 9 en artikel 13. Het budget is € 1,5 miljoen.";
  assert.deepEqual(ongedekteBeweringen("Controleer of de melding binnen 72 uur is gedaan, volgens artikel 9.", bron), []);
  assert.deepEqual(ongedekteBeweringen("Controleer of de melding binnen 30 dagen is gedaan.", bron), ["30 dagen"]);
  assert.deepEqual(ongedekteBeweringen("Toets artikel 4c en artikel 13.", bron), ["artikel 4c"]);
  assert.deepEqual(ongedekteBeweringen("Toets 95% van de dossiers.", bron), ["95%"]);
  // Een grens noemt een getal juist om het uit te sluiten.
  assert.deepEqual(ongedekteBeweringen("Bewijs: de afgesproken termijn. Beperking: gebruik geen benchmark van 30 dagen.", bron), []);
  // Een artikel dat elders in dezelfde bron staat, is gedekt.
  assert.deepEqual(ongedekteBeweringen("Buiten artikel 15a.", bron, new Set(["15a"])), []);
  assert.deepEqual(ongedekteBeweringen("", bron), []);
});

test("artikelen per bron komen uit vindplaatsen en passages", () => {
  const per = artikelenPerBron([
    { key: "WET|P1", material: { location: "/Hoofdstuk4/Artikel6/Lid3", sourceText: "bedoeld in artikel 9" } },
    { key: "WET|P2", material: { location: "def18; 15a.1; 15a.2" } },
    { key: "ANDER|P1", material: { location: "Artikel 2, lid 1" } },
  ]);
  assert.deepEqual([...per.get("WET")].sort(), ["15a", "6", "9"]);
  assert.deepEqual([...per.get("ANDER")], ["2"]);
});

test("beoordeel meldt een ongedekt getal in eigen tekst, niet in letterlijke brontekst", () => {
  const u = beoordeel(item({ ...volledig, testExistence: "Bekijk het besluit van de laatste 3 jaar." }));
  assert.deepEqual(u.beweringen, [{ veld: "testExistence", bewering: "3 jaar" }]);
  assert.equal(totalen([u]).beweringen, 1);
  assert.match(rapport([u]), /\| 3 jaar \(testExistence\) \|/);
  assert.deepEqual(beoordeel(item({ ...volledig, wordingMode: "source", body: "Binnen 5 dagen." })).beweringen, []);
});
