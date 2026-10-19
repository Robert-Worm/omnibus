export const applicabilityLabels = {pending:"Nog te beoordelen",applicable:"Van toepassing",excluded:"Uitgesloten van deze opdracht",elsewhere:"Dekking via andere opdracht"};
export function validateApplicability(value = []) {
  if (!Array.isArray(value) || value.length > 2000) throw Error("Ongeldig toepasselijkheidsregister.");
  const seen = new Set();
  return value.map(r => {
    if (!r || typeof r.originKey !== "string" || !r.originKey || r.originKey.length > 300 || seen.has(r.originKey) ||
      !Object.hasOwn(applicabilityLabels,r.status) || typeof r.reason !== "string" || r.reason.length > 4000 ||
      typeof r.evidence !== "string" || r.evidence.length > 2000) throw Error("Ongeldige toepasselijkheidsbeoordeling.");
    seen.add(r.originKey);
    return {originKey:r.originKey,status:r.status,reason:r.reason,evidence:r.evidence};
  });
}
export function applicabilityComplete(r) {
  return r.status !== "pending" && Boolean(r.reason.trim()) && Boolean(r.evidence.trim());
}
export function updateApplicability(draft, originKey, patch) {
  const records = validateApplicability(draft.investigation?.applicability);
  const old = records.find(r => r.originKey === originKey) || {originKey,status:"pending",reason:"",evidence:""};
  return {...draft,investigation:{...draft.investigation,
    applicability:validateApplicability([...records.filter(r => r.originKey !== originKey),{...old,...patch,originKey}])}};
}
export function applicabilityRows(draft, requirements) {
  const assessed = new Map(validateApplicability(draft.investigation?.applicability).map(r=>[r.originKey,r]));
  return requirements.map(p => {
    const r = assessed.get(p.originKey) || {originKey:p.originKey,status:"pending",reason:"",evidence:""};
    const material = draft.investigation?.materials.find(m => m.originKey === p.originKey);
    const selected = Boolean(material && draft.included.includes(material.id));
    const linked = Boolean(selected && draft.research?.links.some(l => l.line_id === material.id));
    return {...r,id:p.sourceControlId,title:p.title,selected,linked,complete:applicabilityComplete(r)};
  });
}
export function applicabilityGroups(draft, items) {
  const recorded=new Set((draft.investigation?.applicability || []).map(r=>r.originKey));
  const sourceIds=new Set(items.filter(p=>p.kind==="audit-coverage" && (recorded.has(p.originKey) ||
    draft.investigation?.materials.some(m=>draft.included.includes(m.id)&&m.foundationId===p.sourceId))).map(p=>p.sourceId));
  return [...sourceIds].map(sourceId=>{
    const requirements=items.filter(p=>p.sourceId===sourceId&&p.kind==="audit-coverage");
    return {sourceId,requirements,rows:applicabilityRows(draft,requirements)};
  });
}
