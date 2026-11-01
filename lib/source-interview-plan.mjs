import {questionReviewIds, readQuestionReview} from './question-quality-review.mjs';

const levels = new Set(['operational', 'management', 'strategic']);
const text = value => typeof value === 'string' && Boolean(value.trim());

// An authored point plan keeps each respondent and probe with its opening.
// It is catalogue evidence, never metadata trusted from a saved project.
export function interviewPlanInventory(plan) {
  if (!Array.isArray(plan) || !plan.length) throw Error('Interview plan: openings required.');
  const rows = [];
  for (const opening of plan) {
    if (!opening || !levels.has(opening.level) || !text(opening.respondent) || !text(opening.scope) ||
        !Array.isArray(opening.followups)) throw Error('Interview plan: explicit level, respondent, scope and probes required.');
    if (Object.keys(opening).some(key => !['id','text','level','respondent','scope','parentOpeningId','followups'].includes(key)))
      throw Error('Interview plan: unsupported opening field.');
    rows.push({id:opening.id, kind:'interview', text:opening.text, level:opening.level,
      respondent:opening.respondent, scope:opening.scope, parentOpeningId:opening.parentOpeningId ?? null});
    for (const probe of opening.followups) {
      if (!probe || Object.keys(probe).some(key => !['id','text'].includes(key)))
        throw Error('Interview plan: unsupported probe field.');
      rows.push({id:probe.id, kind:'doorvraag', text:probe.text, openingId:opening.id});
    }
  }
  questionReviewIds(rows);
  for (const opening of plan) {
    if (opening.parentOpeningId != null && (!plan.some(parent => parent.id === opening.parentOpeningId &&
        parent.id !== opening.id && parent.parentOpeningId == null)))
      throw Error('Interview plan: variant needs its original opening.');
  }
  return rows;
}

// The publisher checks the complete item/context hash. The browser additionally
// compares this exact projection; a changed relation cannot reuse a text receipt.
export function sourceInterviewPlanPresentation(owner, identity, level) {
  try {
    const inventory = interviewPlanInventory(owner.interviewPlan), publication = owner.interviewReview;
    if (level !== undefined && !levels.has(level) ||
        JSON.stringify(inventory) !== JSON.stringify(publication?.interviewInventory)) return [];
    const approved = question => readQuestionReview({...identity, question, publication}).approved;
    return owner.interviewPlan.filter(opening => (level === undefined || opening.level === level) &&
      approved(inventory.find(row => row.id === opening.id))).map(opening => ({...opening,
      followups:opening.followups.filter(probe => approved(inventory.find(row => row.id === probe.id)))}));
  } catch { return []; }
}
