import resources from './foundation-overview-resources.mjs';
import {registerCatalogueResource,catalogueReady} from './catalogue-runtime.mjs';

const overviews=new Map();
for(const [id,load] of Object.entries(resources))registerCatalogueResource('foundation-overview:'+id,load,value=>{
  if(value?.sourceId!==id||!Array.isArray(value.rows)||!Array.isArray(value.points)||
      value.rows.some(row=>row.displayOnly!==true))throw Error('Het kaderoverzicht hoort niet bij deze bron.');
  overviews.set(id,value);
  return ()=>overviews.delete(id);
});
// Explicit details, saved evidence and the About view still require full data.
export const foundationOverviewKey=(id,details=false)=>(!details&&Object.hasOwn(resources,id)?'foundation-overview:':'foundation:')+id;
export const foundationOverview=id=>catalogueReady(['foundation:'+id])?null:overviews.get(id);
export function foundationOverviewSelection(overview,draft,ids){
  const requested=ids&&new Set(ids),included=new Set(draft.included);
  const keys=new Set((draft.investigation?.materials||[]).filter(m=>included.has(m.id)).map(m=>m.originKey));
  const eligible=overview.points.filter(p=>p.selection_status==='SELECTABLE'&&(!requested||requested.has(p.id)));
  const selectedIds=eligible.filter(p=>keys.has(p.originKey)).map(p=>p.id),total=eligible.length,selected=selectedIds.length;
  return {selectedIds,total,selected,all:total>0&&total===selected,partial:selected>0&&selected<total};
}
