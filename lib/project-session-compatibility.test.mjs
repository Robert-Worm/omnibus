import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import v1Fixture from './project-session-fixtures/v1.mjs';
import {createProjectMigrator,migrateProject,PROJECT_VERSION} from './project-session-migrations.mjs';
import {parseProjectText,serializeProject} from './project-codec.mjs';
import {validateModelLibrary} from './model-library-validation.mjs';
import {assertProjectCollections,bindCollectionPreference,sourceCollections} from './source-collections.mjs';

const fixture=migrateProject(v1Fixture).value;

const lines=fixture.draft.investigation.materials.map(m=>({id:m.id,report_id:'synthetic-report',
  criterion:{text:m.body},auditQuestion:{text:m.question},
  sourceItems:[{id:'source-risk-2',kind:'risk',text:'Tweede fictief risico'}]}));
const snapshots=Object.fromEntries(lines.map(line=>[line.id,{line:JSON.stringify(line),sourceHash:'synthetic-source'}]));
// Keep the real draft/investigation/question/branch/model/scope/workspace validators. Only
// catalogue data and its evidence adapter are synthetic; those adapters have
// their own admission tests. An invalid fixture trace explicitly fails here.
const codeLikeText = '"; globalThis.compatibilityFixtureExecuted = true; // </script> &amp; \\u2028';
register('./project-session-fixtures/compatibility-loader.mjs', import.meta.url, {data:{
  parentURL:import.meta.url,
  snapshots:{...snapshots,'synthetic-code-probe':{line:codeLikeText}},
  reportTrace:fixture.draft.investigation.materials[1].reportTrace,
  lawTrace:fixture.draft.investigation.materials[0].lawTrace,
}});

void test('compatibility loader transfers code-like fixture text as data', async () => {
  const {reviewedScopeSnapshots} = await import('./reviewed-reports.mjs');
  assert.equal(reviewedScopeSnapshots['synthetic-code-probe'].line, codeLikeText);
  assert.equal(globalThis.compatibilityFixtureExecuted, undefined);
  const {validateReportTrace} = await import('./report-point-source.mjs');
  const {validateWwkeMaterial} = await import('./wwke-law-data.mjs');
  assert.throws(() => validateReportTrace({reportTrace:codeLikeText}), /Synthetic report evidence mismatch/);
  assert.throws(() => validateWwkeMaterial({lawTrace:codeLikeText}), /Synthetic law evidence mismatch/);
});
const {readProject,makeProject,acceptProjectFile,guardedProjectStore,PROJECT_KEY}=await import('./project-session.mjs');
const {upgradeDraft}=await import('./corpus-model.mjs');
const {validateDraft}=await import('./framework-model.mjs');
const {cleanScopeDraft}=await import('./product-scope.mjs');
const {readProjectInBackground}=await import('../app/project-reader.ts');
const framework={version:'synthetic',content_hash:'a'.repeat(64),productScope:'internal-it-1',
  report:{id:'synthetic-report',source_hash:'synthetic-source'},lines:[...lines,{id:'synthetic-held'}]};
const options={restoreDraft:value=>cleanScopeDraft(framework,validateDraft(value,framework)).draft,
  restoreModels:validateModelLibrary,themes:[{id:'synthetic-a'},{id:'synthetic-b'}]};
const current=()=>({...structuredClone(fixture),draft:{...structuredClone(fixture.draft),title:'Current unsaved work'}});
function storage(raw=null){
  const values=new Map(raw===null?[]:[[PROJECT_KEY,raw]]),writes=[];
  let failure=()=>false;
  return {values,writes,getItem:key=>values.get(key)??null,setItem(key,value){
    if(failure(key))throw new DOMException('Synthetic full storage','QuotaExceededError');
    values.set(key,value);writes.push(key);
  },fail:fn=>{failure=fn;}};
}
const decode={
  file:async text=>parseProjectText(await new File([text],'synthetic.project').text()),
  browser:text=>readProjectInBackground(text,{createWorker:()=>{throw Error('Use real decoder fallback');}}),
};
async function open(text,route,store,session,restore=options){
  const decoded=await decode[route](text);
  const result=readProject(decoded,session.project,restore);
  const accepted=route==='file'
    ? acceptProjectFile(result,()=>store.acceptProject(result,text,{replace:true}))
    : store.acceptProject(result,text);
  session.project=result.project;
  if(accepted.notice)session.notices.push(accepted.notice);
  return {result,accepted};
}

