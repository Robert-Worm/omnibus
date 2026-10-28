// Fabricated questions and receipts for software fixtures only. Never use this
// helper for a source package or as evidence of real reviewer approval.
import {prepareQuestionReviewPublication, prepareQuestionPlanPublication} from '../question-review-publication.mjs';
import {frameworkQuestionContext} from '../../local-data/question-review-gate.mjs';

export function syntheticFrameworkQuestions(catalogue, bank, sourceHash) {
  const sourceId = catalogue.source_identity.source_id, sourceEdition = catalogue.context.edition;
  const context = frameworkQuestionContext(catalogue, bank), points = catalogue.points.filter(p => p.selection_status === 'SELECTABLE');
  if (!points.length) {
    catalogue.questionPlan={central:'',subquestions:[],broadSubquestions:[]};
    catalogue.interviewReviews={};
    return catalogue;
  }
  const plan = {central:'Hoe worden meldingen afgehandeld?',
    subquestions:points.map((point,i)=>({key:'specific:'+i,text:'Hoe wordt een behandelaar voor de melding aangewezen?',originKeys:[sourceId+':'+point.id]})),
    broadSubquestions:[{key:'broad:handling',text:'Hoe is de afhandeling van meldingen ingericht?',originKeys:points.map(p=>sourceId+':'+p.id)}]};
  const input = {sourceId, sourceEdition, sourceHash, context, inventoryComplete:true, reviews:[]};
  const receipts = capsule => capsule.questions.map(q=>({sourceId,sourceEdition,sourceHash,itemId:capsule.itemId,
    itemHash:capsule.itemHash,contextHash:capsule.contextHash,questionHash:q.questionHash,questionId:q.id,
    decision:'behouden',reviewId:'synthetic-'+q.id,reviewer:'synthetic-reviewer',reviewDate:'2026-01-01',
    basis:'Fictieve softwaretest; geen inhoudelijke goedkeuring.'}));
  const basis = prepareQuestionPlanPublication({...input,plan,item:plan}).publication;
  catalogue.questionPlan = prepareQuestionPlanPublication({...input,plan,item:plan,reviews:receipts(basis)}).plan;
  catalogue.interviewReviews = Object.fromEntries(points.map(point=>{
    const itemId=sourceId+':'+point.id, questions=[{id:'question',kind:'interview',text:'Hoe is de laatste melding afgehandeld?'},
      {id:'probe:example',kind:'doorvraag',text:'Welke gegevens zijn daarbij vastgelegd?'}];
    const params={...input,itemId,item:point,questions};
    const basis=prepareQuestionReviewPublication(params).publication;
    return [itemId,prepareQuestionReviewPublication({...params,reviews:receipts(basis)}).publication];
  }));
  return catalogue;
}
