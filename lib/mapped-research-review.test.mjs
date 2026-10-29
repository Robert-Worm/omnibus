import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';

// Real catalogue adapters and project edits, with only unavailable catalogue
// imports replaced by fictitious rows. No real source or database is accessed.
globalThis.researchReviewData={themes:{presets:[]},flow:{groups:[]},reviewed:{presets:[],groups:[]},
 processes:{processes:[],questionPlans:{},processResearchTopics:{},sourceDomains:{}}};
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(s,c,next){
  const modules={
   'omnibus-data:lib/theme-workspaces.mjs':'export default globalThis.researchReviewData.themes;',
   'omnibus-data:lib/research-flow.mjs':'export default globalThis.researchReviewData.flow;',
   'omnibus-data:lib/process-catalogue.mjs':'export default globalThis.researchReviewData.processes;',
   '@/lib/catalogue-retirement.mjs':'export const retiredThemeIds=[];',
   '@/lib/reviewed-reports.mjs':'export const reviewedResearchPresets=globalThis.researchReviewData.reviewed.presets,reviewedResearchGroups=globalThis.researchReviewData.reviewed.groups;',
   '@/lib/product-scope.mjs':'export const admittedLines=f=>f.lines.filter(l=>l.allowed!==false);',
   './framework-source-items.mjs':'export const sourceFields=()=>[];',
   './research-directions.mjs':'export const directionLabel=x=>x;',
   './process-catalogue.mjs':'export const activeProcesses=[];'
  };
  if(modules[s])return {url:'data:text/javascript,'+encodeURIComponent(modules[s]),shortCircuit:true};
  if(s==='@/lib/research-plan.mjs')return {url:${JSON.stringify(new URL('./research-plan.mjs',import.meta.url).href)},shortCircuit:true};
  if(s==='@/lib/research-flow.mjs')return {url:${JSON.stringify(new URL('./content-adapters/research-flow.mjs',import.meta.url).href)},shortCircuit:true};
  return next(s,c);
 }
`),import.meta.url);
const data=globalThis.researchReviewData;
const central={key:'central',themeId:'T',text:'Hoe verloopt de fictieve afhandeling?',ids:['one','two'],groups:['part']};
const sub={key:'part',text:'Hoe wordt een fictieve melding geregistreerd?',ids:['one','two']};
const receipt=(row,sourceId,decision='behouden')=>questionReviewFixture({sourceId,itemId:row.key,item:structuredClone(row),
  questions:[{id:'question',kind:'onderzoeksvraag',text:row.text}],decisions:{question:decision}});
data.themes.presets.push(central);data.flow.groups.push(sub);
const {centralSuggestions,scopedSubSuggestions,applySubQuestionWording}=await import('./content-adapters/theme-workspaces.mjs');
const {adoptSubSuggestion}=await import('./content-adapters/research-flow.mjs');

test('process plans arrive through the shared deferred catalogue and roll back without touching navigation',async()=>{
 const {processes,activeProcesses,filterSources}=await import('./content-adapters/process-catalogue.mjs');
 const {registerCatalogueResource,ensureCatalogue,applyCatalogueEdits}=await import('./catalogue-runtime.mjs');
 const process=processes.find(p=>p.id==='PR05'),before=structuredClone(process);
 const plan={central:'Een fictieve hoofdvraag',subquestions:[],broadSubquestions:[]};
 const key='test:process-plan';
 registerCatalogueResource(key,async()=>plan,p=>applyCatalogueEdits(data.processes,[{path:['questionPlans'],value:{PR05:p}}]));
 await ensureCatalogue([key]);
 assert.equal(activeProcesses.find(p=>p.id==='PR05'),process);assert.equal(process.questionPlan,plan);
 assert.deepEqual(filterSources([{id:'AW',title:'Fictieve bron',kind:'law'}],{processId:'PR05'}).map(s=>s.id),['AW']);
 const bad='test:process-plan-failure',dependency='test:process-plan-change';
 registerCatalogueResource(dependency,async()=>null,p=>applyCatalogueEdits(data.processes,[{path:['questionPlans'],value:{PR05:p}}]));
 registerCatalogueResource(bad,async()=>null,()=>{throw Error('synthetic rollback');});
 await assert.rejects(ensureCatalogue([dependency,bad]),/synthetic rollback/);
 assert.equal(process.questionPlan,plan);const {questionPlan:_,...navigation}=process;assert.deepEqual(navigation,before);
});

test('thematic review filters menus and adoption without rewriting own questions or source mappings',()=>{
 const originalCentral=structuredClone(central),originalSub=structuredClone(sub);
 const draft={included:['one'],research:{questions:[{id:'q-1',parent_id:null,text:central.text,origin:'user'}],links:[]}};
 try{
  central.questionReview=receipt(originalCentral,'theme:T');sub.questionReview=receipt(originalSub,'theme-groups');
  const before=structuredClone(draft);
  assert.deepEqual(centralSuggestions(draft,['T'])[0].ids,['one','two']);
  assert.equal(centralSuggestions(draft,['T'])[0].reviewedSourcePlan,true);
  const scoped=centralSuggestions(draft,['T'],{productScope:true,lines:[{id:'one'},{id:'two',allowed:false}]});
  assert.deepEqual(scoped[0].ids,['one']);assert.deepEqual(central.ids,['one','two']);
  assert.deepEqual(scopedSubSuggestions(draft,'q-1')[0].ids,['one']);
  const adopted=adoptSubSuggestion(draft,'q-1','part'),child=adopted.research.questions.find(q=>q.parent_id);
  assert.equal(child.text,sub.text);assert.deepEqual(adopted.research.links,[{line_id:'one',question_id:child.id}]);
  child.text='Mijn eigen deelvraag';const saved=structuredClone(adopted);
  for(const decision of ['schrappen','herschrijven','HOLD']){
   central.questionReview.reviews[0].decision=decision;sub.questionReview.reviews[0].decision=decision;
   assert.deepEqual(centralSuggestions(draft,['T']),[]);assert.deepEqual(scopedSubSuggestions(draft,'q-1'),[]);
   assert.equal(adoptSubSuggestion(draft,'q-1','part'),draft);
   assert.equal(applySubQuestionWording(adopted,child.id,'part'),adopted);
  }
  central.questionReview=null;sub.questionReview=null;
  assert.deepEqual(centralSuggestions(draft,['T']),[]);assert.deepEqual(scopedSubSuggestions(draft,'q-1'),[]);
  assert.deepEqual(adopted,saved);assert.deepEqual(draft,before);
  delete central.questionReview;delete sub.questionReview;
  assert.deepEqual(centralSuggestions(draft,['T']),[],'Legacy absence cannot offer a new question');
  assert.deepEqual(scopedSubSuggestions(draft,'q-1'),[]);
  assert.equal(adoptSubSuggestion(draft,'q-1','part'),draft);
  assert.equal(applySubQuestionWording(adopted,child.id,'part'),adopted);
  assert.deepEqual(adopted,saved,'Own text and existing question links survive missing catalogue reviews');
 }finally{Object.assign(central,originalCentral);Object.assign(sub,originalSub);delete central.questionReview;delete sub.questionReview;}
});
