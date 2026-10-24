import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {validateModelLibrary} from './model-library-validation.mjs';

const item = (id='D1') => ({id,title:'Synthetic dimension',question:'Own dimension wording',probes:'',included:true,
  questions:[{id:id+'-Q1',dimensionId:id,title:'Synthetic question',question:'Own question 🧭',probes:'Own follow-up',included:true}]});
const model = (id='SYNTHETIC') => ({id,kind:'own',version:'synthetic-1',title:'Synthetic model',source:'Synthetic source',
  question:'Own central question',selected:true,items:[item()],limitations:'Synthetic fixture only'});
const library = () => ({version:1,models:[model()]});

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
const {restoreModelLibrary}=await import('./content-adapters/model-library.mjs');

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
