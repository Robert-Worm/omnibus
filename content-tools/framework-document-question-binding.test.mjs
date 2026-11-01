import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareQuestionPlanPublication,prepareInterviewPlanPublication} from './question-review-publication.mjs';
import {frameworkQuestionContext,verifyLocalFrameworkQuestions} from './question-review-validation.mjs';
import {topicalPointDocument} from '../lib/topical-document-identity.mjs';
import {sourceInterviewPlanPresentation} from '../lib/source-interview-plan.mjs';

// Fictitious software-test receipts only; never an intake or source approval.
function reviewed(prepare,input){
 const draft=prepare({...input,reviews:[],inventoryComplete:true}).publication;
 const reviews=draft.questions.map(q=>({sourceId:draft.sourceId,itemId:draft.itemId,questionId:q.id,
  itemHash:draft.itemHash,contextHash:draft.contextHash,sourceHash:draft.sourceHash,sourceEdition:draft.sourceEdition,
  questionHash:q.questionHash,decision:'behouden',reviewId:'synthetic-'+q.id,reviewer:'synthetic-test-only',
  reviewDate:'2026-11-01',basis:'Fictieve softwaretest; geen inhoudelijke goedkeuring.'}));
 return prepare({...input,reviews,inventoryComplete:true});
}
function fixture({wrongInterviewSource=false}={}){
 const packet={id:'FICTIEF-MULTI',context:{edition:'Fictieve editie'},
  documents:[{packageDocumentId:'a',pdf_hash:'a'.repeat(64)},{packageDocumentId:'b',pdf_hash:'b'.repeat(64)}],
  manifest:{documents:[{id:'a',first_package_page:1,last_package_page:1},{id:'b',first_package_page:2,last_package_page:2}]},
  bank:{records:[{id:'r1',source_spans:[{page:1}]},{id:'r2',source_spans:[{page:2}]}]},
  catalogue:{points:[1,2].map(i=>({id:'p'+i,selection_status:'SELECTABLE',source_links:[{record_id:'r'+i,contribution:'PRIMARY'}]})),
   interviewPlans:{},interviewReviews:{}}};
 const keys=packet.catalogue.points.map(p=>packet.id+':'+p.id);
 packet.questionPlan={central:'Hoe worden meldingen behandeld?',subquestions:[{key:'specific',text:'Hoe worden meldingen vastgelegd?',originKeys:keys}],
  broadSubquestions:[{key:'broad:handling',text:'Hoe verloopt de behandeling van meldingen?',originKeys:keys}]};
 packet.catalogue.questionPlan=packet.questionPlan;
 for(const key of keys)packet.catalogue.interviewPlans[key]=[{id:'opening',text:'Hoe legt u een melding vast?',level:'operational',respondent:'Behandelaar',scope:'Fictieve meldingen',followups:[]}];
 const context=frameworkQuestionContext(packet.catalogue,packet.bank),identity={sourceId:packet.id,sourceEdition:packet.context.edition,context};
 const plan=packet.questionPlan;
 packet.questionPlan=reviewed(prepareQuestionPlanPublication,{...identity,sourceHash:packet.documents[0].pdf_hash,plan,item:plan}).plan;
 packet.catalogue.questionPlan=packet.questionPlan;
 for(const point of packet.catalogue.points){const itemId=packet.id+':'+point.id,interviewPlan=packet.catalogue.interviewPlans[itemId];
  packet.catalogue.interviewReviews[itemId]=reviewed(prepareInterviewPlanPublication,{...identity,itemId,plan:interviewPlan,item:{point,interviewPlan},
   sourceHash:wrongInterviewSource?packet.documents[0].pdf_hash:topicalPointDocument(packet,point).pdf_hash}).publication;}
 return packet;
}
test('framework admission and interview reader use each point’s primary document',()=>{
 const p=fixture();assert.doesNotThrow(()=>verifyLocalFrameworkQuestions(p,p.catalogue.interviewReviews));
 for(const point of p.catalogue.points){const key=p.id+':'+point.id,plan=p.catalogue.interviewPlans[key];
  const shown=sourceInterviewPlanPresentation({interviewPlan:plan,interviewReview:p.catalogue.interviewReviews[key]},
   {sourceId:p.id,itemId:key,sourceEdition:p.context.edition,sourceHash:topicalPointDocument(p,point).pdf_hash});
  assert.deepEqual(shown,plan);}
});
test('a root-document receipt cannot approve an interview based on another document',()=>{
 const p=fixture({wrongInterviewSource:true});
 assert.throws(()=>verifyLocalFrameworkQuestions(p,p.catalogue.interviewReviews),/source, item or context.*p2/);
 const key=p.id+':p2';assert.deepEqual(sourceInterviewPlanPresentation({interviewPlan:p.catalogue.interviewPlans[key],interviewReview:p.catalogue.interviewReviews[key]},
  {sourceId:p.id,itemId:key,sourceEdition:p.context.edition,sourceHash:'b'.repeat(64)}),[]);
});
test('changed source ordering and document identity still invalidate old evidence',()=>{
 const p=fixture();p.catalogue.points[1].source_links.unshift({record_id:'r1',contribution:'PRIMARY'});
 assert.throws(()=>verifyLocalFrameworkQuestions(p,p.catalogue.interviewReviews),/source, item or context/);
 const q=fixture();q.documents[1].pdf_hash='c'.repeat(64);
 assert.throws(()=>verifyLocalFrameworkQuestions(q,q.catalogue.interviewReviews),/source, item or context.*p2/);
});
