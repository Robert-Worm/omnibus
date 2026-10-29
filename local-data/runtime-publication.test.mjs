import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogueRepository, digest} from './repository.mjs';
import {prepareWebResources} from './web-resources.mjs';
import {publishRuntime, readRuntimePublication, validateRuntimeModules} from './runtime-publication.mjs';
import {prepareQuestionReviewPublication} from '../content-tools/question-review-publication.mjs';
import {syntheticFrameworkQuestions} from '../content-tools/test-support/local-framework-questions.mjs';
import {reportViewerFixture} from '../content-tools/test-support/local-report-viewer-fixture.mjs';
import {questionReviewFixture} from '../lib/test-support/question-review-fixture.mjs';
import {questionPlanInventory} from '../lib/source-question-plan.mjs';
import {additionalProcesses} from '../lib/additional-processes.mjs';
import {modelWordingModules} from './model-review-gate.mjs';
import {modelResearchInventory} from '../content-tools/model-research-inventory.mjs';
import {createHash} from 'node:crypto';

function fixture(t) {
  const repository = new CatalogueRepository(':memory:');
  t.after(() => repository.close());
  const release = repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[]});
  const contract = digest('synthetic code contract');
  const refs = prepareWebResources(repository, release, {catalogue:[{path:['items'],value:[]}]});
  const value = {format:'omnibus-runtime-publication',schemaVersion:1,release,contract,
    contentGate:'VERIFIED_APPLICATION_RELEASE',modules:{'lib/example.json':{items:[]}},
    registrations:{'lib/example.json':['catalogue']},refs,routing:{},summary:{}};
  return {repository, release, contract, value};
}

test('archived plan reviews bind the assembled delivery without new decisions or loss of earlier resources',t=>{
  const repository=new CatalogueRepository(':memory:');t.after(()=>repository.close());
  const makePlan=(sourceId,decision='behouden')=>{
    const plan={central:'Hoe verloopt de fictieve afhandeling?',subquestions:[
      {key:'one',text:'Hoe wordt een fictieve melding geregistreerd?',originKeys:[sourceId+':one']}],
      broadSubquestions:[{key:'broad:all',text:'Hoe wordt de fictieve afhandeling ingericht?',originKeys:[sourceId+':one']}]};
    const questions=questionPlanInventory(plan);
    plan.questionReview={...questionReviewFixture({sourceId,itemId:sourceId+':question-plan',item:structuredClone(plan),
      questions,decisions:{central:decision}}),planInventory:questions};
    return plan;
  };
  const plans={F:makePlan('F'),G:makePlan('G','HOLD')};
  const artifacts=[{name:'synthetic-single-review',data:{receipt:{schema:1,kind:'reviewed-question-plan-amendment',sourceId:'F'},plan:plans.F}},
    {name:'synthetic-plan-reviews',data:{receipt:{schema:1,kind:'reviewed-question-plan-amendment',sourceIds:['G']},plans:{G:plans.G}}}];
  const release=repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[],artifacts});
  const contract=digest('synthetic'),moduleId='lib/foundations/registry.mjs';
  const refs=prepareWebResources(repository,release,{
    first:[{path:['foundationQuestionPlans'],value:{F:plans.F}}],
    second:[{path:['foundationQuestionPlans'],value:{G:plans.G}}],
  });
  const value={format:'omnibus-runtime-publication',schemaVersion:1,release,contract,contentGate:'VERIFIED_APPLICATION_RELEASE',
    modules:{[moduleId]:{foundationQuestionPlans:{}}},registrations:{[moduleId]:['first','second']},refs,routing:{},summary:{}};
  const publish=v=>publishRuntime(repository,v,{release,contract});
  const publication=publish(value);
  assert.equal(readRuntimePublication(repository,{release,publication,contract}).refs.first.hash,refs.first.hash);
  assert.equal(plans.G.questionReview.reviews[0].decision,'HOLD','A negative archived decision is not promoted');
  for(const mutate of [
    p=>{p.F.central='Hoe wordt iets anders onderzocht?';},p=>{p.F.subquestions[0].originKeys=['F:other'];},
    p=>{delete p.F.questionReview;},p=>{p.F.questionReview.reviews[0].basis='Changed reviewer reasoning';},
    p=>{delete p.G;},p=>{p.F=makePlan('F','HOLD');},
  ])for(const deferred of [false,true]){
    const changed=structuredClone(plans);mutate(changed);
    const extra=prepareWebResources(repository,release,{last:[{path:['foundationQuestionPlans'],value:changed}]});
    const bad={...value,modules:{[moduleId]:{foundationQuestionPlans:{}}},
      registrations:deferred?{[moduleId]:['last']}:{},refs:deferred?extra:{}};
    if(!deferred)bad.modules[moduleId].foundationQuestionPlans=changed;
    assert.throws(()=>publish(bad),/question review publication/);
  }
  assert.throws(()=>publish({...value,modules:{},registrations:{},refs:{}}),/archived review/);
  const late=prepareWebResources(repository,release,{last:[{path:['foundationQuestionPlans'],value:{F:makePlan('F','HOLD')}}]});
  assert.throws(()=>publish({...value,refs:{...refs,...late},registrations:{[moduleId]:['first','second','last']}}),/archived review/);
  // Historic reading remains independent of the new-write gate.
  assert.equal(readRuntimePublication(repository,{release,publication,contract}).release,release);
  const row=repository.db.prepare('SELECT sha256,payload FROM artifacts LIMIT 1').get();
  const changed=JSON.parse(row.payload);changed.receipt.schema=2;
  repository.db.prepare('UPDATE artifacts SET payload=? WHERE sha256=?').run(JSON.stringify(changed),row.sha256);
  assert.throws(()=>publish(value),/changed archived/);
});

