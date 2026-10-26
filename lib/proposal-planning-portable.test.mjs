import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';

// The real proposal algorithm, with independent synthetic sources and observable
// boundary checks. No private catalogue, persisted project or source file needed.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!['/research-proposals.mjs','/research-plan.mjs','/foundation-workspace.mjs','/question-start.mjs'].some(file=>context.parentURL?.endsWith(file)))return next(specifier,context);
  const fixtures={
   './theme-workspaces.mjs':
    'export function centralSuggestions(){globalThis.planFixture.themeReads++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme scan");return [{text:"Theme question?"}];}export function scopedSubSuggestions(){globalThis.planFixture.themeSubs++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme suggestions");return [{key:"theme:one",text:"Theme detail?",ids:["m1"]}];}export const themeCatalogue=()=>[];',
   './foundations/registry.mjs':'export const foundationQuestionPlans={F:{central:"Source question?",subquestions:[{key:"one",text:"Source detail?",originKeys:["F:one","F:missing","F:scope"]}]}};globalThis.planSourcePlan=foundationQuestionPlans.F;',
   './investigation.mjs':
    'export const materialQuestionText=m=>m.question;export const foundations=[{id:"F",title:"Synthetic framework",url:"https://example.org/framework"},{id:"CIO",title:"Synthetic CIO",url:"https://example.org/cio"},{id:"FALLBACK",title:"Synthetic fallback"}];export const foundationProposals=[{originKey:"F:one",title:"First norm"},{originKey:"F:scope",auditRole:"scope"}];export function validateInvestigation(value){globalThis.planFixture.validations++;if(value.invalid)throw Error("Invalid current evidence");return structuredClone(value);}export const addMaterials=()=>{throw Error("Unexpected material adoption");};',
   './framework-source-items.mjs':'export const sourceFields=()=>[];',
   './process-catalogue.mjs':'export const activeProcesses=[{id:"P",title:"Synthetic process",question:"Process question?",sourceIds:["F"]}];export const processResearchTopics={P:["Process detail"]};globalThis.planProcess=activeProcesses[0];',
   './research-directions.mjs':'export const directionPlan=d=>d?{text:"Design question?",subquestions:[{key:"design:one",text:"Design detail?",ids:[]}],advice:{key:"advice",text:"Advice?",ids:[]}}:null;export const intendedUseQuestion=()=>null,directionLabel=id=>id;',
   './research-goal.mjs':'export const researchGoalText=()=>"";',
   './model-context.mjs':'export const contextualModelQuestion=m=>m.question;export const contextualQuestion=q=>q;',
   './research-wording.mjs':'export const directedSourceQuestions=(_id,questions)=>questions;export const researchTopicQuestion=t=>t+"?";',
   './cio-law-data.mjs':'export const cioSourceId="CIO",cioCatalogue={objectives:[],points:[{id:"point1",selection_status:"SELECTABLE",objective_ids:["one"]},{id:"point2",selection_status:"SELECTABLE",objective_ids:["two"]}]};',
   './cio-question-detail.mjs':'export const cioQuestionGroups=(_objectives,detail)=>detail==="broad"?[{key:"both",text:"Broad question?",objectives:["one","two"]}]:[{key:"one",text:"Specific one?",objectives:["one"]},{key:"two",text:"Specific two?",objectives:["two"]}];',
   './research-question-formulations.mjs':'export const proposalFormulation=(text,own)=>own??text;',
   './catalogue-runtime.mjs':'export const catalogueDerived=f=>f(),catalogueReady=()=>true;',
   './topical-content.mjs':'export const topicalPackage=()=>null,topicalIds=[];',
   './workspace-view.mjs':'export const pageSlice=()=>{throw Error("Unexpected workspace pagination");};',
   './cio-law-adapter.mjs':'export const cioSourceId="CIO",chooseCioPoints=()=>{throw Error("Unexpected material adoption");};',
   './wwke-law-adapter.mjs':'export const chooseWwkePoints=()=>{throw Error("Unexpected material adoption");},selectWwkePointsDirect=chooseWwkePoints;',
   './wwke-law-data.mjs':'export const wwkeSourceId="WWKE";',
   './catalogue-summary.mjs':'export const foundationSummaries={};',
   './topical-selection.mjs':'export const chooseTopicalPoints=()=>{throw Error("Unexpected material adoption");};',
   './cio-selection-notices.mjs':'export const cioSelectionNotices=()=>[],legacyCioMaterials=()=>[],supersededCioMaterials=()=>[];'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {subProposals,subProposalsByDetail,centralProposals,sourceQuestionPlan,modelQuestionPlan,processQuestionPlan,linkNewSelections,adoptSourceQuestionPlan,adoptModelQuestionPlan,adoptSubProposal,proposalReuseId,chooseProcess,adoptProcessQuestionPlan}=await import('./research-proposals.mjs');
const {adoptFoundationQuestions}=await import('./foundation-workspace.mjs');
const {questionLineIds,questionLinkSummary}=await import('./research-plan.mjs');
const {mappedQuestionSuggestions}=await import('./question-writing.mjs');
const {questionStartPreview,rankedQuestionStarts}=await import('./question-start.mjs');
const model={id:'M',selected:true,title:'Synthetic model',question:'Model question?',items:[{id:'dimension',title:'Model dimension',researchQuestion:'Model detail?'}]};
const draft=(root={planKey:'source:F',text:'Edited source question?'})=>({
 included:['m1','m2'],overrides:{},
 investigation:{sourceIds:['F'],materials:[{id:'m1',foundationId:'F',originKey:'F:one',title:'First norm'},
  {id:'m2',originKey:'M:one',location:'dimension / one',title:'Model point',topic:''}]},
 research:{questions:[{id:'root',parent_id:null,...root}],links:[]},
});
const setup=(forbidThemes=false)=>globalThis.planFixture={forbidThemes,themeReads:0,themeSubs:0,validations:0};
const keys=result=>result.map(s=>s.key);

test('question material lookup preserves link order, child scope and fresh selection without repeated selection scans',()=>{
 const input={included:['second','first','second','last'],research:{questions:[
  {id:'root',parent_id:null,text:'Own question?'},{id:'child',parent_id:'root',text:'Own detail?'},
  {id:'other',parent_id:null,text:'Other question?'}],links:[
  {question_id:'child',line_id:'last'},{question_id:'root',line_id:'first'},
  {question_id:'root',line_id:'excluded'},{question_id:'other',line_id:'second'},
  {question_id:'root',line_id:'first'},{question_id:'root',line_id:'second'},
  {question_id:'child',line_id:'first'}]}};
 const previous=(draft,id,children)=>[...new Set(draft.research.links.filter(link=>
  [id,...(children?draft.research.questions.filter(q=>q.parent_id===id).map(q=>q.id):[])].includes(link.question_id)
  &&draft.included.includes(link.line_id)).map(link=>link.line_id))];
 const check=()=>{const before=structuredClone(input);for(const id of ['root','child','other','missing'])for(const children of [false,true])
  assert.deepEqual(questionLineIds(input,id,children),previous(input,id,children));assert.deepEqual(input,before);};
 check();assert.deepEqual(questionLineIds(input,'root',true),['last','first','second']);
 // A fresh lookup observes even in-place edits; the membership set never survives a call.
 input.included.splice(0,input.included.length,'excluded','last');check();
 input.research.questions[1].parent_id='other';check();
 input.research.links.reverse();check();input.included.length=0;check();
 const ids=Array.from({length:5000},(_,i)=>'material-'+i);let reads=0;
 const included=new Proxy(ids,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
 const large={included,research:{questions:[{id:'root',parent_id:null},{id:'child',parent_id:'root'}],
  links:ids.toReversed().flatMap(line_id=>[{question_id:'child',line_id},{question_id:'root',line_id}])}};
 assert.deepEqual(questionLineIds(large,'root',true),ids.toReversed());
 assert.equal(reads,ids.length,'Selection membership is read once per lookup, independently of link count');
});

test('one-render link summaries preserve direct order, child unions, duplicates and fresh in-place changes',()=>{
 const input={included:['last','first','second','first'],research:{questions:[
  {id:'root',parent_id:null,text:'Own central wording'},
  {id:'child',parent_id:'root',text:'Own child wording'},
  {id:'other',parent_id:null,text:'Another central wording'},
  {id:'empty',parent_id:'other',text:''}],links:[
  {question_id:'child',line_id:'last'},{question_id:'root',line_id:'second'},
  {question_id:'other',line_id:'first'},{question_id:'root',line_id:'excluded'},
  {question_id:'root',line_id:'first'},{question_id:'root',line_id:'second'},
  {question_id:'child',line_id:'first'}]}};
 const check=()=>{
  const before=structuredClone(input),summary=questionLinkSummary(input);
  for(const q of input.research.questions)assert.deepEqual(summary.get(q.id),{
   direct:questionLineIds(input,q.id),total:questionLineIds(input,q.id,true).length});
  assert.deepEqual(input,before,'Summaries leave the full draft available for undo and export');
  return summary;
 };
 assert.deepEqual(check().get('root'),{direct:['second','first'],total:3});
 check().get('root').direct.push('caller-edit');check();
 input.research.questions[1].parent_id='other';check();
 input.research.links.reverse();check();
 input.research.links.push({question_id:'empty',line_id:'excluded'});
 input.included.splice(0,input.included.length,'excluded','last');check();
 input.research.links[0].line_id='excluded';check();
 input.research.links[0].question_id='root';check();
 input.research.questions.reverse();check();
 input.included.length=0;check();
 assert.deepEqual(questionLinkSummary({included:[]}),new Map());
});

test('large link summaries read the selection and link collection once for the complete question tree',()=>{
 const questions=Array.from({length:40},(_,i)=>({id:`q-${i+1}`,parent_id:i%10===0?null:`q-${Math.floor(i/10)*10+1}`}));
 const ids=Array.from({length:387},(_,i)=>`material-${i}`);
 const links=questions.flatMap(q=>ids.toReversed().map(line_id=>({question_id:q.id,line_id})));
 let selectionReads=0,linkReads=0;
 const observed=(values,read)=>new Proxy(values,{get(target,key,receiver){
  if(typeof key==='string'&&/^\d+$/.test(key))read();return Reflect.get(target,key,receiver);
 }});
 const summary=questionLinkSummary({included:observed(ids,()=>selectionReads++),research:{questions,
  links:observed(links,()=>linkReads++)}});
 assert.equal(selectionReads,ids.length);
 assert.equal(linkReads,links.length,'No repeated scan for each direct list or child total');
 for(const q of questions)assert.deepEqual(summary.get(q.id),{direct:ids.toReversed(),total:ids.length});
});

await test('known source central suggestions and prepared subquestions keep the form gate without changing saved text or mapping identities',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  for(const text of [...SLECHTE_VRAGEN.map(([,text])=>text),'Hoe is de taak verdeeld en hoe wordt erop gestuurd?']){
   setup();const input=draft(),before=structuredClone(input);
   source.central=text;source.subquestions=[{text,originKeys:['F:one']}];
   const valid=Boolean(questionCandidate(text,'onderzoeksvraag'));
   assert.equal(centralProposals(input).some(p=>p.sourceId==='F'),valid,text);
   assert.equal(sourceQuestionPlan(input,'F').text,text,'Explicit plan callers keep the known source, independently of central suggestion filtering');
   assert.equal(subProposals(input,'root').some(p=>p.key==='source:F:0'),valid,text);
   assert.deepEqual(input,before);
  }
  setup();source.central=beforeSource.central;
  source.subquestions=[{text:'Vraag nog uit te werken',originKeys:['F:one']},{text:'Valid question?',originKeys:['F:one']}];
  assert.deepEqual(keys(sourceQuestionPlan(draft(),'F').subquestions),['source:F:1']);
  const saved=draft({text:'Own root',planKey:'source:F',linkMode:'dimensions'});
  saved.research.questions.push({id:'saved-child',parent_id:'root',text:'Own saved wording',planPartKey:'source:F:0'});
  assert.deepEqual(linkNewSelections({...saved,included:[]},saved).research.links,[{line_id:'m1',question_id:'saved-child'}]);
 } finally {Object.assign(source,beforeSource);}
});

