import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareQuestionReviewPublication } from './question-review-publication.mjs';
import { readQuestionReview } from '../lib/question-quality-review.mjs';
import { SLECHTE_VRAGEN } from '../lib/question-quality-fixtures.mjs';
import { structureModelData } from '../lib/model-structure.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Receipt authoring below is confined to fiction. Production never fabricates,
// rebinds or claims to perform a substantive assessment from a fingerprint.
function fixture() {
  const input = { sourceId: 'SYNTHETIC', itemId: 'DIM', sourceEdition: 'synthetic-1',
    sourceHash: sha({ source: 'Fictieve bron. A😀é\r\nGeen inhoudelijke beoordeling.' }), inventoryComplete: true,
    item: { id: 'DIM', definition: 'Fictieve overdracht.' },
    context: { scope: 'Softwaretest', limitations: 'Niet gebruiken als echte vragenlijst.', dependencies: [] },
    questions: [{ id: 'DIM-Q1', kind: 'interview', text: 'Hoe verliep de fictieve overdracht?' }], reviews: [] };
  authorReceipts(input);
  return input;
}
function authorReceipts(input, decision = 'behouden', suffix = '1') {
  input.reviews = input.questions.map(q => ({ sourceId: input.sourceId, itemId: input.itemId, questionId: q.id,
    sourceEdition: input.sourceEdition, sourceHash: input.sourceHash, itemHash: sha({ item: input.item, questions: input.questions }), contextHash: sha(input.context),
    questionHash: sha({ id: q.id, kind: q.kind, text: q.text }), decision,
    reviewId: 'synthetic-review-' + suffix + '-' + q.id, reviewer: 'synthetic-question-reviewer', reviewDate: '2026-10-26',
    basis: 'Fictieve softwaretest; geen werkelijk inhoudelijk oordeel.' }));
}
const read = (input, publication, question = input.questions[0]) => readQuestionReview({
  sourceId: input.sourceId, itemId: input.itemId, sourceEdition: input.sourceEdition, sourceHash: input.sourceHash, question, publication });

test('one shared validator admits exact reviewed text without changing input', () => {
  const input = fixture(), before = structuredClone(input), out = prepareQuestionReviewPublication(input);
  assert.deepEqual(input, before);
  assert.deepEqual(out.offeredQuestions, input.questions);
  assert.deepEqual(out.publication.reviews, input.reviews);
  assert.deepEqual(read(input, out.publication), { status: 'approved', approved: true,
    form: { uitkomst: 'door', meldingen: [] }, reasons: [], reviewId: input.reviews[0].reviewId });
  out.publication.questions[0].text = 'changed output';
  out.offeredQuestions[0].text = 'changed output';
  assert.deepEqual(input, before);
});

test('negative and missing judgments never become approvals through a successful form check', () => {
  for (const decision of ['schrappen', 'herschrijven', 'HOLD', null]) {
    const input = fixture();
    if (decision) input.reviews[0].decision = decision; else input.reviews = [];
    const out = prepareQuestionReviewPublication(input), state = read(input, out.publication);
    assert.equal(state.form.uitkomst, 'door');
    assert.equal(state.status, decision ?? 'unknown'); assert.equal(state.approved, false);
    assert.deepEqual(out.offeredQuestions, []);
    assert.equal(out.withheld[0].status, state.status);
  }
  const input = fixture();
  for (const decision of ['door', 'PASS', 'APPROVE']) {
    input.reviews[0].decision = decision;
    assert.throws(() => prepareQuestionReviewPublication(input), /incomplete question receipt/);
  }
  assert.equal(read(input, undefined).status, 'unknown');
});

test('an explicit receipt HOLD cannot hide behind behouden', () => {
  for (const marker of [{ hold: { active: true } }, { status: 'HOLD' }]) {
    const input = fixture(); Object.assign(input.reviews[0], marker);
    const out = prepareQuestionReviewPublication(input);
    assert.deepEqual(out.offeredQuestions, []);
    assert.equal(read(input, out.publication).status, 'HOLD');
    assert.deepEqual(out.publication.reviews[0], input.reviews[0]);
  }
});

test('exact text, kind, variant identity and source/item context invalidate old reviews', () => {
  const changes = [
    f => { f.questions[0].text += ' '; },
    f => { f.questions[0].text = 'Hoe registreerde u de fictieve overdracht?'; },
    f => { f.questions[0].kind = 'toetsvraag'; },
    f => { f.questions[0].id = 'DIM-Q1/strategic'; },
    f => { f.sourceId = 'OTHER'; }, f => { f.itemId = 'OTHER'; },
    f => { f.sourceEdition = 'synthetic-2'; }, f => { f.sourceHash = sha('new source'); },
    f => { f.item.definition += ' New interpretation.'; },
    f => { f.context.dependencies.push('new dependency'); },
    f => { f.questions[0].pointIds = ['OTHER-POINT']; },
  ];
  for (const change of changes) {
    const input = fixture(), { publication } = prepareQuestionReviewPublication(input);
    change(input);
    assert.throws(() => prepareQuestionReviewPublication(input), /Question (publication|review):/);
    if (input.itemId === 'DIM' && input.sourceId === 'SYNTHETIC' && input.item.definition === 'Fictieve overdracht.' &&
        !input.context.dependencies.length && !input.questions[0].pointIds)
      assert.equal(read(input, publication).approved, false);
    authorReceipts(input, 'behouden', 'fresh');
    assert.equal(read(input, prepareQuestionReviewPublication(input).publication).approved, true);
  }
});