test('archived model reviews pin existing wording and deferred alternatives without promoting HOLDs',t=>{
  const repository=new CatalogueRepository(':memory:');t.after(()=>repository.close());
  const models=['F','G'].map(id=>({id,title:'Fictief model '+id,question:'Hoe verloopt de fictieve afhandeling?',
    items:[{id:'D',title:'Afhandeling',questions:[{id:'D-Q',question:'Hoe wordt de fictieve melding behandeld?',
      variants:{operational:'Hoe wordt de fictieve melding behandeld?'},probes:'Kunt u een voorbeeld geven?'}]}]}));
  const contexts={},researchBindings=[],bindings=models.map(model=>{
    const q=model.items[0].questions[0],context={rawModel:model,model,cyclers:[{
      id:`${model.id}/D/D-Q/operational/cycle:0`,dimensionId:'D',questionId:'D-Q',level:'operational',index:0,
      text:q.question,probes:q.probes,base:q.question,
    }],research:{targets:modelResearchInventory(model)}};
    for(const target of context.research.targets){
      const researchContext={global:{id:model.id},target},key=digest(researchContext);
      contexts[key]=researchContext;
      const binding={modelId:model.id,kind:'research',jointBasisHash:digest(model.id),
        targetId:target.targetId,exactTarget:target,contextRef:{key,digest:key}};
      researchBindings.push(model.id==='F'?{...binding,decision:'behouden',
        textSha256:createHash('sha256').update(target.text).digest('hex')}:
        {...binding,contextRef:key,status:'UNCHANGED_UNIT_EXISTING_ROLE_REVIEWS_REUSABLE',
          originalContextHash:key,candidateContextHash:key,
          priorEvidence:['theory','practical'].map(role=>({assessment:{role,targetId:target.targetId,
            original:target.text,decision:'behouden'}}))});
    }
    const key=digest(context);contexts[key]=context;
    return {modelId:model.id,kind:'model',jointBasisHash:digest(model.id),contextRef:{key,digest:key},decision:'HOLD'};
  });
  const meta=models.map(m=>({modelId:m.id,jointBasisHash:digest(m.id)}));
  const data={receipt:{schema:1,kind:'reviewed-model-wording-amendment',models:2,unrestrictedModelApproval:false},
    index:{models:meta},reviewIndex:{models:meta,batchBasisHash:digest('synthetic batch')},contexts,
    reviews:{wordingIntegrationDecision:'ACCEPT_REVIEWED_WORDING_WITH_PRESERVED_LIMITS',counts:{remaining:0},
      batchBasisHash:digest('synthetic batch'),modelReviews:meta,assessments:[bindings[0],...researchBindings.filter(b=>b.modelId==='F')]},
    reusableEvidence:{entries:[{...bindings[1],contextRef:bindings[1].contextRef.key,theoryDecision:'UNRESOLVED'},
      ...researchBindings.filter(b=>b.modelId==='G')]}};
  const release=repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[],
    artifacts:[{name:'synthetic-model-review',data}]});
  prepareWebResources(repository,release,{});
  const contract=digest('synthetic'),modelId='lib/model-library.mjs';
  const modules={[modelId]:{models},[modelWordingModules[0]]:{clauses:{},strategicExperience:''},
    [modelWordingModules[1]]:{values:[]},[modelWordingModules[2]]:{reviewed:{items:[]}}};
  const value={format:'omnibus-runtime-publication',schemaVersion:1,release,contract,contentGate:'VERIFIED_APPLICATION_RELEASE',
    modules,registrations:{},refs:{},routing:{},summary:{}};
  const publish=v=>publishRuntime(repository,v,{release,contract});
  const publication=publish(value);
  const deferred=structuredClone(value);deferred.modules[modelId]={models:[]};
  deferred.registrations={[modelId]:['first','second']};
  deferred.refs=prepareWebResources(repository,release,{first:[{path:['models'],value:[models[0]]}],second:[{path:['models'],value:[models[1]]}]});
  assert.doesNotThrow(()=>publish(deferred));
  assert.equal(data.reviews.assessments[0].decision,'HOLD');
  assert.equal(data.reusableEvidence.entries[0].theoryDecision,'UNRESOLVED');
  for(const mutate of [
    m=>{m[modelId].models[0].question='Andere hoofdvraag?';},
    m=>{m[modelId].models[0].items[0].questions[0].probes='Andere doorvraag?';},
    m=>{m[modelId].models[0].items[0].questions[0].indicatorId='other';},
    m=>{m[modelId].models.pop();},m=>{m[modelId].models.push(models[0]);},m=>{delete m[modelId];},
    m=>{m[modelWordingModules[1]].values=[{id:'D-Q',level:'operational',base:models[0].items[0].questions[0].question,
      alternatives:['Andere formulering?']}];},
  ]){
    const changed=structuredClone(modules);mutate(changed);
    assert.throws(()=>publish({...value,modules:changed}),/model review publication/);
  }
  // Late resource edits are checked after assembling the same modules the UI uses.
  const late=prepareWebResources(repository,release,{late:[{path:['values'],value:[{
    id:'D-Q',level:'operational',base:models[0].items[0].questions[0].question,alternatives:['Andere formulering?'],
  }]}]});
  assert.throws(()=>publish({...deferred,refs:{...deferred.refs,...late},
    registrations:{...deferred.registrations,[modelWordingModules[1]]:['late']}}),/formulations differ/);
  assert.equal(readRuntimePublication(repository,{release,publication,contract}).release,release);
  // Properly pinned archives still need individual positive route decisions.
  // Matching bytes or a model-level decision cannot approve a research variant.
  for(const mutate of [
    d=>{d.reviews.assessments[1].decision='HOLD';},
    d=>{d.reviews.assessments[1].textSha256=digest('wrong text');},
    d=>{d.reviews.assessments.splice(1,1);},
    d=>{d.reviews.assessments.push(d.reviews.assessments[1]);},
    d=>{d.reusableEvidence.entries[1].priorEvidence[0].assessment.decision='herschrijven';},
    d=>{d.reusableEvidence.entries[1].priorEvidence.pop();},
    d=>{d.reusableEvidence.entries[1].candidateContextHash=digest('different context');},
    d=>{d.reviews.assessments[1].exactTarget.text='Andere vraag?';},
  ]){
    const changed=structuredClone(data);mutate(changed);
    const other=repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[],
      artifacts:[{name:'synthetic-model-review',data:changed}]});
    prepareWebResources(repository,other,{});
    assert.throws(()=>publishRuntime(repository,{...value,release:other},{release:other,contract}),/model review publication/);
  }
  // Model bytes can match while an adapter branch produces different questions.
  const drift=structuredClone(data),ref=drift.reviews.assessments[0].contextRef;
  const context=drift.contexts[ref.key];context.model.kind='kaptein';context.rawModel.kind='kaptein';
  const contextKey=digest(context);delete drift.contexts[ref.key];drift.contexts[contextKey]=context;
  drift.reviews.assessments[0].contextRef={key:contextKey,digest:contextKey};
  const driftRelease=repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[],
    artifacts:[{name:'synthetic-model-review',data:drift}]});
  prepareWebResources(repository,driftRelease,{});
  const driftModules=structuredClone(modules);driftModules[modelId].models[0].kind='kaptein';
  assert.throws(()=>publishRuntime(repository,{...value,release:driftRelease,modules:driftModules},
    {release:driftRelease,contract}),/offered model research route differs/);
  const row=repository.db.prepare('SELECT sha256,payload FROM artifacts').get(),changed=JSON.parse(row.payload);
  changed.reviews.assessments[0].decision='behouden';
  repository.db.prepare('UPDATE artifacts SET payload=? WHERE sha256=?').run(JSON.stringify(changed),row.sha256);
  assert.throws(()=>publish(value),/archived model wording evidence/);
});

