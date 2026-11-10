import data from './topical-reviewed.json' with {type:'json'};
import {catalogueDerived} from './catalogue-runtime.mjs';
import {evidenceMetadataJson,evidenceStringHash} from './evidence-path.mjs';
import {auditReadingText,distinctAuditLimitations} from './audit-reading.mjs';
import {topicalPointDocument,topicalSpanPage,topicalPrimarySpans,zonderAfbreking} from './topical-document-identity.mjs';
import {topicalTrace,acceptsReviewedTopicalTrace} from './topical-source-trace.mjs';
import {topicalNavigation} from './topical-navigation-groups.mjs';
export {topicalTrace} from './topical-source-trace.mjs';
export {topicalSpanLocation,topicalSpanPage,topicalPrimarySpans,zonderAfbreking} from './topical-document-identity.mjs';

export const topicalPackages=data.packages;
export const topicalIds=topicalPackages.map(p=>p.id);
export const topicalPackage=id=>topicalPackages.find(p=>p.id===id);
export const topicalMetadata=topicalPackages.map(p=>({id:p.id,title:p.context.title,kind:p.context.kind||'audit',url:p.status.official_url,
 edition:p.context.edition,usage:p.context.intro,readiness:'Brongebonden normen en afzonderlijke toetspunten',
 coverage:p.context.coverage||'Hoofdtekst en volledige gebruikershandleiding; drie onafhankelijke AI-reviews, geen menselijke goedkeuring.',
 context:p.context.applicability}));