await test('explicit source adoption remains safe when central suggestions are withheld, including selected-only and fallback plans',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  for(const text of ['Centrale tekst zonder vraagteken','Hoe is de taak verdeeld en hoe wordt erop gestuurd?']) {
   setup();source.central=text;assert.equal(questionCandidate(text,'onderzoeksvraag'),'');
   for(const targetId of [undefined,'root']) {
    const input=draft(),before=structuredClone(input);
    if(!targetId)input.research={questions:[],links:[]};
    const saved=structuredClone(input);
    assert.equal(centralProposals(input).some(p=>p.sourceId==='F'),false);
    const adopted=adoptFoundationQuestions(input,'F',{selectedOnly:true,...(targetId?{targetId}:{})});
    const root=adopted.research.questions.find(q=>q.parent_id===null);
    assert.equal(root.text,targetId?before.research.questions[0].text:text);
    const child=adopted.research.questions.find(q=>q.parent_id===root.id);
    assert.equal(child.text,'Source detail?');
    assert.ok(adopted.research.links.some(l=>l.line_id==='m1'&&l.question_id===child.id));
    assert.deepEqual(input,saved);
    assert.equal(adoptFoundationQuestions(input,'unknown',{selectedOnly:true}),input);
   }
  }
  setup();const input=draft();input.investigation.sourceIds.push('FALLBACK');
  const fallback=sourceQuestionPlan(input,'FALLBACK');
  assert.equal(questionCandidate(fallback.text,'onderzoeksvraag'),'');
  assert.equal(adoptSourceQuestionPlan(input,'FALLBACK').draft.research.questions.find(q=>q.planKey==='source:FALLBACK').text,fallback.text);
  assert.equal(sourceQuestionPlan(input,'unknown'),null);
 } finally {Object.assign(source,beforeSource);}
});