test('explicit process plans bind both levels, source scope and exact reviews before publication',t=>{
 const {repository,release,contract,value}=fixture(t),moduleId='lib/process-catalogue.mjs';
 for(const additional of [false,true]){
  const process=additional?additionalProcesses.find(p=>p.id==='PR05'):
   {id:'SYNTHETIC',title:'Fictief proces',keywords:'',sourceIds:['AW'],question:'Oud voorstel?'};
  const plan={central:'Hoe verloopt de fictieve behandeling?',sourceEdition:'synthetic-1',sourceHash:digest('fictitious sources'),
   subquestions:[{key:'registration',text:'Hoe wordt de fictieve aanvraag geregistreerd?',originKeys:['AW:one']}],
   broadSubquestions:[{key:'broad:handling',text:'Hoe is de fictieve behandeling ingericht?',originKeys:['AW:one','AW:two']}]};
  const questions=questionPlanInventory(plan);
  plan.questionReview={...questionReviewFixture({sourceId:'process:'+process.id,itemId:`process:${process.id}:question-plan`,
   sourceEdition:plan.sourceEdition,sourceHash:plan.sourceHash,item:structuredClone(plan),context:{process},questions}),planInventory:questions};
  const module={processes:additional?[]:[process],questionPlans:{[process.id]:plan}};
  const publish=(data,extra={})=>publishRuntime(repository,{...value,modules:{[moduleId]:data},refs:{},registrations:{},...extra},{release,contract});
  assert.doesNotThrow(()=>publish(module));
  for(const mutate of [
   p=>{p.central='Hoe verloopt een ander proces?';},p=>{p.sourceEdition='other';},p=>{p.sourceHash=digest('other');},
   p=>{delete p.questionReview;},p=>{p.questionReview.reviews.pop();},p=>{p.subquestions[0].originKeys=['AW:two'];},
   p=>{p.broadSubquestions=[];},p=>{p.questionReview.planInventory=[];},
  ])for(const late of [false,true]){
   const changed=structuredClone(module);mutate(changed.questionPlans[process.id]);
   const extra=late?{refs:prepareWebResources(repository,release,{late:[{path:['questionPlans'],value:changed.questionPlans}]}),
    registrations:{[moduleId]:['late']}}:{};
   assert.throws(()=>publish(late?module:changed,extra),/question review publication/);
  }
  const negative=structuredClone(module);negative.questionPlans[process.id].questionReview.reviews[0].decision='HOLD';
  assert.doesNotThrow(()=>publish(negative));
  const outside=structuredClone(module),outsidePlan=outside.questionPlans[process.id];delete outsidePlan.questionReview;
  outsidePlan.broadSubquestions[0].originKeys=['UNRELATED:one'];
  const outsideQuestions=questionPlanInventory(outsidePlan);
  outsidePlan.questionReview={...questionReviewFixture({sourceId:'process:'+process.id,itemId:`process:${process.id}:question-plan`,
   sourceEdition:plan.sourceEdition,sourceHash:plan.sourceHash,item:structuredClone(outsidePlan),context:{process},questions:outsideQuestions}),planInventory:outsideQuestions};
  assert.throws(()=>publish(outside),/outside its declared sources/,'Even internally matching synthetic receipts cannot expand the source scope');
  assert.throws(()=>publish({...module,questionPlans:{unknown:plan}}),/known process/);
  if(!additional){
   assert.throws(()=>publish({...module,processes:[{...process,sourceIds:['other']}]}),/reviewed scope/);
   assert.throws(()=>publish({...module,processes:[process,process]}),/known process/);
  }
 }
});