for(const route of ['file','browser']) {
  test(`${route}: unused packages do not bind; a supported public successor validates unchanged snapshots`,async()=>{
    const before=sourceCollections({ref:{release:'public-1',hash:'navigation-1'}});
    before.origins.push({id:'own:unused',kind:'own'});before.sources.foundation.UNUSED='own:unused';
    const preference=bindCollectionPreference({mode:'both',origins:[]},before);
    assert.deepEqual(preference.origins,[],'browsing all collections is not source use');
    const project=makeProject(fixture.draft,fixture.modelLibrary,fixture.workspace,fixture.view,preference);
    assert.deepEqual(project.collections.origins,[before.origins[0].id]);
    const next=sourceCollections({ref:{release:'public-2',hash:'navigation-2'}});
    assert.doesNotThrow(()=>assertProjectCollections(project,next));
    const nextFramework={...framework,content_hash:'b'.repeat(64),report:{...framework.report,source_hash:'public-successor'}};
    let validations=0;
    const restore={...options,collections:next,restoreDraft:value=>{
      validations++;return upgradeDraft(value,nextFramework,nextFramework,()=>[framework]);
    }};
    const raw=serializeProject(project),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    const {accepted}=await open(raw,route,store,session,restore);
    assert.equal(validations,1);assert.equal(session.project.draft.source_hash,'public-successor');
    for(const key of ['included','overrides','notes','research','investigation'])assert.deepEqual(session.project.draft[key],project.draft[key]);
    assert.deepEqual(session.project.collections,project.collections,'historical public provenance is not rebound');
    assert.equal(backing.getItem(accepted.originalKey),raw);
    for(const change of [p=>p.draft.investigation.materials[0].lawTrace='{"changed":true}',p=>p.draft.source_hash='unknown-publication']){
      const invalid=structuredClone(project);change(invalid);
      const saved=store.raw(),currentProject=structuredClone(session.project),writes=backing.writes.length;
      await assert.rejects(open(serializeProject(invalid),route,store,session,restore),/bekende bronversie/);
      assert.equal(store.raw(),saved);assert.equal(backing.writes.length,writes);assert.deepEqual(session.project,currentProject);
    }
  });

  test(`${route}: restore then choose another own source and a new public source keeps old bindings and assigns current new pins`,async()=>{
    const old={schema:1,origins:[{id:'public:old',kind:'public'},{id:'own:first',kind:'own'}],sources:{report:{},foundation:{FIRST:'own:first'},model:{}}};
    const input=structuredClone(fixture);input.draft.investigation.materials[0].foundationId='FIRST';
    const project=makeProject(input.draft,input.modelLibrary,input.workspace,input.view,bindCollectionPreference({mode:'both',origins:[]},old));
    const next={schema:1,origins:[{id:'public:new',kind:'public'},{id:'own:first',kind:'own'},{id:'own:second',kind:'own'}],sources:{report:{},foundation:{FIRST:'own:first',SECOND:'own:second'},model:{}},reports:{'NEW-PUBLIC':'new-public-report'}};
    const raw=serializeProject(project),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    await open(raw,route,store,session,{...options,collections:next});
    assert.deepEqual(session.project.collections,project.collections);
    const edited=structuredClone(session.project.draft),newMaterial={...edited.investigation.materials[0],id:'WB-3',foundationId:'SECOND',originKey:'synthetic:3'};
    edited.investigation.materials.push(newMaterial);edited.included.push('WB-3','NEW-PUBLIC');
    const chosen=makeProject(edited,session.project.modelLibrary,session.project.workspace,session.project.view,bindCollectionPreference(session.project.collections,next));
    store.save(chosen);const saved=parseProjectText(store.raw());
    assert.equal(saved.collections.bindings.find(b=>b.id==='FIRST').origin,'own:first');
    assert.equal(saved.collections.bindings.find(b=>b.id==='synthetic-report').origin,'public:old');
    assert.equal(saved.collections.bindings.find(b=>b.id==='SECOND').origin,'own:second');
    assert.equal(saved.collections.bindings.find(b=>b.id==='new-public-report').origin,'public:new');
    const expandedFramework={...framework,lines:[...framework.lines,{...lines[0],id:'WB-3'},{...lines[1],id:'NEW-PUBLIC',report_id:'new-public-report'}]};
    await open(store.raw(),route,store,session,{...options,collections:next,restoreDraft:value=>validateDraft(value,expandedFramework)});
    assert.deepEqual(session.project.draft,edited);assert.deepEqual(session.project.collections,chosen.collections);
  });

  test(`${route}: every retained own snapshot binds even when hidden or deselected; unrelated own additions remain possible`,async()=>{
    const available={schema:1,origins:[{id:'public:1',kind:'public'},{id:'own:used',kind:'own'},{id:'own:other',kind:'own'}],sources:{report:{},foundation:{OWN:'own:used',OTHER:'own:other'},model:{}}};
    const input=structuredClone(fixture);input.draft.investigation.materials[0].foundationId='OWN';input.draft.included=[];
    let project=makeProject(input.draft,input.modelLibrary,input.workspace,input.view,bindCollectionPreference({mode:'public',origins:[]},available));
    assert(project.collections.origins.includes('own:used'));assert(!project.collections.origins.includes('own:other'));
    const hidden=bindCollectionPreference({...project.collections,mode:'own'},available);
    assert.deepEqual(makeProject(project.draft,project.modelLibrary,project.workspace,project.view,hidden).collections.origins,project.collections.origins);
    const withoutOwn={...available,origins:[available.origins[0]],sources:{report:{},foundation:{},model:{}}};
    const raw=serializeProject(project),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    let validations=0;
    const replaced={...available,origins:[...available.origins,{id:'own:replaced',kind:'own'}],sources:{...available.sources,foundation:{...available.sources.foundation,OWN:'own:replaced'}}};
    for(const collections of [withoutOwn,replaced])await assert.rejects(open(raw,route,store,session,{...options,collections,restoreDraft:()=>{validations++;throw Error('Must not adopt');}}),/geen andere bron/);
    assert.equal(validations,0);assert.equal(store.raw(),raw);assert.equal(backing.writes.length,0);
    const extended=structuredClone(project.draft);extended.investigation.materials[1].foundationId='OTHER';
    project=makeProject(extended,project.modelLibrary,project.workspace,project.view,bindCollectionPreference(project.collections,available));
    assert(project.collections.origins.includes('own:other'),'ordinary source selection can add a new exact binding');
  });

  test(`${route}: released v1 migrates with exact original, plain and compressed`,async()=>{
    for(const raw of [JSON.stringify(v1Fixture,null,2),serializeProject(v1Fixture)]){
      const before=structuredClone(v1Fixture),backing=storage(route==='browser'?raw:serializeProject(current()));
      const store=guardedProjectStore(backing),session={project:current(),notices:[]};
      const {result,accepted}=await open(raw,route,store,session);
      assert.deepEqual(result.migration,{fromVersion:1,toVersion:2});
      assert.deepEqual(session.project,fixture);assert.deepEqual(v1Fixture,before);
      assert.equal(backing.getItem(accepted.originalKey),raw);
      assert.deepEqual(session.project.collections,{mode:'both',origins:[],bindings:[]});
      const reload=await open(store.raw(),'browser',store,session);
      assert.equal(reload.result.migration,null);assert.equal(session.notices.length,1);
    }
  });

  test(`${route}: released v1 binds only retained sources after ordinary snapshot validation`,async()=>{
    const old=structuredClone(v1Fixture);old.draft.investigation.materials[0].foundationId='OWN';
    const available={schema:1,origins:[{id:'public:current',kind:'public'},{id:'own:used',kind:'own'},{id:'own:unused',kind:'own'}],sources:{report:{},foundation:{OWN:'own:used',UNUSED:'own:unused'},model:{}}};
    const raw=serializeProject(old),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    const {accepted}=await open(raw,route,store,session,{...options,collections:available});
    assert.equal(backing.getItem(accepted.originalKey),raw);assert.deepEqual(session.project.draft,old.draft);
    assert.deepEqual(new Set(session.project.collections.origins),new Set(['own:used','public:current']));
    const invalid=structuredClone(old);invalid.draft.investigation.materials[0].lawTrace='{"changed":true}';
    const saved=store.raw(),writes=backing.writes.length;
    await assert.rejects(open(serializeProject(invalid),route,store,session,{...options,collections:available}),/evidence mismatch/);
    assert.equal(store.raw(),saved);assert.equal(backing.writes.length,writes);
  });

  test(`${route}: choice survives and missing/replaced collection protects original research and evidence`,async()=>{
    const available={schema:1,origins:[{id:'public:synthetic-1',kind:'public'},{id:'own:synthetic-2',kind:'own'}],sources:{report:{},foundation:{OWN:'own:synthetic-2'},model:{}}};
    for(const mode of ['public','own','both']){
      const input=structuredClone(fixture);input.draft.investigation.materials[0].foundationId='OWN';
      const project=makeProject(input.draft,input.modelLibrary,input.workspace,input.view,bindCollectionPreference({mode,origins:[]},available));
      const raw=serializeProject(project),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
      const decoded=await decode[route](raw);
      assert.doesNotThrow(()=>assertProjectCollections(decoded,available));
      await open(raw,route,store,session);assert.deepEqual(session.project,project);
      const before=structuredClone(session.project),writes=backing.writes.length,stored=backing.getItem(PROJECT_KEY);
      assert.throws(()=>assertProjectCollections(decoded,{...available,origins:[]}),/Eigen onderzoekstekst en bronbewijs/);
      const replaced={...available,origins:available.origins.map(origin=>({...origin,id:origin.id+'-changed'}))};
      assert.throws(()=>assertProjectCollections(decoded,replaced),/geen andere bron/);
      let validations=0;
      await assert.rejects(open(raw,route,store,session,{...options,collections:replaced,restoreDraft:()=>{validations++;throw Error('Must not restore another source');}}),/geen andere bron/);
      assert.equal(validations,0);
      assert.deepEqual(session.project,before);assert.equal(backing.getItem(PROJECT_KEY),stored);assert.equal(backing.writes.length,writes);
      assert.deepEqual(parseProjectText(raw).draft,input.draft);
    }
  });

  test(`${route}: v1 migration cannot adopt when its original cannot be retained`,async()=>{
    const raw=serializeProject(v1Fixture),backing=storage(raw),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    const before=structuredClone(session.project);
    backing.fail(key=>key.includes('-original-'));
    await assert.rejects(open(raw,route,store,session),{name:'QuotaExceededError'});
    assert.deepEqual(session.project,before);assert.equal(backing.getItem(PROJECT_KEY),raw);assert.deepEqual(session.notices,[]);
  });

  test(`${route}: rich saved current version opens unchanged, plain and compressed`,async()=>{
    for(const raw of [JSON.stringify(fixture,null,2),serializeProject(fixture)]){
      const backing=storage(route==='browser'?raw:serializeProject(current())),store=guardedProjectStore(backing);
      const session={project:current(),notices:[]},before=structuredClone(fixture);
      const {result}=await open(raw,route,store,session);
      assert.deepEqual(session.project,before);assert.deepEqual(fixture,before);
      assert.equal(result.legacy,false);assert.equal(result.migration,null);assert.equal(result.preserveOriginal,false);
      assert.deepEqual(session.notices,[]);
      for(let reload=0;reload<3;reload++)await open(store.raw(),'browser',store,session);
      assert.deepEqual(session.project,before);assert.deepEqual(session.notices,[]);
      assert.deepEqual([...backing.values.keys()].filter(k=>k.includes('-original-')),[]);
      assert.equal(backing.writes.length,route==='file'?2:0);
    }
  });

  test(`${route}: unsupported/invalid versions and corrupt projects preserve open work and every stored byte`,async()=>{
    const bad=[...[3,99,0,-1,1.5,'1',null,undefined].map(version=>JSON.stringify({...fixture,version})),
      JSON.stringify({...fixture,format:'rijksmap-project-unknown'}),
      JSON.stringify({...JSON.parse(serializeProject(fixture)),version:2}),
      serializeProject({...fixture,version:3}),'{broken'];
    for(const raw of bad){
      const backing=storage(route==='browser'?raw:serializeProject(current())),store=guardedProjectStore(backing);
      const session={project:current(),notices:[]},before=structuredClone(session.project),stored=store.raw();
      let validations=0;
      await assert.rejects(open(raw,route,store,session,{...options,restoreDraft:()=>{validations++;throw Error('Should not validate unsupported projects');}}));
      assert.equal(validations,0);assert.deepEqual(session.project,before);assert.equal(store.raw(),stored);
      assert.equal(backing.getItem(PROJECT_KEY),stored);assert.deepEqual(backing.writes,[]);assert.deepEqual(session.notices,[]);
    }
  });

  test(`${route}: malformed draft, model, workspace and evidence fail before any backup or adoption`,async()=>{
    for(const change of [p=>p.draft.baseline_id='wrong',p=>p.draft.research.links[0].line_id='missing',
      p=>p.modelLibrary.models[0].selected='yes',p=>p.workspace.openIds=[4],p=>p.view=[],
      p=>p.draft.investigation.applicability[0].status='approved-by-migration',
      p=>delete p.collections,p=>p.collections.mode='external',p=>p.collections.origins=[23],
      p=>delete p.collections.bindings,p=>p.collections.bindings=[{kind:'foundation',id:'X',collection:'own',origin:'not-bound'}],
      p=>p.draft.investigation.materials[0].lawTrace='{"changed":true}']){
      const invalid=structuredClone(fixture);change(invalid);
      const raw=serializeProject(invalid),backing=storage(route==='browser'?raw:serializeProject(current()));
      const session={project:current(),notices:[]},before=structuredClone(session.project),store=guardedProjectStore(backing);
      await assert.rejects(open(raw,route,store,session));
      assert.deepEqual(session.project,before);assert.deepEqual(backing.writes,[]);assert.deepEqual(session.notices,[]);
    }
  });

  test(`${route}: HOLD cleanup retains exact original once and never admits the held selection`,async()=>{
    const held=structuredClone(fixture);held.draft.included.push('synthetic-held');
    held.draft.research.links.push({question_id:'q-1',line_id:'synthetic-held'});
    const raw=JSON.stringify(held,null,2),previous=serializeProject(current());
    const backing=storage(route==='browser'?raw:previous),store=guardedProjectStore(backing),session={project:current(),notices:[]};
    const {result,accepted}=await open(raw,route,store,session);
    assert.equal(result.preserveOriginal,true);assert.equal(result.migration,null);
    assert.deepEqual(session.project,fixture);assert.equal(backing.getItem(accepted.originalKey),raw);
    if(route==='file')assert.equal(backing.getItem(PROJECT_KEY+'-before-open'),previous);
    const writes=backing.writes.length;
    for(let reload=0;reload<3;reload++)await open(store.raw(),'browser',store,session);
    assert.equal(backing.writes.length,writes);assert.equal(session.notices.length,1);
  });

  test(`${route}: backup and final-write quota failures never partially adopt, and retry reuses the original`,async()=>{
    const changed=structuredClone(fixture);changed.draft.included.push('synthetic-held');
    const raw=JSON.stringify(changed,null,2);
    for(const failingKey of [PROJECT_KEY,PROJECT_KEY+'-original-0',...(route==='file'?[PROJECT_KEY+'-before-open']:[])]){
      const previous=route==='browser'?raw:serializeProject(current()),backing=storage(previous),store=guardedProjectStore(backing);
      const session={project:current(),notices:[]},before=structuredClone(session.project);
      backing.fail(key=>key===failingKey);
      for(let retry=0;retry<2;retry++){
        await assert.rejects(open(raw,route,store,session),{name:'QuotaExceededError'});
        assert.deepEqual(session.project,before);assert.equal(backing.getItem(PROJECT_KEY),previous);assert.equal(store.raw(),previous);
        assert.deepEqual(session.notices,[]);
      }
      backing.fail(()=>false);await open(raw,route,store,session);
      assert.deepEqual(session.project,fixture);assert.equal(session.notices.length,1);
      assert.equal([...backing.values.keys()].filter(k=>k.includes('-original-')).length,1);
      assert.equal(backing.getItem(PROJECT_KEY+'-original-0'),raw);
    }
  });
}

