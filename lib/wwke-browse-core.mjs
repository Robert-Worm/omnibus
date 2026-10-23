import {wwkeAudienceMatches} from './wwke-audiences.mjs';

// Shared by full-source browsing and the display-only overview. These predicates
// describe navigation, never a legal applicability decision or evidence admission.
export function wwkeMatchesFields(point,mapping,locators,governmentModes,{sector='',role='',government='',includeGeneral=true,query=''}={}){
 if(!mapping)return false;
 if(sector&&!mapping.sectors.includes(sector)&&!(includeGeneral&&!mapping.sectors.length))return false;
 if(role&&!mapping.target_roles.includes(role))return false;
 const modes=government==='all'?governmentModes:government?[government]:[];
 if(modes.length&&!mapping.government_relevance.some(m=>modes.includes(m)))return false;
 const terms=query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
 const text=[point.id,point.title,point.text,point.element,point.scope,...point.addressees.map(a=>a.label),...locators].join(' ').toLocaleLowerCase('nl');
 return terms.every(t=>text.includes(t));
}
export function wwkeBrowseInventory(source,filters={},selectedIds=[]){
 const selected=new Set(selectedIds);
 const points=source.points.filter(p=>wwkeAudienceMatches(p,filters.audience)&&source.matches(p,{query:filters.query,sector:filters.sector,government:filters.government,includeGeneral:filters.includeGeneral})&&(!filters.selectedOnly||selected.has(p.id)));
 return {norms:points.filter(p=>p.selection_status==='SELECTABLE'),context:points.filter(p=>p.selection_status==='CONTEXT_ONLY'),hold:points.filter(p=>p.selection_status==='HOLD')};
}
const unique=values=>[...new Set(values.filter(Boolean))];
const element=(text='',basis='NOT_ESTABLISHED')=>({text,basis:text?basis:'NOT_ESTABLISHED',reason:text&&basis==='PROPOSED'?'Analytisch voorstel uit het beoordeelde bronpakket.':'',evidence_ids:[]});
export function wwkeBrowseRows(source,groups,filters={},selectedIds=[]){
 const inventory=wwkeBrowseInventory(source,filters,selectedIds);
 const matching=filters.section?inventory[filters.section]:[...inventory.norms,...inventory.context,...inventory.hold];
 return groups.flatMap(group=>group.criteria.flatMap(id=>{
  const criterion=source.criteria.find(c=>c.id===id);
  const points=matching.filter(p=>p.criterion_id===criterion.id);
  if(!points.length)return [];
  const context=points.map(source.contextFor);
  return [{id:criterion.id,criterionId:criterion.id,groupId:group.id,groupTitle:group.title,sourceChapter:criterion.chapter,pointIds:points.map(p=>p.id),title:criterion.title,entity:group.title,
   objective:element(unique(context.flatMap(c=>c.goals.map(g=>g.text))).join('\n\n'),'PROPOSED'),
   risk:element(unique(context.flatMap(c=>c.objectives.map(o=>o.risk))).join('\n\n'),'PROPOSED'),
   controlObjective:element(unique(context.flatMap(c=>c.objectives.map(o=>o.text))).join('\n\n'),'PROPOSED'),
   control:element(unique(points.map(p=>p.control_measure.text)).join('\n\n'),'PROPOSED'),
   criterion:element(source.criterionText(criterion,filters.audience),'INFERRED'),finding:element(),auditQuestion:element(),procedure:element(),owner:element(),relationships:[],
   controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'Geen naleving vastgesteld.',evidence_ids:[]}]))}];
 }));
}
