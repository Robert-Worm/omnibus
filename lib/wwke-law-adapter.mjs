import {addMaterials,validateInvestigation} from './investigation.mjs';
import {readableWwkeCriterion} from './wwke-readable-criteria.mjs';
import {wwkeSourceId,wwkeReviewBasis,wwkePoints,wwkePointMap,wwkePointContext,wwkeMetadata,wwkeContext,wwkeStatus,wwkeReceipt,wwkeFilterMap,wwkePhaseText,wwkeLabels,wwkeExcludedForSector,validateWwkeAssessment} from './wwke-law-data.mjs';
const assessmentHeading=a=>a.mode==='SELECTION'?'Onderzoeksselectie — toepasselijkheid nog te beoordelen':'Vastgelegde scopebeoordeling door gebruiker (geen automatisch juridisch oordeel)';
export function wwkeSelection(draft,ids=wwkePoints.map(p=>p.id)){
 const eligible=[...new Set(ids)].filter(id=>wwkePointMap.get(id)?.selection_status==='SELECTABLE');
 const included=new Set(draft.included),keys=new Set((draft.investigation?.materials||[]).filter(m=>included.has(m.id)).map(m=>m.originKey));
 const selectedIds=eligible.filter(id=>keys.has(wwkeSourceId+':'+id));
 return {selectedIds,selected:selectedIds.length,total:eligible.length,all:eligible.length>0&&selectedIds.length===eligible.length,partial:selectedIds.length>0&&selectedIds.length<eligible.length};
}
export function makeWwkeMaterial(point,assessment){
 if(JSON.stringify(wwkePointMap.get(point.id))!==JSON.stringify(point))throw Error('Alleen het ongewijzigde beoordeelde WWKE-punt kan worden overgenomen.');
 validateWwkeAssessment(point,assessment);
 const detail=wwkePointContext(point),{criterion,objectives,goals,records,issues}=detail;
 const trace={sourceId:wwkeSourceId,reviewBasis:wwkeReviewBasis,source:wwkeContext,sourceStatus:wwkeStatus,reviewReceipt:{status:wwkeReceipt.status,basis_sha256:wwkeReceipt.basis_sha256,review_results:wwkeReceipt.review_results,human_validation:false},point,...detail,filterMapping:wwkeFilterMap.get(point.id),assessment};
 const sourceText=point.source_links.map(l=>{const r=records.find(r=>r.id===l.record_id);return `${r.id} · ${r.locator} · ${wwkeLabels[l.contribution]||l.contribution} · ${l.basis_code}\n${(l.visible_spans||[]).map(s=>`p. ${s.page} [${s.start}–${s.end}]\n${s.quote}`).join('\n\n')}${r.xml_evidence?'\nXML: '+r.xml_evidence.quote:''}`;}).join('\n\n');
 const sourceContext=[
  'Bronversie: '+wwkeMetadata.edition,'AI-beoordeeld; geen menselijke juridische of auditgoedkeuring.',
  'Toetscriterium\n'+criterion.text+'\n'+criterion.composition_rationale,
  ...goals.map(g=>'Doel · analytisch voorstel\n'+g.text+'\n'+g.rationale),
  ...objectives.map(o=>'Beheersdoelstelling · analytisch voorstel\n'+o.text+'\n'+o.rationale+'\nRisico · analytisch voorstel\n'+o.risk),
  'Beheersmaatregel · generieke analytische aanpak\n'+point.control_measure.text+'\n'+point.control_measure.rationale,
  'Voor wie\n'+point.addressees.map(a=>a.label+(a.condition?' — '+a.condition:'')).join('\n'),
  'Reikwijdte\n'+point.scope,...point.conditions.map(s=>'Voorwaarde: '+s),...point.exceptions.map(s=>'Uitzondering: '+s),
  'Selectiegrens\n'+point.selection_reason,...detail.issueUses.map(u=>u.issue_id+' · '+u.mode+'\n'+u.reason),
  ...issues.filter(i=>i.status==='OPEN').map(i=>'Open bronvraag '+i.id+'\n'+i.description+'\n'+i.resolution),
  assessmentHeading(assessment)+'\n'+JSON.stringify(assessment),
  wwkeContext.scope.navigation_boundary,
 ].join('\n\n');
 const design=wwkePhaseText(point.phase_plans.opzet),existence=wwkePhaseText(point.phase_plans.bestaan);
 return {kind:'criterion',title:point.title,body:point.text,question:'',procedure:'',foundationId:wwkeSourceId,originKey:wwkeSourceId+':'+point.id,sourcePointId:point.id,sourceControlId:point.id,
  parentCriterion:readableWwkeCriterion(criterion),controlObjectiveId:objectives[0]?.id||'',controlObjectiveTitle:objectives.map(o=>o.title).join(' / '),controlObjective:objectives.map(o=>o.text).join('\n\n'),
  rationale:goals.map(g=>g.text).join('\n\n'),risk:objectives.map(o=>o.risk).filter(Boolean).join('\n\n'),control:point.control_measure.text,
  sourceTitle:wwkeMetadata.title,sourceUrl:wwkeMetadata.url,edition:wwkeMetadata.edition,topic:point.element,
  location:[...new Set(point.source_links.map(l=>l.xml_anchor||records.find(r=>r.id===l.record_id)?.locator))].join('; '),
  sourceText,sourceContext,lawTrace:JSON.stringify(trace),reviewStatus:'ai-reviewed',sourceHash:wwkeStatus.source_bank_sha256,
  sourceMethodology:'Brongebonden herextractie met twee blinde lezingen, onafhankelijke reconciliatie en drie onafhankelijke AI-eindreviews op dezelfde basis. Doelen, risico’s, beheersmaatregelen en toetsaanpak zijn analytische voorstellen. Open bronvragen en toepassingsgrenzen blijven behouden.',
  effectiveFrom:wwkeContext.dates.commencement,statusAsOf:wwkeContext.dates.context_checked_on,statusNote:wwkeMetadata.statusNote,
  testDesign:design,testExistence:existence,testOperation:'',documents:[...new Set([point.phase_plans.opzet,point.phase_plans.bestaan].filter(p=>p.status==='APPLICABLE').map(p=>p.expected_evidence))].join('\n\n')};
}
export function chooseWwkePoints(draft,ids,include,assessments={}){
 const requested=[...new Set(ids)].map(id=>{const p=wwkePointMap.get(id);if(!p)throw Error('Onbekend WWKE-punt: '+id);return p;});
 const points=requested.filter(p=>p.selection_status==='SELECTABLE'),wb=validateInvestigation(draft.investigation);
 if(!include){const keys=new Set(points.map(p=>wwkeSourceId+':'+p.id)),drop=new Set(wb.materials.filter(m=>keys.has(m.originKey)).map(m=>m.id));return {...draft,included:draft.included.filter(id=>!drop.has(id))};}
 // Explicit scope assessments retain their separate validation. Direct research
 // selection uses selectWwkePointsDirect and never fabricates a scope assessment.
 const materials=points.map(p=>makeWwkeMaterial(p,assessments[p.id]));
 const updates=new Map(materials.map(m=>[m.originKey,m]));
 const retained=wb.materials.map(m=>{
  const next=updates.get(m.originKey);if(!next)return m;
  const trace=JSON.parse(m.lawTrace),newAssessment=JSON.parse(next.lawTrace).assessment;
  if(JSON.stringify(trace.assessment)===JSON.stringify(newAssessment))return m;
  trace.assessmentHistory=[...(trace.assessmentHistory||[]),trace.assessment];trace.assessment=newAssessment;
  const marker=assessmentHeading(JSON.parse(m.lawTrace).assessment),nextMarker=assessmentHeading(newAssessment);
  const sourceContext=m.sourceContext.split(marker)[0]+next.sourceContext.slice(next.sourceContext.indexOf(nextMarker));
  return {...m,lawTrace:JSON.stringify(trace),sourceContext};
 });
 return addMaterials({...draft,investigation:{...wb,materials:retained,sourceIds:[...new Set([...wb.sourceIds,wwkeSourceId])]}},materials);
}

/** Adopt visible research points immediately; retain saved edits and assessments. */
export function selectWwkePointsDirect(draft,ids,sector=''){
 const wb=validateInvestigation(draft.investigation),existing=new Map(wb.materials.map(m=>[m.originKey,m]));
 const selectedAt=new Date().toISOString();
 const points=[...new Set(ids)].map(id=>{const p=wwkePointMap.get(id);if(!p)throw Error('Onbekend WWKE-punt: '+id);return p;})
  .filter(p=>p.selection_status==='SELECTABLE'&&!wwkeExcludedForSector(p.id,sector));
 if(!points.length)return draft;
 const materials=points.map(p=>existing.get(wwkeSourceId+':'+p.id)||makeWwkeMaterial(p,{
  mode:'SELECTION',pointId:p.id,reviewBasis:wwkeReviewBasis,scopeConfirmed:false,unresolvedCasesExcluded:false,sector,selectedAt,
 }));
 return addMaterials({...draft,investigation:{...wb,sourceIds:[...new Set([...wb.sourceIds,wwkeSourceId])]}},materials);
}