await test('known process selection and explicit adoption do not depend on central suggestion eligibility',()=>{
 const process=globalThis.planProcess,previous=process.question;
 try {
  for(const text of ['Procestekst zonder vraagteken','Hoe is het proces ingericht en hoe werkt het?']) {
   setup();process.question=text;assert.equal(questionCandidate(text,'onderzoeksvraag'),'');
   const input=draft(),before=structuredClone(input),chosen=chooseProcess(input,'P');
   assert.equal(chosen.investigation.processId,'P');
   assert.equal(chosen.investigation.scope,process.title);
   assert.equal(centralProposals(chosen).some(p=>p.processId==='P'),false);
   assert.equal(processQuestionPlan(chosen,'P').text,text);
   const adopted=adoptProcessQuestionPlan(input,'P','dimensions');
   assert.equal(adopted.draft.investigation.processId,'P');
   assert.equal(adopted.draft.research.questions.find(q=>q.id===adopted.questionId).text,text);
   assert.deepEqual(input,before);
   assert.equal(processQuestionPlan(input,'unknown'),null);
   assert.throws(()=>chooseProcess(input,'unknown'),/Onbekend proces/);
   assert.throws(()=>adoptProcessQuestionPlan(input,'unknown'),/Onbekend proces/);
  }
 } finally {process.question=previous;}
});