test('unchanged current-format file stays usable and downloadable after backup/final-write quota failure without replacing stored bytes',async()=>{
  for(const failingKey of [PROJECT_KEY+'-before-open',PROJECT_KEY]){
    const previous=serializeProject(current()),backing=storage(previous),store=guardedProjectStore(backing);
    const session={project:current(),notices:[]};
    backing.fail(key=>key===failingKey);
    const {accepted}=await open(serializeProject(fixture),'file',store,session);
    assert.equal(accepted.savedLocally,false);assert.deepEqual(session.project,fixture);
    assert.deepEqual(parseProjectText(serializeProject(session.project)),fixture,'The opened file remains downloadable');
    assert.equal(backing.getItem(PROJECT_KEY),previous);assert.equal(store.raw(),previous);
    assert.deepEqual(session.notices,[]);assert(!backing.writes.includes(PROJECT_KEY));
  }
});

test('file fallback permits denied storage only after unchanged current-format validation, never migration, source changes or generic failures',()=>{
  const opened=readProject(fixture,current(),options);
  const denied=()=>guardedProjectStore({getItem(){throw new DOMException('Denied','SecurityError');}});
  assert.deepEqual(acceptProjectFile(opened,denied),{originalKey:null,notice:'',savedLocally:false});
  for(const changed of [{...opened,preserveOriginal:true},{...opened,migration:{fromVersion:1,toVersion:2}},
    {...opened,legacy:true}]){
    for(const name of ['QuotaExceededError','SecurityError'])
      assert.throws(()=>acceptProjectFile(changed,()=>{throw new DOMException('Cannot preserve original',name);}),{name});
  }
  for(const error of [Error('Source failure'),Error('Tab conflict'),new DOMException('Unrecognized failure','UnknownError')])
    assert.throws(()=>acceptProjectFile(opened,()=>{throw error;}),e=>e===error);
});

