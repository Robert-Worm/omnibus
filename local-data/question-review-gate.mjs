// Write boundary only. Old pinned releases and user projects remain readable.
import {QUESTION_REVIEW_PUBLICATION_FORMAT} from '../lib/question-quality-review.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {localModelPublicationReview,modelWordingModules} from './model-review-gate.mjs';
import {additionalProcesses} from '../lib/additional-processes.mjs';
import {digest} from '../content-tools/identity.mjs';
import {questionPlanInventory} from '../lib/source-question-plan.mjs';
import {verifyQuestionCapsule,verifyLocalFrameworkQuestions,verifyLocalReportQuestions,verifyMappedResearchQuestion,verifyProcessQuestionPlans} from '../content-tools/question-review-validation.mjs';
export {verifyQuestionCapsule} from '../content-tools/question-review-validation.mjs';
const fail=message=>{throw Error('Invalid question review publication: '+message);};

// Reuse already archived question-plan decisions. This is a write-side binding,
// not a new review or a browser payload. An archive cannot be silently superseded
// by a later resource, a generic source plan or a missing receipt.
function archivedQuestionPlans(repository,release) {
  const manifest=JSON.parse(repository.db.prepare('SELECT manifest FROM releases WHERE id=?').get(release).manifest);
  const pins=new Map((manifest.inventory?.artifacts??[]).map(row=>[row.name,row.sha256]));
  const rows=repository.db.prepare(`SELECT r.name,a.sha256,a.payload FROM artifacts a
    JOIN release_artifacts r ON r.sha256=a.sha256 WHERE r.release_id=?
    AND json_extract(a.payload,'$.receipt.kind')='reviewed-question-plan-amendment'`).all(release);
  const expected=new Map();
  for(const row of rows){
    const data=JSON.parse(row.payload),receipt=data.receipt;
    if(pins.get(row.name)!==row.sha256||digest(data)!==row.sha256||receipt.schema!==1)
      fail('changed archived question-plan evidence');
    const ids=receipt.sourceIds??[receipt.sourceId];
    const plans=data.plans??(data.plan?{[receipt.sourceId]:data.plan}:null);
    if(!plans||typeof plans!=='object'||Array.isArray(plans)||!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string'||!id.trim())||
        new Set(ids).size!==ids.length||digest(Object.keys(plans).sort())!==digest([...ids].sort()))
      fail('invalid archived question-plan scope');
    for(const id of ids){
      const plan=plans[id],capsule=plan?.questionReview;
      verifyQuestionCapsule(capsule);
      const questions=questionPlanInventory(plan);
      if(capsule.sourceId!==id||capsule.itemId!==id+':question-plan'||
          receipt.sourceEdition!==undefined&&receipt.sourceEdition!==capsule.sourceEdition||
          receipt.sourceHash!==undefined&&receipt.sourceHash!==capsule.sourceHash||
          !Array.isArray(capsule.planInventory)||digest(questions)!==digest(capsule.planInventory)||
          digest(questions.map(({id,kind,text})=>({id,kind,text})))!==
            digest(capsule.questions.map(({id,kind,text})=>({id,kind,text}))))
        fail('archived question plan differs from its reviewed inventory: '+id);
      if(expected.has(id)&&digest(expected.get(id))!==digest(plan))
        fail('ambiguous archived question plans: '+id);
      expected.set(id,plan);
    }
  }
  return plans=>{
    for(const[id,plan]of expected)if(!plans||!Object.hasOwn(plans,id)||digest(plans[id])!==digest(plan))
      fail('delivered question plan differs from archived review: '+id);
  };
}

/** Visit both inline data and deferred data at the actual publication boundary.
 * Resource integrity has already been checked by publishRuntime. */
