import revisions from '../app/wwke-quality-revisions.json' with {type:'json'};

// Current practical prose only. Frozen quotations, legal metadata and selection
// boundaries are deliberately not writable through this correction layer.
export const wwkeTextRevisions=revisions;
const allowed={
  criteria:new Set(['title','text','composition_rationale']),
  objectives:new Set(['title','text','risk','rationale','source_record_ids']),
  goals:new Set(['title','text','rationale','source_record_ids']),
  points:new Set(['title','text','split_rationale','control_measure.text','control_measure.rationale',
    'source_links.supported_clause','source_links.explanation',
    ...['opzet','bestaan'].flatMap(phase=>['action','expected_evidence','interpretation_boundary','reason'].map(field=>'phase_plans.'+phase+'.'+field))]),
  readableCriteria:new Set(['text']),
};
const keys=new Set();
for(const edit of revisions.edits){
  const key=[edit.collection,edit.id,edit.field,edit.recordId??'',edit.index??''].join(':');
  const valid=value=>edit.field==='source_record_ids'?Array.isArray(value)&&value.length>0&&value.every(id=>typeof id==='string'&&id.trim()):typeof value==='string'&&value.trim();
  if(keys.has(key)||!allowed[edit.collection]?.has(edit.field)||!valid(edit.before)||!valid(edit.after)||!edit.reason||!edit.batchId||
    (edit.collection==='readableCriteria'&&(!Number.isInteger(edit.index)||edit.index<0))||
    (edit.field.startsWith('source_links.')&&!edit.recordId))throw Error('Invalid WWKE text correction: '+key);
  keys.add(key);
}

export function wwkeTextTarget(entry,edit){
  if(edit.field.startsWith('source_links.')){
    const links=entry.source_links.filter(link=>link.record_id===edit.recordId);
    if(links.length!==1)throw Error('Ambiguous WWKE source relation: '+edit.id+':'+edit.recordId);
    return {object:links[0],field:edit.field.split('.')[1]};
  }
  const parts=edit.field.split('.');
  if(parts[0]==='phase_plans'&&entry.phase_plans?.[parts[1]]?.status!=='APPLICABLE')throw Error('WWKE phase is not offered: '+edit.id);
  let object=entry;
  for(const part of parts.slice(0,-1))object=object?.[part];
  if(!object||!Object.hasOwn(object,parts.at(-1)))throw Error('Unknown WWKE text field: '+edit.id+':'+edit.field);
  return {object,field:parts.at(-1)};
}
function replace(entry,edit){
  const {object,field}=wwkeTextTarget(entry,edit);
  if(JSON.stringify(object[field])!==JSON.stringify(edit.before))throw Error('Stale WWKE text correction: '+edit.id+':'+edit.field);
  object[field]=structuredClone(edit.after);
}
export function applyWwkeCatalogueText(original){
  const result={...original},changed=new Set();
  for(const edit of revisions.edits.filter(e=>e.collection!=='readableCriteria')){
    const entries=result[edit.collection],index=entries.findIndex(entry=>entry.id===edit.id);
    if(index<0)throw Error('Unknown WWKE text object: '+edit.id);
    if(edit.collection==='points'&&entries[index].selection_status!=='SELECTABLE')throw Error('WWKE restricted point is not editable: '+edit.id);
    if(!changed.has(edit.collection)){result[edit.collection]=[...entries];changed.add(edit.collection);}
    const key=edit.collection+':'+edit.id;
    if(!changed.has(key)){result[edit.collection][index]=structuredClone(entries[index]);changed.add(key);}
    replace(result[edit.collection][index],edit);
  }
  return result;
}
export function applyWwkeReadableText(original){
  const result=structuredClone(original);
  for(const edit of revisions.edits.filter(e=>e.collection==='readableCriteria')){
    const part=result[edit.id]?.[edit.index];
    if(!part)throw Error('Unknown WWKE reading variant: '+edit.id);
    replace(part,edit);
  }
  return result;
}
export function wwkeTextReviewFor(point,{criterion,objectives,goals}){
  const ids=new Set([point.id,criterion.id,...objectives.map(o=>o.id),...goals.map(g=>g.id)]);
  const edits=revisions.edits.filter(e=>ids.has(e.id));
  if(!edits.length)return null;
  const batches=new Set(edits.map(e=>e.batchId));
  return {version:revisions.version,review_form:'SELF_REVIEW',human_validation:false,
    batches:revisions.batches.filter(b=>batches.has(b.id)).map(({id,sha256})=>({id,sha256})),
    fields:edits.map(({collection,id,field,recordId,index})=>({collection,id,field,...(recordId?{recordId}:{}),...(index!==undefined?{index}:{})}))};
}