test('file fallback cannot hide a stale-tab conflict or an invalid project, even when subsequent writes would hit quota',async()=>{
  const previous=serializeProject(current()),backing=storage(previous),store=guardedProjectStore(backing);
  const external=serializeProject({...current(),draft:{...current().draft,title:'Other tab'}});
  backing.values.set(PROJECT_KEY,external);backing.fail(()=>true);
  const session={project:current(),notices:[]},before=structuredClone(session.project);
  await assert.rejects(open(serializeProject(fixture),'file',store,session),/ander tabblad/);
  await assert.rejects(open(JSON.stringify({...fixture,version:3}),'file',store,session),/projectversie/);
  const invalid=structuredClone(fixture);invalid.draft.investigation.materials[0].lawTrace='{"changed":true}';
  await assert.rejects(open(serializeProject(invalid),'file',store,session),/evidence mismatch/);
  assert.deepEqual(session.project,before);assert.deepEqual(session.notices,[]);assert.deepEqual(backing.writes,[]);
  assert.equal(backing.getItem(PROJECT_KEY),external);assert.equal(store.raw(),previous);
});

test('sequential fictional migrations run in isolation and preserve the caller even if a step mutates then throws',()=>{
  const source=structuredClone(v1Fixture),before=structuredClone(source),seen=[];
  const migrate=createProjectMigrator(3,[[1,value=>{seen.push(1);return {...value,version:2,workplace:value.workspace,workspace:undefined};}],
    [2,value=>{seen.push(2);const {workplace,...rest}=value;return {...rest,version:3,workspace:workplace};}]]);
  const result=migrate(source);
  assert.deepEqual(seen,[1,2]);assert.deepEqual(result.value,{...v1Fixture,version:3});
  assert.deepEqual(result.migration,{fromVersion:1,toVersion:3});assert.deepEqual(source,before);
  assert.equal(migrate(result.value).migration,null);assert.deepEqual(seen,[1,2]);
  for(const steps of [[],[[1,v=>({...v,version:2})]],[[1,v=>({...v,version:3})]],[[1,v=>({...v,format:'wrong',version:2})]],
    [[1,v=>{v.draft.title='Damaged';throw Error('Failed step');}]]]){
    assert.throws(()=>createProjectMigrator(3,steps)(source));assert.deepEqual(source,before);
  }
  assert.equal(PROJECT_VERSION,2);assert.throws(()=>migrateProject(result.value),/projectversie/);
  assert.throws(()=>readProject(result.value,current(),options),/projectversie/);
});

