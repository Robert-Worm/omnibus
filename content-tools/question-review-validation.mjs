// Pure admission checks, shared with standalone skills. No database access.
import {createHash} from 'node:crypto';
import {questionReviewIds,readQuestionReview} from '../lib/question-quality-review.mjs';
import {questionPlanInventory} from '../lib/source-question-plan.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=message=>{throw Error('Invalid question review publication: '+message);};

/** A preparation may retain missing decisions for further review. A publication
 * must have a real, exact decision for every supplied question. Negative results
 * remain negative; this check never manufactures approval or removes a HOLD.
 * Source-specific coverage checks still have to establish which capsules and
 * question categories must exist. This is not proof of reviewer independence. */
export function verifyQuestionCapsule(publication) {
  let ids;
  try { ids=questionReviewIds(publication.questions); }
  catch { fail('invalid question inventory'); }
  if(!ids.length)fail('empty inventory is not an explicit reviewed absence');
  for(const question of publication.questions){
    if(question.questionHash!==hash({id:question.id,kind:question.kind,text:question.text}))
      fail('question text differs from its reviewed hash');
    const state=readQuestionReview({sourceId:publication.sourceId,itemId:publication.itemId,
      question,publication,sourceEdition:publication.sourceEdition,sourceHash:publication.sourceHash});
    // A negative authored decision is complete evidence, but never an offer.
    const review=publication.reviews?.find(row=>row.questionId===question.id);
    const negative=review&&['herschrijven','schrappen','HOLD'].includes(review.decision);
    const expected=negative?['question-review-'+review.decision,'question-review-HOLD']:[];
    if(!state.approved&&!(negative&&state.reasons.length>0&&state.reasons.every(reason=>expected.includes(reason))))
      fail('missing, stale or invalid decision for '+publication.sourceId+'/'+publication.itemId+'/'+question.id);
  }
  return publication;
}

/** The reviewed normative context stays separate from questions and receipts.
 * Changing a norm, actor, exception, link or source invalidates question review. */
export function frameworkQuestionContext(catalogue, bank) {
  const {questionPlan: _plan, interviewReviews: _interviews, ...normative} = catalogue;
  return {catalogue: normative, bank};
}

/** New local framework packages must not silently publish an empty plan.
 * This is a write/admission rule, never a migration of saved user questions.
 * An explicit negative decision is retained and withheld by the shared reader. */
export function verifyLocalFrameworkQuestions(packet, publishedInterviews) {
  const {catalogue, bank, id: sourceId} = packet;
  const context = frameworkQuestionContext(catalogue, bank);
  const sourceEdition = packet.context?.edition, sourceHash = packet.documents?.[0]?.pdf_hash;
  const points = catalogue.points.filter(point => point.selection_status === 'SELECTABLE');
  // A source whose points are all explicitly HOLD/context-only offers no point
  // questions. Its existing source-review and selection gates remain binding.
  if (!points.length) {
    const plans=[packet.questionPlan,catalogue.questionPlan];
    if(plans.some(plan=>plan?.central?.trim()||plan?.subquestions?.length||plan?.broadSubquestions?.length)||
        Object.keys(catalogue.interviewReviews??{}).length)
      fail('framework without selectable points must not offer a question plan or interviews');
    return;
  }
  const keys = points.map(point => sourceId + ':' + point.id);
  if (new Set(keys).size !== keys.length) fail('duplicate local framework point');
  const plan = packet.questionPlan;
  if (!plan || !plan.central?.trim() || !plan.subquestions?.length || !plan.broadSubquestions?.length)
    fail('local framework needs central, broad and specific questions');
  const {questionReview, ...authoredPlan} = plan;
  if (JSON.stringify(plan) !== JSON.stringify(catalogue.questionPlan)) fail('framework plan differs from reviewed catalogue');
  const questions = questionPlanInventory(plan);
  for (const rows of [plan.subquestions, plan.broadSubquestions]) {
    const covered = new Set(rows.flatMap(row => row.originKeys));
    if (covered.size !== keys.length || keys.some(key => !covered.has(key)))
      fail('framework broad/specific question coverage differs from selectable points');
  }
  function check(capsule, itemId, item, inventory) {
    if (!capsule) fail('missing local framework question capsule: ' + itemId);
    verifyQuestionCapsule(capsule);
    if (capsule.sourceId !== sourceId || capsule.itemId !== itemId ||
        capsule.sourceEdition !== sourceEdition || capsule.sourceHash !== sourceHash ||
        capsule.contextHash !== hash(context) || capsule.itemHash !== hash({item, questions: inventory}))
      fail('local framework questions differ from their source, item or context: ' + itemId);
    const fields = rows => rows.map(({id,kind,text})=>({id,kind,text}));
    if (JSON.stringify(fields(capsule.questions)) !== JSON.stringify(fields(inventory)))
      fail('framework receipt questions differ from the offered inventory');
  }
  check(questionReview, sourceId + ':question-plan', authoredPlan, questions);
  if (JSON.stringify(questionReview.planInventory) !== JSON.stringify(questions)) fail('framework plan inventory differs');
  const interviews = catalogue.interviewReviews;
  if (!interviews || Array.isArray(interviews) || Object.keys(interviews).length !== keys.length ||
      keys.some(key => !Object.hasOwn(interviews, key))) fail('incomplete framework interview coverage');
  for (const point of points) {
    const key = sourceId + ':' + point.id, capsule = interviews[key];
    const inventory = capsule?.questions?.map(({id,kind,text}) => ({id,kind,text}));
    if (!inventory?.some(q => q.id === 'question' && q.kind === 'interview') ||
        inventory.some(q => !['interview','doorvraag'].includes(q.kind)) ||
        inventory.filter(q => q.kind === 'interview').length !== 1)
      fail('framework point needs one reviewed interview opening: ' + key);
    check(capsule, key, point, inventory);
    if (JSON.stringify(publishedInterviews?.[key]) !== JSON.stringify(capsule))
      fail('framework interview delivery differs from reviewed catalogue: ' + key);
  }
}