test('thematic publication binds reviewed text and mappings after deferred assembly',t=>{
  const {repository,release,contract,value}=fixture(t);
  for(const [moduleId,field,sourceId] of [
    ['lib/theme-workspaces.mjs','presets','theme:T'],['lib/research-flow.mjs','groups','theme-groups'],
    ['app/reviewed-reports.json','researchPresets','theme:T'],['app/reviewed-reports.json','researchGroups','theme-groups'],
      ['app/report-additions.json','researchPresets','theme:T'],['app/report-additions.json','researchGroups','theme-groups'],
  ]){
    const row={key:'test',themeId:'T',text:'Hoe verloopt de fictieve afhandeling?',ids:['one','two'],groups:['g']};
    row.questionReview=questionReviewFixture({sourceId,itemId:row.key,item:structuredClone(row),
      questions:[{id:'question',kind:'onderzoeksvraag',text:row.text}]});
    for(const late of [false,true])for(const mutate of [
      r=>{r.ids=['other'];},r=>{r.groups=['other'];},r=>{r.themeId='other';},r=>{r.key='other';},
      r=>{r.text='Hoe verloopt een andere afhandeling?';},r=>{r.questionReview.reviews=[];},
    ]){
      const changed=structuredClone(row);mutate(changed);
      const refs=late?prepareWebResources(repository,release,{late:[{path:[field,0],value:changed}]}):{};
      assert.throws(()=>publishRuntime(repository,{...value,modules:{[moduleId]:{[field]:[late?row:changed]}},
        refs,registrations:late?{[moduleId]:['late']} : {}},{release,contract}),/question review publication/);
    }
    for(const decision of ['behouden','schrappen','HOLD']){
      const changed=structuredClone(row);changed.questionReview.reviews[0].decision=decision;
      assert.doesNotThrow(()=>publishRuntime(repository,{...value,modules:{[moduleId]:{[field]:[changed]}},
        refs:{},registrations:{}},{release,contract}));
    }
  }
});

