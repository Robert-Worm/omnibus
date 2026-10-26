// Preparation only: no database writes, generated judgments or package approval.
// The ordinary source-specific review/intake/publication must bind this output.
import { createHash } from 'node:crypto';
import { assertJsonData } from './runtime-author-data.mjs';
import { questionReviewIds, questionReviewIssues, readQuestionReview,
  QUESTION_REVIEW_PUBLICATION_FORMAT } from '../lib/question-quality-review.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const need = (ok, detail) => { if (!ok) throw Error('Question publication: ' + detail); };
const fingerprint = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(value);

/** Freeze an explicitly complete inventory and existing authored decisions.
 * item/context are immutable review inputs, without this derived capsule.
 * sourceHash pins the source/package evidence (including passage documents);
 * context must include applicability, grouping, limitations and dependencies
 * used by the adapter. No identity, edition or missing decision is inferred.
 *
 * offeredQuestions contains ONLY exact retained variants passing the form gate.
 * The complete capsule also retains negative/unknown decisions for explanation.
 * Do not apply this projection to saved/user questions. Store prior capsules in
 * the existing evidence archive when the new source inventory removes a row.
 */
export function prepareQuestionReviewPublication(input) {
  assertJsonData(input);
  const { sourceId, itemId, sourceEdition, sourceHash, item, context, questions, reviews, inventoryComplete } = input;
  need(identifier(sourceId) && identifier(itemId), 'explicit source and item identities required');
  need(typeof sourceEdition === 'string' && sourceEdition.trim() && fingerprint(sourceHash), 'exact source edition/hash required');
  need(inventoryComplete === true && item && context && !Array.isArray(item) && !Array.isArray(context) &&
    typeof item === 'object' && typeof context === 'object', 'complete inventory and item/context basis required');
  need(Array.isArray(reviews), 'explicit receipt array required (empty means unknown)');
  const questionIds = questionReviewIds(questions), itemHash = sha(item), contextHash = sha(context);
  const rows = questions.map(({ id, kind, text }) => ({ id, kind, text, questionHash: sha({ id, kind, text }) }));
  const bindings = Object.fromEntries(rows.map(q => [q.id, { sourceEdition, sourceHash, contextHash, questionHash: q.questionHash }]));
  const checks = questionReviewIssues({ sourceId, itemId, itemHash, questionIds, reviews, bindings });
  // Explicit negative or missing decisions stay honest; malformed or stale
  // receipts stop preparation. Never repair hashes on an authored receipt.
  need(checks.every(row => row.reasons.every(reason => ['question-review-missing', 'question-review-schrappen',
    'question-review-herschrijven', 'question-review-HOLD'].includes(reason))), 'stale or incomplete question receipt');
  const publication = structuredClone({ format: QUESTION_REVIEW_PUBLICATION_FORMAT, schemaVersion: 1,
    sourceId, itemId, sourceEdition, sourceHash, itemHash, contextHash, questions: rows, reviews });
  const states = rows.map(question => ({ questionId: question.id,
    ...readQuestionReview({ sourceId, itemId, question, publication, sourceEdition, sourceHash }) }));
  const offered = new Set(states.filter(state => state.approved).map(state => state.questionId));
  return { publication, offeredQuestions: structuredClone(questions.filter(question => offered.has(question.id))),
    withheld: states.filter(state => !state.approved) };
}
