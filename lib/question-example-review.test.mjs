import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import reviews from './question-example-reviews.mjs';
import {researchQuestionFormulations} from './research-question-formulations.mjs';
import {createReviewedResearchRenderer} from './research-direction-review.mjs';
// Personal question state is real; only unavailable catalogue inputs are empty.
register('data:text/javascript,'+encodeURIComponent(`export function resolve(s,c,next){
 if(c.parentURL?.endsWith('/research-plan.mjs')){
  if(s==='./framework-source-items.mjs')return {url:'data:text/javascript,export const sourceFields=()=>[];',shortCircuit:true};
  if(s==='./process-catalogue.mjs')return {url:'data:text/javascript,export const activeProcesses=[];',shortCircuit:true};
 }return next(s,c);
}`),import.meta.url);
const {questionExamples,questionExampleTemplates,addOwnSubquestions}=await import('./question-writing.mjs');
const render=createReviewedResearchRenderer(reviews);

test('every writing template and offered wording variant has its exact substantive decision',()=>{
 const templates=questionExampleTemplates(),inventory=new Set(templates.flatMap(r=>[r.central,...r.sub]).flatMap(researchQuestionFormulations));
 assert.equal(templates.length,10);assert(templates.every(r=>r.sub.length===10));
 assert.equal(new Set(templates.flatMap(r=>[r.central,...r.sub])).size,109);
 assert.equal(reviews.length,109);assert.equal(inventory.size,175);
 assert.deepEqual(inventory,new Set(reviews.flatMap(r=>r.variants)),'Changed or new wording needs a substantive review');
 const evidence=readFileSync(new URL('./question-example-reviews.mjs',import.meta.url),'utf8');
 for(const row of reviews){
  assert.equal(row.decision,'behouden');assert(evidence.includes('// '+row.id));
  for(const variant of row.variants)assert(render(variant,{onderwerp:'de afhandeling'}),row.id);
 }
});

test('writing examples retain all route indices, explicit scope slots and personal subject without inventing source coverage',()=>{
 for(const subject of ['', 'de afhandeling','de uitvoering van subsidiebeleid','het gebruik van $&'])for(let i=0;i<10;i++){
  const shown=questionExamples(subject,i),original=questionExampleTemplates();
  assert.deepEqual(shown.routes.map(r=>r.label),original.map(r=>r.label));
  assert.equal(shown.central.length,10);assert(shown.central.every(Boolean));assert.equal(shown.sub.length,10);
  assert.equal(shown.central[i],original[i].central.replaceAll('{{onderwerp}}',()=>subject||'[onderwerp]'));
  assert.deepEqual(shown.sub,original[i].sub.map(t=>t.replaceAll('{{onderwerp}}',()=>subject||'[onderwerp]')));
 }
 assert.equal(questionExamples('de afhandeling',3).sub[5],'Waren de maatregelen voor de afhandeling op [peildatum] aantoonbaar aanwezig?');
});

test('missing and negative reviews never fall back to another route or to old wording',()=>{
 const central=reviews.find(r=>r.id==='EX-04-00'),child=reviews.find(r=>r.id==='EX-01-08');
 try{
  for(const decision of ['HOLD','herschrijven','schrappen',undefined]){
   central.decision=decision;child.decision=decision;
   const shown=questionExamples('de afhandeling',3);
   assert.equal(shown.routes.length,10);assert.equal(shown.central[3],'');assert.deepEqual(shown.sub,[]);
   assert(shown.central[4]);assert.equal(questionExamples('de afhandeling',0).sub.length,9);
  }
 }finally{central.decision='behouden';child.decision='behouden';}
 const malformed=questionExamples('de afhandeling? Waarom faalt deze?',3);
 assert(malformed.central.every(t=>!t));assert.deepEqual(malformed.sub,[]);
 assert(questionExamples('te lang '.repeat(50)).central.every(t=>!t));
 assert.equal(render('Een nieuwe ongereviewde vraag over {{onderwerp}}?',{onderwerp:'de afhandeling'}),'');
 assert.equal(render('Welke restrisico’s voor {{onderwerp}} zijn zichtbaar en wie heeft die geaccepteerd?',{onderwerp:'de afhandeling'}),'');
});

test('explicit adoption and reloading retain old and personal questions, blanks and manual links',()=>{
 const old='Met welk bewijs is vastgesteld dat tekortkomingen bij de afhandeling daadwerkelijk zijn verminderd?';
 const draft={included:['one'],research:{questions:[{id:'q-1',parent_id:null,text:'Mijn eigen hoofdvraag',origin:'user'},
  {id:'q-2',parent_id:'q-1',text:old,origin:'suggested'},{id:'q-3',parent_id:'q-1',text:'',origin:'user'}],links:[{question_id:'q-2',line_id:'one'}]}};
 const before=structuredClone(draft),text=questionExamples('de afhandeling',9).sub[6];
 const next=addOwnSubquestions(draft,'q-1',[text,'Mijn eigen afwijkende vraag',text]);
 assert.deepEqual(next.research.questions.slice(0,3),before.research.questions);
 assert.equal(next.research.questions.filter(q=>q.text===text).length,1);
 assert.deepEqual(next.research.links,before.research.links);assert.deepEqual(next.included,before.included);
 assert.deepEqual(JSON.parse(JSON.stringify(next)),next);assert.deepEqual(draft,before);
});
