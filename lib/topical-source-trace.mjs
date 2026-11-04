import {evidenceMetadataJson} from './evidence-path-core.mjs';

export function topicalTrace(p,point){
 const criterion=p.catalogue.criteria.find(c=>c.id===point.criterion_id),objectives=p.catalogue.objectives.filter(o=>point.objective_ids.includes(o.id));
 const goals=p.catalogue.goals.filter(g=>objectives.some(o=>o.goal_ids.includes(g.id)));
 const ids=new Set([...point.source_links.map(l=>l.record_id),...criterion.source_record_ids,...objectives.flatMap(o=>o.source_record_ids),...goals.flatMap(g=>g.source_record_ids)]);
 return {sourceId:p.id,reviewBasis:p.reviewBasis,point,criterion,objectives,goals,records:p.bank.records.filter(r=>ids.has(r.id)),documents:p.manifest.documents,limitations:p.context.limitations};
}

export const topicalTraceHash=(trace,hashString)=>hashString(evidenceMetadataJson(trace,hashString));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validEntry=(entry,sourceId)=>entry&&entry.format==='omnibus-reviewed-trace-transition/1'&&
 entry.sourceId===sourceId&&typeof entry.pointId==='string'&&entry.pointId.trim()&&
 hash(entry.previousTraceHash)&&hash(entry.currentTraceHash)&&entry.previousTraceHash!==entry.currentTraceHash&&
 entry.review?.decision==='ACCEPT'&&hash(entry.review.basisSha256)&&
 typeof entry.review.reviewer==='string'&&entry.review.reviewer.trim();

// Publication checks the current side of every independently reviewed transition.
// Previous hashes identify complete old traces; they are never field exemptions.
export function verifyTopicalTraceTransitions(packet,hashString){
 const entries=packet.reviewedTraceTransitions;
 if(entries===undefined)return;
 if(!Array.isArray(entries))throw Error('Invalid reviewed topical trace transitions.');
 const seen=new Set(),current=new Map();
 for(const entry of entries){
  if(!validEntry(entry,packet.id))throw Error('Invalid reviewed topical trace transition.');
  const key=entry.pointId+':'+entry.previousTraceHash;
  if(seen.has(key))throw Error('Duplicate reviewed topical trace transition.');seen.add(key);
  const point=packet.catalogue.points.find(p=>p.id===entry.pointId&&p.selection_status==='SELECTABLE');
  if(!point)throw Error('Reviewed topical trace transition has no selectable point.');
  if(!current.has(point.id))current.set(point.id,topicalTraceHash(topicalTrace(packet,point),hashString));
  if(entry.currentTraceHash!==current.get(point.id))throw Error('Reviewed topical trace transition is stale.');
 }
}

// Called only after ordinary exact comparison fails. This leaves the saved
// material, personal questions and historical instructions untouched.
export function acceptsReviewedTopicalTrace(packet,saved,current,hashString){
 const entries=packet.reviewedTraceTransitions;
 if(!Array.isArray(entries)||saved?.sourceId!==packet.id||saved?.point?.id!==current.point.id)return false;
 const candidates=entries.filter(entry=>validEntry(entry,packet.id)&&entry.pointId===current.point.id);
 if(!candidates.length)return false;
 const currentHash=topicalTraceHash(current,hashString),previousHash=topicalTraceHash(saved,hashString);
 return candidates.some(entry=>entry.currentTraceHash===currentHash&&entry.previousTraceHash===previousHash);
}