test('a migration receipt requires original retention and announces only the successful adoption',()=>{
  // Storage is version-agnostic. Exercise its receipt with a current-format
  // payload; future production versions remain deliberately unsupported.
  const migration=migrateProject(v1Fixture).migration;
  const raw=JSON.stringify(fixture,null,2),backing=storage(raw),store=guardedProjectStore(backing);
  const opened={...readProject(fixture,current(),options),migration};
  backing.fail(key=>key===PROJECT_KEY+'-original-0');
  assert.throws(()=>store.acceptProject(opened,raw),{name:'QuotaExceededError'});assert.equal(store.raw(),raw);
  backing.fail(()=>false);const accepted=store.acceptProject(opened,raw);
  assert.equal(backing.getItem(accepted.originalKey),raw);assert.match(accepted.notice,/projectversie/);
  const reloaded=readProject(parseProjectText(store.raw()),current(),options),writes=backing.writes.length;
  assert.deepEqual(store.acceptProject(reloaded,store.raw()),{originalKey:null,notice:''});
  assert.equal(backing.writes.length,writes);
});

test('different originals remain recoverable and serialization errors precede every storage write',()=>{
  const backing=storage(serializeProject(current())),store=guardedProjectStore(backing);
  const first=JSON.stringify(fixture,null,2),second=JSON.stringify(current(),null,2);
  const result={...readProject(fixture,current(),options),preserveOriginal:true};
  const a=store.acceptProject(result,first,{replace:true}),b=store.acceptProject(result,second,{replace:true});
  assert.notEqual(a.originalKey,b.originalKey);
  assert.equal(backing.getItem(a.originalKey),first);assert.equal(backing.getItem(b.originalKey),second);
  const invalid=structuredClone(result);invalid.project.draft.investigation.materials[0].lawTrace='invalid JSON';
  const before=new Map(backing.values),writes=backing.writes.length,raw=store.raw();
  assert.throws(()=>store.acceptProject(invalid,first,{replace:true}));
  assert.deepEqual(backing.values,before);assert.equal(backing.writes.length,writes);assert.equal(store.raw(),raw);
});

