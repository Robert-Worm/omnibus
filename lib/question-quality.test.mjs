import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { voorcontrole, questionCandidate, SOORTEN } from "./question-quality.mjs";
import { validateSemanticReview } from "./semantic-review-gate.mjs";

import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';

// Goede vragen uit Omnibus zelf: geen vormfout.
const GOEDE_VRAGEN = [
  ["interview", "Kunt u beschrijven hoe u een ruimte of middel gebruikte dat afnemers konden zien tijdens de dienstverlening bij {{onderwerp}}?"],
  ["interview", "Hoe houdt u zicht op de uitvoerbaarheidstoetsen waarvoor u verantwoordelijk bent?"],
  ["toetsvraag", "Hoe vertaalt OCW haar reductieambitie en externe afhankelijkheden naar keuzes over eigen maatregelen?"],
  ["onderzoeksvraag", "Hoe wordt de dienstverlening bij {{onderwerp}} uitgevoerd en bijgestuurd op basis van beschikbare afnemersinformatie?"],
  ["doorvraag", "Welke afspraken speelden mee? Wat deed de leiding zelf? Wat heeft u zelf gezien of gehoord van de reactie van anderen?"],
  ["interview", "Zou u kunnen beschrijven hoe u een recente melding afhandelde?"],
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

// Invented source package and independently authored receipts. Hashing these
// fixtures only constructs test inputs; production code never creates decisions.
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function semanticQuestionFixture() {
  const records = [{ id: '1', group: 'g1', passage: 'Synthetic passage.' }];
  const groups = { g1: ['Synthetic group', 'Synthetic group description'] };
  const items = [{ id: 'S-1', sourceId: 'S', groupId: 'S-g1', groupTitle: groups.g1[0], groupDescription: groups.g1[1],
    questions: [{ id: 'q1', kind: 'interview', text: 'Hoe verliep de fictieve overdracht?' }] }];
  const review = { semanticDecision: 'PASS', sharedContextReview: { decision: 'PASS', basis: 'Synthetic context review' },
    reviewer: 'synthetic-reviewer', reviewType: 'synthetic-independent-review', reviewDate: '2026-01-01',
    records: [{ code: 'S-1', decision: 'PASS', basis: 'Synthetic item review', recordHash: hash(records[0]),
      itemHash: hash(items[0]), passagesHash: hash([records[0].passage]) }],
    groups: [{ id: 'g1', decision: 'PASS', basis: 'Synthetic group review', title: groups.g1[0], description: groups.g1[1], records: ['S-1'] }] };
  review.records[0].questionReviews = [{ sourceId: 'S', itemId: 'S-1', questionId: 'q1', decision: 'behouden',
    reviewId: 'synthetic-q-review', reviewer: 'synthetic-question-reviewer', reviewDate: '2026-01-01', basis: 'Synthetic question review',
    itemHash: hash(items[0]), recordHash: hash(records[0]), passagesHash: hash([records[0].passage]),
    contextHash: hash({ groups, sharedContextReview: review.sharedContextReview }), questionHash: hash(items[0].questions[0]) }];
  return { sourceId: 'S', reviewFile: 'synthetic-review.json', review, records, groups, items,
    sourceRows: record => [record.passage], questionRows: (_record, item) => item.questions, expectedRecords: 1, expectedGroups: 1 };
}

await test('the existing semantic gate rejects explicit question decisions despite an enclosing PASS', () => {
  const original = semanticQuestionFixture(), before = JSON.stringify(original);
  assert.equal(validateSemanticReview(original).decisions.size, 1);
  assert.equal(JSON.stringify(original), before);
  for (const decision of ['schrappen', 'herschrijven', 'HOLD', 'door', 'PASS']) {
    const fixture = semanticQuestionFixture();
    fixture.review.records[0].questionReviews[0].decision = decision;
    assert.equal(voorcontrole(fixture.items[0].questions[0].text, 'interview').uitkomst, 'door');
    assert.throws(() => validateSemanticReview(fixture), /unclosed question review/);
  }
  const missing = semanticQuestionFixture(); delete missing.review.records[0].questionReviews;
  assert.throws(() => validateSemanticReview(missing), /unclosed question review/);
  const absentAdapter = semanticQuestionFixture(); delete absentAdapter.questionRows;
  assert.throws(() => validateSemanticReview(absentAdapter), /question adapter required/);
  // Legacy records still follow their original source gate, without a new blanket filter.
  delete absentAdapter.review.records[0].questionReviews;
  assert.equal(validateSemanticReview(absentAdapter).decisions.size, 1);
});

await test('a new enclosing review cannot silently carry forward a stale question receipt', () => {
  const fixture = semanticQuestionFixture(), parent = fixture.review.records[0];
  fixture.items[0].questions[0].text = 'Hoe registreerde u de fictieve overdracht?';
  assert.throws(() => validateSemanticReview(fixture), /changed after independent review/);
  parent.itemHash = hash(fixture.items[0]); // New parent evidence, old question evidence.
  assert.throws(() => validateSemanticReview(fixture), /unclosed question review/);
  for (const change of [
    f => { f.records[0].passage += ' Changed source.'; },
    f => { f.review.sharedContextReview.basis += ' Changed interpretation.'; },
    f => { f.questionRows = (_record, item) => item.questions.map(q => ({ ...q, text: 'Hoe registreerde u de fictieve overdracht?' })); },
  ]) {
    const context = semanticQuestionFixture(); change(context);
    context.review.records[0].recordHash = hash(context.records[0]);
    context.review.records[0].passagesHash = hash(context.sourceRows(context.records[0]));
    assert.throws(() => validateSemanticReview(context), /changed question review context/);
  }
});

await test('removal goes through a fresh source gate and cannot silently reintroduce the old question', () => {
  const fixture = semanticQuestionFixture(), parent = fixture.review.records[0], oldQuestion = fixture.items[0].questions[0];
  parent.questionReviews[0].decision = 'schrappen';
  assert.throws(() => validateSemanticReview(fixture), /unclosed question review/);
  fixture.items[0].questions = [];
  assert.throws(() => validateSemanticReview(fixture), /changed after independent review/);
  parent.itemHash = hash(fixture.items[0]);
  assert.throws(() => validateSemanticReview(fixture), /unknown or duplicate receipt/);
  // Represents a new authored review of the complete package after removal.
  parent.questionReviews = [];
  assert.equal(validateSemanticReview(fixture).decisions.size, 1);
  fixture.items[0].questions.push(oldQuestion);
  parent.itemHash = hash(fixture.items[0]);
  assert.throws(() => validateSemanticReview(fixture), /unclosed question review/);
});

await test('even an explicit retain receipt cannot override a failed mechanical precheck', () => {
  const fixture = semanticQuestionFixture(), parent = fixture.review.records[0];
  fixture.items[0].questions[0].text = 'Beoordeel het fictieve dossier.';
  parent.itemHash = hash(fixture.items[0]); parent.questionReviews[0].itemHash = parent.itemHash;
  assert.throws(() => validateSemanticReview(fixture), /unclosed question review/);
});
