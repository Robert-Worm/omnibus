// Additional branches are user proposals; the historical base nodes remain untouched.
import {organizationalGoalFor} from './organizational-goals.mjs';
export const branchLabels={objective:'Doel',risk:'Risico',control:'Beheersmaatregel',auditQuestion:'Auditvraag',procedure:'Toetsing'};
export const childKinds={objective:'risk',risk:'control',control:'auditQuestion',auditQuestion:'procedure'};
export const baseParents={risk:'objective',control:'risk',auditQuestion:'control',procedure:'auditQuestion'};
export const MAX_BRANCH_ITEMS=200;
export const MAX_DRAFT_BYTES=12000000;
export function validateBranches(value,lineIds,lines=[]){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Ongeldige vertakkingen.');
  const result={};let total=0;
  for(const [lineId,items] of Object.entries(value)){
    if(!lineIds.has(lineId)||!Array.isArray(items)||(total+=items.length)>MAX_BRANCH_ITEMS)throw new Error('Onbekende kaderlijn of te veel vertakkingen.');
    const kinds=new Map(Object.keys(branchLabels).map(k=>[k,k]));
    for(const n of lines.find(l=>l.id===lineId)?.sourceItems??[])kinds.set(n.id,n.kind);
    for(const n of items){
      if(!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).sort().join(',')!=='id,kind,parent_id,text'||!/^extra-[1-9][0-9]*$/.test(n.id)||kinds.has(n.id)||!Object.hasOwn(baseParents,n.kind)||typeof n.text!=='string'||n.text.length>10000)throw new Error('Ongeldig onderdeel van de structuur.');
      kinds.set(n.id,n.kind);
    }
    for(const n of items)if(childKinds[kinds.get(n.parent_id)]!==n.kind)throw new Error('Een onderdeel is aan een ongeldig bovenliggend onderdeel gekoppeld.');
    result[lineId]=items.map(n=>({...n}));
  }
  return result;
}
export function structureNodes(line,draft){
  const base=Object.keys(branchLabels).map(kind=>({id:kind,kind,parent_id:baseParents[kind]??null,text:draft.overrides[line.id]?.[kind]??(kind==='objective'?organizationalGoalFor(line):line[kind]).text,isBase:true}));
  return [...base,...(line.sourceItems??[]).map(n=>({...n,text:draft.overrides[line.id]?.[n.id]??n.text,isBase:true})),...(draft.branchItems?.[line.id]??[]).map(n=>({...n,isBase:false}))];
}
/** @param {import('./framework-types').Line} [line] */
export function addBranch(draft,lineId,parentId,line){
  const items=draft.branchItems?.[lineId]??[];
  const total=Object.values(draft.branchItems??{}).reduce((n,list)=>n+list.length,0);
  if(total>=MAX_BRANCH_ITEMS)throw new Error('Maximaal 200 extra onderdelen per concept.');
  const parentKind=Object.hasOwn(branchLabels,parentId)?parentId:items.find(n=>n.id===parentId)?.kind??line?.sourceItems?.find(n=>n.id===parentId)?.kind;
  const kind=childKinds[parentKind];if(!kind)throw new Error('Dit onderdeel kan geen onderliggende onderdelen hebben.');
  let number=1;while(items.some(n=>n.id===`extra-${number}`))number++;
  const node={id:`extra-${number}`,kind,parent_id:parentId,text:''};
  return {node,draft:{...draft,branchItems:{...draft.branchItems,[lineId]:[...items,node]}}};
}
export function editBranch(draft,lineId,nodeId,text){
  if(typeof text!=='string'||text.length>10000)throw new Error('Ongeldige tekst.');
  const items=draft.branchItems?.[lineId]??[];if(!items.some(n=>n.id===nodeId))throw new Error('Onbekend onderdeel.');
  return {...draft,branchItems:{...draft.branchItems,[lineId]:items.map(n=>n.id===nodeId?{...n,text}:n)}};
}
export function removeBranch(draft,lineId,nodeId){
  const items=draft.branchItems?.[lineId]??[];
  if(!items.some(n=>n.id===nodeId))throw new Error('De oorspronkelijke bronstructuur blijft behouden.');
  if(items.some(n=>n.parent_id===nodeId))throw new Error('Verwijder eerst de onderliggende onderdelen.');
  return {...draft,branchItems:{...draft.branchItems,[lineId]:items.filter(n=>n.id!==nodeId)}};
}
export function branchCount(draft,lineId,kind){return (draft.branchItems?.[lineId]??[]).filter(n=>n.kind===kind).length}
export function exportBranches(line,draft){
  if(!(draft.branchItems?.[line.id]?.length))return [];
  const nodes=structureNodes(line,draft);const out=['','### Vertakte auditstructuur','Nieuwe onderdelen én hun koppelingen zijn eigen voorstellen, zonder overgenomen bronstatus of bewijs van werking. Criteria, historische bevinding en verantwoordelijkheid van de basislijn gelden niet automatisch voor nieuwe takken.',''];
  function visit(parentId,depth){for(const n of nodes.filter(n=>n.parent_id===parentId)){out.push(`${'  '.repeat(depth)}- ${branchLabels[n.kind]} [${n.id}]: ${n.text.replace(/[\r\n]+/g,' ')||'(nog in te vullen)'} — ${n.isBase?'basislijn; zie eigen herkomst en relatiebeoordeling hierboven':'UW VOORSTEL; koppeling te beoordelen; geen directe brononderbouwing'}`);visit(n.id,depth+1)}}
  visit(null,0);return out;
}
