// Source-derived multiplicity is independent of user-created draft branches.
export const sourceKinds=['objective','risk','control','auditQuestion','procedure'];
const parentKinds={risk:'objective',control:'risk',auditQuestion:'control',procedure:'auditQuestion'};
const primaryKinds=[...sourceKinds,'criterion','finding','owner'];
import {controlObjectiveFor} from './control-objectives.mjs';
import {organizationalGoalFor} from './organizational-goals.mjs';
export function sourceElement(line,id){return id==='objective'?organizationalGoalFor(line):id==='controlObjective'?controlObjectiveFor(line):primaryKinds.includes(id)?line[id]:line.sourceItems?.find(n=>n.id===id)}
export function sourceFields(line,kind){return [{...sourceElement(line,kind),id:kind,kind},...(line.sourceItems??[]).filter(n=>n.kind===kind)]}
export function sourceRelations(line){return [...line.relationships,...(line.sourceItems??[]).filter(n=>n.parent_id!==null).map(n=>({...n.relationship,from:n.parent_id,to:n.id}))]}
export function sourceEvidenceIds(line){return [...new Set([...primaryKinds.flatMap(k=>line[k].evidence_ids),...sourceRelations(line).flatMap(r=>r.evidence_ids),...(line.sourceItems??[]).flatMap(n=>n.evidence_ids),...Object.values(line.controlStatus).flatMap(s=>s.evidence_ids)])]}
export function validateSourceItems(framework){
  const evidenceIds=new Set(framework.evidence.map(e=>e.id));
  const bases=new Set(['EXPLICIT','INFERRED','PROPOSED','NOT_ESTABLISHED']);
  function evidence(ids){if(!Array.isArray(ids)||ids.length===0||ids.some(id=>!evidenceIds.has(id)))throw new Error('Brononderdeel mist geldige bewijsverwijzingen.')}
  for(const line of framework.lines){
    const items=line.sourceItems??[];if(!Array.isArray(items))throw new Error('Ongeldige brononderdelen.');
    const kinds=new Map(primaryKinds.map(k=>[k,k]));
    for(const n of items){
      if(!n||!/^source-[a-z0-9-]+$/.test(n.id)||kinds.has(n.id)||!sourceKinds.includes(n.kind)||!bases.has(n.basis)||typeof n.text!=='string'||!n.text.trim()||typeof n.reason!=='string'||!n.reason.trim())throw new Error('Ongeldig brononderdeel.');
      evidence(n.evidence_ids);kinds.set(n.id,n.kind);
    }
    for(const n of items){
      if(n.kind==='objective'?n.parent_id!==null:kinds.get(n.parent_id)!==parentKinds[n.kind])throw new Error('Ongeldige bronrelatie.');
      const r=n.relationship;
      if(!r||!bases.has(r.basis)||typeof r.relation!=='string'||!r.relation.trim()||typeof r.reason!=='string'||!r.reason.trim())throw new Error('Bronrelatie mist eigen herkomst en onderbouwing.');
      evidence(r.evidence_ids);
    }
  }
  return true;
}
export function workflowPage(hash){return hash==='#mijn-kader'?'framework':hash==='#rapporten'?'reports':'topics'}
export function visibleFrameworkLines(framework,draft,page){const lines=admittedLines(framework);return page==='framework'?lines.filter(l=>draft.included.includes(l.id)):lines}
import {admittedLines} from './product-scope.mjs';
