import {addMaterials,validateInvestigation} from './investigation.mjs';
import goalProposals from './cio-goal-proposals.json' with {type:'json'};
import {applyCioSharedText} from './cio-phase-editorial.mjs';
import {cioEditorialFor,cioControlForPoint} from './cio-content.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
import {cioCatalogue,cioSourceBank,cioStatus,cioSourceId,cioPoints,cioReviewBasis,cioPhaseText,cioIssuesFor,cioRoleLabels,cioContributionLabels,cioKindLabels} from './cio-law-data.mjs';
export * from './cio-law-data.mjs';
export function cioGoalFor(objectiveId){return applyCioSharedText('goal',objectiveId,goalProposals[objectiveId]||null);}
const pointMap=new Map();
catalogueDerived(()=>{pointMap.clear();for(const p of cioPoints)pointMap.set(p.id,p);});
const selectionCache=new WeakMap();
function selectedKeys(draft){
 const cached=selectionCache.get(draft);
 if(cached?.included===draft.included&&cached?.materials===draft.investigation?.materials)return cached.keys;
 const included=new Set(draft.included),keys=new Set(validateInvestigation(draft.investigation).materials.filter(m=>included.has(m.id)).map(m=>m.originKey));
 selectionCache.set(draft,{included:draft.included,materials:draft.investigation?.materials,keys});return keys;
}
export function cioSelection(draft,pointIds=cioPoints.map(p=>p.id)){
 const eligible=[...new Set(pointIds)].filter(id=>pointMap.get(id)?.selection_status==='SELECTABLE');
 const keys=selectedKeys(draft);
 const selectedIds=eligible.filter(id=>keys.has(cioSourceId+':'+id));
 return {selectedIds,selected:selectedIds.length,total:eligible.length,all:eligible.length>0&&selectedIds.length===eligible.length,partial:selectedIds.length>0&&selectedIds.length<eligible.length};
}
export function makeCioMaterial(point){
 if(!pointMap.has(point.id)||JSON.stringify(pointMap.get(point.id))!==JSON.stringify(point))throw Error('Alleen het ongewijzigde beoordeelde CIO-punt kan worden overgenomen.');
 if(point.selection_status!=='SELECTABLE')throw Error('Dit CIO-punt is niet vrijgegeven voor selectie.');
 const criterion=cioCatalogue.criteria.find(c=>c.id===point.criterion_id);
 const objectives=cioCatalogue.objectives.filter(o=>point.objective_ids.includes(o.id));
 const goals=objectives.map(o=>cioGoalFor(o.id)).filter(Boolean);
 const recordIds=new Set([...point.source_links.map(l=>l.record_id),...criterion.source_record_ids,...objectives.flatMap(o=>o.source_record_ids),...goals.flatMap(g=>g.source_record_ids)]);
 const records=cioSourceBank.records.filter(r=>recordIds.has(r.id)),issues=cioIssuesFor(point);
 const editorial=cioEditorialFor(point.id),controlMeasure=cioControlForPoint(point.id);
 const trace={source:cioStatus,reviewBasis:cioReviewBasis,point,criterion,objectives,goals,records,issues,editorial,controlMeasure};
 const sourceText=records.map(r=>r.id+' · '+r.locator+' · '+(r.source_status==='DIRECT_SOURCE'?'Hoofdtekst':'Toelichting')+'\n'+r.source_spans.map(s=>'Pagina '+s.page+' ['+s.start+'–'+s.end+']\n'+s.quote).join('\n\n')).join('\n\n');
 const context=[
  'Toetscriterium · '+criterion.id+'\n'+criterion.text,'Samenstelling\n'+criterion.composition_rationale,
  ...objectives.map(o=>'Beheersdoelstelling · analytisch voorstel\n'+o.text+'\nHerleiding: '+o.rationale+'\nRisico (analytisch voorstel): '+(o.risk||'Niet geformuleerd.')),
  ...goals.map(g=>'Organisatiedoel · analytisch voorstel\n'+g.text+'\nHerleiding: '+g.rationale+'\nBronrecords: '+g.source_record_ids.join(', ')),
  'Beheersmaatregel · generieke beheersaanpak\n'+controlMeasure.text+'\nHerleiding: '+controlMeasure.reason,
  'Redactie '+editorial.version+' · afzonderlijke AI-panelreview, geen menselijke juridische goedkeuring. De bronextractie en broncitaten zijn ongewijzigd.',
  ...(editorial.pointChange?['Eerdere toetspunttekst\n'+editorial.pointChange.before+'\nReden voor aanpassing: '+editorial.pointChange.reason]:[]),
  ...(editorial.criterionChange?['Eerder bovenliggend toetscriterium\n'+editorial.criterionChange.before+'\nReden voor aanpassing: '+editorial.criterionChange.reason]:[]),
  'Voor wie\n'+point.addressees.map(a=>cioRoleLabels[a.role]+': '+a.label+(a.condition?' — '+a.condition:'')).join('\n'),
  'Aard: '+(cioKindLabels[point.normative_kind]||point.normative_kind),'Reikwijdte: '+point.scope,
  ...point.conditions.map(s=>'Voorwaarde: '+s),...point.exceptions.map(s=>'Uitzondering: '+s),
  'Afzonderlijk punt: '+point.split_rationale,
  ...point.source_links.map(l=>{const r=records.find(r=>r.id===l.record_id);return r.locator+' · '+(cioContributionLabels[l.contribution]||l.contribution)+'\nOndersteunt: '+l.supported_clause+'\nHerleiding: '+l.explanation+'\nBewerking: '+l.derivation+(l.unresolved_interpretation?'\nInterpretatiegrens: '+l.unresolved_interpretation:'');}),
  ...issues.map(i=>'Bronbeperking · '+i.id+'\n'+i.description+'\n'+i.resolution),
  cioStatus.current_consolidation_verification.display_note,cioStatus.external_dependencies,
  'Bronextractie: drie onafhankelijke AI-reviews. Geen menselijke juridische/auditgoedkeuring. Opzet en bestaan zijn auditvoorstellen; werking is niet geselecteerd.',
 ].filter(Boolean).join('\n\n');
 const design=cioPhaseText(point.phase_plans.opzet),existence=cioPhaseText(point.phase_plans.bestaan);
 return {kind:'criterion',title:point.title,body:point.text,question:'',procedure:[design&&'Opzet\n'+design,existence&&'Bestaan\n'+existence].filter(Boolean).join('\n\n'),
  foundationId:cioSourceId,originKey:cioSourceId+':'+point.id,sourcePointId:point.id,sourceControlId:point.id,
  parentCriterion:criterion.text,controlObjectiveId:objectives[0]?.id||'',controlObjectiveTitle:objectives.map(o=>o.title).join(' / '),controlObjective:objectives.map(o=>o.text).join('\n\n'),
  rationale:goals.map(g=>g.text).join('\n\n'),risk:objectives.map(o=>o.risk).filter(Boolean).join('\n\n'),control:controlMeasure.text,
  sourceTitle:cioStatus.title,sourceUrl:cioStatus.official_url,edition:cioStatus.edition,
  location:[...new Set(records.map(r=>r.locator))].join('; '),topic:point.chapter||criterion.chapter,
  sourceText,sourceContext:context,cioTrace:JSON.stringify(trace),reviewStatus:'ai-reviewed',
  sourceHash:cioStatus.official_pdf_byte_verification.sha256,
  sourceMethodology:'Brongebonden herextractie CIO-stelsel met afzonderlijk beoordeelde Nederlandse redactie '+editorial.version+'. Doel, risico en beheersdoelstelling zijn analytische voorstellen. De beheersmaatregel beschrijft een generieke beheersaanpak, geen aanvullende verplichting. Deze aanpak is afzonderlijk geredigeerd; de eerdere AI-panelreview van criteria en toetspunten geldt niet als review van deze nieuwe maatregeltekst. Criteria zijn bronparafrases of syntheses. Voor wie en uitzonderingen bepalen de toepassing. De oorspronkelijke extractietekst, redactie en exacte bron zijn afzonderlijk in de herleiding bewaard.',
  effectiveFrom:cioStatus.effective_from,statusAsOf:cioStatus.verified_on,statusNote:cioStatus.current_consolidation_verification.display_note,
  testDesign:design,testExistence:existence,testOperation:'',documents:[...new Set([point.phase_plans.opzet,point.phase_plans.bestaan].filter(p=>p.status==='APPLICABLE').map(p=>p.expected_evidence))].join('\n\n')};
}
export function chooseCioPoints(draft,pointIds,include){
 const requested=[...new Set(pointIds)].map(id=>{const p=pointMap.get(id);if(!p)throw Error('Onbekend CIO-punt: '+id);return p;});
 const points=requested.filter(p=>p.selection_status==='SELECTABLE'),wb=validateInvestigation(draft.investigation);
 if(!include){const keys=new Set(points.map(p=>cioSourceId+':'+p.id));const drop=new Set(wb.materials.filter(m=>keys.has(m.originKey)).map(m=>m.id));return {...draft,included:draft.included.filter(id=>!drop.has(id))};}
 const opened={...draft,investigation:{...wb,sourceIds:[...new Set([...wb.sourceIds,cioSourceId])]}};
 return addMaterials(opened,points.map(makeCioMaterial));
}
