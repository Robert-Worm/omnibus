import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// Synthetic boundary doubles: inspect the exact inputs delivered to the existing
// workbook generator without importing the separately distributed catalogue.
register('data:text/javascript,' + encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/export-state.ts'))return next(specifier,context);
  const fixtures={
   '../lib/model-library.mjs':\`export const scopedExportSelection=(f,d)=>({included:d.included,themes:[],themeIds:['t'],excludedNorms:['outside']});
    export const exportDraftForSelection=(d,ids)=>({...d,included:ids});
    export function selectedModelOptions(m,interview){if(!m)throw Error('Choose a model');return {basis:'own',modelTitle:m.title,modelItems:m.items,interview};}\`,
   '../lib/creator-model.mjs':\`export function creatorWorkbookModel(f,d,o){
    if(o.profile==='testing'&&o.testingAspects?.length===0)throw Error('Choose testing aspects');
    return {selection:{norms:d.included.length},sheets:[],inputs:{framework:f,draft:d,options:o}};}\`,
   '../lib/excel-model.mjs':'export const requiredExportFields=()=>({});',
   '../lib/interview-structure.mjs':'export const modelDisplayName=m=>m.title;',
   '../lib/planning-review.mjs':'export const planningReview=(f,d,ids)=>d.research.questions.filter(q=>!d.research.links.some(l=>l.question_id===q.id&&ids.includes(l.line_id)));'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {exportState}=await import('./export-state.ts');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const framework=freeze({lines:[{id:'n1',title:'Norm'},{id:'n2',title:'Another norm'},{id:'q1',materialKind:'model-question'}]});
const draft=freeze({title:'Mijn referentiekader',included:['n1','n2'],overrides:{},notes:{},
 investigation:{goal:{subject:'Synthetic process'},scope:'Whole process'},
 research:{questions:[{id:'q',text:'How?'}],links:[{question_id:'q',line_id:'n1'}]}});

test('export defaults and validation remain tied to the complete selection',()=>{
 const state=exportState(framework,draft,{},[]);
 assert.equal(state.profile,'testing');assert.equal(state.preview,null);
 assert.equal(state.validation,'Choose testing aspects');
 assert.equal(state.meta.scope,'Whole process');assert.equal(state.focus,'Synthetic process');
 assert.equal(state.exportDraft.title,'Referentiekader — Synthetic process');
 assert.deepEqual(state.exportedNormIds,['n1','n2']);
 assert.equal(state.choices.questions,true);assert.deepEqual(state.planningIssues,[]);
});

test('explicit settings, empty values, exclusions and linked questions reach the same export snapshot',()=>{
 const config=freeze({profile:'testing',testingAspects:['opzet','bestaan'],testingTerminology:'custom',
  meta:{version:'2',author:'Reviewer',team:'A\nB',scope:'Explicit scope',change:'Review'},
  focus:'',filename:'',fields:[],notes:true,accent:'green',colorMode:'uniform',
  fontFamily:'Arial',fontSize:12,excludedNorms:['n1','outside']});
 const state=exportState(framework,draft,config,[]);
 assert.equal(state.validation,'');assert.equal(state.preview.inputs.options,state.choices);
 assert.equal(state.preview.inputs.draft,state.exportDraft);
 assert.deepEqual(state.exportDraft.included,['n2']);assert.equal(state.exportDraft.research,draft.research);
 assert.equal(state.meta.scope,'Explicit scope');assert.equal(state.focus,'');assert.equal(state.filename,'');
 for(const key of ['testingAspects','testingTerminology','fields','notes','accent','colorMode','fontFamily','fontSize'])
  assert.deepEqual(state.choices[key],config[key],key);
 assert.deepEqual(state.choices.excludedNorms,['outside','n1']);
 assert.deepEqual(state.planningIssues,draft.research.questions);
 assert.equal(exportState(framework,draft,{...config,scopeFromInvestigation:true},[]).meta.scope,'Whole process');
 assert.equal(exportState(framework,draft,{...config,excludedNorms:[]},[]).preview.selection.norms,2);
});

test('changed questions, source values and settings are not hidden by a process-wide cache',()=>{
 const config={testingAspects:['opzet']};
 const first=exportState(framework,draft,config,[]);
 const changedDraft={...draft,research:{questions:[{id:'new',text:'Updated question'}],links:[]}};
 const changedFramework={...framework,lines:[{...framework.lines[0],title:'Revised norm'}]};
 const next=exportState(changedFramework,changedDraft,{...config,testingAspects:['bestaan']},[]);
 assert.equal(next.preview.inputs.framework,changedFramework);
 assert.equal(next.preview.inputs.draft.research,changedDraft.research);
 assert.deepEqual(next.choices.testingAspects,['bestaan']);
 assert.deepEqual(next.planningIssues,changedDraft.research.questions);
 assert.deepEqual(first.choices.testingAspects,['opzet']);
});

test('model and interview defaults retain their distinct settings and missing-model errors',()=>{
 const modelDraft={...draft,included:['q1']},interview={levels:['team'],starr:true,triangulation:true,overrides:{}};
 const own=exportState(framework,modelDraft,{interview},[]);
 assert.equal(own.profile,'interview');assert.equal(own.choices.researchInterview,interview);
 assert.equal(own.choices.testingAspects,undefined);
 assert.equal(exportState(framework,modelDraft,{profile:'interview',basis:'missing'},[]).validation,'Choose a model');
 const model=freeze({id:'m',selected:true,title:'Synthetic model',items:[{id:'i',question:'Why?'}]});
 const state=exportState(framework,modelDraft,{profile:'interview',basis:'m',interview},[model]);
 assert.equal(state.choices.basis,'own');assert.equal(state.choices.modelItems,model.items);
 assert.equal(state.choices.researchInterview,undefined);assert.equal(state.filename,model.title);
});
