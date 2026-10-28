import catalogue from './wwke-content.mjs';
import bank from './wwke-reviewed/source-bank.json' with {type:'json'};
import filters from './wwke-reviewed/filters.json' with {type:'json'};
import context from './wwke-reviewed/context.json' with {type:'json'};
import status from './wwke-reviewed/status.json' with {type:'json'};
import receipt from './wwke-reviewed/receipt.json' with {type:'json'};
import impact from './wwke-reviewed/impact.json' with {type:'json'};
import pages from './wwke-reviewed/pages.json' with {type:'json'};
import {readableWwkeCriterion} from './wwke-readable-criteria.mjs';
import {wwkeTextReviewFor} from './wwke-text-revisions.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
import {wwkeMatchesFields} from './wwke-browse-core.mjs';

export const wwkeSourceId='WWKE-20260815-ASTRA-R1';
export const wwkeReviewBasis='db669c8cf076e4c0acd153d2188fbffa40a5c3a17c4cec7294ee94c590f9eaff';
export {catalogue as wwkeCatalogue,bank as wwkeBank,filters as wwkeFilters,context as wwkeContext,status as wwkeStatus,receipt as wwkeReceipt,pages as wwkePages};
export const wwkePoints=catalogue.points;
export const wwkePointMap=new Map(wwkePoints.map(p=>[p.id,p]));
export const wwkeRecordMap=new Map(bank.records.map(r=>[r.id,r]));
export const wwkeFilterMap=new Map(filters.point_mappings.map(p=>[p.point_id,p]));
catalogueDerived(()=>{for(const [map,items,key] of [[wwkePointMap,wwkePoints,'id'],[wwkeRecordMap,bank.records,'id'],[wwkeFilterMap,filters.point_mappings,'point_id']]){map.clear();for(const item of items)map.set(item[key],item);}});
export const wwkeMetadata={id:wwkeSourceId,title:context.title,kind:'law',url:context.consolidation.url,edition:'Consolidatie 15 augustus 2026',sourceHash:status.source_bank_sha256,
 usage:'Weerbaarheid en continuïteit van essentiële diensten. Filter op overheid en sector.',
 readiness:'AI-beoordeeld · menselijke acceptatie nog nodig',coverage:'Volledige wet en bijlage: 96 selecteerbare toetspunten, 17 contextpunten en 7 HOLD.',
 statusNote:'Geselecteerde bronversie 15 augustus 2026. Toepassing op jouw organisatie en onderzoeksperiode afzonderlijk bepalen.'};
