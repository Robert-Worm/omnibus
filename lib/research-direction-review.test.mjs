import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directionPlan,directionPlanTemplate,researchDirections,intendedUseQuestion,intendedUseTemplate} from './research-directions.mjs';
import {renderReviewedDirectionQuestion} from './research-direction-review.mjs';
import reviews from './research-direction-reviews.mjs';
import {researchQuestionFormulations} from './research-question-formulations.mjs';

const combinations = [undefined,'broad','deep'].flatMap(breadth=>
  [undefined,'descriptive','causal'].map(lens=>({breadth,lens})));
test('all offered direction templates and cyclers exactly match the substantive review, including optional and unelaborated combinations',()=>{
  const inventory=new Set();
  for(const {id} of researchDirections)for(const proposal of [false,true])for(const change of [false,true])for(const approach of combinations){
    const p=directionPlanTemplate(id,{proposal,change},approach);
    for(const text of [p.text,...p.questions,p.advice.text,intendedUseTemplate(p.text,id)])
      for(const variant of researchQuestionFormulations(text))inventory.add(variant);
  }
  assert.equal(reviews.length,170);
  const approved=reviews.flatMap(row=>row.variants);
  assert.equal(new Set(approved).size,approved.length);
  assert.equal(inventory.size,234);
  assert.deepEqual(inventory,new Set(approved),'New or changed wording needs an actual review, not a regenerated approval');
  const evidence=readFileSync(new URL('./research-direction-reviews.mjs',import.meta.url),'utf8');
  for(const row of reviews){
    assert.equal(row.decision,'behouden');
    assert(evidence.includes('// '+row.id+': '),'Each exact template keeps its substantive reason');
    for(const variant of row.variants)assert(renderReviewedDirectionQuestion(variant,{onderwerp:'de afhandeling',gebruik:'een besluit te nemen'}),row.id);
  }
});

test('direction review is exact, does not approve free text and cannot resolve unrelated form failures',()=>{
  assert.equal(renderReviewedDirectionQuestion('Waarom faalt {{onderwerp}}?',{onderwerp:'de uitvoering'}),'');
  const known='Welke eventuele knelpunten doen zich voor bij {{onderwerp}}?';
  assert.equal(renderReviewedDirectionQuestion(known+' ',{onderwerp:'de uitvoering'}),'');
  assert.equal(renderReviewedDirectionQuestion(known,{}),'');
  assert.equal(renderReviewedDirectionQuestion(known,{onderwerp:'{{onderwerp}}'}),'');
  assert.equal(renderReviewedDirectionQuestion(known,{onderwerp:'de uitvoering? Waarom faalt deze?'}),'');
  assert.equal(renderReviewedDirectionQuestion(known,{onderwerp:'de lange afhandeling '.repeat(30)}),'');
  const compound=reviews.find(r=>r.compoundResolved).variants[0];
  assert.equal(renderReviewedDirectionQuestion(compound,{onderwerp:'TODO'}),'');
  assert.equal(renderReviewedDirectionQuestion(known,{onderwerp:'de verwerking van $&-tekens'}),
    'Welke eventuele knelpunten doen zich voor bij de verwerking van $&-tekens?');
  const p=directionPlan('diagnostic','de afhandeling');
  assert.equal(intendedUseQuestion('Mijn eigen hoofdvraag?','diagnostic','een besluit te nemen',p),'');
  assert.equal(intendedUseQuestion(p.text,'diagnostic','een besluit te nemen'),'');
});

test('an explicit negative template decision withholds the plan rather than reviving unreviewed wording',()=>{
 const row=reviews.find(r=>r.variants.includes('Hoe zijn de knelpunten bij {{onderwerp}} te verklaren?'));
 const previous=row.decision;
 try{
  for(const decision of ['HOLD','herschrijven','schrappen',undefined]){
   row.decision=decision;
   assert.equal(directionPlan('diagnostic','de afhandeling'),null);
  }
 }finally{row.decision=previous;}
 assert(directionPlan('diagnostic','de afhandeling'));
});

test('reviewed plans retain all strategies, stable selection keys and independent personal context',()=>{
  for(const {id} of researchDirections)for(const topic of ['de afhandeling','het voorgestelde plan','de invoering van de werkwijze'])for(const approach of combinations){
    const before=structuredClone(approach),p=directionPlan(id,topic,approach);
    assert(p,`${id}/${topic}/${JSON.stringify(approach)}`);
    assert.equal(p.topic,topic);assert.equal(p.direction,id);
    assert.equal(p.subquestions.length,3);
    assert.deepEqual(p.subquestions.map(q=>q.key),[0,1,2].map(i=>`direction:${id}:${i}`));
    assert(p.subquestions.every(q=>q.ids.length===0),'No inferred source coverage');
    assert.deepEqual(p.questions,p.subquestions.map(q=>q.text));
    assert.deepEqual(approach,before);
    assert(!p.text.includes('{{'));
  }
  assert.equal(directionPlan('unknown','de afhandeling'),null);
  assert.equal(directionPlan('diagnostic',''),null);
  assert.throws(()=>directionPlan('diagnostic','de afhandeling',{lens:'unknown'}),/Ongeldige onderzoeksaanpak/);
});

test('corrected direction questions do not assume stagnation, effect, implementation problems or causes in descriptive research',()=>{
  assert.match(directionPlan('change','de invoering',{breadth:'deep',lens:'causal'}).text,/bevorderen of belemmeren/);
  assert.match(directionPlan('evaluative','de afhandeling',{breadth:'deep',lens:'causal'}).text,/^In hoeverre/);
  assert.match(directionPlan('diagnostic','de afhandeling',{breadth:'deep',lens:'causal'}).text,/^In hoeverre/);
  assert.match(directionPlan('signaling','de afhandeling',{breadth:'broad',lens:'descriptive'}).text,/eventuele problemen/);
  const design=directionPlan('design','het voorgestelde plan',{breadth:'deep',lens:'descriptive'});
  assert.match(design.text,/mogelijk moeilijk uit te voeren/);
  assert.match(design.subquestions[1].text,/mogelijk moeilijk uit te voeren/);
  assert.match(directionPlan('design','het voorgestelde plan').subquestions[2].text,/In hoeverre houdt het ontwerp rekening/);
  const p=directionPlan('diagnostic','de afhandeling',{lens:'descriptive'});
  const combined=intendedUseQuestion(p.text,'diagnostic','te bepalen welk nader onderzoek nodig is',p);
  assert.match(combined,/welke bevindingen zijn van belang/);assert.doesNotMatch(combined,/die oorzaken/);
});