await test('custom material text survives source previews, menus and explicit adoption without approving matching catalogue text',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  for(const text of ['Eigen vraag zonder vraagteken','Hoe '+ 'eigen '.repeat(45)+'tekst?']){
   setup();assert.equal(questionCandidate(text,'onderzoeksvraag'),'');
   const input=draft();input.included.push('own');
   input.investigation.materials.push({id:'own',foundationId:'F',title:'Eigen materiaal',question:text});
   const before=structuredClone(input),key='source:F:material:own';
   // Even identical wording must not make a catalogue question eligible.
   source.subquestions=[{key:'rejected',text,originKeys:['F:one']}];
   const plan=sourceQuestionPlan(input,'F');
   assert.deepEqual(plan.subquestions.map(q=>[q.key,q.text]),[[key,text]]);
   const central=centralProposals(input).find(p=>p.sourceId==='F');
   assert.equal(central.subquestions[0].text,text);
   const preview=questionStartPreview(input,central,{targetId:'root'});
   assert.equal(preview.subs.find(q=>q.key===key).text,text);
   assert.equal(mappedQuestionSuggestions(subProposals(input,'root'),input)[0].text,text);
   for(const adopted of [adoptSourceQuestionPlan(input,'F','dimensions',{selectedKeys:[key]}).draft,adoptSubProposal(input,'root',key)]){
    const own=adopted.research.questions.find(q=>q.planPartKey===key);
    assert.equal(own.text,text);
    assert.ok(adopted.research.links.some(l=>l.line_id==='own'&&l.question_id===own.id));
   }
   assert.deepEqual(input,before);
  }
 } finally {Object.assign(source,beforeSource);}
});

await test('locally edited model central and item questions survive ranking, previews and explicit adoption',()=>{
 for(const text of ['Eigen centrale tekst zonder vraagteken','Hoe '+ 'eigen '.repeat(45)+'modeltekst?']){
  for(const withSubquestions of [false,true]){
   setup();assert.equal(questionCandidate(text,'onderzoeksvraag'),'');
   const edited={...model,question:text,items:[{...model.items[0],researchQuestion:text}],
    ...(withSubquestions?{researchSubquestions:[{id:'own-sub',question:text,indicatorIds:['one']}]}:{})};
   const context={models:[edited]},input=draft(),before=structuredClone({input,edited});
   const proposal=centralProposals(input,context).find(p=>p.modelId==='M');
   assert.equal(proposal.text,text);assert.equal(proposal.subquestions[0].text,text);
   assert.equal(modelQuestionPlan(input,'M',context).text,text);
   assert.equal(rankedQuestionStarts(input,context,[proposal])[0].proposal.text,text);
   const preview=questionStartPreview(input,proposal,context);
   assert.equal(preview.draft.research.questions.find(q=>q.id===preview.questionId).text,text);
   assert.equal(preview.subs[0].text,text);
   const adopted=adoptModelQuestionPlan(input,'M','dimensions',context);
   assert.equal(adopted.draft.research.questions.find(q=>q.id===adopted.questionId).text,text);
   const child=adopted.draft.research.questions.find(q=>q.parent_id===adopted.questionId);
   assert.equal(child.text,text);
   assert.ok(adopted.draft.research.links.some(l=>l.line_id==='m2'&&l.question_id===child.id));
   assert.deepEqual({input,edited},before);
  }
 }
});

await test('exact source plans skip unused themes and retain precise source mappings and missing criteria',()=>{
 const calls=setup(true),input=draft(),before=structuredClone(input);
 const result=subProposals(input,'root');
 assert.deepEqual(keys(result),['source:F:one']);assert.deepEqual(result[0].ids,['m1']);
 assert.deepEqual(result[0].selectedTitles,['First norm']);
 assert.deepEqual(result[0].missingCriteria,[{originKey:'F:missing',code:'F:missing',title:'Niet beschikbaar in de huidige catalogus',available:false}]);
 assert.equal(calls.validations,1);assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);
 assert.deepEqual(input,before);
});

await test('model and process branches do not build discarded theme suggestions',()=>{
 for(const root of [{text:'Edited model?',modelId:'M',modelSubject:''},{text:'Edited process?',planKey:'process:P'}]){
  const calls=setup(true),input=draft(root);
  const result=subProposals(input,'root',null,{models:[model]});
  assert.deepEqual(keys(result),[root.modelId?'model:M:dimension':'process:P:0']);
  assert.equal(result[0].text,root.modelId?'Model detail?':'Process detail?');
  assert.deepEqual(result[0].ids,root.modelId?['m2']:[]);
  assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);assert.equal(calls.validations,1);
 }
});

