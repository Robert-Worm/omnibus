import { SOORTEN } from './question-quality.mjs';

export const QUESTION_REVIEW_DECISIONS = Object.freeze(['behouden', 'herschrijven', 'schrappen', 'HOLD']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(value);

/** Explicit catalogue inventory, supplied by the source adapter. Never infer
 * identities from wording or apply this contract to a user's saved questions.
 * Each row has {id, kind, text}; additional review context stays in the hashed
 * parent basis. Give each offered variant its own stable identity. */
export function questionReviewIds(questions) {
  if (!Array.isArray(questions)) throw Error('Question review: expected question inventory');
  const ids = new Set();
  for (const question of questions) {
    if (!question || !identifier(question.id) || !SOORTEN.includes(question.kind) || typeof question.text !== 'string')
      throw Error('Question review: invalid question identity, kind or text');
    if (ids.has(question.id)) throw Error('Question review: duplicate question identity');
    ids.add(question.id);
  }
  return [...ids];
}

/** Check authored receipts against the existing boundary's item hash, covering
 * the question text and variants. The caller must also bind source/context if
 * its review format keeps those under separate hashes (the semantic gate does).
 * A receipt names {sourceId, itemId, questionId, itemHash, decision, reviewId,
 * reviewer, reviewDate, basis}. Only `behouden` closes that question's review.
 * This validates bindings, never the truth of a review or a reviewer's identity.
 * A parent PASS, score or mechanical `door` cannot replace a question decision.
 */
export function questionReviewIssues({ sourceId, itemId, itemHash, questionIds, reviews }) {
  if (reviews !== undefined && !Array.isArray(reviews)) throw Error('Question review: expected receipt array');
  const byId = new Map();
  for (const review of reviews ?? []) {
    if (!review || !questionIds.includes(review.questionId) || byId.has(review.questionId))
      throw Error('Question review: unknown or duplicate receipt identity');
    byId.set(review.questionId, review);
  }
  return questionIds.map(questionId => {
    const review = byId.get(questionId), reasons = [];
    if (!review) reasons.push('question-review-missing');
    else {
      if (review.sourceId !== sourceId || review.itemId !== itemId || review.itemHash !== itemHash)
        reasons.push('question-review-hash-mismatch');
      if (!['reviewId', 'reviewer', 'reviewDate', 'basis'].every(field => text(review[field])))
        reasons.push('question-review-incomplete');
      if (!QUESTION_REVIEW_DECISIONS.includes(review.decision)) reasons.push('question-review-decision-invalid');
      else if (review.decision !== 'behouden') reasons.push('question-review-' + review.decision);
    }
    return { questionId, previousDecision: review?.decision ?? null, previousReviewId: review?.reviewId ?? null, reasons };
  });
}
