import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';

// The real proposal algorithm, with independent synthetic sources and observable
// boundary checks. No private catalogue, persisted project or source file needed.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!['/research-proposals.mjs','/research-plan.mjs','/foundation-workspace.mjs'].some(file=>context.parentURL?.endsWith(file)))return next(specifier,context);
  const fixtures={
   './theme-workspaces.mjs':
    'export function centralSuggestions(){globalThis.planFixture.themeReads++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme scan");return [{text:"Theme question?"}];}export function scopedSubSuggestions(){globalThis.planFixture.themeSubs++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme suggestions");return [{key:"theme:one",text:"Theme detail?",ids:["m1"]}];}export const themeCatalogue=()=>[];',
   './foundations/registry.mjs':'export const foundationQuestionPlans={F:{central:"Source question?",subquestions:[{key:"one",text:"Source detail?",originKeys:["F:one","F:missing","F:scope"]}]}};globalThis.planSourcePlan=foundationQuestionPlans.F;',
   './investigation.mjs':
    'export const foundations=[{id:"F",title:"Synthetic framework",url:"https://example.org/framework"},{id:"CIO",title:"Synthetic CIO",url:"https://example.org/cio"},{id:"FALLBACK",title:"Synthetic fallback"}];export const foundationProposals=[{originKey:"F:one",title:"First norm"},{originKey:"F:scope",auditRole:"scope"}];export function validateInvestigation(value){globalThis.planFixture.validations++;if(value.invalid)throw Error("Invalid current evidence");return structuredClone(value);}export const addMaterials=()=>{throw Error("Unexpected material adoption");};',
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
const {subProposals,subProposalsByDetail,centralProposals,sourceQuestionPlan,modelQuestionPlan,processQuestionPlan,linkNewSelections,adoptSourceQuestionPlan,adoptModelQuestionPlan,adoptSubProposal,chooseProcess,adoptProcessQuestionPlan}=await import('./research-proposals.mjs');
const {adoptFoundationQuestions}=await import('./foundation-workspace.mjs');
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

test('known source central suggestions and prepared subquestions keep the form gate without changing saved text or mapping identities',()=>{
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

test('explicit source adoption remains safe when central suggestions are withheld, including selected-only and fallback plans',()=>{
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

test('known process selection and explicit adoption do not depend on central suggestion eligibility',()=>{
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

test('custom material text survives source previews, menus and explicit adoption without approving matching catalogue text',()=>{
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

test('locally edited model central and item questions survive ranking, previews and explicit adoption',()=>{
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

test('exact source plans skip unused themes and retain precise source mappings and missing criteria',()=>{
 const calls=setup(true),input=draft(),before=structuredClone(input);
 const result=subProposals(input,'root');
 assert.deepEqual(keys(result),['source:F:one']);assert.deepEqual(result[0].ids,['m1']);
 assert.deepEqual(result[0].selectedTitles,['First norm']);
 assert.deepEqual(result[0].missingCriteria,[{originKey:'F:missing',code:'F:missing',title:'Niet beschikbaar in de huidige catalogus',available:false}]);
 assert.equal(calls.validations,1);assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);
 assert.deepEqual(input,before);
});

test('model and process branches do not build discarded theme suggestions',()=>{
 for(const root of [{text:'Edited model?',modelId:'M',modelSubject:''},{text:'Edited process?',planKey:'process:P'}]){
  const calls=setup(true),input=draft(root);
  const result=subProposals(input,'root',null,{models:[model]});
  assert.deepEqual(keys(result),[root.modelId?'model:M:dimension':'process:P:0']);
  assert.equal(result[0].text,root.modelId?'Model detail?':'Process detail?');
  assert.deepEqual(result[0].ids,root.modelId?['m2']:[]);
  assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);assert.equal(calls.validations,1);
 }
});

test('theme, custom and design branches keep selection suggestions and goal advice',()=>{
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

test('adopted choices, target editing and overlap retain their existing filtering',()=>{
 setup(true);const input=draft();
 input.research.questions.push({id:'child',parent_id:'root',text:'Own detail',planPartKey:'source:F:one'});
 input.research.links.push({line_id:'m1',question_id:'child'});
 assert.deepEqual(subProposals(input,'root'),[]);
 assert.deepEqual(subProposals(input,'root',null,{allowOverlap:true}),[]);
 assert.deepEqual(keys(subProposals(input,'root',null,{includeAdopted:true})),['source:F:one']);
 assert.deepEqual(keys(subProposals(input,'root','child')),['source:F:one']);
});

test('every call still validates the current evidence even when a precise plan matches',()=>{
 const calls=setup(true),input=draft();subProposals(input,'root');
 const before=calls.validations;input.investigation.invalid=true;
 assert.throws(()=>subProposals(input,'root'),/Invalid current evidence/);
 assert.ok(calls.validations>before);
});

test('combined and public plan boundaries validate once per call and never reuse a prior snapshot',()=>{
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

test('changed selections and saved model subjects remain current',()=>{
 setup(true);const input=draft();
 assert.deepEqual(subProposals(input,'root')[0].ids,['m1']);
 input.included=['m2'];const result=subProposals(input,'root')[0];
 assert.deepEqual(result.ids,[]);assert.ok(result.missingCriteria.some(m=>m.originKey==='F:one'));
 const modelDraft=draft({text:'Own model question?',modelId:'M',modelSubject:'Saved topic'});
 modelDraft.investigation.materials[1].topic='Saved topic';
 assert.deepEqual(subProposals(modelDraft,'root',null,{models:[{...model,researchSubject:'Current topic'}]})[0].ids,['m2']);
});

test('detail variants share one validation while retaining distinct coverage, order and overlap rules',()=>{
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

test('detail variants preserve non-CIO branches and saved model subjects without exposing validation shortcuts',()=>{
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

test('new selection linking shares validation but retains explicit manual choices',()=>{
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
