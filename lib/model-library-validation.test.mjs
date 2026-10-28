import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {validateModelLibrary} from './model-library-validation.mjs';
import {structureModelData} from './model-structure.mjs';

test('shared interview restoration requires catalogue context for the protected legacy model',()=>{
 const model={id:'L01',kind:'kaptein',title:'Soft controls · Kaptein',items:[]};
 assert.throws(()=>structureModelData(model),/cataloguscontext/);
 const context={cevMetadata:{officialName:'Synthetic protected model',sources:[]},cevIndicators:()=>[],cevQuestionContent:()=>null};
 const result=structureModelData(model,context);
 assert.equal(result.title,'Synthetic protected model');
 assert.equal(result.structureVersion,2);
 assert.equal(model.title,'Soft controls · Kaptein');
 assert.equal(model.structureVersion,undefined);
});
import {prepareModelReview,checkModelReviews,REVIEW_ASPECTS} from '../content-tools/model-quality.mjs';

const item = (id='D1') => ({id,title:'Synthetic dimension',question:'Own dimension wording',probes:'',included:true,
  questions:[{id:id+'-Q1',dimensionId:id,title:'Synthetic question',question:'Own question 🧭',probes:'Own follow-up',included:true}]});
const model = (id='SYNTHETIC') => ({id,kind:'own',version:'synthetic-1',title:'Synthetic model',source:'Synthetic source',
  question:'Own central question',selected:true,items:[item()],limitations:'Synthetic fixture only'});
const library = () => ({version:1,models:[model()]});

test('model review covers dimension wording, research questions and each probe in its respondent context', () => {
  const input=model(), dimension=input.items[0], question=dimension.questions[0];
  dimension.researchQuestion='Welke informatie gebruiken medewerkers?';
  dimension.probes='Kunt u een voorbeeld geven?';
  question.variants={operational:'Wat ontving u?',management:'Welke informatie koos u?'};
  question.probes='Kunt u de situatie beschrijven?\r\n\r\nWat gebeurde daarna?';
  const before=structuredClone(input), evidence={sourceEvidence:[{id:'s1',sha256:'a'.repeat(64)}]};
  const basis=prepareModelReview(input,evidence);
  assert.equal(basis.schemaVersion,2);
  assert.equal(basis.status,'STRUCTURAL_PASS_REVIEW_REQUIRED');
  assert.deepEqual(input,before);
  const targets=new Map(basis.targets.map(t=>[t.id,t]));
  assert.equal(targets.get('SYNTHETIC/D1/question').text,dimension.question);
  assert.equal(targets.get('SYNTHETIC/D1/researchQuestion').text,dimension.researchQuestion);
  assert.equal([...targets.values()].filter(t=>t.kind==='probe').length,7);
  for(const level of ['default','operational','management']) {
    const parentId='SYNTHETIC/D1/D1-Q1/'+level;
    assert.deepEqual([1,3].map(n=>targets.get(parentId+'/probes/'+n).text),
      ['Kunt u de situatie beschrijven?','Wat gebeurde daarna?']);
    assert.equal(targets.get(parentId+'/probes/1').parentId,parentId);
    assert.equal(targets.get(parentId+'/probes/1').level,level);
  }
  assert(![...targets.values()].some(t=>t.level==='strategic'),'Absent levels are not fabricated');
  question.probes='Een gewijzigde doorvraag?';
  assert.notEqual(prepareModelReview(input,evidence).basisHash,basis.basisHash);
  question.probes=[];
  assert(prepareModelReview(input,evidence).errors.some(e=>e.code==='PROBES_SHAPE'));
});

test('model review includes the viewer operational fallback and rejects old review basis versions', () => {
  const input=model(), basis=prepareModelReview(input,{sourceEvidence:[{id:'s1',sha256:'a'.repeat(64)}]});
  const restored=structureModelData(input);
  assert.equal(basis.targets.find(t=>t.id==='SYNTHETIC/D1/D1-Q1/operational').text,
    restored.items[0].questions[0].variants.operational);
  const old={...basis,schemaVersion:1};
  assert(checkModelReviews(old,[],{authorIds:['synthetic-author']}).errors.some(e=>e.startsWith('Current model review basis')));
});

