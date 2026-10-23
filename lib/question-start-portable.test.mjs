import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// Exercise the real start/selection orchestration with independent source
// boundaries. No private data or browser globals are needed.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/question-start.mjs'))return next(specifier,context);
  let source;
  if(specifier==='./research-proposals.mjs')source=
   'function adopt(d,id,mode,...args){const f=globalThis.startFixture;f.adoptions++;if(d.invalid)throw Error("Invalid current evidence");const o=args.at(-1),questionId=o.targetId||"preview";f.options=o;return {draft:{...d,research:{...d.research,questions:[{id:questionId,parent_id:null,text:o.text}]}},questionId};}'+
   'function plan(){globalThis.startFixture.planReads++;return {subquestions:globalThis.startFixture.coverage};}'+
   'export const adoptModelQuestionPlan=adopt,adoptSourceQuestionPlan=adopt,adoptProcessQuestionPlan=adopt,modelQuestionPlan=plan,sourceQuestionPlan=plan,processQuestionPlan=plan;'+
   'export const centralProposals=()=>[],subProposals=()=>globalThis.startFixture.subs;';
  if(specifier==='./research-plan.mjs')source=
   'export const researchOf=d=>d.research;export function addQuestion(d,parent_id,text){const question={id:"preview",parent_id,text};return {draft:{...d,research:{...d.research,questions:[...d.research.questions,question]}},question};}'+
   'export const editQuestion=(d,id,text)=>({...d,research:{...d.research,questions:d.research.questions.map(q=>q.id===id?{...q,text}:q)}});export const setQuestionDesign=d=>d;';
  if(specifier==='./question-writing.mjs')source='export const mappedQuestionSuggestions=s=>s;';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {questionStartSelection,questionStartPreview,rankedQuestionStarts}=await import('./question-start.mjs');
const draft=()=>({included:['one','two'],investigation:{goal:{direction:'diagnostic'}},research:{questions:[],links:[]}});
const setup=()=>globalThis.startFixture={adoptions:0,planReads:0,subs:[{key:'sub',text:'Detail?',ids:['one']}],coverage:[{ids:['one','two','outside','one']}]};

test('opening source, model and process choices retains validation without an unused coverage scan',()=>{
 for(const proposal of [{key:'source:F'},{key:'model:M',modelId:'M'},{key:'process:P'}]){
  const calls=setup(),input=draft(),before=structuredClone(input),choice={...proposal,text:'Question?',topic:'Topic'};
  const context={targetId:'saved-root',subquestionDetail:'broad'};
  const selection=questionStartSelection(input,choice,context);
  assert.equal(calls.adoptions,1);assert.equal(calls.planReads,0);
  assert.equal(selection.questionId,'saved-root');assert.deepEqual(selection.defaultKeys,[]);assert.deepEqual(selection.directIds,[]);
  assert.equal(calls.options.subquestionDetail,'broad');assert.deepEqual(calls.options.design,{direction:'diagnostic',topic:'Topic'});
  assert.equal(Object.hasOwn(selection,'matchedIds'),false);
  const {matchedIds,...preview}=questionStartPreview(input,choice,context);
  assert.deepEqual(preview,selection);assert.deepEqual(matchedIds,['one','two']);assert.equal(calls.planReads,1);
  assert.deepEqual(input,before);
  assert.throws(()=>questionStartSelection({...input,invalid:true},choice,context),/Invalid current evidence/);
 }
});

test('individual and theme choices retain direct selected IDs only when no subquestions apply',()=>{
 const calls=setup(),input=draft(),item={key:'item:one',text:'Item?',ids:['one','outside']};
 assert.deepEqual(questionStartSelection(input,item).directIds,['one']);
 const theme={...item,key:'theme:T'};
 assert.deepEqual(questionStartSelection(input,theme).directIds,[]);
 calls.subs=[];assert.deepEqual(questionStartSelection(input,theme).directIds,['one']);
 assert.deepEqual(questionStartPreview(input,theme).matchedIds,['one']);
 assert.equal(calls.planReads,0);
});

test('ranking keeps full plan coverage and suggestions rather than default-selection counts',()=>{
 setup();const input=draft();
 const ranked=rankedQuestionStarts(input,{},[{key:'source:F',text:'Question?',label:'Source'}]);
 assert.equal(ranked.length,1);assert.equal(ranked[0].matched,2);assert.equal(ranked[0].subCount,1);
 assert.equal(globalThis.startFixture.planReads,1);
});