export function topicalGoal(p,objectiveId){const o=p.catalogue.objectives.find(o=>o.id===objectiveId);return {text:p.catalogue.goals.filter(g=>o?.goal_ids.includes(g.id)).map(g=>g.text).join('\n\n')};}
const join=values=>[...new Set(values.filter(Boolean))].join('\n\n');
const element=(text='',basis='PROPOSED',reason='')=>({text,basis,reason,evidence_ids:[]});
export function topicalRows(p){const navigation=topicalNavigation(p);return p.catalogue.criteria.map(c=>{
 const points=p.catalogue.points.filter(x=>x.criterion_id===c.id),objectives=p.catalogue.objectives.filter(o=>c.objective_ids.includes(o.id));
 const originalGroup=points[0]?.chapter||c.chapter,group=navigation.criteria.get(c.id);
 return {id:c.id,criterionId:c.id,groupId:group.id,pointIds:points.map(x=>x.id),title:c.title,entity:group.title,navigationSubjects:[group.title,originalGroup],
  objective:element(join(objectives.map(o=>topicalGoal(p,o.id).text))),risk:element(join(objectives.map(o=>o.risk))),
  controlObjective:element(join(objectives.map(o=>o.text))),control:element(join(objectives.map(o=>o.control_measure))),
  criterion:element(auditReadingText(c.text),'INFERRED',c.composition_rationale),finding:element(),auditQuestion:element(),procedure:element(),owner:element(),relationships:[],
  controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'Geen naleving vastgesteld.',evidence_ids:[]}]))};
});}
export function topicalGroups(p){return topicalNavigation(p).groups;}
export function topicalMeasure(p,criterionId){const c=p.catalogue.criteria.find(c=>c.id===criterionId);return {text:join(p.catalogue.objectives.filter(o=>c?.objective_ids.includes(o.id)).map(o=>o.control_measure))};}
export const topicalPhaseText=plan=>plan?.status==='APPLICABLE'?[plan.action,'Verwacht bewijs: '+plan.expected_evidence].join('\n\n'):'';
// Share the document identity between the lightweight proposal and full trace.
// Interview receipts stay separate from the frozen normative point.
export function makeTopicalMaterial(p,point){
 const canonical=p.catalogue.points.find(x=>x.id===point.id);
 if(!canonical||JSON.stringify(canonical)!==JSON.stringify(point)||point.selection_status!=='SELECTABLE')throw Error('Dit toetspunt is niet vrijgegeven voor selectie.');
 const trace=topicalTrace(p,point),{criterion,objectives,goals,records}=trace;
 const document=topicalPointDocument(p,point);
 const context=[point.scope,...point.addressees.map(a=>a.label+(a.condition?' — '+a.condition:'')),...point.conditions,...point.exceptions,
  // Geen bewijs- en interpretatiegrenzen per fase (besluit beheerder 8 november 2026: minder herhaalde tekst).
  ...distinctAuditLimitations(p.context.limitations).map(l=>l.title+'\n'+l.text)].join('\n\n');
 return {id:point.id,sourceId:p.id,kind:'criterion',title:point.title,body:point.text,auditNorm:point.text,question:'',
  ...(point.relevance?{relevance:point.relevance}:{}),
  foundationId:p.id,originKey:p.id+':'+point.id,sourcePointId:point.id,sourceControlId:point.id,
  parentCriterion:auditReadingText(criterion.text),controlObjectiveId:objectives[0]?.id||'',controlObjectiveTitle:join(objectives.map(o=>o.title)),controlObjective:join(objectives.map(o=>o.text)),
  rationale:join(goals.map(g=>g.text)),risk:join(objectives.map(o=>o.risk)),control:join(objectives.map(o=>o.control_measure)),
  sourceTitle:p.context.title,sourceUrl:p.status.official_url,edition:p.context.edition,topic:point.chapter,
  groupId:point.chapter,groupTitle:point.chapter,groupDescription:'',
  location:join(records.filter(r=>point.source_links.some(l=>l.contribution==='PRIMARY'&&l.record_id===r.id)).map(r=>r.locator)),
  sourceHash:document.pdf_hash,sourceDocumentHashes:JSON.stringify(Object.fromEntries(p.documents.map(d=>[d.id,d.pdf_hash]))),
  sourceText:records.map(r=>r.locator+'\n'+topicalPrimarySpans(p.manifest.documents,r.source_spans).map(s=>topicalSpanPage(p.manifest.documents,s)+'\n'+zonderAfbreking(s.quote)).join('\n\n')).join('\n\n'),
  sourceContext:context,topicalTrace:JSON.stringify(trace),reviewStatus:'ai-reviewed',
  sourceChanges:'De toetspunten en de toetsaanpak zijn een eigen uitwerking van de bron. De oorspronkelijke publicatie en de citaten zijn niet gewijzigd. De uitwerking is drie keer onafhankelijk door AI beoordeeld; er is geen menselijke goedkeuring.',
  sourceMethodology:p.context.applicability,sourceLicense:p.status.publication_rights,
  effectiveStatus:p.context.status==='EFFECTIVE'?'in-force':p.context.status==='UNKNOWN'?'unknown':'future',effectiveFrom:p.context.effective_from,statusAsOf:p.context.as_of,
  statusNote:p.context.applicability,statusSource:p.status.official_url,
  testDesign:topicalPhaseText(point.phase_plans.opzet),testExistence:topicalPhaseText(point.phase_plans.bestaan),testOperation:topicalPhaseText(point.phase_plans.werking),
  procedure:join(['opzet','bestaan'].map(k=>topicalPhaseText(point.phase_plans[k]))),
  documents:join(['opzet','bestaan'].map(k=>point.phase_plans[k].expected_evidence))};
}
// Small search projection; full material/trace is made only on explicit adoption.
export const topicalProposals=[];
catalogueDerived(()=>topicalProposals.splice(0,topicalProposals.length,...topicalPackages.flatMap(p=>p.catalogue.points.filter(x=>x.selection_status==='SELECTABLE').map(point=>{
 const c=p.catalogue.criteria.find(c=>c.id===point.criterion_id),o=p.catalogue.objectives.find(o=>point.objective_ids.includes(o.id));
 return {id:point.id,sourceId:p.id,originKey:p.id+':'+point.id,title:point.title,body:point.text,auditNorm:point.text,parentCriterion:c.text,question:'',
  ...(point.relevance?{relevance:point.relevance}:{}),
  groupId:point.chapter,groupTitle:point.chapter,groupDescription:'',topic:point.chapter,sourcePointId:point.id,sourceControlId:point.id,
  sourceContext:[point.scope,...point.conditions,...point.exceptions].join('\n'),risk:o?.risk||'',control:o?.control_measure||'',reviewStatus:'ai-reviewed',
  edition:p.context.edition,sourceHash:topicalPointDocument(p,point)?.pdf_hash,
  ...(Object.hasOwn(p.catalogue.interviewPlans??{},p.id+':'+point.id)?{interviewPlan:p.catalogue.interviewPlans[p.id+':'+point.id]}:{}),
  ...(Object.hasOwn(data.interviewReviews??{},p.id+':'+point.id)?{interviewReview:data.interviewReviews[p.id+':'+point.id]}:{})};
}))));
export function validateTopicalMaterial(material){
 const p=topicalPackage(material.foundationId),point=p?.catalogue.points.find(x=>x.id===material.sourcePointId);
 if(!point||point.selection_status!=='SELECTABLE'||material.originKey!==p.id+':'+point.id)throw Error('Onbekend of niet-selecteerbaar Topical-toetspunt.');
 let trace;try{trace=JSON.parse(material.topicalTrace);}catch{throw Error('Ontbrekende Topical-bronherleiding.');}
 const current=topicalTrace(p,point);
 if(evidenceMetadataJson(trace)!==evidenceMetadataJson(current)&&!acceptsReviewedTopicalTrace(p,trace,current,evidenceStringHash))throw Error('Topical-bronherleiding wijkt af van de beoordeelde versie.');
 const expected=makeTopicalMaterial(p,point);
 if(material.sourceHash!==expected.sourceHash||material.sourceDocumentHashes!==expected.sourceDocumentHashes)throw Error('Topical-bronversie wijkt af.');
}
