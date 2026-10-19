import {wwkeCatalogue,wwkePoints,wwkePointContext,wwkeMatches} from './wwke-law-data.mjs';
import {wwkeAudienceMatches} from './wwke-audiences.mjs';
import {readableWwkeCriterion} from './wwke-readable-criteria.mjs';

export const lawBrowserColumns=[{id:'objective',title:'Doel'},{id:'risk',title:'Risico'},{id:'controlObjective',title:'Beheersdoelstelling'},{id:'control',title:'Beheersmaatregel'}];
// Reading groups describe work, not legal applicability or a transfer of duties.
// Chapters remain source locators; the original addressed roles stay on each point.
export const wwkeBrowserGroups=[
 {id:'weerbaarheid',title:'Weerbaarheid en continuïteit',description:'Risicobeoordeling, zorgplicht, incidentmelding en contact rond kritieke entiteiten.',criteria:[6,7,9,10]},
 {id:'aanwijzing',title:'Aanwijzing en ondersteuning',description:'Aanwijzing, sectorale risico-informatie en ondersteuning door vakministers en bevoegde autoriteiten.',criteria:[2,3,4]},
 {id:'coordinatie',title:'Coördinatie en informatie-uitwisseling',description:'Nationale coördinatie, samenwerking, gegevensroutes en vertrouwelijkheid.',criteria:[5,11,12]},
 {id:'toezicht',title:'Toezicht en handhaving',description:'Toezicht, opgelegd onderzoek, aanwijzingen, bestuursdwang en boetes.',criteria:[13,14]},
 {id:'regelgeving',title:'Regelgeving en verantwoording',description:'Uitvoeringsregels, voorhang, verslaglegging en evaluatie.',criteria:[15,16]},
 {id:'broncontext',title:'Begrippen en wettelijke reikwijdte',description:'Leeswijzer bij de bron; geen zelfstandige uitvoeringsnormen.',criteria:[1]},
 {id:'leveranciers',title:'Leveranciers en nationale veiligheid',description:'Open bronvragen over leveranciersinterventies en alternatievenbeoordeling.',criteria:[8]},
].map(g=>({...g,criteria:g.criteria.map(n=>'WWA-C-'+String(n).padStart(4,'0'))}));
const unique=values=>[...new Set(values.filter(Boolean))];
const element=(text='',basis='NOT_ESTABLISHED')=>({text,basis:text?basis:'NOT_ESTABLISHED',reason:text&&basis==='PROPOSED'?'Analytisch voorstel uit het beoordeelde bronpakket.':'',evidence_ids:[]});
export function wwkeBrowserInventory(filters={},selectedIds=[]){
 const selected=new Set(selectedIds);
 const points=wwkePoints.filter(p=>wwkeAudienceMatches(p,filters.audience)&&wwkeMatches(p,{query:filters.query,sector:filters.sector,government:filters.government,includeGeneral:filters.includeGeneral})&&(!filters.selectedOnly||selected.has(p.id)));
 return {norms:points.filter(p=>p.selection_status==='SELECTABLE'),context:points.filter(p=>p.selection_status==='CONTEXT_ONLY'),hold:points.filter(p=>p.selection_status==='HOLD')};
}
// A browse projection only: never rewrite parent criteria, point text, source
// relationships or the immutable reviewed package. Filtering narrows children
// and their context together; it never determines legal applicability.
export function wwkeBrowserRows(filters={},selectedIds=[]){
 const inventory=wwkeBrowserInventory(filters,selectedIds);
 const matching=filters.section?inventory[filters.section]:[...inventory.norms,...inventory.context,...inventory.hold];
 return wwkeBrowserGroups.flatMap(group=>group.criteria.flatMap(id=>{
  const criterion=wwkeCatalogue.criteria.find(c=>c.id===id);
  const points=matching.filter(p=>p.criterion_id===criterion.id);
  if(!points.length)return [];
  const context=points.map(wwkePointContext);
  return [{id:criterion.id,criterionId:criterion.id,groupId:group.id,groupTitle:group.title,sourceChapter:criterion.chapter,pointIds:points.map(p=>p.id),title:criterion.title,entity:group.title,
   objective:element(unique(context.flatMap(c=>c.goals.map(g=>g.text))).join('\n\n'),'PROPOSED'),
   risk:element(unique(context.flatMap(c=>c.objectives.map(o=>o.risk))).join('\n\n'),'PROPOSED'),
   controlObjective:element(unique(context.flatMap(c=>c.objectives.map(o=>o.text))).join('\n\n'),'PROPOSED'),
   control:element(unique(points.map(p=>p.control_measure.text)).join('\n\n'),'PROPOSED'),
   criterion:element(readableWwkeCriterion(criterion,filters.audience),'INFERRED'),finding:element(),auditQuestion:element(),procedure:element(),owner:element(),relationships:[],
   controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'Geen naleving vastgesteld.',evidence_ids:[]}]))}];
 }));
}
