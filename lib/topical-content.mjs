import data from './topical-reviewed.json' with {type:'json'};
import {catalogueDerived} from './catalogue-runtime.mjs';

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
export function topicalRows(p){return p.catalogue.criteria.map(c=>{
 const points=p.catalogue.points.filter(x=>x.criterion_id===c.id),objectives=p.catalogue.objectives.filter(o=>c.objective_ids.includes(o.id));
 const group=points[0]?.chapter||c.chapter;
 return {id:c.id,criterionId:c.id,groupId:group,pointIds:points.map(x=>x.id),title:c.title,entity:group,navigationSubjects:[group],
  objective:element(join(objectives.map(o=>topicalGoal(p,o.id).text))),risk:element(join(objectives.map(o=>o.risk))),
  controlObjective:element(join(objectives.map(o=>o.text))),control:element(join(objectives.map(o=>o.control_measure))),
  criterion:element(c.text,'INFERRED',c.composition_rationale),finding:element(),auditQuestion:element(),procedure:element(),owner:element(),relationships:[],
  controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'Geen naleving vastgesteld.',evidence_ids:[]}]))};
});}
export function topicalGroups(p){return [...new Set(p.catalogue.points.map(x=>x.chapter))].map(id=>({id,title:id}));}
export function topicalMeasure(p,criterionId){const c=p.catalogue.criteria.find(c=>c.id===criterionId);return {text:join(p.catalogue.objectives.filter(o=>c?.objective_ids.includes(o.id)).map(o=>o.control_measure))};}
export const topicalPhaseText=plan=>plan?.status==='APPLICABLE'?[plan.action,'Verwacht bewijs: '+plan.expected_evidence].join('\n\n'):'';
export function topicalTrace(p,point){
 const criterion=p.catalogue.criteria.find(c=>c.id===point.criterion_id),objectives=p.catalogue.objectives.filter(o=>point.objective_ids.includes(o.id));
 const goals=p.catalogue.goals.filter(g=>objectives.some(o=>o.goal_ids.includes(g.id)));
 const ids=new Set([...point.source_links.map(l=>l.record_id),...criterion.source_record_ids,...objectives.flatMap(o=>o.source_record_ids),...goals.flatMap(g=>g.source_record_ids)]);
 return {sourceId:p.id,reviewBasis:p.reviewBasis,point,criterion,objectives,goals,records:p.bank.records.filter(r=>ids.has(r.id)),documents:p.manifest.documents,limitations:p.context.limitations};
}
export function makeTopicalMaterial(p,point){
 const canonical=p.catalogue.points.find(x=>x.id===point.id);
 if(!canonical||JSON.stringify(canonical)!==JSON.stringify(point)||point.selection_status!=='SELECTABLE')throw Error('Dit toetspunt is niet vrijgegeven voor selectie.');
 const trace=topicalTrace(p,point),{criterion,objectives,goals,records}=trace;
 const primary=point.source_links.find(l=>l.contribution==='PRIMARY'),record=p.bank.records.find(r=>r.id===primary?.record_id);
 const sourcePage=record?.source_spans[0]?.page;
 const document=p.documents.find(d=>{const m=p.manifest.documents.find(m=>m.id===d.packageDocumentId);return sourcePage>=m.first_package_page&&sourcePage<=m.last_package_page;})||p.documents[0];
 const context=[point.scope,...point.addressees.map(a=>a.label+' ('+a.role+')'+(a.condition?' — '+a.condition:'')),...point.conditions,...point.exceptions,
  ...point.source_links.map(l=>l.contribution+' · '+l.record_id+'\n'+l.supported_clause+'\n'+l.explanation),
  ...p.context.limitations.map(l=>l.title+'\n'+l.text),...['opzet','bestaan'].map(k=>k+' · '+point.phase_plans[k].interpretation_boundary)].join('\n\n');
 return {id:point.id,sourceId:p.id,kind:'criterion',title:point.title,body:point.text,auditNorm:point.text,question:'',
  foundationId:p.id,originKey:p.id+':'+point.id,sourcePointId:point.id,sourceControlId:point.id,
  parentCriterion:criterion.text,controlObjectiveId:objectives[0]?.id||'',controlObjectiveTitle:join(objectives.map(o=>o.title)),controlObjective:join(objectives.map(o=>o.text)),
  rationale:join(goals.map(g=>g.text)),risk:join(objectives.map(o=>o.risk)),control:join(objectives.map(o=>o.control_measure)),
  sourceTitle:p.context.title,sourceUrl:p.status.official_url,edition:p.context.edition,topic:point.chapter,
  groupId:point.chapter,groupTitle:point.chapter,groupDescription:'',
  location:join(records.filter(r=>point.source_links.some(l=>l.contribution==='PRIMARY'&&l.record_id===r.id)).map(r=>r.locator)),
  sourceHash:document.pdf_hash,sourceDocumentHashes:JSON.stringify(Object.fromEntries(p.documents.map(d=>[d.id,d.pdf_hash]))),
  sourceText:records.map(r=>r.locator+'\n'+r.source_spans.map(s=>topicalSpanLocation(p.manifest.documents,s)+'\n'+s.quote).join('\n\n')).join('\n\n'),
  sourceContext:context,topicalTrace:JSON.stringify(trace),reviewStatus:'ai-reviewed',
  sourceChanges:'Bronparafrase en eigen audituitwerking. Oorspronkelijke publicaties en exacte citaten zijn ongewijzigd. Drie onafhankelijke AI-reviews; geen menselijke goedkeuring.',
  sourceMethodology:p.context.applicability,sourceLicense:p.status.publication_rights,
  effectiveStatus:p.context.status==='EFFECTIVE'?'in-force':p.context.status==='UNKNOWN'?'unknown':'future',effectiveFrom:p.context.effective_from,statusAsOf:p.context.as_of,
  statusNote:p.context.applicability,statusSource:p.status.official_url,
  testDesign:topicalPhaseText(point.phase_plans.opzet),testExistence:topicalPhaseText(point.phase_plans.bestaan),testOperation:'',
  procedure:join(['opzet','bestaan'].map(k=>topicalPhaseText(point.phase_plans[k]))),
  documents:join(['opzet','bestaan'].map(k=>point.phase_plans[k].expected_evidence))};
}
// Small search projection; full material/trace is made only on explicit adoption.
export const topicalProposals=[];
catalogueDerived(()=>topicalProposals.splice(0,topicalProposals.length,...topicalPackages.flatMap(p=>p.catalogue.points.filter(x=>x.selection_status==='SELECTABLE').map(point=>{
 const c=p.catalogue.criteria.find(c=>c.id===point.criterion_id),o=p.catalogue.objectives.find(o=>point.objective_ids.includes(o.id));
 return {id:point.id,sourceId:p.id,originKey:p.id+':'+point.id,title:point.title,body:point.text,auditNorm:point.text,parentCriterion:c.text,
  groupId:point.chapter,groupTitle:point.chapter,groupDescription:'',topic:point.chapter,sourcePointId:point.id,sourceControlId:point.id,
  sourceContext:[point.scope,...point.conditions,...point.exceptions].join('\n'),risk:o?.risk||'',control:o?.control_measure||'',reviewStatus:'ai-reviewed'};
}))));
export function validateTopicalMaterial(material){
 const p=topicalPackage(material.foundationId),point=p?.catalogue.points.find(x=>x.id===material.sourcePointId);
 if(!point||point.selection_status!=='SELECTABLE'||material.originKey!==p.id+':'+point.id)throw Error('Onbekend of niet-selecteerbaar Topical-toetspunt.');
 let trace;try{trace=JSON.parse(material.topicalTrace);}catch{throw Error('Ontbrekende Topical-bronherleiding.');}
 if(JSON.stringify(trace)!==JSON.stringify(topicalTrace(p,point)))throw Error('Topical-bronherleiding wijkt af van de beoordeelde versie.');
 const expected=makeTopicalMaterial(p,point);
 if(material.sourceHash!==expected.sourceHash||material.sourceDocumentHashes!==expected.sourceDocumentHashes)throw Error('Topical-bronversie wijkt af.');
}
export function topicalSpanLocation(documents,span){
 const d=documents.find(d=>span.page>=d.first_package_page&&span.page<=d.last_package_page);
 if(!d)throw Error('Bronpagina valt buiten de vastgelegde documenten.');
 return `${d.original_path?.split(/[\\/]/).pop()||d.file||d.id} · PDF-pagina ${span.page-d.first_package_page+1}`;
}
