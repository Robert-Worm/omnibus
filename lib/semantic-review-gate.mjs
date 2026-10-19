import {createHash} from 'node:crypto';

// A hash does not assess meaning. It binds independent, authored judgments to
// the exact records, runtime context, source passages and grouping reviewed.
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateSemanticReview({sourceId,itemPrefix=sourceId,groupPrefix=sourceId,reviewFile,review,records,groups,items,sourceRows,expectedRecords,expectedGroups}){
 const decisions=new Map(),groupDecisions=new Map();
 const current=items.filter(p=>p.sourceId===sourceId);
 const fail=detail=>{throw Error(`${sourceId} semantic review: ${detail}`);};
 if(review.semanticDecision!=='PASS'||review.sharedContextReview?.decision!=='PASS')fail('incomplete independent review');
 if(!review.reviewer?.trim()||!review.reviewType?.trim()||!review.reviewDate?.trim())fail('missing reviewer provenance');
 if(review.records?.length!==expectedRecords||records.length!==expectedRecords||current.length!==expectedRecords||review.groups?.length!==expectedGroups||Object.keys(groups).length!==expectedGroups)fail('incomplete coverage');
 for(const decision of review.records){
  const record=records.find(r=>`${itemPrefix}-${r.id}`===decision.code),item=current.find(p=>p.id===decision.code);
  if(!record||!item||decisions.has(decision.code)||decision.decision!=='PASS'||!decision.basis?.trim())fail('missing, duplicate or unclosed decision '+decision.code);
  if(sha(record)!==decision.recordHash||sha(item)!==decision.itemHash||sha(sourceRows(record))!==decision.passagesHash)fail('changed after independent review '+decision.code);
  decisions.set(item.id,{...decision,reviewFile,reviewType:review.reviewType,reviewer:review.reviewer,reviewDate:review.reviewDate});
 }
 for(const decision of review.groups){
  const group=groups[decision.id],members=records.filter(r=>r.group===decision.id).map(r=>`${itemPrefix}-${r.id}`);
  const key=`${groupPrefix}-${decision.id}`;
  if(!group||groupDecisions.has(key)||decision.decision!=='PASS'||!decision.basis?.trim()||decision.title!==group[0]||decision.description!==group[1]||sha(decision.records)!==sha(members))fail('changed or unclosed group '+decision.id);
  const actualMembers=current.filter(p=>p.groupId===key);
  if(sha(actualMembers.map(p=>p.id).sort())!==sha([...members].sort())||actualMembers.some(p=>p.groupTitle!==group[0]||p.groupDescription!==group[1]))fail('runtime group differs '+decision.id);
  groupDecisions.set(key,{...decision,reviewFile});
 }
 if(decisions.size!==expectedRecords||groupDecisions.size!==expectedGroups)fail('incomplete distinct coverage');
 return {decisions,groupDecisions};
}
