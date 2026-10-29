import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';
import {mappedResearchQuestion} from './source-question-plan.mjs';

const group={key:'new-report:part',text:'Hoe verloopt de fictieve afhandeling?',ids:['new-point']};
const approved={...group,questionReview:questionReviewFixture({sourceId:'theme-groups',itemId:group.key,
  item:group,questions:[{id:'question',kind:'onderzoeksvraag',text:group.text}]})};
globalThis.reportResearchFixture={reviewed:{corpus:[],scopeSnapshots:{},scopeDecisions:{},themes:[],
  researchPresets:[],researchGroups:[{key:'legacy',text:'Legacy question?',ids:['old-point']}]},
  additions:{corpus:[],scopeSnapshots:{},scopeDecisions:{},themes:[],researchPresets:[],
    researchGroups:[approved,{key:'unknown',text:'Hoe wordt een melding geregistreerd?',ids:['new-point']}]}};
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(s,c,next){
  if(c.parentURL?.endsWith('/reviewed-reports.mjs')){
   const key=s==='../app/reviewed-reports.json'?'reviewed':s==='../app/report-additions.json'?'additions':null;
   if(key)return {url:'data:text/javascript,export default globalThis.reportResearchFixture.'+key+';',importAttributes:{},shortCircuit:true};
  }
  return next(s,c);
 }
`),import.meta.url);

test('later report groups reach the shared review gate with exact mappings, without approving missing evidence',async()=>{
 const before=structuredClone(globalThis.reportResearchFixture);
 const {reviewedResearchGroups}=await import('./reviewed-reports.mjs');
 assert.deepEqual(reviewedResearchGroups.map(g=>g.key),['legacy','new-report:part','unknown']);
 const shown=()=>reviewedResearchGroups.map(g=>mappedResearchQuestion(g,'theme-groups')).filter(Boolean);
 assert.deepEqual(shown().map(g=>g.key),['new-report:part']);
 assert.deepEqual(shown()[0].ids,['new-point']);
 assert.equal(shown()[0].reviewedSourcePlan,true);
 assert.deepEqual(globalThis.reportResearchFixture,before,'No source rows or original receipts are rewritten');
 const row=reviewedResearchGroups[1],original=row.questionReview;
 for(const decision of ['HOLD','schrappen','herschrijven']){
  row.questionReview=structuredClone(original);row.questionReview.reviews[0].decision=decision;
  assert.deepEqual(shown(),[]);
 }
 row.questionReview=original;row.text='Hoe verandert een niet-gereviewde formulering?';
 assert.deepEqual(shown(),[]);
});