export const wwkeLabels={
 ENERGIE:'Energie',VERVOER:'Vervoer',BANKWEZEN:'Bankwezen',FINANCIELE_MARKT:'Financiële-marktinfrastructuur',GEZONDHEIDSZORG:'Gezondheidszorg',DRINKWATER:'Drinkwater',AFVALWATER:'Afvalwater',DIGITALE_INFRASTRUCTUUR:'Digitale infrastructuur',OVERHEID:'Overheid',RUIMTEVAART:'Ruimtevaart',LEVENSMIDDELEN:'Levensmiddelen',
 SCOPE_READER:'Begrippen en reikwijdte',SECTOR_MINISTER:'Betrokken vakminister',COMPETENT_AUTHORITY:'Bevoegde autoriteit',NATIONAL_MINISTER:'JenV · nationale taken',CENTRAL_CONTACT_POINT:'Centraal contactpunt',CRITICAL_ENTITY:'Kritieke entiteit',EUROPEAN_CRITICAL_ENTITY:'Kritieke entiteit van Europees belang',ORDERED_CRITICAL_ENTITY:'Entiteit met concrete opdracht',DELEGATED_RULEMAKER:'Bevoegde regelgever',DESIGNATED_INSPECTOR:'Aangewezen toezichthouder',CYBER_AUTHORITY:'Cyberautoriteit',
 CENTRAL_GOVERNMENT_CRITICAL_ENTITY:'Centrale kritieke overheidsentiteit',COMPETENT_AUTHORITY_GOVERNMENT_SECTOR:'Bevoegde autoriteit · sector overheid',NATIONAL_GOVERNANCE:'Nationale governance',SCOPE_OR_EXCEPTION:'Reikwijdte en uitzonderingen',CROSS_SECTOR_CONDITIONAL:'Sectoroverstijgend · voorwaardelijk',NOT_SPECIFIC:'Geen specifieke overheidrelatie',
 PRIMARY:'Primaire bepaling',DEFINITION:'Definitie',SCOPE:'Reikwijdte',CONDITION:'Voorwaarde',EXCEPTION:'Uitzondering',QUALIFICATION:'Nuancering',EXPLANATION:'Toelichting',
 SELECTABLE:'Selecteerbaar voor je onderzoek',HOLD:'Nog niet selecteerbaar · open bronvraag',CONTEXT_ONLY:'Achtergrondinformatie · geen zelfstandige norm',
};
export const wwkePhaseText=plan=>plan?.status==='APPLICABLE'?[plan.action,'Verwacht bewijs: '+plan.expected_evidence,'Interpretatiegrens: '+plan.interpretation_boundary,'Toelichting: '+plan.reason].join('\n\n'):'';
export function wwkeMatches(point,options={}){
 return wwkeMatchesFields(point,wwkeFilterMap.get(point.id),point.source_links.map(l=>wwkeRecordMap.get(l.record_id)?.locator),filters.predicates.government_navigation.default_modes,options);
}
export function wwkeExcludedForSector(pointId,sector){return wwkeFilterMap.get(pointId)?.known_article23_excluded_sectors.includes(sector)||false;}
export function wwkePointContext(point){
 const criterion=catalogue.criteria.find(c=>c.id===point.criterion_id),objectives=catalogue.objectives.filter(o=>point.objective_ids.includes(o.id));
 const goals=catalogue.goals.filter(g=>objectives.some(o=>o.goal_ids.includes(g.id)));
 const ids=new Set([...point.source_links.map(l=>l.record_id),...criterion.source_record_ids,...objectives.flatMap(o=>o.source_record_ids),...goals.flatMap(g=>g.source_record_ids)]);
 const records=bank.records.filter(r=>ids.has(r.id));
 const issues=catalogue.issues.filter(i=>i.affected_ids.some(id=>id===point.id||id===criterion.id||point.objective_ids.includes(id)||ids.has(id))||point.material_issue_context_ids?.includes(i.id));
 const issueUses=impact.issues.flatMap(i=>(i.usage_assessments||[]).filter(u=>u.point_id===point.id));
 const textReview=wwkeTextReviewFor(point,{criterion,objectives,goals});
 return {criterion,objectives,goals,records,issues,issueUses,...(textReview?{textReview}:{})};
}
export const wwkeProposals=[];
catalogueDerived(()=>wwkeProposals.splice(0,wwkeProposals.length,...wwkePoints.filter(p=>p.selection_status==='SELECTABLE').map(p=>{
 const c=catalogue.criteria.find(c=>c.id===p.criterion_id);
 return {id:p.id,sourceId:wwkeSourceId,originKey:wwkeSourceId+':'+p.id,title:p.title,body:p.text,auditNorm:p.text,topic:p.element,groupId:c.id,groupTitle:c.title,groupDescription:readableWwkeCriterion(c),sourceControlId:p.id,sourcePointId:p.id,parentCriterion:readableWwkeCriterion(c),reviewStatus:'ai-reviewed',location:p.source_links.map(l=>wwkeRecordMap.get(l.record_id)?.locator).join('; '),sourceContext:p.scope,risk:'',control:p.control_measure.text,question:'',procedure:''};
})));
// Confirmations are user assertions, never a computed legal applicability verdict.
export function validateWwkeAssessment(point,assessment){
 if(point?.selection_status!=='SELECTABLE')throw Error('HOLD en contextpunten kunnen niet als norm worden geselecteerd.');
 // Selecting research material is not a user's legal scope confirmation.
 if(assessment?.mode==='SELECTION'){
  const a=assessment,keys=['mode','pointId','reviewBasis','scopeConfirmed','unresolvedCasesExcluded','sector','selectedAt'];
  if(Object.keys(a).some(k=>!keys.includes(k))||a.pointId!==point.id||a.reviewBasis!==wwkeReviewBasis||a.scopeConfirmed!==false||a.unresolvedCasesExcluded!==false)throw Error('Ongeldige onderzoeksselectie: toepasselijkheid is nog niet beoordeeld.');
  if(a.sector!==''&&!filters.vocabularies.sectors.some(s=>s.id===a.sector))throw Error('Ongeldig sectorfilter bij onderzoeksselectie.');
  if(wwkeExcludedForSector(point.id,a.sector))throw Error('Dit toetspunt is voor deze sector uitgezonderd in artikel 23.');
  if(typeof a.selectedAt!=='string'||!Number.isFinite(Date.parse(a.selectedAt)))throw Error('De selectiedatum ontbreekt.');
  return a;
 }
 const a=assessment;if(!a||a.mode!=='NORM'||a.scopeConfirmed!==true||a.unresolvedCasesExcluded!==true||a.pointId!==point.id||a.reviewBasis!==wwkeReviewBasis)throw Error('Beoordeel eerst de scope en open casusgrenzen van dit toetspunt.');
 for(const k of ['subject','period','basis','boundary'])if(typeof a[k]!=='string'||!a[k].trim()||a[k].length>4000)throw Error('Vul onderzoeksobject, periode, zelfstandige grond en afbakening in.');
 if(!filters.vocabularies.sectors.some(s=>s.id===a.sector)&&a.sector!=='NATIONAL_GOVERNANCE')throw Error('Kies de beoordeelde sector of nationale governance.');
 if(!Array.isArray(a.roles)||!a.roles.length||a.roles.some(r=>!filters.vocabularies.target_roles.some(v=>v.id===r))||!point.facets.target_roles.some(r=>a.roles.includes(r)))throw Error('De gekozen wettelijke rol sluit niet aan bij dit punt.');
 if(a.sector==='NATIONAL_GOVERNANCE'&&point.facets.target_roles.every(r=>['CRITICAL_ENTITY','EUROPEAN_CRITICAL_ENTITY','ORDERED_CRITICAL_ENTITY'].includes(r)))throw Error('Een entiteitsplicht vereist een concrete sectorbeoordeling.');
 if(wwkeExcludedForSector(point.id,a.sector))throw Error('Dit toetspunt is voor deze sector uitgezonderd in artikel 23.');
 if(typeof a.confirmedAt!=='string'||!Number.isFinite(Date.parse(a.confirmedAt)))throw Error('De bevestigingsdatum ontbreekt.');
 return a;
}
const approvedTraces=new Map();
export function validateWwkeMaterial(material){
 const p=wwkePointMap.get(material.sourcePointId);
 if(!p||p.selection_status!=='SELECTABLE'||material.originKey!==wwkeSourceId+':'+p.id||material.foundationId!==wwkeSourceId||!material.lawTrace)throw Error('WWKE-bouwsteen mist geldige identiteit of herleiding.');
 if(approvedTraces.get(material.lawTrace)===p.id)return;
 let trace;try{trace=JSON.parse(material.lawTrace);}catch{throw Error('Ongeldige WWKE-bronherleiding.');}
 if(trace.sourceId!==wwkeSourceId||trace.reviewBasis!==wwkeReviewBasis||JSON.stringify(trace.point)!==JSON.stringify(p))throw Error('WWKE-punt wijkt af van de vastgelegde bronversie.');
 const expected=wwkePointContext(p);
 for(const k of Object.keys(expected))if(JSON.stringify(trace[k])!==JSON.stringify(expected[k]))throw Error('Onvolledige WWKE-herleiding: '+k);
 for(const [k,v] of Object.entries({source:context,sourceStatus:status,reviewReceipt:{status:receipt.status,basis_sha256:receipt.basis_sha256,review_results:receipt.review_results,human_validation:false},filterMapping:wwkeFilterMap.get(p.id)}))if(JSON.stringify(trace[k])!==JSON.stringify(v))throw Error('WWKE-broncontext wijkt af: '+k);
 validateWwkeAssessment(p,trace.assessment);
 if(trace.assessmentHistory!==undefined){if(!Array.isArray(trace.assessmentHistory))throw Error('Ongeldige scopehistorie.');for(const a of trace.assessmentHistory)validateWwkeAssessment(p,a);}
 if(approvedTraces.size>1000)approvedTraces.clear();approvedTraces.set(material.lawTrace,p.id);
}
export function wwkeExactPassage(span){
 const page=pages.find(p=>p.page===span.page),chars=Array.from(page?.text||'');
 if(!page||!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.end<span.start||chars.slice(span.start,span.end).join('')!==span.quote)return null;
 return {before:chars.slice(0,span.start).join(''),quote:span.quote,after:chars.slice(span.end).join('')};
}
