import {addMaterials,validateInvestigation} from './investigation.mjs';
import {topicalPackage,makeTopicalMaterial} from './topical-content.mjs';
export function topicalSelection(draft,sourceId,ids){
 const p=topicalPackage(sourceId),requested=ids?new Set(ids):null;
 const eligible=p.catalogue.points.filter(x=>x.selection_status==='SELECTABLE'&&(!requested||requested.has(x.id)));
 const keys=new Set(validateInvestigation(draft.investigation).materials.filter(m=>draft.included.includes(m.id)).map(m=>m.originKey));
 const selectedIds=eligible.filter(x=>keys.has(sourceId+':'+x.id)).map(x=>x.id);
 return {selectedIds,selected:selectedIds.length,total:eligible.length,all:eligible.length>0&&selectedIds.length===eligible.length,partial:selectedIds.length>0&&selectedIds.length<eligible.length};
}
export function chooseTopicalPoints(draft,sourceId,ids,include){
 const p=topicalPackage(sourceId),points=[...new Set(ids)].map(id=>{const point=p?.catalogue.points.find(x=>x.id===id);if(!point)throw Error('Onbekend toetspunt: '+id);return point;}).filter(x=>x.selection_status==='SELECTABLE');
 const wb=validateInvestigation(draft.investigation);
 if(!include){const keys=new Set(points.map(x=>sourceId+':'+x.id)),drop=new Set(wb.materials.filter(m=>keys.has(m.originKey)).map(m=>m.id));return {...draft,included:draft.included.filter(id=>!drop.has(id))};}
 return addMaterials({...draft,investigation:{...wb,sourceIds:[...new Set([...wb.sourceIds,sourceId])]}},points.map(x=>makeTopicalMaterial(p,x)));
}
