import {wwkeAudiences} from '../lib/wwke-audiences.mjs';
import {wwkeOverviewRows} from '../lib/wwke-overview.mjs';

// The existing reviewed adapter supplies the text. Keep only the inputs used
// by browsing; full evidence, assessments and test plans are never reconstructed.
export function projectWwkeOverview(sourceId,{criteria,points,contextFor,criterionText,records,filters,groups}){
 const recordMap=new Map(records.map(r=>[r.id,r])),mappings=new Map(filters.point_mappings.map(p=>[p.point_id,p]));
 const criterionIds=new Set(criteria.map(c=>c.id));
 if(!sourceId||new Set(points.map(p=>p.id)).size!==points.length||criterionIds.size!==criteria.length||recordMap.size!==records.length||mappings.size!==filters.point_mappings.length||
   points.some(p=>!criterionIds.has(p.criterion_id)||!mappings.has(p.id)||!['SELECTABLE','CONTEXT_ONLY','HOLD'].includes(p.selection_status)||p.source_links.some(l=>!recordMap.has(l.record_id))))throw Error('Invalid WWKE overview identity.');
 const overview={sourceId,groups,governmentModes:filters.predicates.government_navigation.default_modes,sectors:filters.vocabularies.sectors,
  criteria:criteria.map(c=>({id:c.id,title:c.title,chapter:c.chapter,texts:Object.fromEntries(['',...wwkeAudiences.map(a=>a.id)].map(a=>[a,criterionText(c,a)]))})),
  points:points.map(p=>{const context=contextFor(p),mapping=mappings.get(p.id);return {
   id:p.id,criterion_id:p.criterion_id,originKey:sourceId+':'+p.id,title:p.title,text:p.text,element:p.element,scope:p.scope,selection_status:p.selection_status,
   facets:{target_roles:p.facets.target_roles},addressees:p.addressees.map(a=>({label:a.label})),control_measure:{text:p.control_measure.text},
   locators:p.source_links.map(l=>recordMap.get(l.record_id).locator),
   mapping:Object.fromEntries(['sectors','target_roles','government_relevance','known_article23_excluded_sectors'].map(key=>[key,mapping[key]])),
   context:{goals:context.goals.map(g=>({text:g.text})),objectives:context.objectives.map(o=>({text:o.text,risk:o.risk}))},
  };}),
 };
 return {...overview,rows:wwkeOverviewRows(overview)};
}
