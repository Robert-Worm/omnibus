// Write boundary only. Old pinned releases and user projects remain readable.
import {createHash} from 'node:crypto';
import {QUESTION_REVIEW_PUBLICATION_FORMAT,questionReviewIds,readQuestionReview} from '../lib/question-quality-review.mjs';

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

/** Visit both inline data and deferred data at the actual publication boundary.
 * Resource integrity has already been checked by publishRuntime. */
export function verifyPublishedQuestionCapsules(repository, value) {
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.format===QUESTION_REVIEW_PUBLICATION_FORMAT){verifyQuestionCapsule(node);return;}
    for(const child of Object.values(node))visit(child);
  }
  visit(value.modules);
  const select=repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  const seen=new Set();
  for(const ref of Object.values(value.refs))if(!seen.has(ref.hash)){
    seen.add(ref.hash);visit(JSON.parse(select.get(value.release,ref.hash).payload));
  }
}
