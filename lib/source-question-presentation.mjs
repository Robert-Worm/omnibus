import {questionCandidate} from './question-quality.mjs';
import {readQuestionReview} from './question-quality-review.mjs';

// Only call with an authoritative row from the pinned catalogue. A saved
// project, a matching string or a parent review status is not a review receipt.
// Old publications keep their form-filtered visibility, with unknown approval.
// An explicitly present capsule (even null/invalid) can never use that fallback.
export function sourceQuestionPresentation(owner, {sourceId, itemId, questionId, kind, text, sourceEdition, sourceHash, legacyKind = kind}) {
  const review = readQuestionReview({sourceId, itemId, question:{id:questionId,kind,text},
    publication:owner?.questionReview, sourceEdition, sourceHash});
  return {review, text: Object.hasOwn(owner ?? {}, 'questionReview')
    ? (review.approved ? text : '') : questionCandidate(text,legacyKind)};
}

export function reportQuestionText(line, key = 'auditQuestion', legacyKind = 'toetsvraag') {
  const text = key === 'auditQuestion' ? line.auditQuestion?.text : line.sourceItems?.find(item=>item.id===key)?.text;
  return sourceQuestionPresentation(line, {sourceId:line.report_id,itemId:line.id,questionId:key,
    kind:'toetsvraag',text,sourceEdition:line.edition,sourceHash:line.sourceHash,legacyKind}).text;
}

// Called only for the current authoritative proposal, never saved metadata.
export function foundationQuestionEdition(proposal) {
  return proposal.edition ?? proposal.source?.edition ?? proposal.questionReview?.sourceEdition;
}

export function foundationQuestionPresentation(proposal, key = 'question') {
  return sourceQuestionPresentation(proposal, {sourceId:proposal.sourceId,itemId:proposal.originKey || proposal.id,
    questionId:key,kind:'interview',text:proposal[key],
    sourceEdition:foundationQuestionEdition(proposal),sourceHash:proposal.sourceHash});
}