export function verifyPublishedQuestionCapsules(repository, value) {
  const verifyModels=localModelPublicationReview(repository,value);
  const verifyPlans=archivedQuestionPlans(repository,value.release);
  let deliveredPlans;
  const modelInputs={};
  const collections=value.modules['lib/application-catalogue.mjs']?.collections;
  const ownOrigins=new Set((collections?.origins??[]).filter(row=>row.kind==='own').map(row=>row.id));
  const ownReports=Object.entries(collections?.sources?.report??{}).filter(([,origin])=>ownOrigins.has(origin)).map(([id])=>id);
  const reportModule='app/report-additions.json';
  if(ownReports.length&&!Object.hasOwn(value.modules,reportModule))fail('missing local report delivery');
  function capsule(node){
    if(!node||node.format!==QUESTION_REVIEW_PUBLICATION_FORMAT)fail('invalid or missing capsule');
    verifyQuestionCapsule(node);
  }
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.format===QUESTION_REVIEW_PUBLICATION_FORMAT){verifyQuestionCapsule(node);return;}
    for(const [key,child]of Object.entries(node)){
      if(key==='questionReview'||key==='interviewReview')capsule(child);
      else if(key==='interviewReviews'){
        if(!child||typeof child!=='object'||Array.isArray(child))fail('invalid capsule index');
        for(const entry of Object.values(child))capsule(entry);
      }else visit(child);
    }
  }
  const select=repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  const names=new Set(['questionReview','interviewReview','interviewReviews']);
  const relevant=node=>node&&typeof node==='object'&&(node.format===QUESTION_REVIEW_PUBLICATION_FORMAT||
    Object.keys(node).some(key=>names.has(key))||Array.isArray(node.path)&&node.path.some(key=>names.has(key))||
    Object.values(node).some(relevant));
  const resources=new Map();
  for(const [id,initial]of Object.entries(value.modules)){
    const edits=(value.registrations[id]??[]).map(key=>{
      const ref=value.refs[key];
      if(!resources.has(ref.hash))resources.set(ref.hash,JSON.parse(select.get(value.release,ref.hash).payload));
      return resources.get(ref.hash);
    });
    const frameworks = id === 'lib/topical-reviewed.json';
    const processPlans=id==='lib/process-catalogue.mjs';
    const sourcePlans=id==='lib/foundations/registry.mjs';
    const reports=id===reportModule&&ownReports.length;
    const models=id==='lib/model-library.mjs'&&verifyModels;
    const wording=verifyModels&&modelWordingModules.includes(id);
    if(!frameworks&&!processPlans&&!sourcePlans&&!reports&&!models&&!wording&&!relevant(initial)&&!edits.some(relevant))continue;
    // Check the actual assembled inventory, not isolated partial edits. A late
    // resource must not change a previously valid receipt or evade this gate.
    const hydrated=structuredClone(initial);
    for(const rows of edits)applyCatalogueEdits(hydrated,structuredClone(rows));
    visit(hydrated);
    if(sourcePlans)deliveredPlans=hydrated.foundationQuestionPlans;
    if(processPlans)verifyProcessQuestionPlans([...(hydrated.processes??[]),...additionalProcesses],hydrated.questionPlans);
    const presets=id==='lib/theme-workspaces.mjs'?hydrated.presets:
      ['app/reviewed-reports.json','app/report-additions.json'].includes(id)?hydrated.researchPresets:[];
    const groups=id==='lib/research-flow.mjs'?hydrated.groups:
      ['app/reviewed-reports.json','app/report-additions.json'].includes(id)?hydrated.researchGroups:[];
    for(const row of presets??[])verifyMappedResearchQuestion(row,'theme:'+row.themeId);
    for(const row of groups??[])verifyMappedResearchQuestion(row,'theme-groups');
    if(models||wording)modelInputs[id]=hydrated;
    if(frameworks)for(const packet of hydrated.packages??[])
      if(packet.family==='local-framework')verifyLocalFrameworkQuestions(packet,hydrated.interviewReviews);
    if(reports)for(const sourceId of ownReports){
      const sources=(hydrated.corpus??[]).filter(app=>app.framework?.report.id===sourceId);
      if(sources.length!==1)fail('missing or ambiguous local report: '+sourceId);
      const framework=sources[0].framework, points=(hydrated.catalogue?.points??[]).filter(p=>p.report_id===sourceId);
      const pointIds=new Set(points.map(p=>p.id)), ids=new Set([...framework.lines.map(l=>l.id),...pointIds]);
      const reuse={points,organizational_goals:(hydrated.organizational_goals??[]).filter(row=>row.report_id===sourceId),
        control_objectives:(hydrated.control_objectives??[]).filter(row=>row.report_id===sourceId),
        interview_questions:(hydrated.interview_questions??[]).filter(q=>q.point_ids?.some(id=>pointIds.has(id))),
        visual_sources:(hydrated.visual_sources??[]).filter(row=>row.report_id===sourceId),
        interviewReviews:Object.fromEntries(Object.entries(hydrated.interviewReviews??{})
          .filter(([id,capsule])=>ids.has(id)||capsule?.sourceId===sourceId))};
      verifyLocalReportQuestions(framework,reuse,hydrated.interviewReviews);
    }
  }
  if(verifyModels)verifyModels(modelInputs['lib/model-library.mjs'],modelInputs);
  verifyPlans(deliveredPlans);
}
