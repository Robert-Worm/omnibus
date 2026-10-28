// Write boundary only. Old pinned releases and user projects remain readable.
import {QUESTION_REVIEW_PUBLICATION_FORMAT} from '../lib/question-quality-review.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {verifyQuestionCapsule,verifyLocalFrameworkQuestions} from '../content-tools/question-review-validation.mjs';
export {verifyQuestionCapsule} from '../content-tools/question-review-validation.mjs';
const fail=message=>{throw Error('Invalid question review publication: '+message);};

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
    const frameworks = id === 'lib/topical-reviewed.json';
    if(!frameworks&&!relevant(initial)&&!edits.some(relevant))continue;
    // Check the actual assembled inventory, not isolated partial edits. A late
    // resource must not change a previously valid receipt or evade this gate.
    const hydrated=structuredClone(initial);
    for(const rows of edits)applyCatalogueEdits(hydrated,structuredClone(rows));
    visit(hydrated);
    if(frameworks)for(const packet of hydrated.packages??[])
      if(packet.family==='local-framework')verifyLocalFrameworkQuestions(packet,hydrated.interviewReviews);
  }
}