test('stale restore transactions cannot adopt or write over a changed tab, including an unchanged current-format reload',()=>{
  for(const replace of [false,true]){
    const raw=serializeProject(fixture),backing=storage(raw),store=guardedProjectStore(backing);
    const result=readProject(fixture,current(),options),external=serializeProject(current());
    backing.values.set(PROJECT_KEY,external);
    assert.throws(()=>store.acceptProject(result,raw,{replace}),/ander tabblad/);
    assert.equal(backing.getItem(PROJECT_KEY),external);assert.deepEqual(backing.writes,[]);
  }
});

test('legacy draft imports retain current models and workspace and still run draft validation',()=>{
  const active=current(),opened=readProject(fixture.draft,active,options);
  assert.equal(opened.legacy,true);assert.equal(opened.migration,null);assert.equal(opened.preserveOriginal,false);
  assert.deepEqual(opened.project.modelLibrary,active.modelLibrary);assert.deepEqual(opened.project.workspace,active.workspace);
  assert.throws(()=>readProject({...fixture.draft,baseline_id:'wrong'},active,options));
  const available=sourceCollections({ref:{release:'public-current',hash:'catalogue-current'}});
  const scoped=readProject(fixture.draft,active,{...options,collections:available});
  assert.deepEqual(scoped.project.collections.bindings,[{kind:'report',id:'synthetic-report',collection:'public',origin:available.origins[0].id}]);
});

