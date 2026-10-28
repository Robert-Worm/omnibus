import { SOORTEN, voorcontrole } from './question-quality.mjs';

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
export function questionReviewIssues({ sourceId, itemId, itemHash, questionIds, reviews, bindings }) {
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
      // Publication adapters supply the exact additional source/context/text
      // fingerprints. Legacy review boundaries retain their existing checks.
      if (bindings && Object.entries(bindings[questionId] ?? {}).some(([key, value]) => review[key] !== value))
        reasons.push('question-review-binding-mismatch');
      if (!['reviewId', 'reviewer', 'reviewDate', 'basis'].every(field => text(review[field])))
        reasons.push('question-review-incomplete');
      if (!QUESTION_REVIEW_DECISIONS.includes(review.decision)) reasons.push('question-review-decision-invalid');
      else if (review.decision !== 'behouden') reasons.push('question-review-' + review.decision);
      if (Object.hasOwn(review,'formResolutions') && (review.decision !== 'behouden' ||
          !Array.isArray(review.formResolutions) || review.formResolutions.length !== 1 ||
          review.formResolutions[0]?.rule !== 'samengesteld' || !text(review.formResolutions[0]?.reason)))
        reasons.push('question-review-form-resolution-invalid');
      if (review.hold?.active === true || review.status === 'HOLD') {
        if (!reasons.includes('question-review-HOLD')) reasons.push('question-review-HOLD');
      }
    }
    return { questionId, previousDecision: review?.decision ?? null, previousReviewId: review?.reviewId ?? null, reasons };
  });
}

export const QUESTION_REVIEW_PUBLICATION_FORMAT = 'omnibus-question-review-publication';
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Read only a source-authoritative capsule from a pinned publication. Never
 * discover authorship by comparing wording, or use saved project metadata as
 * an approval. Publisher checks hashes; this synchronous reader checks exact
 * offered text against that inventory and reuses the same receipt validator.
 * Each level/variant/probe needs its own adapter-supplied question identity.
 * Missing evidence is unknown. Other source/HOLD/applicability gates still apply.
 */
export function readQuestionReview({ sourceId, itemId, question, publication, sourceEdition, sourceHash } = {}) {
  let form;
  try {
    questionReviewIds([question]);
    form = voorcontrole(question.text, question.kind);
  } catch {
    return { status: 'invalid', approved: false, form: null, reasons: ['question-review-question-invalid'], reviewId: null };
  }
  const result = (status, reasons, reviewId = null) => ({ status, approved: status === 'approved', form, reasons, reviewId });
  if (publication == null) return result('unknown', ['question-review-missing']);
  try {
    if (publication.format !== QUESTION_REVIEW_PUBLICATION_FORMAT || publication.schemaVersion !== 1 ||
        !identifier(publication.sourceId) || !identifier(publication.itemId) || !text(publication.sourceEdition) ||
        !['sourceHash', 'itemHash', 'contextHash'].every(key => hash(publication[key])) || !Array.isArray(publication.reviews))
      return result('invalid', ['question-review-publication-invalid']);
    const ids = questionReviewIds(publication.questions);
    if (publication.questions.some(q => !hash(q.questionHash))) return result('invalid', ['question-review-publication-invalid']);
    if (publication.sourceId !== sourceId || publication.itemId !== itemId ||
        sourceEdition !== undefined && publication.sourceEdition !== sourceEdition ||
        sourceHash !== undefined && publication.sourceHash !== sourceHash)
      return result('stale', ['question-review-source-mismatch']);
    const bindings = Object.fromEntries(publication.questions.map(q => [q.id, {
      sourceEdition: publication.sourceEdition, sourceHash: publication.sourceHash,
      contextHash: publication.contextHash, questionHash: q.questionHash,
    }]));
    const checks = questionReviewIssues({ sourceId, itemId, itemHash: publication.itemHash,
      questionIds: ids, reviews: publication.reviews, bindings });
    const expected = publication.questions.find(q => q.id === question.id);
    if (!expected || expected.text !== question.text || expected.kind !== question.kind)
      return result('stale', ['question-review-text-mismatch']);
    const check = checks.find(row => row.questionId === question.id), reasons = check.reasons;
    const reviewId = check.previousReviewId;
    if (reasons.some(reason => reason.endsWith('-mismatch'))) return result('stale', reasons, reviewId);
    if (reasons.includes('question-review-missing')) return result('unknown', reasons);
    if (reasons.some(reason => ['question-review-incomplete', 'question-review-decision-invalid'].includes(reason)))
      return result('invalid', reasons, reviewId);
    if (reasons.length) return result(reasons.includes('question-review-HOLD') ? 'HOLD' : check.previousDecision, reasons, reviewId);
    const resolutions=publication.reviews.find(row=>row.questionId===question.id)?.formResolutions;
    if (resolutions !== undefined) {
      // A compound non-interview question is a request for substantive review,
      // not an unconditional rejection. Only this exact HOLD can be resolved;
      // preserve the mechanical finding and never override a rewrite or deletion.
      if(question.kind==='interview'||form.uitkomst!=='HOLD'||
        form.meldingen.some(row=>row.uitkomst!=='HOLD'||row.regel!=='samengesteld'))
        return result('invalid',['question-form-resolution-not-applicable'],reviewId);
    } else if (form.uitkomst !== 'door') return result(form.uitkomst, ['question-form-' + form.uitkomst], reviewId);
    return result('approved', [], reviewId);
  } catch {
    return result('invalid', ['question-review-publication-invalid']);
  }
}
