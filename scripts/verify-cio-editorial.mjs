import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import receipt from '../lib/cio-editorial-review.json' with {type:'json'};
import {cioEditedCatalogue,cioOriginalCatalogue,cioEditorialVersion} from '../lib/cio-editorial.mjs';
import {cioFunctionRows} from '../lib/cio-function-view.mjs';
import {cioControlForPoint} from '../lib/cio-control-measures.mjs';
import directionReceipt from '../lib/cio-control-direction-review.json' with {type:'json'};
import {cioControlDirectionVersion,cioControlDirections,cioControlForPoint as currentControlForPoint} from '../lib/cio-control-directions.mjs';
import {cioPhaseRevisions} from '../lib/cio-phase-editorial.mjs';
import {sharedCioTextEdits,cioClauseTextEdit} from './cio-text-review.mjs';
assert.equal(receipt.version,cioEditorialVersion);
assert.equal(receipt.human_validation,false);
assert.equal(receipt.decision,'APPROVE_EDITORIAL_AND_ANALYTICAL_USE');
for(const file of receipt.files){
 const actual=createHash('sha256').update(readFileSync(new URL('../'+file.path,import.meta.url))).digest('hex');
 assert.equal(actual,file.sha256,'CIO editorial review is stale: '+file.path);
}
const countChanged=kind=>cioEditedCatalogue[kind].filter(e=>e.text!==cioOriginalCatalogue[kind].find(o=>o.id===e.id).text).length;
assert.deepEqual(receipt.coverage,{criteria:cioEditedCatalogue.criteria.length,changed_criteria:countChanged('criteria'),points:cioEditedCatalogue.points.length,changed_points:countChanged('points'),point_measures:cioEditedCatalogue.points.filter(p=>cioControlForPoint(p.id).basis==='PROPOSED').length,viewer_rows:cioFunctionRows.length});
assert.equal(directionReceipt.version,cioControlDirectionVersion);
assert.equal(directionReceipt.independent_panel_review,false);
assert.equal(createHash('sha256').update(readFileSync(new URL('../'+directionReceipt.path,import.meta.url))).digest('hex'),directionReceipt.sha256,'CIO direction review is stale');
assert.deepEqual(directionReceipt.coverage,{criterion_directions:Object.keys(cioControlDirections).length,points:cioEditedCatalogue.points.filter(p=>currentControlForPoint(p.id).basis==='PROPOSED').length,viewer_rows:cioFunctionRows.length});
console.log('CIO criteria/points: original panel receipt verified. Generic control directions: separate editorial receipt verified; source gate remains separate.');
// The new instruction review is SELF_REVIEW, not part of the original panel receipt.
assert.equal(cioPhaseRevisions.reviewMode,'SELF_REVIEW');
assert.equal(cioPhaseRevisions.humanValidation,false);
const instructionEdits=[];
const sharedEdits=[];
const clauseEdits=[];
for(const batch of cioPhaseRevisions.batches){
 const bytes=readFileSync(new URL('../'+batch.path,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),batch.sha256,'Stale CIO text review: '+batch.path);
 const review=JSON.parse(bytes);
 sharedEdits.push(...sharedCioTextEdits(review));
 assert.equal(review.state,'COMPLETE');assert.equal(review.reviewMode,'SELF_REVIEW');
 assert.deepEqual(batch.retainedNormIds,review.norms.filter(n=>n.status==='RETAINED').map(n=>n.id));
 assert.deepEqual(batch.changedNormIds,review.norms.filter(n=>n.status==='PROPOSAL_READY').map(n=>n.id));
 for(const norm of review.norms){
  assert.equal(norm.coverageComplete,true);assert.equal(norm.sourceVerified,true);assert.deepEqual(norm.sourceQuestions,[]);
  for(const change of norm.changes){
   const clause=cioClauseTextEdit(change,norm.id,review.batchId);
   if(clause){clauseEdits.push(clause);continue;}
   const path=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.phase_plans\.(opzet|bestaan)\.(action|expected_evidence|interpretation_boundary|reason)$/);
   assert.ok(path,'Unsupported CIO text target');assert.equal(path[1],change.pointId);
   instructionEdits.push({normId:norm.id,pointId:change.pointId,phase:path[2],field:path[3],before:change.old,after:change.new,reason:change.reason,batchId:review.batchId});
  }
 }
}
assert.deepEqual(cioPhaseRevisions.edits,instructionEdits,'CIO instructions differ from their completed text review');
assert.deepEqual(cioPhaseRevisions.sharedEdits??[],sharedEdits,'CIO shared texts differ from their completed text review');
assert.deepEqual(cioPhaseRevisions.clauseEdits??[],clauseEdits,'CIO derived clauses differ from their completed text review');
for(const edit of sharedEdits){
 const points=cioOriginalCatalogue.points.filter(p=>p.objective_ids.includes(edit.objectId));
 const criteria=cioOriginalCatalogue.criteria.filter(c=>c.objective_ids.includes(edit.objectId)||points.some(p=>p.criterion_id===c.id));
 assert.deepEqual([...edit.dependentPointIds].sort(),points.map(p=>p.id).sort(),'Incomplete CIO shared point scope');
 assert.deepEqual([...edit.dependentCriterionIds].sort(),criteria.map(c=>c.id).sort(),'Incomplete CIO shared norm scope');
}
console.log('CIO instruction corrections: '+instructionEdits.length+' exact replacements; SELF_REVIEW, not human or independent approval.');
console.log('CIO shared analytical corrections: '+sharedEdits.length+' exact replacements; SELF_REVIEW.');
console.log('CIO derived-clause corrections: '+clauseEdits.length+' exact replacements; original source records unchanged.');