test('own report publication cannot omit parent or point interview reviews, including deferred changes',t=>{
  const {repository,release,contract,value}=fixture(t),{input}=reportViewerFixture();
  const report=input.app.framework.report, id='app/report-additions.json';
  const data={corpus:[input.app],catalogue:input.projection,...input.reuse};
  const modules={'lib/application-catalogue.mjs':{collections:{origins:[{id:'own:test',kind:'own'}],
    sources:{report:{[report.id]:'own:test'}}}},[id]:data};
  const publish=(changed,extra={})=>publishRuntime(repository,{...value,modules:changed,registrations:{},...extra},{release,contract});
  for(const change of [
    modules=>{delete modules[id];},
    modules=>{delete modules[id].interviewReviews;},
    modules=>{delete modules[id].interviewReviews.K1;},
    modules=>{delete modules[id].interviewReviews['K1/TP01'];},
    modules=>{modules[id].interview_questions=[];},
    modules=>{modules[id].interview_questions[0].text='Hoe beslist u over meldingen?';},
    modules=>{modules[id].corpus[0].framework.lines[0].risk.text='Ander risico';},
    modules=>{modules[id].corpus[0].framework.report.source_hash=digest('different source');},
  ]){
    const bad=structuredClone(modules);change(bad);
    assert.throws(()=>publish(bad),/question review publication/);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),undefined);
  }
  const refs=prepareWebResources(repository,release,{late:[{path:['interviewReviews'],value:{K1:null}}]});
  assert.throws(()=>publish(modules,{refs,registrations:{[id]:['late']}}),/question review publication/);
  const publication=publish(modules);
  assert.equal(readRuntimePublication(repository,{release,publication,contract}).modules[id].interviewReviews.K1.itemId,'K1');
  const withheld=structuredClone(modules);withheld[id].interviewReviews.K1.reviews[0].decision='HOLD';
  assert.doesNotThrow(()=>publish(withheld),'Negative source decisions are preserved, not replaced with approval');
});

