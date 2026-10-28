// Fictitious software fixtures only. These are not independent source reviews.
import {prepareQuestionReviewPublication} from '../question-review-publication.mjs';
import {reportQuestionContext} from '../question-review-validation.mjs';

export function syntheticReportQuestions(framework, reuse) {
  const report=framework.report, context=reportQuestionContext(framework,reuse);
  const inputs=[...framework.lines.map(item=>({item,questions:[{id:'auditQuestion',kind:'interview',text:'Hoe is de laatste melding afgehandeld?'}]})),
    ...reuse.points.map(item=>({item,questions:reuse.interview_questions.filter(q=>q.point_ids.includes(item.id)).flatMap(q=>[
      {id:q.id,kind:'interview',text:q.text},...(q.follow_up?[{id:q.id+':follow_up',kind:'doorvraag',text:q.follow_up}]:[])])}))];
  reuse.interviewReviews=Object.fromEntries(inputs.map(({item,questions})=>{
    if(!questions.length)questions=[{id:'question',kind:'interview',text:''}];
    const input={sourceId:report.id,itemId:item.id,sourceEdition:String(report.year),sourceHash:report.source_hash,
      item,context,questions,inventoryComplete:true,reviews:[]};
    const basis=prepareQuestionReviewPublication(input).publication;
    input.reviews=basis.questions.map(q=>({sourceId:report.id,itemId:item.id,questionId:q.id,
      sourceEdition:basis.sourceEdition,sourceHash:basis.sourceHash,contextHash:basis.contextHash,
      itemHash:basis.itemHash,questionHash:q.questionHash,decision:q.text?'behouden':'HOLD',reviewId:'synthetic-'+q.id,
      reviewer:'synthetic-independent-reviewer',reviewDate:'2026-01-01',basis:'Fabricated software test, not substantive approval.'}));
    return [item.id,prepareQuestionReviewPublication(input).publication];
  }));
}
