import {questionCandidate} from './question-quality.mjs';
import {readQuestionReview} from './question-quality-review.mjs';

// Only the current catalogue assembler binds this sidecar. Keeping it out of
// source rows preserves their byte-exact scope checks and saved evidence.
const reportInterviewOwners=new WeakMap();
export function bindReportInterviewOwner(line, owner) {
  if(owner)reportInterviewOwners.set(line,owner);else reportInterviewOwners.delete(line);
  return line;
}

// Only call with an authoritative row from the pinned catalogue. A saved
// project, a matching string or a parent review status is not a review receipt.
// A grammatical sentence or a parent source approval is not a question review.
// Missing, stale and negative receipts all withhold a new catalogue proposal.
export function sourceQuestionPresentation(owner, {sourceId, itemId, questionId, kind, text, sourceEdition, sourceHash, legacyKind = kind}) {
  const review = readQuestionReview({sourceId, itemId, question:{id:questionId,kind,text},
    publication:owner?.questionReview, sourceEdition, sourceHash});
  return {review, text: review.approved && (legacyKind === kind || questionCandidate(text,legacyKind)) ? text : ''};
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

// A complete item with one opening (and optionally its identical base alias)
// has one respondent context. Do not guess probe links in a multi-opening item.
// Both the chosen opening and every probe need their own exact review receipt.
export function sourceInterviewProbes(owner, identity) {
  const publication=owner?.interviewReview;
  const opening=sourceInterviewPresentation(owner,identity);
  if(!publication||!opening.review.approved)return [];
  const questions=publication.questions;
  const openings=questions.filter(q=>q.kind==='interview');
  const levels=openings.filter(q=>q.id!=='question');
  if(levels.length>1||!openings.length||openings.some(q=>q.text!==opening.text))return [];
  return questions.filter(q=>q.kind==='doorvraag'&&readQuestionReview({
    ...identity,question:q,publication,
  }).approved).map(q=>q.text);
}

export function reportInterviewText(line,key='auditQuestion') {
  const text=key==='auditQuestion'?line.auditQuestion?.text:line.sourceItems?.find(item=>item.id===key)?.text;
  const owner=reportInterviewOwners.get(line)??line;
  const identity={sourceId:line.report_id,itemId:line.id,questionId:key,text,
    sourceEdition:owner.edition,sourceHash:owner.sourceHash};
  const opening=sourceInterviewPresentation(owner,identity).text;
  if(!opening)return '';
  const probes=owner?.interviewReview?.questions?.some(q=>q.kind==='doorvraag')?sourceInterviewProbes(owner,identity):[];
  return opening+(probes.length?'\n\nDoorvragen:\n'+probes.join('\n'):'');
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
  const separate=Object.hasOwn(catalogue.interviewReviews??{},point.id);
  const owner=separate?{interviewReview:catalogue.interviewReviews[point.id]}:point;
  const publication=owner.interviewReview;
  // Complete point inventory may include a reviewed new opening. The original
  // snapshot above remains the author boundary; own/historical text stays literal.
  const openings=separate?(Array.isArray(publication?.questions)?publication.questions.filter(q=>q.kind==='interview'):[]):questions;
  return openings.map(q=>{
    const identity={sourceId:report.id,itemId:point.id,questionId:q.id,text:q.text,
      sourceEdition:String(report.year),sourceHash:report.source_hash};
    const opening=sourceInterviewPresentation(owner,identity).text;
    if(!opening)return '';
    // Report intake assigns each original follow_up to its exact opening ID.
    const probe=publication?.questions?.find(p=>p.kind==='doorvraag'&&p.id===q.id+':follow_up');
    const approved=probe&&readQuestionReview({...identity,question:probe,publication}).approved;
    return opening+(approved?'\n\nDoorvragen:\n'+probe.text:'');
  }).filter(Boolean).join('\n\n');
}

// Called only for the current authoritative proposal, never saved metadata.
export function foundationQuestionEdition(proposal) {
  return proposal.edition ?? proposal.source?.edition ?? proposal.questionReview?.sourceEdition ?? proposal.interviewReview?.sourceEdition;
}

export function foundationQuestionPresentation(proposal, key = 'question') {
  // The selected point's ordinary question field and interview opening use
  // the same reviewed interview wording. This does not approve audit questions
  // from reports, whose purpose and review kind are different.
  if(Object.hasOwn(proposal??{},'interviewReview'))return sourceInterviewPresentation(proposal,{
    sourceId:proposal.sourceId,itemId:proposal.originKey||proposal.id,questionId:key,text:proposal[key],
    sourceEdition:foundationQuestionEdition(proposal),sourceHash:proposal.sourceHash});
  return sourceQuestionPresentation(proposal, {sourceId:proposal.sourceId,itemId:proposal.originKey || proposal.id,
    questionId:key,kind:'interview',text:proposal[key],
    sourceEdition:foundationQuestionEdition(proposal),sourceHash:proposal.sourceHash});
}