test('authored alternatives and their probe context require their own model review targets',()=>{
  const input=model(), question=input.items[0].questions[0];
  question.formulations={operational:[question.question,'Hoe verliep die overdracht?']};
  const evidence={sourceEvidence:[{id:'s1',sha256:'a'.repeat(64)}]};
  const basis=prepareModelReview(input,evidence), target='SYNTHETIC/D1/D1-Q1/operational/formulations/2';
  assert.equal(basis.status,'STRUCTURAL_PASS_REVIEW_REQUIRED');
  assert.equal(basis.targets.find(row=>row.id===target).kind,'formulation');
  assert.equal(basis.targets.find(row=>row.id===target).base,question.question);
  assert.equal(basis.targets.find(row=>row.id===target+'/probes/1').text,question.probes);
  for(const invalid of [{operational:['Anders?']},{management:['Anders?']},
    {operational:[question.question,question.question]},null,{unknown:['Anders?']}]) {
    question.formulations=invalid;
    assert.equal(prepareModelReview(input,evidence).status,'HOLD');
  }
});

await test('validation preserves every saved field and does not modify the input', () => {
  const value=library();
  value.models[0].items[0].questions[0].variants={operational:'Own wording',management:'',strategic:'Unchanged'};
  value.models[0].sources=[{id:'s1',title:'Own source',url:'https://example.invalid'}];
  const before=structuredClone(value), result=validateModelLibrary(value);
  assert.deepEqual(result,before); assert.deepEqual(value,before);
  assert.notEqual(result.models,value.models);
  assert.notEqual(result.models[0],value.models[0]);
  assert.notEqual(result.models[0].items[0],value.models[0].items[0]);
  assert.notEqual(result.models[0].items[0].questions[0],value.models[0].items[0].questions[0]);
  const legacy=library(); delete legacy.models[0].items[0].questions;
  assert.deepEqual(validateModelLibrary(legacy),legacy,'Older single-question items remain supported');
});

await test('existing limits and identity/field checks reject malformed saved models', () => {
  const mutations=[
    v=>v.version=2, v=>v.models=null, v=>v.models.push(v.models[0]),
    v=>delete v.models[0].items, v=>v.models[0].kind='unknown', v=>delete v.models[0].selected,
    v=>v.models[0].id='../x', v=>v.models[0].source=3, v=>v.models[0].title='x'.repeat(4001),
    v=>v.models[0].items.push(v.models[0].items[0]), v=>delete v.models[0].items[0].included,
    v=>v.models[0].items[0].definition={}, v=>v.models[0].items[0].originalTitle=[],
    v=>v.models[0].items[0].questions.push(v.models[0].items[0].questions[0]),
    v=>v.models[0].items[0].questions[0].id='WRONG-Q1',
    v=>v.models[0].items[0].questions[0].dimensionId='WRONG',
    v=>delete v.models[0].items[0].questions[0].probes,
    v=>v.models[0].items[0].questions[0].included='yes',
  ];
  for(const mutate of mutations){const value=library();mutate(value);assert.throws(()=>validateModelLibrary(value));}
  const manyModels={version:1,models:Array.from({length:100},(_,i)=>model('MODEL'+i))};
  assert.equal(validateModelLibrary(manyModels).models.length,100);
  manyModels.models.push(model('EXTRA'));assert.throws(()=>validateModelLibrary(manyModels));
  const manyItems=library();manyItems.models[0].items=Array.from({length:500},(_,i)=>item('D'+i));
  assert.equal(validateModelLibrary(manyItems).models[0].items.length,500);
  manyItems.models[0].items.push(item('EXTRA'));assert.throws(()=>validateModelLibrary(manyItems));
  const manyQuestions=library(),dimension=manyQuestions.models[0].items[0];
  dimension.questions=Array.from({length:100},(_,i)=>({...dimension.questions[0],id:'D1-Q'+i}));
  assert.equal(validateModelLibrary(manyQuestions).models[0].items[0].questions.length,100);
  dimension.questions.push({...dimension.questions[0],id:'D1-EXTRA'});assert.throws(()=>validateModelLibrary(manyQuestions));
});

await test('protected model dimensions require the current catalogue context', () => {
  const value=library(),names=Array.from({length:8},(_,i)=>'Synthetic protected dimension '+i);
  value.models[0].id='CEV-AI';value.models[0].items=names.map((title,i)=>({...item('AI0'+(i+1)),title}));
  assert.throws(()=>validateModelLibrary(value),/acht dimensies/);
  assert.deepEqual(validateModelLibrary(value,{activeIntegrityDimensions:names}),value);
  value.models[0].items[0].title='Changed';
  assert.throws(()=>validateModelLibrary(value,{activeIntegrityDimensions:names}),/acht dimensies/);
});

