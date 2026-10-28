import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogueRepository, digest} from './repository.mjs';
import {prepareWebResources} from './web-resources.mjs';
import {publishRuntime, readRuntimePublication, validateRuntimeModules} from './runtime-publication.mjs';
import {prepareQuestionReviewPublication} from '../content-tools/question-review-publication.mjs';
import {syntheticFrameworkQuestions} from '../content-tools/test-support/local-framework-questions.mjs';

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
