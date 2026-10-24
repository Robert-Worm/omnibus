import assert from "node:assert/strict";
import test from "node:test";
import { voorcontrole, SOORTEN } from "./question-quality.mjs";

// Vaste set slechte vragen: deze moeten altijd worden afgekeurd (nooit 'door').
// De eerste is de vraag die Omnibus vroeger zelf maakte voor een toetspunt zonder vraag.
export const SLECHTE_VRAGEN = [
  ["interview", "Hoe krijgt het toetspunt ‘Overdracht van voorzieningen’ in de praktijk vorm? Wat is uw eigen rol? Beschrijf een concrete situatie en wat daarin wel of niet lukte.", ["meer-vragen", "technisch"]],
  ["interview", "Hoe zijn de verantwoordelijkheden verdeeld en hoe volgt u de uitvoering en eventuele bijsturing?", ["samengesteld"]],
  ["interview", "Vraag nog uit te werken", ["leeg"]],
  ["interview", "", ["leeg"]],
  ["interview", "Wordt het informatiebeveiligingsbeleid jaarlijks geëvalueerd?", ["gesloten"]],
  ["interview", "Heeft u een overzicht van alle verwerkingen?", ["gesloten"]],
  ["interview", "Bent u het ermee eens dat de sturing op het programma tekortschiet?", ["sturend"]],
  ["interview", "Waarom ontbreekt een actueel risicoregister?", ["sturend"]],
  ["interview", "Hoe goed werkt de samenwerking met de CISO?", ["sturend"]],
  ["toetsvraag", "Beoordeel of de CISO formeel is aangesteld.", ["opdracht"]],
  ["toetsvraag", "Controleer of het register volledig is?", ["opdracht"]],
  ["toetsvraag", "Hoe is C26-P-014 belegd in de organisatie?", ["technisch"]],
  ["onderzoeksvraag", "Hoe wordt ${topic} bestuurd?", ["technisch"]],
  ["onderzoeksvraag", "Hoe wordt {{organisatie}} bestuurd?", ["technisch"]],
  ["interview", "Kunt u beschrijven hoe de afdeling in de afgelopen twee jaar, mede gelet op de reorganisatie, de nieuwe werkwijze en de verwachtingen van het bestuur, de risico’s rond informatiebeheer heeft herkend, besproken en opgevolgd?", ["te-lang"]],
];

// Goede vragen uit Omnibus zelf: geen vormfout.
const GOEDE_VRAGEN = [
  ["interview", "Kunt u beschrijven hoe u een ruimte of middel gebruikte dat afnemers konden zien tijdens de dienstverlening bij {{onderwerp}}?"],
  ["interview", "Hoe houdt u zicht op de uitvoerbaarheidstoetsen waarvoor u verantwoordelijk bent?"],
  ["toetsvraag", "Hoe vertaalt OCW haar reductieambitie en externe afhankelijkheden naar keuzes over eigen maatregelen?"],
  ["onderzoeksvraag", "Hoe wordt de dienstverlening bij {{onderwerp}} uitgevoerd en bijgestuurd op basis van beschikbare afnemersinformatie?"],
  ["doorvraag", "Welke afspraken speelden mee? Wat deed de leiding zelf? Wat heeft u zelf gezien of gehoord van de reactie van anderen?"],
];

test("de vaste set slechte vragen wordt altijd afgekeurd, om de juiste reden", () => {
  for (const [soort, tekst, regels] of SLECHTE_VRAGEN) {
    const { uitkomst, meldingen } = voorcontrole(tekst, soort);
    assert.notEqual(uitkomst, "door", tekst);
    for (const regel of regels) assert.ok(meldingen.some((m) => m.regel === regel), `${regel} ontbreekt voor: ${tekst}`);
  }
});

test("goede vragen uit Omnibus komen door de voorcontrole", () => {
  for (const [soort, tekst] of GOEDE_VRAGEN) assert.deepEqual(voorcontrole(tekst, soort), { uitkomst: "door", meldingen: [] }, tekst);
});

test("de zwaarste melding bepaalt de uitkomst", () => {
  assert.equal(voorcontrole("Vraag nog uit te werken", "interview").uitkomst, "schrappen");
  assert.equal(voorcontrole("Hoe is de taak verdeeld en hoe wordt erop gestuurd?", "toetsvraag").uitkomst, "HOLD");
  assert.equal(voorcontrole("Hoe is de taak verdeeld en hoe wordt erop gestuurd?", "interview").uitkomst, "herschrijven");
  assert.equal(voorcontrole("Welke stappen zet u, bijvoorbeeld bij een melding?", "interview").uitkomst, "HOLD");
});

test("twijfel is HOLD, nooit stilletjes door", () => {
  assert.equal(voorcontrole("De rol van de functionaris gegevensbescherming", "toetsvraag").uitkomst, "HOLD");
});

test("doorvragen mogen meer vragen bevatten, maar elke vraag apart blijft kort", () => {
  assert.equal(voorcontrole("Wat deed u? Wat zag u?", "doorvraag").uitkomst, "door");
  const lang = "Wat deed u? " + "Hoe " + "verliep ".repeat(26) + "het?";
  assert.equal(voorcontrole(lang, "doorvraag").uitkomst, "herschrijven");
});

test("een onbekende soort vraag is een fout", () => {
  assert.throws(() => voorcontrole("Hoe?", "enquête"), /Onbekende soort/);
  assert.deepEqual(SOORTEN, ["interview", "doorvraag", "toetsvraag", "onderzoeksvraag"]);
});