await test('empty saved dimensions are preserved as data, never accepted as reviewed publication content', () => {
  const value=library();
  value.models[0].items[0].questions=[];
  const before=structuredClone(value);
  assert.deepEqual(validateModelLibrary(value),before);
  const prepared=prepareModelReview(value.models[0],{sourceEvidence:[{id:'s1',sha256:'a'.repeat(64)}]});
  assert.equal(prepared.status,'HOLD');
  assert(prepared.errors.some(error=>error.code==='NO_QUESTIONS'));
  // Even complete positive parent/dimension receipts cannot express approval
  // of an empty dimension in the current model review schema.
  const approvals=Object.entries(REVIEW_ASPECTS).map(([role,aspects])=>({
    role,actorId:'synthetic-'+role,basisHash:prepared.basisHash,decision:'APPROVE',
    humanValidation:false,unresolvedIssues:[],assessments:prepared.targets.map(target=>({
      targetId:target.id,decision:'APPROVE',reason:'Synthetic receipt only',
      aspects:Object.fromEntries(aspects.map(aspect=>[aspect,'Synthetic assessment'])),
    })),
  }));
  assert.deepEqual(checkModelReviews(prepared,approvals,{authorIds:['synthetic-author']}).errors,
    ['Structural checks must pass.'],'The positive receipts are otherwise complete and correctly bound');
  for(const reviews of [undefined,[],approvals,approvals.map(r=>({...r,decision:'HOLD'}))]) {
    const result=checkModelReviews(prepared,reviews,{authorIds:['synthetic-author']});
    assert.equal(result.status,'HOLD');
    assert(result.errors.includes('Structural checks must pass.'));
  }
  assert.deepEqual(value,before);
});

// Exercise the real restore/merge after the shared validation. Only unavailable
// catalogue inputs and unrelated adapter imports are replaced by test data.
register('data:text/javascript,'+encodeURIComponent(`export function resolve(s,c,next){
 const fixtures={
  'omnibus-data:lib/model-library.mjs':'export default {models:[],preInterviewReview:[],prePracticalCevQuestions:[],previousActiveQuestions:[],activeIntegrityDimensions:[]};',
  '@/lib/export-presets.mjs':'export const softControlExample=[];',
  '@/lib/kaptein-questions.mjs':'export const kapteinQuestions=[];',
  '@/lib/theme-workspaces.mjs':'export const themeCatalogue=()=>[];',
  '@/lib/report-choices.mjs':'export const themeLines=()=>[];',
  '@/lib/interview-structure.mjs':'export const structureModel=m=>m,assembleInterview=()=>[];',
  '@/lib/product-scope.mjs':'export const cleanScopeDraft=()=>{};',
  '@/lib/model-context.mjs':'export const contextualQuestion=q=>q,contextualModelQuestion=m=>m.question;',
  '@/lib/interview-practice-review.mjs':'export const practiceQuestionRevision=()=>undefined;'
 };return Object.hasOwn(fixtures,s)?{url:'data:text/javascript,'+encodeURIComponent(fixtures[s]),shortCircuit:true}:next(s,c);
}`),import.meta.url);
const {restoreModelLibrary,initialModelLibrary,default:catalogueData}=await import('./content-adapters/model-library.mjs');

await test('an explicit empty question list remains empty on restore without a substitute question', () => {
  const saved=library();
  saved.models[0].items[0].questions=[];
  const catalogue=structuredClone(saved),before=structuredClone({saved,catalogue});
  const restored=restoreModelLibrary(saved,catalogue);
  assert.deepEqual(restored.models[0].items[0].questions,[]);
  assert.equal(restored.models[0].selected,true);
  assert.equal(restored.models[0].items[0].included,true);
  assert.equal(restored.models[0].items[0].question,'Own dimension wording');
  assert.deepEqual({saved,catalogue},before);
});

await test('an empty catalogue dimension cannot delete saved questions, legacy wording or selections', () => {
  for(const legacy of [false,true]) {
    const saved=library(),seed=model();
    saved.models[0].items[0].questions[0].origin='user';
    saved.models[0].items[0].questions[0].variants={operational:'Own variant',strategic:''};
    saved.models[0].items[0].questions[0].selectedLevels=['operational'];
    if(legacy) delete saved.models[0].items[0].questions;
    seed.items[0].questions=[];
    const catalogue={version:1,models:[seed]},before=structuredClone({saved,catalogue});
    const restored=restoreModelLibrary(saved,catalogue),dimension=restored.models[0].items[0];
    assert.equal(restored.models[0].selected,true);
    assert.equal(dimension.included,true);
    assert.equal(dimension.question,'Own dimension wording');
    if(legacy) {
      assert.equal(dimension.questions.length,1);
      assert.equal(dimension.questions[0].question,saved.models[0].items[0].question);
      assert.equal(dimension.questions[0].included,true);
    } else assert.deepEqual(dimension.questions,saved.models[0].items[0].questions);
    assert.deepEqual({saved,catalogue},before);
  }
});

