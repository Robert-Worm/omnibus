// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import revisions from "@/app/cio-quality-revisions.json" with {type:'json'};

// Current text corrections; the frozen legal extraction is untouched.
export const cioPhaseRevisions=revisions;
const fields=new Set(['action','expected_evidence','interpretation_boundary','reason']);
const editsByPoint=new Map();
const keys=new Set();
for(const edit of revisions.edits){
  const key=[edit.pointId,edit.phase,edit.field].join(':');
  if(keys.has(key)||!['opzet','bestaan'].includes(edit.phase)||!fields.has(edit.field)||
    typeof edit.before!=='string'||typeof edit.after!=='string'||!edit.after.trim()||!edit.reason)
    throw Error('Invalid CIO instruction correction: '+key);
  keys.add(key);
  editsByPoint.set(edit.pointId,[...(editsByPoint.get(edit.pointId)??[]),edit]);
}

export function applyCioPhaseEdits(points){
  const ids=new Set(points.map(p=>p.id));
  for(const id of editsByPoint.keys())if(!ids.has(id))throw Error('Unknown CIO instruction point: '+id);
  return points.map(point=>{
    const edits=editsByPoint.get(point.id);
    if(!edits)return point;
    const revised={...point,phase_plans:structuredClone(point.phase_plans)};
    for(const edit of edits){
      const phase=revised.phase_plans[edit.phase];
      if(point.criterion_id!==edit.normId||phase?.status!=='APPLICABLE'||phase[edit.field]!==edit.before)
        throw Error('Stale CIO instruction correction: '+point.id);
      phase[edit.field]=edit.after;
    }
    return revised;
  });
}

export function cioPhaseEditorialFor(pointId){
  const changes=editsByPoint.get(pointId);
  return changes?{version:revisions.version,review_form:'SELF_REVIEW',human_validation:false,changes}:null;
}

const sharedByObject=new Map();
for(const edit of revisions.sharedEdits??[]){
  const key=[edit.target,edit.objectId,edit.field].join(':');
  const allowed=edit.target==='goal'?['text','rationale','source_record_ids']:
    edit.target==='objective'?['title','text','risk','rationale','source_record_ids']:[];
  const valid=value=>edit.field==='source_record_ids'?
    Array.isArray(value)&&value.length>0&&value.every(id=>typeof id==='string'&&id.trim()):
    typeof value==='string'&&value.trim();
  if(keys.has(key)||!allowed.includes(edit.field)||!valid(edit.before)||!valid(edit.after)||
    !edit.reason||!edit.dependentCriterionIds?.length||!edit.dependentPointIds?.length)
    throw Error('Invalid CIO shared text correction: '+key);
  keys.add(key);
  const objectKey=edit.target+':'+edit.objectId;
  sharedByObject.set(objectKey,[...(sharedByObject.get(objectKey)??[]),edit]);
}

export function applyCioSharedText(target,id,original){
  const changes=sharedByObject.get(target+':'+id);
  if(!changes)return original;
  if(!original)throw Error('Unknown CIO shared text object: '+id);
  const revised={...original};
  for(const edit of changes){
    if(JSON.stringify(revised[edit.field])!==JSON.stringify(edit.before))
      throw Error('Stale CIO shared text correction: '+id+':'+edit.field);
    revised[edit.field]=structuredClone(edit.after);
  }
  return revised;
}

export function cioSharedEditorialFor(pointId){
  const changes=(revisions.sharedEdits??[]).filter(e=>e.dependentPointIds.includes(pointId));
  return changes.length?{version:revisions.version,review_form:'SELF_REVIEW',human_validation:false,changes}:null;
}

const clauseEdits=revisions.clauseEdits??[];
for(const edit of clauseEdits){
  const key=[edit.target,edit.objectId,edit.pointId,edit.recordId].join(':');
  if(keys.has(key)||!['point','criterion'].includes(edit.target)||!edit.pointId||!edit.recordId||
    typeof edit.before!=='string'||typeof edit.after!=='string'||!edit.after.trim()||!edit.reason)
    throw Error('Invalid CIO derived-clause correction: '+key);
  keys.add(key);
}
export function applyCioClauseEdits(target,entries){
  const property=target==='point'?'source_links':'source_clauses';
  const edits=clauseEdits.filter(e=>e.target===target);
  for(const edit of edits)if(!entries.some(e=>e.id===edit.objectId))throw Error('Unknown CIO clause object: '+edit.objectId);
  return entries.map(entry=>{
    const changes=edits.filter(e=>e.objectId===entry.id);
    if(!changes.length)return entry;
    const clauses=structuredClone(entry[property]);
    for(const edit of changes){
      const matches=clauses.filter(c=>c.record_id===edit.recordId&&(target==='point'?entry.id===edit.pointId:c.point_id===edit.pointId));
      if(matches.length!==1||matches[0].supported_clause!==edit.before)
        throw Error('Stale CIO derived-clause correction: '+entry.id+':'+edit.recordId);
      matches[0].supported_clause=edit.after;
    }
    return {...entry,[property]:clauses};
  });
}
export function cioClauseEditorialFor(point){
  const changes=clauseEdits.filter(e=>e.target==='point'?e.pointId===point.id:e.objectId===point.criterion_id);
  return changes.length?{version:revisions.version,review_form:'SELF_REVIEW',human_validation:false,changes}:null;
}
