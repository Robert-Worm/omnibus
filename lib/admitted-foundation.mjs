// Admission is data published by the private review gate, never inferred from a
// title, source ID or historical presence. This adapter adds no normative text.
export function isAdmittedFoundation(source) {
  return source?.catalogueAdmission?.schema === 'reviewed-flat/v1' &&
    /^[a-f0-9]{64}$/.test(source.catalogueAdmission.reviewBasis || '');
}
const element=(text='',basis='PROPOSED')=>({text,basis,reason:'',evidence_ids:[]});
export const flatNormSelectable=p=>p.auditRole==='norm'&&['ai-reviewed','reviewed'].includes(p.reviewStatus)&&(!p.selection_status||p.selection_status==='SELECTABLE');
export function flatLawSummary(source,items) {
  if(!isAdmittedFoundation(source))return null;
  const norms=items.filter(p=>p.sourceId===source.id&&flatNormSelectable(p));
  return {groups:new Set(norms.map(p=>p.groupId)).size,norms:norms.length,
    pointIds:norms.map(p=>p.id),originKeys:norms.map(p=>p.originKey)};
}
export function flatLawPresentation(source,items) {
  if(!isAdmittedFoundation(source))throw Error('Dit kader is niet toegelaten tot de catalogus.');
  const members=items.filter(p=>p.sourceId===source.id),norms=members.filter(p=>p.auditRole==='norm');
  if(new Set(members.map(p=>p.id)).size!==members.length)throw Error('Dubbele normidentiteit.');
  if(norms.some(p=>!p.auditNorm?.trim()||!p.originKey||!p.groupId))throw Error('Onvolledige norm voor de gedeelde viewer.');
  const points=norms.map(p=>({id:p.id,criterion_id:p.id,title:p.title,text:p.auditNorm,
    basis:'SOURCE_PARAPHRASE',objective_ids:[p.id],addressees:[],normative_kind:'OTHER',
    scope:p.sourceContext||'',conditions:[],exceptions:[],interpretation_status:'ANALYST_DERIVED',
    selection_status:flatNormSelectable(p)?'SELECTABLE':'HOLD',selection_reason:p.selection_reason||'Bronbewerking met AI-review; selectie bevestigt geen toepasselijkheid.',
    source_links:[],phase_plans:{opzet:{status:'APPLICABLE',action:p.testDesign,reason:''},bestaan:{status:'APPLICABLE',action:p.testExistence,reason:''},werking:{status:'NOT_SELECTED',reason:''}},
    split_rationale:'Bestaande beoordeelde eenheid; niet opnieuw gesplitst.',chapter:p.groupTitle||p.topic||'',source_cross_references:[],source_interpretation_notes:[]}));
  const criteria=points.map(p=>({id:p.id,title:p.title,text:p.text,basis:p.basis,objective_ids:p.objective_ids,composition_rationale:'',source_record_ids:[],chapter:p.chapter,applicability:p.scope,child_selection:'SELECTABLE'}));
  const objectives=norms.map(p=>({id:p.id,title:p.title,text:'',basis:'ANALYST_PROPOSAL',rationale:'',risk:p.risk||'',risk_basis:'ANALYST_PROPOSAL',source_record_ids:[]}));
  const rows=norms.map(p=>({id:p.id,criterionId:p.id,groupId:p.groupId,pointIds:[p.id],title:p.title,entity:p.groupTitle,navigationSubjects:[p.groupTitle],articleReferences:[p.location||''],
    objective:element(),risk:element(p.risk),controlObjective:element(),control:element(p.control),criterion:element(p.auditNorm,'INFERRED'),
    finding:element(),auditQuestion:element(p.question),procedure:element(p.procedure),owner:element(),relationships:[],
    controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'',evidence_ids:[]}]))}));
  return {points,catalogue:{criteria,objectives},rows,records:[],
    groups:[...new Map(norms.map(p=>[p.groupId,{id:p.groupId,title:p.groupTitle}])).values()],
    contextItems:members.filter(p=>p.auditRole!=='norm'),items:norms.filter(flatNormSelectable)};
}
export function flatLawSelection(draft,items,ids) {
  const requested=ids&&new Set(ids),eligible=items.filter(p=>flatNormSelectable(p)&&(!requested||requested.has(p.id)));
  const included=new Set(draft.included),keys=new Set((draft.investigation?.materials||[]).filter(m=>included.has(m.id)).map(m=>m.originKey));
  const selectedIds=eligible.filter(p=>keys.has(p.originKey)).map(p=>p.id),total=eligible.length,selected=selectedIds.length;
  return {selectedIds,total,selected,all:total>0&&total===selected,partial:selected>0&&selected<total};
}
// Only a current, unchanged selection uses the live catalogue viewer. Older
// snapshots and user edits retain the existing editable material viewer.
export function admittedMaterialTarget(draft,id,sources,items) {
  const material=draft.investigation?.materials.find(m=>m.id===id);
  if(!material||Object.keys(draft.overrides?.[id]||{}).length)return null;
  const source=sources.find(s=>s.id===material.foundationId&&isAdmittedFoundation(s));
  if(!source)return null;
  const point=items.find(p=>p.originKey===material.originKey&&p.auditRole==='norm');
  if(!point)return null;
  if((material.edition||'')!==(point.edition||source.edition||''))return null;
  if(material.auditNorm!==undefined&&material.auditNorm!==point.auditNorm)return null;
  const fields=['title','question','rationale','risk','control','procedure','documents','testDesign','testExistence','testOperation','sourceHash','sourceDocumentHashes','sourceControlId','sourceText','sourceContext','sourceChanges','sourceMethodology','sourceLicense','sourceUrl','reviewStatus','location','statusNote','statusSource','effectiveStatus','effectiveFrom','statusAsOf'];
  if(fields.some(k=>(material[k]||'')!==(point[k]||''))||material.body!==point.auditNorm)return null;
  return {sourceId:point.sourceId,pointId:point.id};
}
