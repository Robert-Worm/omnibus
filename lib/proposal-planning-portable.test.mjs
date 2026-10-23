import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// The real proposal algorithm, with independent synthetic sources and observable
// boundary checks. No private catalogue, persisted project or source file needed.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/research-proposals.mjs'))return next(specifier,context);
  const fixtures={
   './theme-workspaces.mjs':
    'export function centralSuggestions(){globalThis.planFixture.themeReads++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme scan");return [{text:"Theme question?"}];}export function scopedSubSuggestions(){globalThis.planFixture.themeSubs++;if(globalThis.planFixture.forbidThemes)throw Error("Unneeded theme suggestions");return [{key:"theme:one",text:"Theme detail?",ids:["m1"]}];}export const themeCatalogue=()=>[];',
   './foundations/registry.mjs':'export const foundationQuestionPlans={F:{central:"Source question?",subquestions:[{key:"one",text:"Source detail?",originKeys:["F:one","F:missing","F:scope"]}]}};',
   './investigation.mjs':
    'export const foundations=[{id:"F",title:"Synthetic framework",url:"https://example.org/framework"}];export const foundationProposals=[{originKey:"F:one",title:"First norm"},{originKey:"F:scope",auditRole:"scope"}];export function validateInvestigation(value){globalThis.planFixture.validations++;if(value.invalid)throw Error("Invalid current evidence");return structuredClone(value);}',
   './research-plan.mjs':'export const researchOf=d=>d.research;export const addQuestion=()=>{},editQuestion=()=>{},linkLine=()=>{},setQuestionDesign=()=>{};',
   './process-catalogue.mjs':'export const activeProcesses=[{id:"P",title:"Synthetic process",question:"Process question?",sourceIds:["F"]}];export const processResearchTopics={P:["Process detail"]};',
   './research-directions.mjs':'export const directionPlan=d=>d?{text:"Design question?",subquestions:[{key:"design:one",text:"Design detail?",ids:[]}],advice:{key:"advice",text:"Advice?",ids:[]}}:null;export const intendedUseQuestion=()=>null;',
   './research-goal.mjs':'export const researchGoalText=()=>"";',
   './model-context.mjs':'export const contextualModelQuestion=m=>m.question;export const contextualQuestion=q=>q;',
   './research-wording.mjs':'export const directedSourceQuestions=(_id,questions)=>questions;export const researchTopicQuestion=t=>t+"?";',
   './cio-law-data.mjs':'export const cioSourceId="CIO",cioCatalogue={objectives:[],points:[]};',
   './cio-question-detail.mjs':'export const cioQuestionGroups=()=>[];',
   './research-question-formulations.mjs':'export const proposalFormulation=(text,own)=>own??text;',
   './catalogue-runtime.mjs':'export const catalogueDerived=f=>f();',
   './topical-content.mjs':'export const topicalPackage=()=>null;'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {subProposals}=await import('./research-proposals.mjs');
const model={id:'M',selected:true,title:'Synthetic model',question:'Model question?',items:[{id:'dimension',title:'Model dimension',researchQuestion:'Model detail?'}]};
const draft=(root={planKey:'source:F',text:'Edited source question?'})=>({
 included:['m1','m2'],overrides:{},
 investigation:{sourceIds:['F'],materials:[{id:'m1',foundationId:'F',originKey:'F:one',title:'First norm'},
  {id:'m2',originKey:'M:one',location:'dimension / one',title:'Model point',topic:''}]},
 research:{questions:[{id:'root',parent_id:null,...root}],links:[]},
});
const setup=(forbidThemes=false)=>globalThis.planFixture={forbidThemes,themeReads:0,themeSubs:0,validations:0};
const keys=result=>result.map(s=>s.key);

test('exact source plans skip unused themes and retain precise source mappings and missing criteria',()=>{
 const calls=setup(true),input=draft(),before=structuredClone(input);
 const result=subProposals(input,'root');
 assert.deepEqual(keys(result),['source:F:one']);assert.deepEqual(result[0].ids,['m1']);
 assert.deepEqual(result[0].selectedTitles,['First norm']);
 assert.deepEqual(result[0].missingCriteria,[{originKey:'F:missing',code:'F:missing',title:'Niet beschikbaar in de huidige catalogus',available:false}]);
 assert.ok(calls.validations>0);assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);
 assert.deepEqual(input,before);
});

test('model and process branches do not build discarded theme suggestions',()=>{
 for(const root of [{text:'Edited model?',modelId:'M',modelSubject:''},{text:'Edited process?',planKey:'process:P'}]){
  const calls=setup(true),input=draft(root);
  const result=subProposals(input,'root',null,{models:[model]});
  assert.deepEqual(keys(result),[root.modelId?'model:M:dimension':'process:P:0']);
  assert.equal(result[0].text,root.modelId?'Model detail?':'Process detail?');
  assert.deepEqual(result[0].ids,root.modelId?['m2']:[]);
  assert.equal(calls.themeReads,0);assert.equal(calls.themeSubs,0);assert.ok(calls.validations>0);
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