test('new local frameworks require complete reviewed plans and point interviews at the final write boundary', t=>{
  const {repository,release,contract,value}=fixture(t);
  const catalogue={source_identity:{source_id:'SYNTHETIC'},context:{edition:'synthetic-1'},
    points:[{id:'P1',selection_status:'SELECTABLE',text:'Een fictieve melding krijgt een behandelaar.'}]};
  const bank={records:[]}, sourceHash=digest('fictional source');
  syntheticFrameworkQuestions(catalogue,bank,sourceHash);
  const packet={id:'SYNTHETIC',family:'local-framework',catalogue,bank,context:catalogue.context,
    documents:[{pdf_hash:sourceHash}],questionPlan:catalogue.questionPlan};
  const moduleId='lib/topical-reviewed.json';
  const publish=data=>publishRuntime(repository,{...value,modules:{[moduleId]:data},registrations:{}},{release,contract});
  const correct={packages:[packet],interviewReviews:catalogue.interviewReviews};
  for(const change of [
    p=>{delete p.questionPlan;delete p.catalogue.questionPlan;},
    p=>{delete p.questionPlan.questionReview;},
    p=>{p.questionPlan.broadSubquestions=[];},
    p=>{p.questionPlan.subquestions=[];},
    p=>{p.questionPlan.broadSubquestions[0].originKeys=['SYNTHETIC:unknown'];},
    p=>{p.catalogue.points.push({id:'P2',selection_status:'SELECTABLE'});},
    p=>{p.catalogue.points[0].selection_status='HOLD';},
    p=>{delete p.catalogue.interviewReviews;},
    p=>{delete p.catalogue.interviewReviews['SYNTHETIC:P1'];},
    p=>{p.catalogue.points[0].text='Een andere verplichting.';},
    p=>{p.documents[0].pdf_hash=digest('different source');},
    p=>{p.catalogue.interviewReviews['SYNTHETIC:P1'].questions[1].text='Wat is veranderd?';},
  ]){
    const data=structuredClone(correct);change(data.packages[0]);
    assert.throws(()=>publish(data),/question review publication/);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),undefined);
  }
  const publication=publish(correct);
  assert.equal(readRuntimePublication(repository,{release,publication,contract}).modules[moduleId].packages[0].questionPlan.central,
    packet.questionPlan.central);
  const missingDelivery=structuredClone(correct);delete missingDelivery.interviewReviews;
  assert.throws(()=>publish(missingDelivery),/interview delivery/);
  const data=structuredClone(correct);data.interviewReviews={};
  const refs=prepareWebResources(repository,release,{questions:[{path:['interviewReviews'],value:{}}]});
  assert.throws(()=>publishRuntime(repository,{...value,modules:{[moduleId]:data},refs,
    registrations:{[moduleId]:['questions']}},{release,contract}),/interview delivery/);
  // An older pinned publication remains readable, including its absent plan.
  const legacy=structuredClone({...value,modules:{[moduleId]:correct},registrations:{}});
  delete legacy.modules[moduleId].packages[0].questionPlan;
  const payload=JSON.stringify(legacy), legacyId=digest(payload);
  repository.db.prepare('INSERT INTO runtime_publications VALUES(?,?,?)').run(release,legacyId,payload);
  assert.equal(readRuntimePublication(repository,{release,publication:legacyId,contract}).modules[moduleId].packages[0].questionPlan,undefined);
  assert.equal(repository.db.prepare('SELECT count(*) AS n FROM runtime_publications').get().n,2);
});

// Explicitly fictional receipts test the contract, not a real content review.
function syntheticQuestionCapsule(decision='behouden') {
  const question={id:'opening',kind:'interview',text:'Hoe wordt een fictieve melding verwerkt?'};
  const input={sourceId:'SYNTHETIC',itemId:'SYNTHETIC:P1',sourceEdition:'test',sourceHash:digest('fictional source'),
    inventoryComplete:true,item:{id:'P1'},context:{scope:'Fictional test only'},questions:[question],reviews:[]};
  const prepared=prepareQuestionReviewPublication(input).publication;
  input.reviews=[{sourceId:input.sourceId,itemId:input.itemId,questionId:question.id,
    sourceEdition:input.sourceEdition,sourceHash:input.sourceHash,itemHash:prepared.itemHash,
    contextHash:prepared.contextHash,questionHash:prepared.questions[0].questionHash,
    decision,reviewId:'synthetic-review',reviewer:'synthetic-reviewer',reviewDate:'2026-10-28',basis:'Fictional contract fixture.'}];
  return prepareQuestionReviewPublication(input).publication;
}

