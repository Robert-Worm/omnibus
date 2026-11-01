import test from 'node:test';
import assert from 'node:assert/strict';
import {questionReviewFixture} from '../lib/test-support/question-review-fixture.mjs';
import {questionPlanInventory,questionPlanItemId,sourceQuestionPlanOptions,sourceQuestionPlanPresentation} from '../lib/source-question-plan.mjs';
import {frameworkQuestionContext,verifyLocalFrameworkQuestions} from './question-review-validation.mjs';
import {prepareQuestionPlanPublication,prepareInterviewPlanPublication} from './question-review-publication.mjs';
import {interviewPlanInventory,sourceInterviewPlanPresentation} from '../lib/source-interview-plan.mjs';

// Entirely synthetic: the real admission and publication functions, no source
// files, database or fabricated decisions for actual content.
function fixture(interviewPlan) {
  const sourceId='SYNTHETIC',sourceEdition='test-1',sourceHash='a'.repeat(64);
  const route=(id,point)=>({routeId:id,title:'Fictieve route '+id,scope:'Alleen de fictieve afdeling '+id+'.',
    central:'Hoe verloopt de fictieve afhandeling?',
    subquestions:[{key:'registration',text:'Hoe wordt de fictieve aanvraag geregistreerd?',originKeys:[sourceId+':'+point]}],
    broadSubquestions:[{key:'broad:handling',text:'Hoe is de fictieve afhandeling ingericht?',originKeys:[sourceId+':'+point]}]});
  const catalogue={points:['one','two'].map(id=>({id,selection_status:'SELECTABLE'})),
    questionPlan:{routes:[route('first','one'),route('second','two')]}};
  if(interviewPlan)catalogue.interviewPlans={[sourceId+':one']:structuredClone(interviewPlan)};
  const bank={},context=frameworkQuestionContext(catalogue,bank);
  const receipt=(item,itemId,questions)=>questionReviewFixture({sourceId,sourceEdition,sourceHash,item,itemId,questions,context});
  catalogue.questionPlan.routes=catalogue.questionPlan.routes.map(plan=>{
    const questions=questionPlanInventory(plan),basis=receipt(plan,questionPlanItemId(sourceId,plan),questions);
    return prepareQuestionPlanPublication({plan,item:plan,sourceId,sourceEdition,sourceHash,context,
      inventoryComplete:true,reviews:basis.reviews}).plan;
  });
  catalogue.interviewReviews=Object.fromEntries(catalogue.points.map(point=>{
    const id=sourceId+':'+point.id;
    if(catalogue.interviewPlans?.[id]){
      const plan=catalogue.interviewPlans[id],item={point,interviewPlan:plan};
      const questions=interviewPlanInventory(plan),basis=receipt(item,id,questions);
      return [id,prepareInterviewPlanPublication({plan,item,itemId:id,
        sourceId,sourceEdition,sourceHash,context,inventoryComplete:true,reviews:basis.reviews}).publication];
    }
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

const interviews=[
 {id:'opening',text:'Hoe behandelde u de laatste melding?',level:'operational',respondent:'Behandelaar',
  scope:'De afhandeling van een fictieve melding.',followups:[{id:'probe',text:'Wat legde u daarbij vast?'}]},
 {id:'management',text:'Hoe verdeelt u de meldingen?',level:'management',respondent:'Teamleider',parentOpeningId:'opening',
  scope:'De verdeling van fictieve meldingen.',followups:[{id:'management-probe',text:'Welke afweging maakte u bij de laatste verdeling?'}]},
 {id:'second',text:'Hoe bespreekt u de werkvoorraad?',level:'management',respondent:'Teamleider',
  scope:'De fictieve werkvoorraad.',followups:[]},
];

test('framework admission preserves multiple openings and their exact level/probe relations',()=>{
 const packet=fixture(interviews),before=structuredClone(packet);
 assert.doesNotThrow(()=>verify(packet));
 const point=packet.catalogue.points[0],capsule=packet.catalogue.interviewReviews['SYNTHETIC:one'];
 const owner={...point,interviewPlan:packet.catalogue.interviewPlans['SYNTHETIC:one'],interviewReview:capsule},identity={sourceId:packet.id,itemId:'SYNTHETIC:one',sourceEdition:'test-1',sourceHash:'a'.repeat(64)};
 assert.deepEqual(sourceInterviewPlanPresentation(owner,identity,'operational'),[interviews[0]]);
 assert.deepEqual(sourceInterviewPlanPresentation(owner,identity,'management'),interviews.slice(1));
 assert.deepEqual(sourceInterviewPlanPresentation(owner,identity,'strategic'),[]);
 assert.deepEqual(packet,before);
});

test('framework admission rejects changed interview relations, missing reviews and legacy fallback',()=>{
 for(const mutate of [
  p=>{p.catalogue.interviewPlans['SYNTHETIC:one'][0].level='strategic';},
  p=>{p.catalogue.interviewPlans['SYNTHETIC:one'][0].scope='Een andere scope.';},
  p=>{p.catalogue.interviewPlans['SYNTHETIC:one'][0].respondent='Bestuurder';},
  p=>{const rows=p.catalogue.interviewPlans['SYNTHETIC:one'];rows[1].followups.push(rows[0].followups.pop());},
  p=>{p.catalogue.interviewPlans['SYNTHETIC:one'].pop();},
  p=>{delete p.catalogue.interviewPlans;},
  p=>{delete p.catalogue.interviewReviews['SYNTHETIC:one'].interviewInventory;},
  p=>{p.catalogue.interviewReviews['SYNTHETIC:one'].reviews.pop();},
 ]){const packet=fixture(interviews);mutate(packet);assert.throws(()=>verify(packet));}
 // Updating only the projection cannot repair stale item/context decisions.
 const packet=fixture(interviews);packet.catalogue.interviewPlans['SYNTHETIC:one'][0].scope='Gewijzigd.';
 packet.catalogue.interviewReviews['SYNTHETIC:one'].interviewInventory=interviewPlanInventory(packet.catalogue.interviewPlans['SYNTHETIC:one']);
 assert.throws(()=>verify(packet));
});

test('negative interview decisions withhold only their opening or probe, without borrowing another level',()=>{
 for(const decision of ['HOLD','herschrijven','schrappen']){
  const packet=fixture(interviews),capsule=packet.catalogue.interviewReviews['SYNTHETIC:one'];
  capsule.reviews.find(row=>row.questionId==='opening').decision=decision;
  capsule.reviews.find(row=>row.questionId==='management-probe').decision=decision;
  assert.doesNotThrow(()=>verify(packet));
  const owner={interviewPlan:packet.catalogue.interviewPlans['SYNTHETIC:one'],interviewReview:capsule},identity={sourceId:packet.id,itemId:'SYNTHETIC:one'};
  assert.deepEqual(sourceInterviewPlanPresentation(owner,identity,'operational'),[]);
  const shown=sourceInterviewPlanPresentation(owner,identity,'management');
  assert.equal(shown.length,2);assert.deepEqual(shown[0].followups,[]);
  assert.deepEqual(sourceInterviewPlanPresentation(owner,{...identity,sourceHash:'b'.repeat(64)}),[]);
 }
});

test('interview inventories reject orphan probes, duplicate identities, invalid levels and variant cycles',()=>{
 for(const mutate of [
  p=>{p[0].followups[0].id=p[0].id;},
  p=>{p[0].level='board';},
  p=>{p[0].scope='';},
  p=>{p[0].parentOpeningId='management';},
  p=>{p[1].parentOpeningId='missing';},
  p=>{p[0].followups[0].openingId='other';},
 ]){const plan=structuredClone(interviews);mutate(plan);assert.throws(()=>interviewPlanInventory(plan));}
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
