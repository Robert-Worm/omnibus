import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import original from '../app/report-point-catalogue.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};
import {pointWording} from '../lib/report-point-adapter.mjs';
import {organizationalGoalFor} from '../lib/organizational-goals.mjs';
import {controlObjectiveFor} from '../lib/control-objectives.mjs';

export const REPORT_QUALITY_PAYLOAD_SHA256='bb2433ce003dac00b8d8cf05d93273bdb58733a6e3e58164671dae52ebff298b';
const INHERITED_PANEL_PAYLOAD_SHA256='a69ba45bdfe152a305f3c2c3c8f2ad0cc1164a207e28f9d86199609d80564a2e';
const TEXT_APPLICATION_SHA256='a9a468347a03338991d7c0f37a960c2a1aae0103134a853c7a63f33cfde54e0d';
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const inheritedNormIds=['OCW26-K01','BEGVOORB25-OCW02','BEGVOORB25-SZW03','IHH26-K07','M36526-K01','OCW26-K03','IHH26-K06','IHH26-K11','M36526-K05','IENW26-K08'];

export function verifyReportQualityRelease() {
  const bytes=read('app/report-quality-revisions.json');
  if(sha(bytes)!==REPORT_QUALITY_PAYLOAD_SHA256)throw Error('Practical correction differs from reviewed payload.');
  const payload=JSON.parse(bytes);
  // Explicitly requested content-only corrections use the recorded single-reviewer
  // mode. Never relabel their acceptance as an independent panel or a new source admission.
  const applicationBytes=read('content-tools/report-quality-text-20261016/acceptance.json');
  if(sha(applicationBytes)!==TEXT_APPLICATION_SHA256)throw Error('Text application record changed.');
  const application=JSON.parse(applicationBytes);
  if(application.decision!=='APPLY_REVIEWED_TEXT'||application.reviewForm!=='SELF_REVIEW'||application.humanValidation!==false||application.targetSha256!==REPORT_QUALITY_PAYLOAD_SHA256)
    throw Error('Missing exact text application record.');
  const normIds=[...inheritedNormIds,...application.batches.flatMap(b=>b.changedNormIds)];
  if(new Set(normIds).size!==normIds.length)throw Error('Duplicate correction identity.');
  if(payload.schema!==1||payload.humanValidation!==false||JSON.stringify(payload.entries.map(e=>e.id))!==JSON.stringify(normIds))
    throw Error('Unexpected practical correction scope.');
  if(sha(JSON.stringify(payload.entries.slice(0,10)))!=='17f2f2063603e45740d65fed3093e69f91b3816d537e941767f5cadf2992d1e3')
    throw Error('Previously accepted batch3 entries changed.');
  // Earlier entries inherit acceptance only while identical. Each receipt
  // remains bound to the actual version its independent reviewer examined.
  if(sha(JSON.stringify(payload.entries.slice(0,5)))!=='4d528bc4387af5f2a069f8ce419cabd8596c79178b8d0ef818f4063a0a379bbe')
    throw Error('Previously accepted correction entries changed.');
  for(const [name,expected] of [
    ['source-acceptance.json','3d19fec54c791c54f8eb47125d51822331640ac04c13a25e2d45c0efc2b63227'],
    ['practical-acceptance.json','65eb3061b0c93b581fe067f51999aec9e3acd1578a824952143330d83c3e426c'],
  ]) {
    if(sha(read('content-tools/report-quality-20261016/'+name))!==expected)
      throw Error('Inherited correction acceptance missing or changed: '+name);
  }
  if(sha(JSON.stringify(payload.entries.slice(0,8)))!=='21776789d62d8f48d4ecc17609d0b612c618de1f15e0d6297aa53444b664228b')
    throw Error('Previously accepted batch2 entries changed.');
  for(const [name,expected] of [
    ['source-acceptance.json','1087e94fcea6a4e61cd8be561e4e6e1c3f2970f0d429ab2babe7552e4954e0b9'],
    ['practical-acceptance.json','433de9396db61b8845df863577fa151b2f51bcd28468323308d17f0fd2d9fb48'],
  ]) {
    if(sha(read('content-tools/report-quality-20261016-batch2/'+name))!==expected)
      throw Error('Inherited batch2 acceptance missing or changed: '+name);
  }
  const blocks=[...original.blocks,...additions.catalogue.blocks],points=[...original.points,...additions.catalogue.points];
  const seen=new Set();
  for(const entry of payload.entries) {
    const block=blocks.find(b=>b.id===entry.id);
    if(!block||block.report_id!==entry.reportId||sha(JSON.stringify(block.line))!==entry.beforeLineSha256)
      throw Error('Practical correction original line changed: '+entry.id);
    if(Object.keys(entry.line).some(k=>!['risk','control','criterion','relationships','procedure','finding','exportContext'].includes(k)))throw Error('Non-practical line change.');
    if(entry.line.finding&&JSON.stringify({...entry.line.finding,reason:block.line.finding.reason})!==JSON.stringify(block.line.finding))throw Error('Original finding changed beyond own reason text.');
    if(Object.keys(entry.block??{}).some(k=>k!=='decomposition_rationale'))throw Error('Non-textual block change.');
    for(const p of entry.points) {
      const old=points.find(x=>x.id===p.id);
      if(!old||old.legacy_line_id!==entry.id||seen.has(p.id)||sha(JSON.stringify(old))!==p.beforeSha256)
        throw Error('Practical correction original point changed: '+p.id);
      seen.add(p.id);
      if(Object.keys(p.changes).some(k=>!['title','text','phases','decomposition','qualifier_checks','qualifier_assessments','source_context'].includes(k)))throw Error('Source/identity change not allowed.');
      for(const name of Object.keys(old.phases)) {
        if((p.changes.phases??old.phases)[name].status!==old.phases[name].status||p.generic_variant.phases[name].status!==old.phases[name].status)
          throw Error('Practical correction changes phase boundary: '+p.id);
      }
    }
    if(points.filter(p=>p.legacy_line_id===entry.id).some(p=>!seen.has(p.id)))throw Error('Incomplete correction point coverage.');
  }
  if(seen.size!==points.filter(p=>normIds.includes(p.legacy_line_id)).length)throw Error('Unexpected correction size.');
  const receipts=[
    ['source-acceptance.json','62779907c31610c94a432c7fcbf0995e5b9b950ad4b3eae1d149d74c706d3573'],
    ['practical-acceptance.json','d8eee657d7e7cdd6426d7fbba33e28ae481ad1783adf7e0d98ee86bbb33a7042'],
  ].map(([name,expected])=>{
    const bytes=read('content-tools/report-quality-20261016-batch3/'+name);
    if(sha(bytes)!==expected)throw Error('Independent correction acceptance changed: '+name);
    return JSON.parse(bytes);
  });
  for(const receipt of receipts) {
    if(receipt.decision!=='APPROVE'||receipt.targetSha256!==INHERITED_PANEL_PAYLOAD_SHA256||!receipt.reviewer?.contextId)
      throw Error('Missing independent acceptance of exact practical correction.');
  }
  if(receipts[0].reviewer.contextId===receipts[1].reviewer.contextId)throw Error('Correction reviewers must be separate contexts.');
  if(JSON.stringify(payload.textReviewBatches)!==JSON.stringify(application.batches))throw Error('Text application scope changed.');
  for(const batch of application.batches){
    const reviewBytes=read(batch.path);
    if(sha(reviewBytes)!==batch.sha256)throw Error('Text review changed: '+batch.path);
    const review=JSON.parse(reviewBytes);
    if(review.state!=='COMPLETE'||review.reviewMode!=='SELF_REVIEW')throw Error('Incomplete text review.');
    const changed=review.norms.filter(n=>n.status==='PROPOSAL_READY');
    if(JSON.stringify(changed.map(n=>n.id))!==JSON.stringify(batch.changedNormIds)||changed.reduce((s,n)=>s+n.changes.length,0)!==batch.edits)throw Error('Unexpected text review scope.');
    for(const norm of changed){
      if(!norm.sourceVerified||!norm.coverageComplete||norm.sourceQuestions.length)throw Error('Open source question: '+norm.id);
      const entry=payload.entries.find(e=>e.id===norm.id);
      for(const change of norm.changes){
        const analytical=change.jsonPath.match(/^\$\.(goals|controlObjectives)\['([^']+)'\]\.(text|reason)$/);
        if(analytical){
          const line=blocks.find(b=>b.id===norm.id)?.line,key=analytical[1]==='goals'?'goal':'controlObjective';
          const old=key==='goal'?organizationalGoalFor(line):controlObjectiveFor(line),expected=structuredClone(old);
          for(const c of norm.changes){
            const m=c.jsonPath.match(/^\$\.(goals|controlObjectives)\['([^']+)'\]\.(text|reason)$/);
            if(m?.[1]===analytical[1]&&m[2]===norm.id)expected[m[3]]=c.new;
          }
          if(analytical[2]!==norm.id||old?.basis!=='PROPOSED'||old[analytical[3]]!==change.old||JSON.stringify(entry[key])!==JSON.stringify(expected)||entry.genericGoal!==entry.goal.text)throw Error('Reviewed analytical text differs: '+norm.id);
          continue;
        }
        const blockExplanation=change.jsonPath.match(/^\$\.blocks\[\?\(@\.id=='([^']+)'\)\]\.decomposition_rationale$/);
        if(blockExplanation){
          if(blockExplanation[1]!==norm.id||blocks.find(b=>b.id===norm.id)?.decomposition_rationale!==change.old||entry.block?.decomposition_rationale!==change.new)throw Error('Reviewed block explanation differs: '+norm.id);
          continue;
        }
        const pointExplanation=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.decomposition\.(rationale|semantic_qualifications|covers)$/);
        if(pointExplanation){
          const old=points.find(p=>p.id===pointExplanation[1]),current=entry.points.find(p=>p.id===pointExplanation[1]);
          const expected=structuredClone(old?.decomposition),field=pointExplanation[2];
          for(const c of norm.changes){
            const m=c.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.decomposition\.(rationale|semantic_qualifications|covers)$/);
            if(m?.[1]===change.pointId)expected[m[2]]=c.new;
          }
          if(pointExplanation[1]!==change.pointId||(field==='covers'&&old?.basis!=='PROPOSED')||JSON.stringify(old?.decomposition?.[field])!==JSON.stringify(change.old)||JSON.stringify(current?.changes.decomposition)!==JSON.stringify(expected))throw Error('Reviewed point explanation differs: '+change.pointId);
          continue;
        }
        const qualifier=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.qualifier_checks\[(\d+)\]\.meaning$/);
        if(qualifier){
          const old=points.find(p=>p.id===qualifier[1]),current=entry.points.find(p=>p.id===qualifier[1]),index=Number(qualifier[2]);
          const expected=structuredClone(old?.qualifier_checks);
          for(const c of norm.changes){
            const m=c.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.qualifier_checks\[(\d+)\]\.meaning$/);
            if(m?.[1]===change.pointId)expected[Number(m[2])].meaning=c.new;
          }
          if(qualifier[1]!==change.pointId||change.variants!=='both'||old?.qualifier_checks?.[index]?.meaning!==change.old||JSON.stringify(current?.changes.qualifier_checks)!==JSON.stringify(expected))throw Error('Reviewed qualifier meaning differs: '+change.pointId);
          continue;
        }
        const assessment=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.qualifier_assessments\[\?\(@\.dimension=='(period|uncertainty)'\)\]\.assessment$/);
        if(assessment){
          const old=points.find(p=>p.id===assessment[1]),current=entry.points.find(p=>p.id===assessment[1]);
          const expected=structuredClone(old?.qualifier_assessments);
          const matches=expected?.filter(a=>a.dimension===assessment[2])??[];
          if(assessment[1]!==change.pointId||change.variants!=='both'||matches.length!==1||matches[0].assessment!==change.old)throw Error('Unexpected qualifier assessment: '+change.pointId);
          for(const c of norm.changes){
            const m=c.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.qualifier_assessments\[\?\(@\.dimension=='(period|uncertainty)'\)\]\.assessment$/);
            if(m?.[1]===change.pointId)expected.find(a=>a.dimension===m[2]).assessment=c.new;
          }
          if(JSON.stringify(current?.changes.qualifier_assessments)!==JSON.stringify(expected))throw Error('Reviewed qualifier assessment differs: '+change.pointId);
          continue;
        }
        const parent=change.jsonPath.match(/^\$\.blocks\[\?\(@\.id=='([^']+)'\)\]\.line\.(control|risk|procedure|criterion)\.text$/);
        if(parent){
          const old=blocks.find(b=>b.id===norm.id)?.line[parent[2]],requiredBasis=parent[2]==='risk'?'INFERRED':'PROPOSED';
          if(parent[1]!==norm.id||old?.basis!==requiredBasis||old.text!==change.old||JSON.stringify(entry.line[parent[2]])!==JSON.stringify({...old,text:change.new}))throw Error('Reviewed parent text differs: '+norm.id);
          continue;
        }
        const m=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.(generic_variant\.)?phases\.(opzet|bestaan|werking)\.(procedure|evidence|boundary|reason)$/);
        const pointText=change.jsonPath.match(/^\$\.points\[\?\(@\.id=='([^']+)'\)\]\.(generic_variant\.)?(text|title)$/);
        if(pointText){
          const old=points.find(p=>p.id===pointText[1]),current=entry.points.find(p=>p.id===pointText[1]);
          if(pointText[1]!==change.pointId||old?.basis!=='PROPOSED')throw Error('Unexpected point text/basis: '+change.pointId);
          const comparisons=pointText[2]?[[pointWording(old,'generic'),current.generic_variant]]:change.variants==='source'?[[old,current.changes]]:[[old,current.changes],[pointWording(old,'generic'),current.generic_variant]];
          if(comparisons.some(([before,after])=>before[pointText[3]]!==change.old||after[pointText[3]]!==change.new))throw Error('Reviewed point text differs: '+change.pointId);
          continue;
        }
        const sourceExplanation=change.jsonPath.match(/^\$\.blocks\[\?\(@\.id=='([^']+)'\)\]\.line\.(finding\.reason|exportContext)$/);
        if(sourceExplanation){
          const line=blocks.find(b=>b.id===norm.id)?.line,reason=sourceExplanation[2]==='finding.reason';
          const old=reason?line.finding?.reason:line.exportContext,current=reason?entry.line.finding?.reason:entry.line.exportContext;
          if(sourceExplanation[1]!==norm.id||change.variants!=='both'||old!==change.old||current!==change.new)throw Error('Reviewed own source explanation differs: '+norm.id);
          continue;
        }
        if(!m||m[1]!==change.pointId)throw Error('Non-textual change in text review.');
        if(m[3]==='werking'&&m[4]!=='reason')throw Error('Only an existing NOT_SELECTED werking explanation may change.');
        const before=points.find(p=>p.id===m[1]),after=entry.points.find(p=>p.id===m[1]);
        if(m[4]==='reason'&&before?.phases[m[3]]?.status!=='NOT_SELECTED')throw Error('Unexpected phase reason change: '+change.pointId);
        const comparisons=m[2]?[[pointWording(before,'generic').phases,after?.generic_variant.phases]]:
          change.variants==='source'?[[before?.phases,after?.changes.phases]]:
          [[before?.phases,after?.changes.phases],[pointWording(before,'generic').phases,after?.generic_variant.phases]];
        if(comparisons.some(([old,current])=>old?.[m[3]]?.[m[4]]!==change.old||current?.[m[3]]?.[m[4]]!==change.new))throw Error('Reviewed replacement differs: '+change.pointId);
      }
    }
  }
  return {status:'PASS',version:payload.version,norms:normIds.length,points:seen.size,humanValidation:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(verifyReportQualityRelease()));