test('publication checks exact question decisions in inline and deferred content before inserting', t=>{
  const {repository,release,contract,value}=fixture(t);
  const approved=syntheticQuestionCapsule();
  for(const deferred of [false,true])for(const change of [
    p=>{p.reviews=[];},p=>{p.questions[0].text='Welke andere melding is bekeken?';},
    p=>{p.reviews[0].contextHash=digest('other scope');},p=>{p.reviews[0].reviewer='';},
    p=>{p.reviews[0].decision='APPROVE';},p=>{p.questions=[];p.reviews=[];},
    p=>{p.reviews.push({...p.reviews[0]});},
    p=>{p.format='unknown';},
  ]){
    const capsule=structuredClone(approved);change(capsule);
    const modules={'lib/example.json':deferred?{items:[]}:{questionReview:capsule}};
    const refs=deferred?prepareWebResources(repository,release,{catalogue:[{path:['items'],value:[{interviewReview:capsule}]}]}):value.refs;
    assert.throws(()=>publishRuntime(repository,{...value,modules,refs},{release,contract}),/question review publication/);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),undefined);
  }
  const publication=publishRuntime(repository,{...value,modules:{'lib/example.json':{questionReview:approved}}},{release,contract});
  assert.equal(readRuntimePublication(repository,{release,contract,publication}).modules['lib/example.json'].questionReview.reviews[0].decision,'behouden');
  const changed=prepareWebResources(repository,release,{catalogue:[{path:['questionReview'],value:{contextHash:digest('late scope change')}}]});
  assert.throws(()=>publishRuntime(repository,{...value,refs:changed,modules:{'lib/example.json':{questionReview:approved}}},{release,contract}),/question review publication/);
  const malformed=prepareWebResources(repository,release,{catalogue:[{path:['interviewReviews'],value:{P1:{format:'unknown'}}}]});
  assert.throws(()=>publishRuntime(repository,{...value,refs:malformed},{release,contract}),/question review publication/);
});

test('explicit negative question decisions remain withheld evidence and old pinned releases stay readable',t=>{
  const {repository,release,contract,value}=fixture(t);
  for(const decision of ['schrappen','herschrijven','HOLD']){
    const capsule=syntheticQuestionCapsule(decision),before=structuredClone(capsule);
    const publication=publishRuntime(repository,{...value,modules:{'lib/example.json':{questionReview:capsule}}},{release,contract});
    assert.deepEqual(readRuntimePublication(repository,{release,contract,publication}).modules['lib/example.json'].questionReview,before);
  }
  // Simulate a previously pinned publication, not a new admission bypass.
  const old=syntheticQuestionCapsule();old.reviews=[];
  const payload=JSON.stringify({...value,modules:{'lib/example.json':{questionReview:old}}}),publication=digest(payload);
  repository.db.prepare('INSERT INTO runtime_publications VALUES(?,?,?)').run(release,publication,payload);
  repository.db.exec('PRAGMA query_only=ON');
  assert.deepEqual(readRuntimePublication(repository,{release,contract,publication}).modules['lib/example.json'].questionReview,old);
});

test('publication is immutable and reading it does not change content or schema', t => {
  const {repository,release,contract,value} = fixture(t);
  const before = repository.exportRelease(release);
  const publication = publishRuntime(repository, value, {release,contract});
  assert.equal(publishRuntime(repository,value,{release,contract}),publication);
  repository.db.exec('PRAGMA query_only=ON');
  assert.deepEqual(readRuntimePublication(repository,{release,contract,publication}),value);
  assert.deepEqual(repository.exportRelease(release),before);
  assert.throws(() => publishRuntime(repository,{...value,summary:{changed:true}},{release,contract}),/readonly/);
});

test('missing publication, mismatched code contract and modified bytes fail closed', t => {
  const {repository,release,contract,value} = fixture(t);
  const publication = publishRuntime(repository,value,{release,contract});
  assert.throws(() => readRuntimePublication(repository,{release,contract}),/explicit/);
  assert.throws(() => readRuntimePublication(repository,{release,contract:digest('other'),publication}),/mismatch/);
  repository.db.prepare('UPDATE runtime_publications SET payload=?').run(JSON.stringify({...value,summary:{changed:true}}));
  assert.throws(() => readRuntimePublication(repository,{release,contract,publication}),/changed publication/);
});

test('delivery resources are verified, not regenerated by the application build', t => {
  const {repository,release,contract,value} = fixture(t);
  const publication = publishRuntime(repository,value,{release,contract});
  repository.db.prepare('UPDATE web_resources SET payload=?').run('{"changed":true}');
  assert.throws(() => readRuntimePublication(repository,{release,contract,publication}),/changed delivery resource/);
});

test('unsafe module identities and unknown resource registrations are rejected', t => {
  const {repository,release,contract,value} = fixture(t);
  for (const modules of [{'../secret.json':{}},{'lib/../../secret.json':{}},{'lib//secret.json':{}}])
    assert.throws(() => publishRuntime(repository,{...value,modules},{release,contract}),/module identity/);
  assert.throws(() => publishRuntime(repository,{...value,registrations:{'lib/example.json':['missing']}},{release,contract}),/registration/);
  assert.throws(() => publishRuntime(repository,{...value,contentGate:'UNREVIEWED'},{release,contract}),/gate mismatch/);
});