test('both editor routes commit storage before applying state; file imports keep literal input bytes',()=>{
  const ordered=(block,...needles)=>{
    const positions=needles.map(text=>block.indexOf(text));
    assert(positions.every((position,i)=>position>=0&&(i===0||position>positions[i-1])),needles.join(' → '));
  };
  const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
  const browser=source.slice(source.indexOf('const restored=readProject(original'),source.indexOf('// Migrate old independent stores'));
  ordered(browser,'const restored=readProject(original','store.acceptProject(restored,store.raw()!)',
    'onProjectRestored(restored.project)','setScopeNotice(accepted.notice)');
  const file=source.slice(source.indexOf('async function importDraft('),source.indexOf('function openStructure('));
  assert.match(file,/const originalText=await file.text\(\);/);
  ordered(file,'readProject(original','acceptProjectFile(opened,()=>{','store.acceptProject(opened,originalText,','backgroundSave.current?.cancel()',
    'rememberProject(','applyProject(opened.project)','setScopeNotice(accepted.notice)');
  assert.match(file,/storageBlocked.current=!accepted.savedLocally/);
  for(const block of [source.slice(source.indexOf('const original=await readProjectInBackground'),source.indexOf('// Migrate old independent stores')),file])
    ordered(block,'assertProjectCollections(original,availableCollections)','ensureCatalogue(projectCatalogueKeys(original))','readProject(original');
  assert.match(file,/savedLocally:accepted.savedLocally,problem:!accepted.savedLocally/);
  assert.match(file,/Project geopend\. Automatisch bewaren is niet gelukt; gebruik Bewaar project\. De eerdere opslag is niet overschreven\./);
  assert.match(source,/<\/div>\s*\{problem && \(\s*<ProjectNotice/,'recovery must remain visible outside the hidden export panel');
});
