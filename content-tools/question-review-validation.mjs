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

/** Frozen report semantics, excluding source-page delivery and question receipts. */
export function reportQuestionContext(framework, reuse) {
  return {framework, points:reuse.points, organizational_goals:reuse.organizational_goals,
    control_objectives:reuse.control_objectives, interview_questions:reuse.interview_questions,
    visual_sources:reuse.visual_sources};
}

/** A new report needs a separate interview decision for every parent norm and
 * point. An audit question, parent approval or empty list cannot stand in for it. */
export function verifyLocalReportQuestions(framework, reuse, publishedInterviews) {
  const report=framework.report, lines=framework.lines, points=reuse.points;
  const ids=[...lines,...points].map(row=>row.id), context=reportQuestionContext(framework,reuse);
  if(!ids.length||new Set(ids).size!==ids.length)fail('invalid report question scope');
  const reviews=reuse.interviewReviews;
  if(!reviews||Array.isArray(reviews)||Object.keys(reviews).length!==ids.length||ids.some(id=>!Object.hasOwn(reviews,id)))
    fail('incomplete report interview coverage');
  const fields=rows=>rows.map(({id,kind,text})=>({id,kind,text}));
  function check(item, inventory) {
    const capsule=reviews[item.id];
    if(!capsule)fail('missing report interview capsule: '+item.id);
    verifyQuestionCapsule(capsule);
    if(capsule.sourceId!==report.id||capsule.itemId!==item.id||capsule.sourceEdition!==String(report.year)||
        capsule.sourceHash!==report.source_hash||capsule.contextHash!==hash(context)||
        capsule.itemHash!==hash({item,questions:inventory})||
        JSON.stringify(fields(capsule.questions))!==JSON.stringify(inventory))
      fail('report interviews differ from their source, item or context: '+item.id);
    if(JSON.stringify(publishedInterviews?.[item.id])!==JSON.stringify(capsule))
      fail('report interview delivery differs from reviewed inventory: '+item.id);
  }
  for(const line of lines){
    const inventory=reviews[line.id]?.questions&&fields(reviews[line.id].questions);
    if(!inventory?.length||inventory[0].id!=='auditQuestion'||inventory[0].kind!=='interview'||
        inventory.length>2||inventory.length===2&&(inventory[1].id!=='auditQuestion:follow_up'||inventory[1].kind!=='doorvraag'))
      fail('report norm needs its own reviewed interview opening: '+line.id);
    check(line,inventory);
  }
  const pointIds=new Set(points.map(point=>point.id));
  if(!Array.isArray(reuse.interview_questions)||reuse.interview_questions.some(q=>!Array.isArray(q.point_ids)||
      !q.point_ids.length||q.point_ids.some(id=>!pointIds.has(id))||
      q.follow_up!==undefined&&typeof q.follow_up!=='string'))fail('invalid report interview links or probe');
  for(const point of points){
    const questions=reuse.interview_questions.filter(q=>q.point_ids.includes(point.id));
    // An absent authored opening needs an explicit negative decision on the
    // empty position. It cannot pass the form gate as an approved question.
    const inventory=questions.length?questions.flatMap(q=>[{id:q.id,kind:'interview',text:q.text},
      ...(typeof q.follow_up==='string'&&q.follow_up.trim()?[{id:q.id+':follow_up',kind:'doorvraag',text:q.follow_up}]:[])]):
      [{id:'question',kind:'interview',text:''}];
    check(point,inventory);
  }
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
