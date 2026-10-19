import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wwkeCatalogue} from '../lib/wwke-law-data.mjs';
import {wwkeReadableCriteria} from '../lib/wwke-readable-criteria.mjs';
import {wwkeTextRevisions} from '../lib/wwke-text-revisions.mjs';
import {textDigest,wwkeReviewEdits,verifyWwkeReviewBasis} from './wwke-text-review.mjs';

assert.equal(wwkeTextRevisions.reviewMode,'SELF_REVIEW');
assert.equal(wwkeTextRevisions.humanValidation,false);
const edits=[],reviewedIds=new Set(),issueIds=new Set(wwkeCatalogue.issues.map(i=>i.id));
for(const batch of wwkeTextRevisions.batches){
 const bytes=readFileSync(new URL('../'+batch.path,import.meta.url));
 assert.equal(textDigest(bytes),batch.sha256,'Stale WWKE text review: '+batch.id);
 const review=JSON.parse(bytes);
 assert.equal(review.batchId,batch.id);
 edits.push(...wwkeReviewEdits(review));
 verifyWwkeReviewBasis(review,wwkeCatalogue,wwkeReadableCriteria,wwkeTextRevisions.edits);
 for(const norm of review.norms){
  assert.ok(!reviewedIds.has(norm.id),'Duplicate WWKE norm review: '+norm.id);
  reviewedIds.add(norm.id);
  for(const question of norm.sourceQuestions)assert.ok(issueIds.has(question.id),'Unknown existing WWKE boundary: '+question.id);
 }
 for(const shared of review.sharedObjectReview??[]){
  if(!shared.changes?.length)continue;
  const sharedId=shared.id??shared.objectId;
  const collection=edits.find(e=>e.id===sharedId)?.collection;
  const objectiveIds=collection==='objectives'?[sharedId]:wwkeCatalogue.objectives.filter(o=>o.goal_ids.includes(sharedId)).map(o=>o.id);
  const points=wwkeCatalogue.points.filter(p=>p.objective_ids.some(id=>objectiveIds.includes(id)));
  const criteria=wwkeCatalogue.criteria.filter(c=>c.objective_ids.some(id=>objectiveIds.includes(id))||points.some(p=>p.criterion_id===c.id));
  assert.deepEqual([...shared.dependentPointIds].sort(),points.map(p=>p.id).sort(),'Shared WWKE point scope: '+sharedId);
  assert.deepEqual([...shared.dependentCriterionIds].sort(),criteria.map(c=>c.id).sort(),'Shared WWKE norm scope: '+sharedId);
 }
}
assert.deepEqual(wwkeTextRevisions.edits,edits,'WWKE text corrections differ from their completed reviews');
console.log('WWKE text review: '+reviewedIds.size+' norms, '+edits.length+' exact replacements; SELF_REVIEW. Original source gate remains separate.');
