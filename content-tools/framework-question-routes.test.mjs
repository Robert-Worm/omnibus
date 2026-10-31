import test from 'node:test';
import assert from 'node:assert/strict';
import {questionReviewFixture} from '../lib/test-support/question-review-fixture.mjs';
import {questionPlanInventory,questionPlanItemId,sourceQuestionPlanOptions,sourceQuestionPlanPresentation} from '../lib/source-question-plan.mjs';
import {frameworkQuestionContext,verifyLocalFrameworkQuestions} from './question-review-validation.mjs';
import {prepareQuestionPlanPublication} from './question-review-publication.mjs';

// Entirely synthetic: the real admission and publication functions, no source
// files, database or fabricated decisions for actual content.
function fixture() {
  const sourceId='SYNTHETIC',sourceEdition='test-1',sourceHash='a'.repeat(64);
  const route=(id,point)=>({routeId:id,title:'Fictieve route '+id,scope:'Alleen de fictieve afdeling '+id+'.',
    central:'Hoe verloopt de fictieve afhandeling?',
    subquestions:[{key:'registration',text:'Hoe wordt de fictieve aanvraag geregistreerd?',originKeys:[sourceId+':'+point]}],
    broadSubquestions:[{key:'broad:handling',text:'Hoe is de fictieve afhandeling ingericht?',originKeys:[sourceId+':'+point]}]});
  const catalogue={points:['one','two'].map(id=>({id,selection_status:'SELECTABLE'})),
    questionPlan:{routes:[route('first','one'),route('second','two')]}};
  const bank={},context=frameworkQuestionContext(catalogue,bank);
  const receipt=(item,itemId,questions)=>questionReviewFixture({sourceId,sourceEdition,sourceHash,item,itemId,questions,context});
  catalogue.questionPlan.routes=catalogue.questionPlan.routes.map(plan=>{
    const questions=questionPlanInventory(plan),basis=receipt(plan,questionPlanItemId(sourceId,plan),questions);
    return prepareQuestionPlanPublication({plan,item:plan,sourceId,sourceEdition,sourceHash,context,
      inventoryComplete:true,reviews:basis.reviews}).plan;
  });
  catalogue.interviewReviews=Object.fromEntries(catalogue.points.map(point=>{
    const id=sourceId+':'+point.id;
    return [id,receipt(point,id,[{id:'question',kind:'interview',text:'Hoe verliep de laatste fictieve afhandeling?'}])];
  }));
  return {id:sourceId,context:{edition:sourceEdition},documents:[{pdf_hash:sourceHash}],catalogue,bank,questionPlan:catalogue.questionPlan};
}
const verify=packet=>verifyLocalFrameworkQuestions(packet,packet.catalogue.interviewReviews);

test('separate routes retain their exact scope, review and combined point coverage',()=>{
  const packet=fixture(),before=structuredClone(packet);
  assert.doesNotThrow(()=>verify(packet));
  const routes=sourceQuestionPlanOptions(packet.questionPlan);
  assert.equal(routes.length,2);
  assert.notEqual(routes[0].questionReview.itemId,routes[1].questionReview.itemId);
  for(const route of routes){
    assert.equal(sourceQuestionPlanPresentation(route,{sourceId:packet.id}).central,route.central);
    const changed=structuredClone(route);changed.scope+=' Andere afdeling.';
    assert.equal(sourceQuestionPlanPresentation(changed,{sourceId:packet.id}).central,'');
  }
  assert.deepEqual(packet,before);
});

test('admission rejects changed, missing or transplanted route evidence',()=>{
  for(const mutate of [
    p=>{p.questionPlan.routes[0].scope='Andere scope';},
    p=>{p.questionPlan.routes[0].title='Andere titel';},
    p=>{p.questionPlan.routes[0].questionReview=p.questionPlan.routes[1].questionReview;},
    p=>{delete p.questionPlan.routes[1].questionReview;},
    p=>{p.questionPlan.routes.pop();},
    p=>{p.questionPlan.routes[0].subquestions[0].originKeys=['SYNTHETIC:unknown'];},
    p=>{p.questionPlan.routes[0].broadSubquestions[0].originKeys=['SYNTHETIC:two'];},
    p=>{p.catalogue.points[0].selection_status='HOLD';},
  ]){
    const packet=fixture();mutate(packet);assert.throws(()=>verify(packet));
  }
});

test('route containers reject ambiguous identities and cannot hide plans on a context-only source',()=>{
  for(const mutate of [
    p=>{p.routes[1].routeId=p.routes[0].routeId;},
    p=>{p.routes[0].routeId='bad:route';},
    p=>{p.routes[0].scope='';},
    p=>{p.central='Mixed format';},
    p=>{p.routes=[];},
    p=>{p.routes[0].routes=[];},
  ]){
    const plan=fixture().questionPlan;mutate(plan);assert.throws(()=>sourceQuestionPlanOptions(plan));
  }
  const packet=fixture();packet.catalogue.points.forEach(p=>p.selection_status='CONTEXT');
  packet.catalogue.interviewReviews={};assert.throws(()=>verify(packet),/without selectable/);
});
