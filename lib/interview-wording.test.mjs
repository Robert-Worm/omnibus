import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionFormulations,createPracticeQuestionRevision} from './interview-wording.mjs';

const question = {id:'S-Q1',title:'Title',purpose:'Purpose',question:'Original?',probes:'Probe',
  included:false,origin:'authored',variants:{operational:'Original?',management:'Management?',strategic:'Strategy?'}};
function formulationFixture() {
  const data={clauses:{'S-Q1':['hoe het gaat','hoe het team werkt','hoe het bestuur werkt']},strategicExperience:'welke ervaringen het bestuur heeft'};
  const practice={values:[]},integrity={reviewed:{items:[{questions:[structuredClone(question)]}]}};
  return {data,practice,integrity,...createQuestionFormulations(data,practice,integrity)};
}

test('all conversational patterns preserve their subject and condition',()=>{
  const api=formulationFixture();
  for (const [base,expected] of [
    ['Als dit gebeurt, kunt u vertellen hoe u reageert?','Als dit gebeurt, kunt u beschrijven hoe u reageert?'],
    ['Kunt u vertellen hoe het werkt?','Kunt u beschrijven hoe het werkt?'],
    ['Kunt u vertellen over de overdracht?','Vertel eens over de overdracht.'],
    ['Kunt u de overdracht beschrijven binnen het team?','Kunt u vertellen over de overdracht binnen het team?'],
    ['Welke ervaringen heeft uw team met overdracht?','Kunt u vertellen welke ervaringen uw team heeft met overdracht?'],
  ]) {
    const result=api.questionFormulations({...question,variants:{operational:base}},'operational');
    assert.equal(result[0],base);
    assert(result.includes(expected));
    assert(result.length<=4);
    assert.equal(new Set(result).size,result.length);
  }
});

test('prepared clauses require the exact original and see lazily loaded questions',()=>{
  const api=formulationFixture();
  assert(api.questionFormulations(question,'operational').includes('Kunt u vertellen hoe het gaat?'));
  const changed={...question,variants:{operational:'User-specific wording?'}};
  assert.deepEqual(api.questionFormulations(changed,'operational'),['User-specific wording?']);
  api.integrity.reviewed.items.length=0;
  assert.deepEqual(api.questionFormulations(question,'operational'),['Original?']);
  api.integrity.reviewed.items.push({questions:[question]});
  assert(api.questionFormulations(question,'operational').length>1);
  api.practice.values.push({base:'Original?',alternatives:['Reviewed A','Reviewed B']});
  assert.deepEqual(api.questionFormulations(question,'operational'),['Reviewed A','Reviewed B']);
  assert.deepEqual(api.questionFormulations({id:'absent'},'operational'),[]);
});

test('cycling is reversible, preserves other levels and never mutates the project question',()=>{
  const api=formulationFixture(),input={...structuredClone(question),included:true,selectedLevels:['operational'],ownField:{keep:true}};
  const before=structuredClone(input),options=api.questionFormulations(input,'operational');
  let current=input;
  for(let i=0;i<options.length;i++) current=api.cycleQuestionFormulation(current,'operational');
  assert.equal(current.question,input.question);
  assert.deepEqual(current.variants,input.variants);
  assert.deepEqual(current.selectedLevels,input.selectedLevels);
  assert.deepEqual(current.ownField,input.ownField);
  assert.deepEqual(input,before);
  const management=api.cycleQuestionFormulation(input,'management');
  assert.equal(management.question,input.question);
  assert.equal(management.variants.operational,input.variants.operational);
  assert.equal(api.cycleQuestionFormulation({id:'absent'},'operational').id,'absent');
});

