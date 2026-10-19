import original from './cio-reviewed/catalogue.json' with {type:'json'};
import {cioPointEdits,cioPointReviewIds} from './cio-point-editorial.mjs';
import {cioCriterionEdits,cioCriterionReviewIds} from './cio-criterion-editorial.mjs';
import {validateEditorialTrace} from './cio-trace-validation.mjs';
import {applyCioPhaseEdits,cioPhaseEditorialFor,applyCioSharedText,cioSharedEditorialFor,applyCioClauseEdits,cioClauseEditorialFor} from './cio-phase-editorial.mjs';

// The signed extraction remains intact. This separately reviewed editorial
// edition changes prose only; source spans, scope, selection and identities stay fixed.
export const cioEditorialVersion='CIO-NL-2026-10-09-1';
export const cioOriginalCatalogue=original;
function revised(entries,edits,reviewed,kind){
  const ids=new Set(entries.map(entry=>entry.id));
  if(reviewed.length!==ids.size||new Set(reviewed).size!==ids.size||reviewed.some(id=>!ids.has(id)))throw Error('Incomplete CIO editorial review: '+kind);
  for(const id of Object.keys(edits))if(!ids.has(id))throw Error('Unknown CIO editorial ID: '+id);
  return entries.map(entry=>{
    const edit=edits[entry.id];
    if(!edit)return entry;
    if(edit.before!==entry.text||typeof edit.after!=='string'||!edit.after.trim()||!edit.reason)throw Error('Invalid or stale CIO editorial change: '+entry.id);
    return {...entry,text:edit.after};
  });
}
export const cioEditedCatalogue={...original,
  objectives:original.objectives.map(o=>applyCioSharedText('objective',o.id,o)),
  criteria:applyCioClauseEdits('criterion',revised(original.criteria,cioCriterionEdits,cioCriterionReviewIds,'criteria')),
  points:applyCioClauseEdits('point',applyCioPhaseEdits(revised(original.points,cioPointEdits,cioPointReviewIds,'points'))),
};
export function cioEditorialFor(pointId){
  const point=original.points.find(p=>p.id===pointId);
  if(!point)throw Error('Unknown CIO point: '+pointId);
  const criterion=original.criteria.find(c=>c.id===point.criterion_id);
  const pointEdit=cioPointEdits[point.id],criterionEdit=cioCriterionEdits[criterion.id];
  const phaseChange=cioPhaseEditorialFor(point.id);
  const sharedChange=cioSharedEditorialFor(point.id);
  const clauseChange=cioClauseEditorialFor(point);
  return {version:cioEditorialVersion,human_validation:false,
    originalPoint:point,originalCriterion:criterion,
    pointChange:pointEdit&&pointEdit.before!==pointEdit.after?pointEdit:null,
    criterionChange:criterionEdit&&criterionEdit.before!==criterionEdit.after?criterionEdit:null,
    ...(phaseChange?{phaseChange}:{}),
    ...(sharedChange?{sharedChange}:{}),
    ...(clauseChange?{clauseChange}:{}),
  };
}
export function validateCioEditorialTrace(trace){
  // Older saved snapshots remain historical records. Never rewrite them to the
  // current prose merely because the user opens an existing investigation.
  return validateEditorialTrace(trace,cioEditorialFor,cioEditedCatalogue);
}
