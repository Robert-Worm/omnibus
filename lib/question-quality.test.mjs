import assert from "node:assert/strict";
import test from "node:test";
import { voorcontrole, questionCandidate, SOORTEN } from "./question-quality.mjs";

import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';

// Goede vragen uit Omnibus zelf: geen vormfout.
const GOEDE_VRAGEN = [
  ["interview", "Kunt u beschrijven hoe u een ruimte of middel gebruikte dat afnemers konden zien tijdens de dienstverlening bij {{onderwerp}}?"],
  ["interview", "Hoe houdt u zicht op de uitvoerbaarheidstoetsen waarvoor u verantwoordelijk bent?"],
  ["toetsvraag", "Hoe vertaalt OCW haar reductieambitie en externe afhankelijkheden naar keuzes over eigen maatregelen?"],
  ["onderzoeksvraag", "Hoe wordt de dienstverlening bij {{onderwerp}} uitgevoerd en bijgestuurd op basis van beschikbare afnemersinformatie?"],
  ["doorvraag", "Welke afspraken speelden mee? Wat deed de leiding zelf? Wat heeft u zelf gezien of gehoord van de reactie van anderen?"],
];

await test("de vaste set slechte vragen wordt altijd afgekeurd, om de juiste reden", () => {
  for (const [soort, tekst, regels] of SLECHTE_VRAGEN) {
    const { uitkomst, meldingen } = voorcontrole(tekst, soort);
    assert.notEqual(uitkomst, "door", tekst);
    assert.equal(questionCandidate(tekst, soort), '', tekst);
    for (const regel of regels) assert.ok(meldingen.some((m) => m.regel === regel), `${regel} ontbreekt voor: ${tekst}`);
  }
});

await test('de presentatiepoort laat HOLD en herschrijven niet door en verandert tekst niet', () => {
  for (const [soort, tekst] of GOEDE_VRAGEN) assert.equal(questionCandidate(tekst, soort), tekst);
  for (const tekst of ['De rol van de functionaris', 'Welke stappen zet u, bijvoorbeeld bij een melding?', '  ', 'n.v.t.', '...'])
    assert.equal(questionCandidate(tekst, 'interview'), '');
  for (const tekst of [null, undefined, {}, 12, ['Hoe?']]) assert.equal(questionCandidate(tekst, 'interview'), '');
  const tekst = '  Hoe verloopt de overdracht?\n';
  assert.equal(questionCandidate(tekst, 'interview'), tekst);
});

await test("goede vragen uit Omnibus komen door de voorcontrole", () => {
  for (const [soort, tekst] of GOEDE_VRAGEN) assert.deepEqual(voorcontrole(tekst, soort), { uitkomst: "door", meldingen: [] }, tekst);
});

await test("de zwaarste melding bepaalt de uitkomst", () => {
  assert.equal(voorcontrole("Vraag nog uit te werken", "interview").uitkomst, "schrappen");
  assert.equal(voorcontrole("Hoe is de taak verdeeld en hoe wordt erop gestuurd?", "toetsvraag").uitkomst, "HOLD");
  assert.equal(voorcontrole("Hoe is de taak verdeeld en hoe wordt erop gestuurd?", "interview").uitkomst, "herschrijven");
  assert.equal(voorcontrole("Welke stappen zet u, bijvoorbeeld bij een melding?", "interview").uitkomst, "HOLD");
});

await test("twijfel is HOLD, nooit stilletjes door", () => {
  assert.equal(voorcontrole("De rol van de functionaris gegevensbescherming", "toetsvraag").uitkomst, "HOLD");
});

await test("doorvragen mogen meer vragen bevatten, maar elke vraag apart blijft kort", () => {
  assert.equal(voorcontrole("Wat deed u? Wat zag u?", "doorvraag").uitkomst, "door");
  const lang = "Wat deed u? " + "Hoe " + "verliep ".repeat(26) + "het?";
  assert.equal(voorcontrole(lang, "doorvraag").uitkomst, "herschrijven");
});

await test("een onbekende soort vraag is een fout", () => {
  assert.throws(() => voorcontrole("Hoe?", "enquête"), /Onbekende soort/);
  assert.deepEqual(SOORTEN, ["interview", "doorvraag", "toetsvraag", "onderzoeksvraag"]);
});
