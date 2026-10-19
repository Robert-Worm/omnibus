import {catalogue,cioControlForPoint,bank,pages,issues,status} from './cio-content.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
export const cioCatalogue=catalogue,cioSourceBank=bank,cioPages=pages,cioIssues=issues,cioStatus=status;
export const cioSourceId=catalogue.source_identity.source_id;
export const cioPoints=catalogue.points;
export {cioEditorialFor,cioEditorialVersion,cioOriginalCatalogue} from './cio-content.mjs';
export const cioReviewBasis='a668db3ffca4d6a6d3aaa36965b70f5d9d6ecf64f0b85a780172815bf084096f';
export const cioMetadata={id:cioSourceId,title:status.title,kind:'law',url:status.official_url,
 edition:status.edition,usage:'CIO-stelsel: rollen, besluitvorming, informatievoorziening en digitale beheersing.',
 readiness:'Herextractie · AI-beoordeeld · menselijke acceptatie nog nodig',coverage:'Volledige publicatie, inclusief toelichting. 72 criteria; 148 selecteerbare punten en 2 HOLD.',
 statusNote:status.current_consolidation_verification.display_note};
export const cioRoleLabels={NORM_ADDRESSEE:'Normadressaat / bevoegdheidshouder',TASK_BEARER:'Taakdrager',BENEFICIARY:'Ontvanger / begunstigde',OTHER:'Overige betrokkene'};
export const cioContributionLabels={PRIMARY:'Primaire bepaling',DEFINITION:'Definitie',SCOPE:'Reikwijdte',CONDITION:'Voorwaarde',EXCEPTION:'Uitzondering',QUALIFICATION:'Nuancering',EXPLANATION:'Toelichting'};
export const cioKindLabels={DUTY:'Verplichting',PROHIBITION:'Verbod',POWER:'Bevoegdheid',PERMISSION:'Toestemming',DEFINITION:'Definitie',SCOPE:'Reikwijdte',EXCEPTION:'Uitzondering',COMMENCEMENT:'Inwerkingtreding',EXPLANATION:'Toelichting',OTHER:'Overig'};
export function cioPhaseText(plan){return plan?.status==='APPLICABLE' ? [plan.action,'Verwacht bewijs: '+plan.expected_evidence,'Bewijsgrens: '+plan.interpretation_boundary,'Status: '+plan.reason].join('\n\n') : '';}
export function cioRecordsFor(point){return point.source_links.map(link=>bank.records.find(r=>r.id===link.record_id)).filter(Boolean);}
export function cioIssuesFor(point){const ids=new Set([point.id,point.criterion_id,...point.objective_ids,...point.source_links.map(l=>l.record_id)]);return issues.issues.filter(i=>i.affected_ids.some(id=>ids.has(id)));}
export function cioCodepointRange(text,start,end){const chars=Array.from(text);if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>chars.length)throw Error('Invalid source span');return {start:chars.slice(0,start).join('').length,end:chars.slice(0,end).join('').length};}
// This projection is searchable catalogue data, not a second semantic extraction.
export const cioProposals=[];
catalogueDerived(()=>cioProposals.splice(0,cioProposals.length,...cioPoints.filter(p=>p.selection_status==='SELECTABLE').map(p=>{
 const c=catalogue.criteria.find(c=>c.id===p.criterion_id),o=catalogue.objectives.find(o=>o.id===p.objective_ids[0]);
 return {id:p.id,sourceId:cioSourceId,originKey:cioSourceId+':'+p.id,title:p.title,body:p.text,auditNorm:p.text,
  topic:p.chapter||c.chapter,groupId:o?.id||'ungrouped',groupTitle:o?.title||'Overige punten',groupDescription:o?.text||'',
  sourceControlId:p.id,sourcePointId:p.id,parentCriterion:c.text,reviewStatus:'ai-reviewed',
  sourceContext:[...p.addressees.map(a=>a.label),...p.conditions,...p.exceptions,...p.source_links.map(l=>l.supported_clause)].join('\n'),
  location:cioRecordsFor(p).map(r=>r.locator).join('; '),risk:o?.risk||'',control:cioControlForPoint(p.id).text,rationale:'',question:'',procedure:[cioPhaseText(p.phase_plans.opzet),cioPhaseText(p.phase_plans.bestaan)].filter(Boolean).join('\n\n'),
 };
})));
