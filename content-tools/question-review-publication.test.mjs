import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareQuestionReviewPublication, prepareQuestionPlanPublication } from './question-review-publication.mjs';
import {questionPlanInventory,sourceQuestionPlanPresentation} from '../lib/source-question-plan.mjs';
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

test('a compound non-interview HOLD needs an explicit exact substantive resolution',()=>{
 const input=fixture();input.questions[0]={id:'probe',kind:'doorvraag',text:'Wat is afgehandeld en wat staat nog open?'};
 authorReceipts(input);
 assert.equal(prepareQuestionReviewPublication(input).offeredQuestions.length,0);
 input.reviews[0].formResolutions=[{rule:'samengesteld',reason:'Fictieve review: beide delen beschrijven één status van dezelfde overdracht.'}];
 const before=structuredClone(input),prepared=prepareQuestionReviewPublication(input);
 assert.deepEqual(prepared.offeredQuestions,input.questions);
 assert.equal(read(input,prepared.publication).form.uitkomst,'HOLD','Keep the mechanical finding visible');
 assert(read(input,prepared.publication).approved);
 assert.deepEqual(input,before);
 for(const mutate of [i=>i.questions[0].text+=' ',i=>i.context.scope='Changed scope',i=>i.sourceEdition='other']){
  const changed=structuredClone(input);mutate(changed);
  assert.throws(()=>prepareQuestionReviewPublication(changed),/stale or incomplete/);
 }
 for(const formResolutions of [[],null,[{rule:'samengesteld',reason:''}],
  [{rule:'veronderstellend',reason:'No'}],[...input.reviews[0].formResolutions,...input.reviews[0].formResolutions]]){
  const changed=structuredClone(input);changed.reviews[0].formResolutions=formResolutions;
  assert.throws(()=>prepareQuestionReviewPublication(changed),/stale or incomplete/);
 }
 for(const [kind,text]of [['interview',input.questions[0].text],['doorvraag','Wat zou u doen?'],
  ['doorvraag','Wat is afgehandeld en wat staat nog open'],['doorvraag','Hoe verloopt de overdracht?'],
  ['doorvraag','Waarom faalt de overdracht en wat staat nog open?'],['doorvraag','TODO']]){
  const changed=fixture();changed.questions[0]={id:'probe',kind,text};authorReceipts(changed);
  changed.reviews[0].formResolutions=structuredClone(input.reviews[0].formResolutions);
  assert.equal(prepareQuestionReviewPublication(changed).offeredQuestions.length,0,text);
 }
 const held=structuredClone(input);held.reviews[0].hold={active:true};
 assert.equal(prepareQuestionReviewPublication(held).offeredQuestions.length,0);
});

test('source plans bind complete coverage and individual decisions, without inventing a fallback',()=>{
  const input=fixture();
  input.plan={central:'Hoe verloopt de fictieve overdracht?',subquestions:[
    {key:'registration',text:'Hoe wordt de fictieve overdracht geregistreerd?',originKeys:['SYNTHETIC:one','SYNTHETIC:two']},
    {key:'reception',text:'Hoe wordt de fictieve ontvangst vastgelegd?',originKeys:['SYNTHETIC:three']},
  ]};
  input.itemId='SYNTHETIC:question-plan';
  input.questions=questionPlanInventory(input.plan);authorReceipts(input);
  const before=structuredClone(input),prepared=prepareQuestionPlanPublication(input);
  assert.deepEqual(input,before);
  const present=plan=>sourceQuestionPlanPresentation(plan,input);
  assert.deepEqual(present(prepared.plan).subquestions,input.plan.subquestions);
  assert.equal(present(prepared.plan).central,input.plan.central);
  for(const decision of ['schrappen','herschrijven','HOLD',null]){
    const edited=structuredClone(prepared.plan);
    if(decision)edited.questionReview.reviews[1].decision=decision;
    else edited.questionReview.reviews.splice(1,1);
    assert.deepEqual(present(edited).subquestions,[input.plan.subquestions[1]]);
    assert.equal(present(edited).central,input.plan.central);
  }
  for(const mutate of [p=>p.subquestions[0].originKeys.reverse(),
    p=>p.subquestions[0].originKeys.push('SYNTHETIC:four'),p=>p.subquestions[0].text+=' ',
    p=>p.subquestions.pop(),p=>{p.questionReview=null;},p=>{p.questionReview={};}]){
    const edited=structuredClone(prepared.plan);mutate(edited);
    assert.equal(present(edited).central,'');assert.deepEqual(present(edited).subquestions,[]);
  }
  assert.equal(sourceQuestionPlanPresentation(prepared.plan,{...input,sourceEdition:'another'}).central,'');
  const changed=structuredClone(input);changed.plan.subquestions[0].originKeys.reverse();
  assert.throws(()=>prepareQuestionPlanPublication(changed),/stale or incomplete/);
  for(const mutate of [p=>p.subquestions.push({...p.subquestions[0]}),p=>{p.subquestions[0].key='';},
    p=>{p.subquestions[0].originKeys=[];},p=>{p.subquestions[0].ids=['unreviewed-project-id'];},p=>p.subquestions[0].originKeys.push('SYNTHETIC:one')]){
    const edited=structuredClone(input.plan);mutate(edited);assert.throws(()=>questionPlanInventory(edited));
  }
  const legacy={central:'Legacy central?',subquestions:[{text:'Legacy detail?',originKeys:[]}]};
  assert.deepEqual(present(legacy),{...legacy,central:'',subquestions:[]},'Legacy absence cannot approve new proposals');
  assert.equal(legacy.central,'Legacy central?','The source and historical linking inventory remain untouched');
});

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

test('broad and specific questions have separate reviews bound to one complete inventory',()=>{
 const input=fixture();input.itemId='SYNTHETIC:question-plan';
 input.plan={central:'Hoe verloopt de fictieve overdracht?',
  subquestions:[{key:'registration',text:'Hoe wordt de fictieve overdracht geregistreerd?',originKeys:['SYNTHETIC:one']}],
  broadSubquestions:[{key:'broad:process',text:'Hoe is het fictieve overdrachtsproces ingericht?',originKeys:['SYNTHETIC:one','SYNTHETIC:two']}]};
 input.questions=questionPlanInventory(input.plan);authorReceipts(input);
 const prepared=prepareQuestionPlanPublication(input),present=p=>sourceQuestionPlanPresentation(p,input);
 assert.deepEqual(present(prepared.plan).broadSubquestions,input.plan.broadSubquestions);
 const negative=structuredClone(prepared.plan);
 negative.questionReview.reviews.find(r=>r.questionId==='sub:broad:process').decision='HOLD';
 assert.deepEqual(present(negative).broadSubquestions,[]);
 assert.deepEqual(present(negative).subquestions,input.plan.subquestions);
 for(const mutate of [p=>p.broadSubquestions[0].originKeys.pop(),p=>p.broadSubquestions[0].text+=' ',p=>delete p.broadSubquestions]){
  const changed=structuredClone(prepared.plan);mutate(changed);
  assert.equal(present(changed).central,'');assert.deepEqual(present(changed).subquestions,[]);
  assert.equal(present(changed).broadSubquestions?.length||0,0);
 }
 for(const mutate of [p=>{p.broadSubquestions='invalid';},p=>{p.broadSubquestions[0].key='registration';},p=>{p.subquestions[0].key='broad:mislabelled';}]){
  const changed=structuredClone(input.plan);mutate(changed);assert.throws(()=>questionPlanInventory(changed));
 }
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
