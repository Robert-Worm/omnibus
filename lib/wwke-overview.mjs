import {wwkeBrowseRows,wwkeMatchesFields} from './wwke-browse-core.mjs';

export function wwkeOverviewRows(overview,filters={},selectedIds=[]){
 const source={points:overview.points,criteria:overview.criteria,
  contextFor:point=>point.context,
  matches:(point,options)=>wwkeMatchesFields(point,point.mapping,point.locators,overview.governmentModes,options),
  criterionText:(criterion,audience)=>criterion.texts[audience||'']||criterion.texts[''],
 };
 return wwkeBrowseRows(source,overview.groups,filters,selectedIds).map(row=>({...row,displayOnly:true}));
}
export const wwkeOverviewExcluded=(overview,id,sector)=>overview.points.find(p=>p.id===id)?.mapping.known_article23_excluded_sectors.includes(sector)||false;