test('Unicode and whitespace are exact review text, never normalized to an old receipt', () => {
  const input = fixture(); input.questions[0].text = 'Hoe verliep de fictieve caféoverdracht?'; authorReceipts(input);
  const { publication } = prepareQuestionReviewPublication(input);
  for (const text of [input.questions[0].text.normalize('NFD'), ' ' + input.questions[0].text,
    input.questions[0].text.replace(' ', '\n')]) {
    assert.equal(read(input, publication, { ...input.questions[0], text }).status, 'stale');
  }
});

test('one approved level cannot approve a different offered level', () => {
  const input = fixture();
  input.questions.push({ ...input.questions[0], id: 'DIM-Q1/strategic' });
  authorReceipts(input); input.reviews.pop();
  const { publication, offeredQuestions } = prepareQuestionReviewPublication(input);
  assert.deepEqual(offeredQuestions.map(q => q.id), ['DIM-Q1']);
  assert.equal(read(input, publication, input.questions[1]).status, 'unknown');
});

test('all fixed bad questions remain withheld even with a fictitious behouden receipt', () => {
  for (const [kind, text] of SLECHTE_VRAGEN) {
    const input = fixture(); Object.assign(input.questions[0], { kind, text }); authorReceipts(input);
    const out = prepareQuestionReviewPublication(input);
    assert.equal(out.offeredQuestions.length, 0, text);
    assert.equal(read(input, out.publication).approved, false, text);
  }
});

test('malformed, duplicate, foreign and stale capsule receipts fail closed in the reader', () => {
  const mutations = [
    p => { p.schemaVersion = 2; }, p => { p.format = 'other'; },
    p => { p.questions.push(structuredClone(p.questions[0])); },
    p => { p.reviews.push(structuredClone(p.reviews[0])); },
    p => { p.reviews[0].questionId = 'FOREIGN'; },
    p => { p.reviews[0].itemHash = 'f'.repeat(64); },
    p => { p.reviews[0].questionHash = 'f'.repeat(64); },
    p => { p.reviews[0].contextHash = 'f'.repeat(64); },
    p => { p.reviews[0].sourceEdition = 'old'; },
    p => { p.reviews[0].sourceHash = 'f'.repeat(64); },
    p => { delete p.reviews[0].reviewer; }, p => { delete p.reviews[0].basis; },
    p => { p.reviews[0].decision = 'door'; }, p => { delete p.questions[0].questionHash; },
  ];
  for (const mutate of mutations) {
    const input = fixture(), { publication } = prepareQuestionReviewPublication(input); mutate(publication);
    const state = read(input, publication);
    assert.equal(state.approved, false); assert.ok(['invalid', 'stale'].includes(state.status));
  }
  assert.equal(readQuestionReview().status, 'invalid');
});

test('a removed question stays in prior evidence and requires fresh review if reintroduced', () => {
  const input = fixture(); input.reviews[0].decision = 'schrappen';
  const old = prepareQuestionReviewPublication(input).publication, retained = structuredClone(old);
  input.questions = []; input.reviews = [];
  const next = prepareQuestionReviewPublication(input);
  assert.deepEqual(next.offeredQuestions, []);
  assert.equal(read(input, next.publication, retained.questions[0]).status, 'stale');
  assert.deepEqual(old, retained);
  input.questions = retained.questions.map(({ id, kind, text }) => ({ id, kind, text }));
  assert.equal(prepareQuestionReviewPublication(input).withheld[0].status, 'unknown');
  authorReceipts(input, 'behouden', 'new');
  assert.equal(prepareQuestionReviewPublication(input).offeredQuestions.length, 1);
});

test('existing model restoration preserves user wording, old receipts and selected levels', () => {
  const input = fixture(), capsule = prepareQuestionReviewPublication(input).publication;
  const model = { id: 'SYNTHETIC', kind: 'own', version: 'old', title: 'Fictief', source: 'Fictief', selected: true, question: '',
    items: [{ id: 'DIM', title: 'Fictief', question: 'Eigen oude tekst', probes: '', included: true,
      questionReview: capsule, questions: [{ id: 'DIM-Q1', title: 'Eigen vraag', question: 'Mijn eigen bewaarde tekst',
        probes: 'Mijn eigen doorvraag', included: true, selectedLevels: ['operational'], origin: 'user' }] }] };
  const before = structuredClone(model), restored = structureModelData(model);
  assert.deepEqual(model, before);
  assert.equal(restored.items[0].questions[0].question, 'Mijn eigen bewaarde tekst');
  assert.deepEqual(restored.items[0].questions[0].selectedLevels, ['operational']);
  assert.deepEqual(restored.items[0].questionReview, capsule);
  assert.deepEqual(structureModelData(JSON.parse(JSON.stringify(restored))), restored);
});