test('explicit source alternatives cycle only within their own level and preserve personal edits',()=>{
  const api=formulationFixture(), base='Kunt u vertellen hoe het werkt?';
  const input={...structuredClone(question),question:base,variants:{operational:base,management:'Mijn managementvraag?'},
    formulations:{operational:[base,'Hoe verliep uw laatste overdracht?']}};
  api.practice.values.push({base,alternatives:['Onbeoordeelde externe formulering']});
  const before=structuredClone(input);
  assert.deepEqual(api.questionFormulations(input,'operational'),input.formulations.operational);
  assert.deepEqual(api.questionFormulations(input,'management'),['Mijn managementvraag?']);
  const next=api.cycleQuestionFormulation(input,'operational');
  assert.equal(next.question,input.formulations.operational[1]);
  assert.deepEqual(api.cycleQuestionFormulation(next,'operational').variants,input.variants);
  assert.deepEqual(input,before);
  const own={...next,variants:{...next.variants,operational:'Mijn eigen formulering?'}};
  assert.deepEqual(api.questionFormulations(own,'operational'),['Mijn eigen formulering?']);
  assert.equal(api.cycleQuestionFormulation(own,'operational'),own);
  for(const formulations of [null,{}, {operational:['Andere bronvraag']}, {operational:[base,base]}]) {
    assert.deepEqual(api.questionFormulations({...input,formulations},'operational'),[base]);
  }
});

test('reviewed corrections only refresh exact unselected authored originals',()=>{
  const previous={values:[{id:'MODEL',questions:[structuredClone(question)]}]};
  const api=createPracticeQuestionRevision({previousKotterBarrier:{}},previous);
  const latest={...question,question:'Reviewed?',variants:{...question.variants,operational:'Reviewed?'}};
  const before=structuredClone(question),revision=api.practiceQuestionRevision('MODEL',question,latest);
  assert.equal(revision.question,'Reviewed?');
  assert.equal(revision.revision,'2026-09-17-practice');
  assert.deepEqual(question,before);
  assert.equal(api.practiceQuestionRevision('MODEL',question,question),null);
  for (const patch of [{included:true},{selectedLevels:['strategic']},{origin:'user'},
    {title:'Own title'},{purpose:'Own purpose'},{probes:'Own probe'},
    {variants:{...question.variants,management:'Own variant'}},{formulationBase:{operational:'Original?'}}])
    assert.equal(api.practiceQuestionRevision('MODEL',{...question,...patch},latest),null);
  assert.equal(api.practiceQuestionRevision('MODEL',question,undefined),null);
  assert.equal(api.practiceQuestionRevision('unknown',question,latest),null);
});

test('historical targeted correction retains its exact identity and protection rules',()=>{
  const variants={operational:'Earlier operational',management:'Earlier management',strategic:'Earlier strategic'};
  const api=createPracticeQuestionRevision({previousKotterBarrier:variants},{values:[]});
  const latest={...question,id:'KT-BARRIERS-Q10',variants:{operational:'New wording'}};
  const old={...latest,question:variants.operational,variants};
  assert.equal(api.practiceQuestionRevision('KOTTER',old,latest).revision,'2026-09-18-clarity');
  assert.equal(api.practiceQuestionRevision('other',old,latest),null);
  assert.equal(api.practiceQuestionRevision('KOTTER',{...old,included:true},latest),null);
});

test('malformed runtime wording is rejected without including source text',()=>{
  const f=formulationFixture();
  assert.throws(()=>createQuestionFormulations({clauses:{x:3},strategicExperience:''},f.practice,f.integrity),{message:'Invalid interview formulation data.'});
  f.practice.values.push({base:'Sensitive value',alternatives:[null]});
  assert.throws(()=>f.questionFormulations(question,'operational'),{message:'Invalid reviewed interview formulations.'});
  const api=createPracticeQuestionRevision({previousKotterBarrier:{}},{values:[{id:'MODEL',questions:[{id:'x',variants:null}]}]});
  assert.throws(()=>api.practiceQuestionRevision('MODEL',question,question),{message:'Invalid previous interview questions.'});
});
