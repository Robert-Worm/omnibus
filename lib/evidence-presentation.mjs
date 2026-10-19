import {sourceEvidenceIds, sourceFields} from './framework-source-items.mjs';
import {draftValue} from './framework-model.mjs';

// Only explicitly registered report-wide context moves out of the direct evidence list.
// A CONTEXT label alone is insufficient: a local qualification can be essential evidence.
export function reportContextIds(framework) {
  return new Set([...(framework.scope_evidence_ids ?? []),
    ...(framework.reportContexts ?? []).flatMap(r=>r.evidence_ids)]);
}
const fingerprint=e=>JSON.stringify([e.report_id,e.page,e.start,e.end,e.quote]);
export function uniqueEvidence(entries) {
  const seen=new Set();return entries.filter(e=>{
    const key=fingerprint(e);if(seen.has(key))return false;seen.add(key);return true;
  });
}
export function directEvidence(framework,ids) {
  const selected=new Set(ids),context=reportContextIds(framework);
  return uniqueEvidence(framework.evidence.filter(e=>selected.has(e.id)&&!context.has(e.id)));
}
export function lineEvidenceView(framework,line,activeId=null) {
  const ids=sourceEvidenceIds(line),direct=directEvidence(framework,ids);
  const priority={CRITERION:0,CONTROL:1,CONTROL_DESCRIPTION:1,RESULT:2,FINDING:2};
  direct.sort((a,b)=>(priority[a.role]??3)-(priority[b.role]??3));
  const reports=new Set([line.report_id??framework.report.id,...framework.evidence.filter(e=>ids.includes(e.id)).map(e=>e.report_id??framework.report.id)]);
  const context=reportContextIds(framework);
  const general=uniqueEvidence(framework.evidence.filter(e=>context.has(e.id)&&reports.has(e.report_id??framework.report.id)));
  const requested=framework.evidence.find(e=>e.id===activeId);
  const focused=requested ? direct.find(e=>fingerprint(e)===fingerprint(requested)) : null;
  return {direct,focused,remaining:direct.filter(e=>e!==focused),context:general};
}
const normalized=text=>String(text??'').replace(/\s+/g,' ').trim();
// Preserve different provenance and additional controls even when wording resembles a criterion.
export function sharedControlCriterion(line) {
  const a=line.control,b=line.criterion;
  return sourceFields(line,'control').length===1 && sourceFields(line,'criterion').length===1 &&
    normalized(a.text)!=='' && normalized(a.text)===normalized(b.text) && a.basis===b.basis &&
    a.reason===b.reason && JSON.stringify([...new Set(a.evidence_ids)].sort())===JSON.stringify([...new Set(b.evidence_ids)].sort());
}
export function sameDraftControlCriterion(line,draft) {
  return normalized(draftValue(line,'control',draft))===normalized(draftValue(line,'criterion',draft));
}