await test('theme, custom and design branches keep selection suggestions and goal advice',()=>{
 let calls=setup();
 assert.deepEqual(keys(subProposals(draft({text:'Theme question?'}),'root')),['theme:one']);
 assert.equal(calls.themeReads,1);assert.equal(calls.themeSubs,1);
 calls=setup();
 const own=draft({text:'Own question?'});own.investigation.goal={direction:'diagnostic',subject:'Topic'};
 assert.deepEqual(keys(subProposals(own,'root')),['theme:one','source:F:one','design:one','advice']);
 assert.equal(calls.themeReads,1);assert.equal(calls.themeSubs,1);
 calls=setup();
 const design=draft({text:'Designed question?',researchDesign:{direction:'diagnostic',topic:'Topic'}});
 assert.deepEqual(keys(subProposals(design,'root')),['design:one','theme:one','source:F:one','advice']);
 assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,1);
});

await test('adopted choices, target editing and overlap retain their existing filtering',()=>{
 setup(true);const input=draft();
 input.research.questions.push({id:'child',parent_id:'root',text:'Own detail',planPartKey:'source:F:one'});
 input.research.links.push({line_id:'m1',question_id:'child'});
 assert.deepEqual(subProposals(input,'root'),[]);
 assert.deepEqual(subProposals(input,'root',null,{allowOverlap:true}),[]);
 assert.deepEqual(keys(subProposals(input,'root',null,{includeAdopted:true})),['source:F:one']);
 assert.deepEqual(keys(subProposals(input,'root','child')),['source:F:one']);
});

await test('every call still validates the current evidence even when a precise plan matches',()=>{
 const calls=setup(true),input=draft();subProposals(input,'root');
 const before=calls.validations;input.investigation.invalid=true;
 assert.throws(()=>subProposals(input,'root'),/Invalid current evidence/);
 assert.ok(calls.validations>before);
});

await test('proposal filtering preserves saved-link scope, ordering and fresh edits for every menu mode',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 const normalized=text=>(text||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl');
 try {
  source.subquestions=[
   {key:'ordered',text:'Which materials apply?',ids:['m2','m1','m2','excluded']},
   {key:'partial',text:'Which part applies?',ids:['m1']},
   {key:'empty',text:'Which scope applies?',ids:[]},
  ];
  const input=draft();
  input.research.questions.push(
   {id:'child',parent_id:'root',text:'  WHICH   MATERIALS APPLY?  ',origin:'user'},
   {id:'empty',parent_id:'root',text:'',origin:'user'},
   {id:'other',parent_id:null,text:'Own other root',origin:'user'});
  const check=()=>{
   const before=structuredClone(input);
   for(const targetId of [null,'child','empty'])for(const allowOverlap of [false,true])for(const includeAdopted of [false,true]){
    setup(true);
    const all=subProposals(input,'root',targetId,{includeAdopted:true});
    const children=input.research.questions.filter(q=>q.parent_id==='root'&&q.id!==targetId),links=input.research.links;
    const same=(a,b)=>normalized(a)===normalized(b);
    const expected=includeAdopted?all:all.filter(s=>!children.some(q=>allowOverlap
     ? q.planPartKey===s.key || q.modelDimensionKey===s.key ||
       (same(q.text,s.text)&&s.ids.every(id=>links.some(l=>l.line_id===id&&l.question_id===q.id)))
     : (same(q.text,s.text)&&(!s.ids.length||s.ids.every(id=>links.some(l=>l.line_id===id)))) ||
       (!targetId&&q.text.trim()&&s.ids.length&&s.ids.every(id=>links.some(l=>l.line_id===id&&l.question_id===q.id)))));
    assert.deepEqual(subProposals(input,'root',targetId,{allowOverlap,includeAdopted}),expected);
    assert.equal(globalThis.planFixture.validations,2,'Every calculation validates the current investigation');
   }
   assert.deepEqual(input,before,'Menus must not edit saved text, question order or links');
  };
  check();
  input.research.links.push(...['m2','m1','m2','excluded'].map(line_id=>({question_id:'other',line_id})));check();
  // Complete links on another question only suppress equal wording in default mode.
  setup(true);assert.deepEqual(keys(subProposals(input,'root')),['source:F:partial','source:F:empty']);
  assert.deepEqual(subProposals(input,'root',null,{allowOverlap:true})[0].ids,['m2','m1','m2','excluded']);
  for(const link of input.research.links)link.question_id='child';check();
  input.research.links[0].line_id='changed';input.research.links.reverse();check();
  input.included.splice(0,input.included.length,'m1');check();
  input.research.questions[1].text='Own edited wording';check();
  input.research.questions[1].planPartKey='source:F:ordered';check();
  input.research.questions[1].parent_id='other';check();
  input.research.questions[2].text='Which scope applies?';check();
  input.research.questions.reverse();source.subquestions.reverse();check();
  input.investigation.invalid=true;
  assert.throws(()=>subProposals(input,'root'),/Invalid current evidence/);
 } finally {Object.assign(source,beforeSource);}
});

