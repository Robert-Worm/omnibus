// Write boundary only. Old pinned releases and user projects remain readable.
import {createHash} from 'node:crypto';
import {QUESTION_REVIEW_PUBLICATION_FORMAT,questionReviewIds,readQuestionReview} from '../lib/question-quality-review.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';

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
  function capsule(node){
    if(!node||node.format!==QUESTION_REVIEW_PUBLICATION_FORMAT)fail('invalid or missing capsule');
    verifyQuestionCapsule(node);
  }
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.format===QUESTION_REVIEW_PUBLICATION_FORMAT){verifyQuestionCapsule(node);return;}
    for(const [key,child]of Object.entries(node)){
      if(key==='questionReview'||key==='interviewReview')capsule(child);
      else if(key==='interviewReviews'){
        if(!child||typeof child!=='object'||Array.isArray(child))fail('invalid capsule index');
        for(const entry of Object.values(child))capsule(entry);
      }else visit(child);
    }
  }
  const select=repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  const names=new Set(['questionReview','interviewReview','interviewReviews']);
  const relevant=node=>node&&typeof node==='object'&&(node.format===QUESTION_REVIEW_PUBLICATION_FORMAT||
    Object.keys(node).some(key=>names.has(key))||Array.isArray(node.path)&&node.path.some(key=>names.has(key))||
    Object.values(node).some(relevant));
  const resources=new Map();
  for(const [id,initial]of Object.entries(value.modules)){
    const edits=(value.registrations[id]??[]).map(key=>{
      const ref=value.refs[key];
      if(!resources.has(ref.hash))resources.set(ref.hash,JSON.parse(select.get(value.release,ref.hash).payload));
      return resources.get(ref.hash);
    });
    if(!relevant(initial)&&!edits.some(relevant))continue;
    // Check the actual assembled inventory, not isolated partial edits. A late
    // resource must not change a previously valid receipt or evade this gate.
    const hydrated=structuredClone(initial);
    for(const rows of edits)applyCatalogueEdits(hydrated,structuredClone(rows));
    visit(hydrated);
  }
}
