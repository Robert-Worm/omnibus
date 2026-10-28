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

// An audit question is not automatically a usable interview opening. Interview
// wording has its own per-field decision; a form-only legacy pass is insufficient.
// A separate capsule can supply a reviewed rewrite without changing the norm,
// audit question or saved project text. Its presence never permits fallback.
export function sourceInterviewPresentation(owner, {sourceId,itemId,questionId,text,sourceEdition,sourceHash}) {
  const separate=Object.hasOwn(owner??{},'interviewReview');
  const publication=separate?owner.interviewReview:owner?.questionReview;
  const offered=separate?(Array.isArray(publication?.questions)?publication.questions.find(q=>q?.id===questionId)?.text:undefined):text;
  const review=readQuestionReview({sourceId,itemId,question:{id:questionId,kind:'interview',text:offered},
    publication,sourceEdition,sourceHash});
  return {review,text:review.approved?offered:''};
}

export function reportInterviewText(line,key='auditQuestion') {
  const text=key==='auditQuestion'?line.auditQuestion?.text:line.sourceItems?.find(item=>item.id===key)?.text;
  return sourceInterviewPresentation(line,{sourceId:line.report_id,itemId:line.id,questionId:key,text,
    sourceEdition:line.edition,sourceHash:line.sourceHash}).text;
}

// Point selections carry a saved question snapshot. Use current source evidence
// only for an unchanged snapshot of that exact point/edition. Undefined means
// historical or edited work; an empty string means a current withheld proposal.
export function reportPointInterviewPresentation(catalogue, material) {
  if(material.originKey!=='report-point:'+material.sourcePointId)return undefined;
  const point=catalogue.points?.find(p=>p.id===material.sourcePointId);
  const report=point&&catalogue.reports?.find(r=>r.id===point.report_id);
  if(!report||material.sourceHash!==report.source_hash||material.edition!==String(report.year))return undefined;
  const questions=(catalogue.interview_questions??[]).filter(q=>q.point_ids.includes(point.id));
  if(material.question!==questions.map(q=>q.text).join('\n\n'))return undefined;
  return questions.map(q=>sourceInterviewPresentation(point,{
    sourceId:report.id,itemId:point.id,questionId:q.id,text:q.text,
    sourceEdition:String(report.year),sourceHash:report.source_hash}).text).filter(Boolean).join('\n\n');
}

// Called only for the current authoritative proposal, never saved metadata.
export function foundationQuestionEdition(proposal) {
  return proposal.edition ?? proposal.source?.edition ?? proposal.questionReview?.sourceEdition ?? proposal.interviewReview?.sourceEdition;
}

export function foundationQuestionPresentation(proposal, key = 'question') {
  return sourceQuestionPresentation(proposal, {sourceId:proposal.sourceId,itemId:proposal.originKey || proposal.id,
    questionId:key,kind:'interview',text:proposal[key],
    sourceEdition:foundationQuestionEdition(proposal),sourceHash:proposal.sourceHash});
}