await test('large proposal filtering reads saved links once and does not inspect them for unfiltered menus',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  const input=draft(),ids=Array.from({length:387},(_,i)=>`material-${i}`);
  source.subquestions=Array.from({length:12},(_,i)=>({key:`part-${i}`,text:`Which part ${i} applies?`,ids:ids.slice(i*32,(i+1)*32)}));
  input.research.questions=Array.from({length:40},(_,i)=>({id:i===0?'root':`q-${i}`,parent_id:i%10===0?null:i<10?'root':`q-${Math.floor(i/10)*10}`,text:`Own question ${i}?`}));
  input.research.questions[0].planKey='source:F';
  const links=input.research.questions.flatMap(q=>ids.map(line_id=>({question_id:q.id,line_id})));
  let reads=0;
  input.research.links=new Proxy(links,{get(target,key,receiver){
   if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);
  }});
  setup(true);assert.deepEqual(subProposals(input,'root'),[]);assert.equal(reads,links.length);
  reads=0;assert.equal(subProposals(input,'root',null,{includeAdopted:true}).length,12);assert.equal(reads,0);
  input.research.questions=input.research.questions.filter(q=>q.parent_id!=='root');
  assert.equal(subProposals(input,'root').length,12);assert.equal(reads,0);
 } finally {Object.assign(source,beforeSource);}
});

await test('combined and public plan boundaries validate once per call and never reuse a prior snapshot',()=>{
 const input=draft({text:'Process question?',planKey:'process:P'}),context={models:[model]};
 for(const calculate of [d=>centralProposals(d,context),d=>sourceQuestionPlan(d,'F'),
  d=>modelQuestionPlan(d,'M',context),d=>processQuestionPlan(d,'P')]){
  const calls=setup();const before=structuredClone(input);const first=calculate(input);
  assert.equal(calls.validations,1);assert.deepEqual(input,before);
  // Outputs are ordinary caller-owned objects, not shared cached plans.
  const result=Array.isArray(first)?first[0]:first;result.subquestions[0].text='Changed returned plan';
  const next=calculate(input);assert.equal(calls.validations,2);
  assert.notEqual((Array.isArray(next)?next[0]:next).subquestions[0].text,'Changed returned plan');
  assert.throws(()=>calculate({...input,investigation:{...input.investigation,invalid:true}}),/Invalid current evidence/);
  assert.equal(calls.validations,3);
 }
 assert.equal(processQuestionPlan(input,'unknown'),null);
});

await test('changed selections and saved model subjects remain current',()=>{
 setup(true);const input=draft();
 assert.deepEqual(subProposals(input,'root')[0].ids,['m1']);
 input.included=['m2'];const result=subProposals(input,'root')[0];
 assert.deepEqual(result.ids,[]);assert.ok(result.missingCriteria.some(m=>m.originKey==='F:one'));
 const modelDraft=draft({text:'Own model question?',modelId:'M',modelSubject:'Saved topic'});
 modelDraft.investigation.materials[1].topic='Saved topic';
 assert.deepEqual(subProposals(modelDraft,'root',null,{models:[{...model,researchSubject:'Current topic'}]})[0].ids,['m2']);
});

await test('detail variants share one validation while retaining distinct coverage, order and overlap rules',()=>{
 const input=draft({text:'Edited CIO question?',planKey:'source:CIO'});
 input.investigation.sourceIds=['CIO'];
 input.investigation.materials=[{id:'m1',foundationId:'CIO',originKey:'CIO:point1',title:'First'},
  {id:'m2',foundationId:'CIO',originKey:'CIO:point2',title:'Second'}];
 input.research.questions.push({id:'child',parent_id:'root',text:'My specific wording',planPartKey:'source:CIO:one'});
 input.research.links.push({question_id:'child',line_id:'m1'});
 const before=structuredClone(input),levels=['broad','specific'];
 for(const context of [{},{allowOverlap:true},{includeAdopted:true}]){
  setup(true);const expected=levels.flatMap(detail=>subProposals(input,'root',null,{...context,subquestionDetail:detail}));
  const calls=setup(true),actual=subProposalsByDetail(input,'root',levels,context);
  assert.deepEqual(actual,expected);assert.equal(calls.validations,1);assert.deepEqual(input,before);
 }
 const calls=setup(true),all=subProposalsByDetail(input,'root',levels,{includeAdopted:true});
 assert.deepEqual(keys(all),['source:CIO:broad:both','source:CIO:one','source:CIO:two']);
 assert.deepEqual(all.map(s=>s.ids),[['m1','m2'],['m1'],['m2']]);
 all[0].ids.length=0;
 assert.deepEqual(subProposalsByDetail(input,'root',levels,{includeAdopted:true})[0].ids,['m1','m2']);
 assert.equal(calls.validations,2,'Each call gets a fresh validation; returned plans are caller-owned');
 input.included=['m2'];
 assert.deepEqual(subProposalsByDetail(input,'root',levels,{includeAdopted:true}).map(s=>s.ids),[['m2'],[],['m2']]);
 input.investigation.invalid=true;
 assert.throws(()=>subProposalsByDetail(input,'root',levels),/Invalid current evidence/);
});