test('new runtime publications cannot promote a local review release by claiming approval', t => {
  const {repository,contract,value} = fixture(t);
  for (const manifest of [
    {format:'omnibus-local-review-database',contentGate:'INTEGRATION_REVIEW_REQUIRED'},
    {format:'omnibus-local-review-database',contentGate:'VERIFIED_APPLICATION_RELEASE'},
    {contentGate:'INTEGRATION_REVIEW_REQUIRED'},
  ]) {
    const release = repository.importRelease({manifest,packages:[],documents:[]});
    const before = repository.exportRelease(release);
    const candidate = {...value,release,refs:{},registrations:{}};
    assert.throws(() => publishRuntime(repository,candidate,{release,contract}),
      /INTEGRATION_REVIEW_REQUIRED.*local review database/);
    assert.deepEqual(repository.exportRelease(release),before);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),undefined);
  }
});

test('changing the stored review gate without its pinned release hash cannot authorize publication', t => {
  const {repository,contract,value} = fixture(t);
  const release = repository.importRelease({manifest:{format:'omnibus-local-review-database',
    contentGate:'INTEGRATION_REVIEW_REQUIRED'},packages:[],documents:[]});
  // Deliberate corruption in a fictitious database only; never a repair procedure.
  repository.db.prepare('UPDATE releases SET manifest=? WHERE id=?')
    .run(JSON.stringify({contentGate:'VERIFIED_APPLICATION_RELEASE',inventory:{}}),release);
  assert.throws(() => publishRuntime(repository,{...value,release,refs:{},registrations:{}},{release,contract}),
    /changed source release manifest/);
  assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),undefined);
});

test('publisher and build share exact named exports and mutable-module boundaries',()=>{
  const contract={'lib/a.mjs':{kind:'exports',names:['first','second']},'lib/b.json':{kind:'json',property:'values'}};
  const value={modules:{'lib/a.mjs':{first:1,second:2},'lib/b.json':{values:[]}},registrations:{},undefinedPaths:[]};
  validateRuntimeModules(value,contract);
  for (const changed of [
    {...value,modules:{...value.modules,'lib/extra.json':{}}},
    {...value,modules:{...value.modules,'lib/a.mjs':{first:1}}},
    {...value,modules:{...value.modules,'lib/b.json':{}}},
    {...value,undefinedPaths:[['lib/a.mjs','first']]},
    {...value,registrations:{'lib/a.mjs':['unexpected']}}
  ]) assert.throws(()=>validateRuntimeModules(changed,contract),/Invalid runtime publication/);
});

test('model presentation shape is checked before build and publication',()=>{
  for (const [id,data] of [
    ['lib/model-choice-guide.mjs',{guides:{},summaries:{}}],
    ['lib/research-models.mjs',{ids:[],presentations:{}}],
  ]) {
    const contract = {[id]:{kind:'adapter'}};
    validateRuntimeModules({modules:{[id]:data}},contract);
    assert.throws(()=>validateRuntimeModules({modules:{[id]:{}}},contract),/Invalid model/);
  }
});

test('new flat foundation publications require complete chains in inline and deferred data', t=>{
 const {repository,release,contract,value}=fixture(t);
 const id='lib/foundations/registry.mjs';
 const metadata={S:{catalogueAdmission:{schema:'reviewed-flat/v1',reviewBasis:'a'.repeat(64)}}};
 const complete={id:'S-1',sourceId:'S',auditRole:'norm',reviewStatus:'ai-reviewed',objective:'Service continuity',risk:'Responsibilities may be missed',controlObjective:'Responsibilities are clear',control:'Assign a responsible role'};
 for(const deferred of [false,true])for(const valid of [false,true]) {
   const item={...complete,...(valid?{}:{controlObjective:''})};
   const refs=deferred?prepareWebResources(repository,release,{foundation:[{path:['importedFoundationItems'],value:[item]}]}):{};
   const candidate={...value,modules:{[id]:{importedFoundationMetadata:metadata,importedFoundationItems:deferred?[]:[item]}},
     registrations:{[id]:deferred?['foundation']:[]},refs};
   if(valid)assert.ok(publishRuntime(repository,candidate,{release,contract}));
   else assert.throws(()=>publishRuntime(repository,candidate,{release,contract}),/Onvolledige beheersketen.*controlObjective/);
 }
});
