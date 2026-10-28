// Fabricated review receipts for software tests only. Never source approval.
// Use the publication owner's real helper; no parallel receipt validator.
import {prepareQuestionReviewPublication} from '../../content-tools/question-review-publication.mjs';

export function questionReviewFixture({sourceId='SYNTHETIC',itemId='SYNTHETIC-1',
  sourceEdition='synthetic-1',sourceHash='a'.repeat(64),questions,decisions={},item,context}) {
  const input={sourceId,itemId,sourceEdition,sourceHash,inventoryComplete:true,
    item:item??{synthetic:true,questions},context:context??{scope:'Fictitious software test; no substantive approval.'},questions,reviews:[]};
  const basis=prepareQuestionReviewPublication(input).publication;
  input.reviews=basis.questions.filter(q=>decisions[q.id]!==null).map(q=>({
    sourceId,itemId,sourceEdition,sourceHash,itemHash:basis.itemHash,contextHash:basis.contextHash,
    questionId:q.id,questionHash:q.questionHash,decision:decisions[q.id]??'behouden',
    reviewId:'synthetic-review-'+q.id,reviewer:'synthetic-test-only',reviewDate:'2026-01-01',
    basis:'Fabricated test receipt, not an actual substantive review.',
  }));
  return prepareQuestionReviewPublication(input).publication;
}