await test('detail variants preserve non-CIO branches and saved model subjects without exposing validation shortcuts',()=>{
 for(const root of [{text:'Theme question?'},{text:'Custom question?'},
  {text:'Model?',modelId:'M',modelSubject:'Saved topic'},{text:'Process?',planKey:'process:P'}]){
  const input=draft(root);input.investigation.materials[1].topic='Saved topic';
  const context={models:[{...model,researchSubject:'Current topic'}],includeAdopted:true};
  setup();const expected=subProposals(input,'root',null,{...context,subquestionDetail:'specific'});
  const calls=setup();assert.deepEqual(subProposalsByDetail(input,'root',['specific'],context),expected);
  assert.equal(calls.validations,1);
 }
 const calls=setup(),input=draft();
 assert.deepEqual(subProposalsByDetail(input,'missing',['specific']),[]);
 assert.deepEqual(subProposalsByDetail(input,'root',[]),[]);
 input.research.questions.push({id:'child',parent_id:'root',text:'Child'});
 assert.deepEqual(subProposalsByDetail(input,'child',['specific']),[]);
 assert.equal(calls.validations,0,'Absent menus keep the original early return');
});

await test('new selection linking shares validation but retains explicit manual choices',()=>{
 const calls=setup(),input=draft({planKey:'source:F',text:'Own root',linkMode:'central'}),before=structuredClone(input);
 const previous={...input,included:[]};
 const linked=linkNewSelections(previous,input);
 assert.equal(calls.validations,1);assert.deepEqual(linked.research.links,[{line_id:'m1',question_id:'root'}]);
 assert.deepEqual(input,before);
 const manual=draft({planKey:'source:F',text:'Own root',linkMode:'manual'});
 assert.equal(linkNewSelections(previous,manual),manual);assert.equal(calls.validations,2);
 const existing={...input,research:{...input.research,links:[{line_id:'m1',question_id:'other'}]}};
 assert.equal(linkNewSelections(previous,existing),existing);assert.equal(calls.validations,3);
 assert.throws(()=>linkNewSelections(previous,{...input,investigation:{...input.investigation,invalid:true}}),/Invalid current evidence/);
 assert.equal(calls.validations,4);
});

await test('adopting a subquestion reuses its fresh proposal for identity, wording and empty-question matching',()=>{
 for(const kind of ['source','model'])for(const match of ['identity','wording','empty','new']){
  const key=kind==='source'?'source:F:one':'model:M:dimension';
  const text=kind==='source'?'Source detail?':'Model detail?',lineId=kind==='source'?'m1':'m2';
  const input=draft(kind==='source'?undefined:{text:'Own model?',modelId:'M'});
  const identity=kind==='source'?'planPartKey':'modelDimensionKey';
  input.research.questions.push({id:'other',parent_id:null,text:'Keep other root',origin:'user'});
  input.research.links.push({question_id:'other',line_id:lineId});
  if(match!=='new')input.research.questions.push({id:'saved',parent_id:'root',origin:'user',
   text:match==='identity'?'Own saved wording':match==='wording'?'  '+text.toUpperCase()+'  ':'',
   ...(match==='identity'?{[identity]:key}:{})});
  if(match==='empty')input.research.links.push({question_id:'saved',line_id:lineId});
  const context={models:[model],allowOverlap:true,includeAdopted:true};
  const before=structuredClone(input),calls=setup(true);
  const next=adoptSubProposal(input,'root',key,context,{formulation:'Own new wording'});
  assert.equal(calls.validations,1,'One current proposal calculation per adoption');
  const child=next.research.questions.find(q=>q.parent_id==='root');
  assert.equal(child[identity],key);
  assert.equal(child.text,match==='identity'?'Own saved wording':match==='new'?'Own new wording':text);
  if(match!=='new')assert.equal(child.id,'saved');
  assert.deepEqual(next.research.links,[{question_id:'other',line_id:lineId},{question_id:child.id,line_id:lineId}]);
  assert.deepEqual(next.included,input.included);assert.deepEqual(next.investigation,input.investigation);
  assert.deepEqual(input,before,'The previous draft remains available for undo');
  assert.equal(proposalReuseId(next,'root',key,context),child.id);
  assert.equal(calls.validations,2,'Public reuse lookup still calculates and validates afresh');
  next.investigation={...next.investigation,invalid:true};
  assert.throws(()=>adoptSubProposal(next,'root',key,context),/Invalid current evidence/);
  assert.throws(()=>proposalReuseId(next,'root',key,context),/Invalid current evidence/);
 }
});

await test('successive adoptions observe new selection, source mappings and overlap rules',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  const input=draft(),before=structuredClone(input),calls=setup(true);
  input.research.questions.push({id:'other',parent_id:null,text:'Other question'});
  input.research.links.push({question_id:'other',line_id:'m1'});
  const blocked=adoptSubProposal(input,'root','source:F:one');
  assert.deepEqual(blocked.research.links,input.research.links,'Default adoption leaves already linked material alone');
  assert.equal(calls.validations,1);
  const overlap=adoptSubProposal(input,'root','source:F:one',{allowOverlap:true});
  assert.equal(overlap.research.links.length,2);assert.equal(calls.validations,2);
  assert.equal(adoptSubProposal(overlap,'root','source:F:one',{allowOverlap:true}),overlap);
  assert.equal(calls.validations,3,'Already adopted choices still recheck current evidence');
  source.subquestions=[{key:'one',text:'Changed source detail?',originKeys:['M:one']}];
  const changed={...input,included:['m2'],investigation:{...input.investigation,
   materials:input.investigation.materials.map(m=>({...m,foundationId:'F'}))}};
  assert.equal(proposalReuseId(changed,'root','source:F:one'),null);
  const next=adoptSubProposal(changed,'root','source:F:one',{allowOverlap:true});
  assert.equal(next.research.questions.at(-1).text,'Changed source detail?');
  assert.equal(next.research.links.at(-1).line_id,'m2');
  assert.equal(adoptSubProposal(input,'root','missing'),input);
  assert.deepEqual(input.investigation,before.investigation);
 } finally {Object.assign(source,beforeSource);}
});

