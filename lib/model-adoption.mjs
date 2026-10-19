import {addMaterial, selectedModelMaterials, validateInvestigation} from './investigation.mjs';

const editable = {body:'criterion',question:'auditQuestion',procedure:'procedure',rationale:'objective',risk:'risk',control:'control',title:'title'};
const same = (a,b) => (a || '').trim() === (b || '').trim();

// A checkbox is a research selection, not an uncommitted shopping basket.
// Only changed choices are applied: opening a model or switching tabs/levels
// must never re-add a building block that the user removed in the builder.
export function syncModelLibrarySelection(draft, previous, updated) {
  let next={...draft,investigation:validateInvestigation(draft.investigation)};
  for(const model of updated.models) {
    const old=previous.models.find(m=>m.id===model.id);
    const before=new Map((old?selectedModelMaterials(old):[]).map(m=>[m.originKey,m]));
    const after=new Map(selectedModelMaterials(model).map(m=>[m.originKey,m]));
    // Older projects stored one implicit interview level. Making that level
    // explicit is an identity migration, not removal plus a new building block.
    for(const [key,prior] of [...before]) {
      const level=old?.interviewLevel||'operational',explicitKey=key+':'+level;
      if(!after.has(key)&&after.has(explicitKey)) {
        before.delete(key);before.set(explicitKey,{...prior,originKey:explicitKey,interviewLevel:level});
        next={...next,investigation:{...next.investigation,materials:next.investigation.materials.map(m=>
          m.kind==='model-question'&&m.originKey===key?{...m,originKey:explicitKey,interviewLevel:level}:m)}};
      }
    }
    const removed=new Set([...before.keys()].filter(key=>!after.has(key)));
    if(removed.size) {
      const ids=new Set(next.investigation.materials.filter(m=>m.kind==='model-question'&&removed.has(m.originKey)).map(m=>m.id));
      next={...next,included:next.included.filter(id=>!ids.has(id))};
    }
    for(const [key,incoming] of after) {
      const prior=before.get(key);
      if(prior&&JSON.stringify(prior)===JSON.stringify(incoming))continue;
      const candidates=next.investigation.materials.filter(m=>m.kind==='model-question'&&m.originKey===key);
      if(!prior) {
        // Re-select saved work without overwriting its edits or creating copies.
        next=candidates.length?{...next,included:[...new Set([...next.included,...candidates.map(m=>m.id)])]}:addMaterial(next,incoming);
      } else {
        // Edits in the model may update an untouched copy, never a separately
        // edited builder copy. Keep IDs, notes, links and source provenance.
        const untouched=candidates.filter(m=>next.included.includes(m.id)&&Object.keys(prior).every(k=>same(editable[k]?next.overrides?.[m.id]?.[editable[k]]??m[k]:m[k],prior[k])));
        for(const m of untouched)next=applyModelAdoption(next,[{incoming,candidates:[m],identicalId:''}],{[key]:{mode:'update',targetId:m.id}});
      }
    }
  }
  return next;
}
export function modelAdoptionPlan(draft, model) {
  const materials = validateInvestigation(draft.investigation).materials;
  return selectedModelMaterials(model).map(incoming => {
    const candidates = materials.filter(m=>m.kind==='model-question' && m.originKey===incoming.originKey);
    const identical = candidates.find(m=>Object.keys(incoming).every(key=>same(
      editable[key] ? draft.overrides?.[m.id]?.[editable[key]] ?? m[key] : m[key], incoming[key])));
    return {incoming, candidates, identicalId:identical?.id || ''};
  });
}

// Updating is an explicit user choice. IDs, question links, notes, field choices
// and extra user branches survive; replaced wording is recoverable through Undo.
export function applyModelAdoption(draft, plan, decisions={}) {
  let next=draft;
  for(const row of plan) {
    if(row.identicalId) {next={...next,included:[...new Set([...next.included,row.identicalId])]};continue;}
    if(!row.candidates.length) {next=addMaterial(next,row.incoming);continue;}
    const decision=decisions[row.incoming.originKey];
    if(!decision || decision.mode==='keep')continue;
    if(decision.mode==='copy') {
      // A consciously chosen extra formulation may share origin and subject.
      const expanded=addMaterial(next,{...row.incoming,originKey:'',interviewLevel:''});
      const id=expanded.investigation.materials.at(-1).id;
      next={...expanded,investigation:validateInvestigation({...expanded.investigation,
        materials:expanded.investigation.materials.map(m=>m.id===id ? {...m,...row.incoming,id}:m)})};
      continue;
    }
    const id=decision.targetId;
    if(decision.mode!=='update' || !row.candidates.some(m=>m.id===id))throw Error('Kies welke bestaande modelvraag je wilt bijwerken.');
    const wb=validateInvestigation(next.investigation);
    const overrides={...next.overrides};
    if(overrides[id]) {
      overrides[id]=Object.fromEntries(Object.entries(overrides[id]).filter(([key])=>!Object.values(editable).includes(key)));
      if(!Object.keys(overrides[id]).length)delete overrides[id];
    }
    next={...next,overrides,included:[...new Set([...next.included,id])],
      investigation:validateInvestigation({...wb,materials:wb.materials.map(m=>m.id===id ? {...m,...row.incoming,id}:m)})};
  }
  return next;
}