await test('real restore keeps own questions/selections and adds new catalogue prompts unselected', () => {
  const saved=library(),seed=model();
  seed.items[0].questions[0].question='Changed catalogue default';
  seed.items[0].questions.push({...seed.items[0].questions[0],id:'D1-Q2',question:'New optional question'});
  const catalogue={version:1,models:[seed,model('NEW')]},before=structuredClone({saved,catalogue});
  const restored=restoreModelLibrary(saved,catalogue),own=restored.models[0];
  assert.equal(own.selected,true);assert.equal(own.question,saved.models[0].question);
  assert.deepEqual(own.items[0].questions[0],saved.models[0].items[0].questions[0]);
  assert.equal(own.items[0].questions[1].included,false);
  assert.equal(restored.models[1].selected,false);assert.equal(restored.models[1].items[0].included,false);
  assert.deepEqual({saved,catalogue},before);
  const navigation={version:1,models:[{id:'ONLY-OVERVIEW',displayOnly:true}]};
  assert.throws(()=>restoreModelLibrary(navigation,catalogue),/modelgegevens/);
});

await test('ordinary restores do not clone the loaded catalogue again', t => {
  const saved={version:1,models:Array.from({length:40},(_,i)=>model('SYNTHETIC'+i))};
  const originalModels=catalogueData.models;
  catalogueData.models=structuredClone(saved.models);
  const clone=structuredClone,calls=[];
  t.mock.method(globalThis,'structuredClone',value=>{calls.push(value);return clone(value);});
  try {
    const restored=restoreModelLibrary(saved);
    assert.equal(restored.models.length,40);
    assert.equal(calls.length,0,'No new catalogue content needs a deep copy');
    assert.equal(restored.models[39].items[0].questions[0].question,'Own question 🧭');
    assert.equal(restored.models[39].selected,true);
    const initial=initialModelLibrary(['SYNTHETIC39']);
    assert.equal(calls.length,1,'An initial library still owns its catalogue copy');
    assert.equal(initial.models.length,1);
    initial.models[0].items[0].questions[0].question='Changed initial copy';
    assert.equal(catalogueData.models[39].items[0].questions[0].question,'Own question 🧭');
    const invalid=clone(saved);invalid.models[39].items[0].questions[0].included='invalid';
    assert.throws(()=>restoreModelLibrary(invalid),/interviewvraag/);
    assert.equal(calls.length,1,'Invalid saved data is still checked before adding defaults');
  } finally {catalogueData.models=originalModels;}
});

await test('new catalogue models, dimensions and questions remain detached and opt-in', () => {
  const seed=model(),added=model('FUTURE');
  const decorate=q=>({...q,variants:{operational:'Published question'},
    formulationBase:{operational:'Published base'},sourceIds:['s1'],selectedLevels:[],included:false});
  seed.items[0].questions.push(decorate({...seed.items[0].questions[0],id:'D1-Q2'}));
  seed.items.push({...item('D2'),questions:[decorate(item('D2').questions[0])]});
  added.sources=[{id:'s1',title:'Published source',url:'https://example.invalid'}];
  seed.sources=structuredClone(added.sources);
  added.items[0].questions=[decorate(added.items[0].questions[0])];
  const catalogue={version:1,models:[seed,added]},before=structuredClone(catalogue),saved=library();
  const restored=restoreModelLibrary(saved,catalogue),own=restored.models[0],future=restored.models[1];
  assert.equal(own.items[0].questions[0].included,true);
  assert.equal(own.items[0].questions[1].included,false);
  assert.equal(own.items[1].included,false);
  assert.equal(future.selected,false);assert.equal(future.items[0].included,false);
  for(const q of [own.items[0].questions[1],own.items[1].questions[0],future.items[0].questions[0]]) {
    q.variants.operational='Edited';q.formulationBase.operational='Edited base';
    q.sourceIds.push('own');q.selectedLevels.push('management');
  }
  future.sources[0].title='Own source title';
  assert.deepEqual(catalogue,before,'Project edits cannot mutate the published catalogue');
  assert.deepEqual(saved,library(),'Restoring also keeps the saved input intact');
  // A later publication is read afresh, not hidden behind a cached catalogue.
  catalogue.models.push(model('LATER'));
  const again=restoreModelLibrary(saved,catalogue);
  assert.equal(again.models.at(-1).id,'LATER');
  assert.deepEqual(again.models[1].items[0].questions[0],before.models[1].items[0].questions[0]);
});