await test('source mappings preserve material order, explicit IDs, missing criteria and scope exclusions',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 try {
  const input=draft();
  input.included=['last','first','duplicate-origin'];
  input.investigation.materials=[
   {id:'first',foundationId:'F',originKey:'F:one',title:'First title'},
   {id:'unselected',foundationId:'F',originKey:'F:unselected',title:'Not selected'},
   {id:'duplicate-origin',foundationId:'F',originKey:'F:one',title:'Other saved title'},
   {id:'last',foundationId:'F',originKey:'F:last',title:'Last title'},
  ];
  const before=structuredClone(input);
  const originKeys=['F:last','F:missing','F:one','F:missing','F:scope','F:unselected'];
  for(const explicit of [undefined,[],['last','first','last','outside']]){
   const question={key:'ordered',text:'Which mapping applies?',originKeys,
    ...(explicit?{ids:explicit}:{})};
   source.subquestions=[question];
   const savedQuestion=structuredClone(question);setup(true);
   const plan=sourceQuestionPlan(input,'F').subquestions[0];
   assert.deepEqual(plan.ids,explicit??['first','duplicate-origin','last']);
   assert.deepEqual(plan.selectedTitles,explicit?.length===0?[]:
    explicit?['First title','Last title']:['First title','Other saved title','Last title']);
   assert.deepEqual(plan.missingCriteria.map(m=>m.originKey),explicit?.length===0
    ?['F:last','F:missing','F:one','F:unselected']:['F:missing','F:unselected']);
   assert.equal(plan.scopeNote,'Controleer of de vraag past bij je selectie.');
   assert.deepEqual(question,savedQuestion);assert.deepEqual(input,before);
  }
 } finally {Object.assign(source,beforeSource);}
});

await test('large plan selections use bounded membership work and preserve material order across fresh calls',()=>{
 const source=globalThis.planSourcePlan,beforeSource=structuredClone(source);
 const process=globalThis.planProcess,beforeProcess=structuredClone(process);
 try {
  const input=draft(),size=1200;
  input.investigation.materials=Array.from({length:size},(_,i)=>({id:'m'+i,foundationId:'F',
   originKey:i%2?'M:one':'F:one',location:'dimension / one',title:'Saved title '+i,topic:''}));
  source.subquestions=[{key:'one',text:'Source detail?',originKeys:['F:one']}];
  // PR02 supplies an explicit source mapping; exercise process filtering too.
  process.id='PR02';
  input.investigation.materials[0].originKey='NIS2:2022-2555-C2:022';
  const ids=input.investigation.materials.filter((_,i)=>i%3!==2).map(m=>m.id).reverse();
  ids.push(ids[0],'unknown');
  let reads=0;
  input.included=new Proxy(ids,{get(target,key,receiver){
   if(/^\d+$/.test(String(key)))reads++;
   return Reflect.get(target,key,receiver);
  }});
  const verify=()=>{
   const selected=new Set(ids),materials=input.investigation.materials.filter(m=>selected.has(m.id));
   const calls=setup(true);reads=0;
   const sourcePlan=sourceQuestionPlan(input,'F'),modelPlan=modelQuestionPlan(input,'M',{models:[model]});
   const processPlan=processQuestionPlan(input,'PR02');
   assert.deepEqual(sourcePlan.subquestions[0].ids,materials.filter(m=>m.originKey==='F:one').map(m=>m.id));
   assert.deepEqual(sourcePlan.subquestions[0].selectedTitles,materials.filter(m=>m.originKey==='F:one').map(m=>m.title));
   assert.deepEqual(modelPlan.subquestions[0].ids,materials.filter(m=>m.originKey==='M:one').map(m=>m.id));
   assert.deepEqual(processPlan.subquestions[0].ids,materials.filter(m=>m.originKey==='NIS2:2022-2555-C2:022').map(m=>m.id));
   assert.ok(reads<=ids.length*6,`Selection reads must scale with selection size, got ${reads}`);
   assert.equal(calls.validations,3,'Every public plan still validates the current investigation');
  };
  verify();
  ids.splice(0,ids.length,'m7','m6','m0','m7');
  input.investigation.materials[6].title='Own revised title';
  verify();
  input.investigation.invalid=true;
  for(const read of [()=>sourceQuestionPlan(input,'F'),()=>modelQuestionPlan(input,'M',{models:[model]}),()=>processQuestionPlan(input,'PR02')])
   assert.throws(read,/Invalid current evidence/);
 } finally {Object.assign(source,beforeSource);Object.assign(process,beforeProcess);}
});
