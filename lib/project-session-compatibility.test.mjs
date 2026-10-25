import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import fixture from './project-session-fixtures/v1.mjs';
import {createProjectMigrator,migrateProject,PROJECT_VERSION} from './project-session-migrations.mjs';
import {parseProjectText,serializeProject} from './project-codec.mjs';
import {validateModelLibrary} from './model-library-validation.mjs';

const lines=fixture.draft.investigation.materials.map(m=>({id:m.id,report_id:'synthetic-report',
  criterion:{text:m.body},auditQuestion:{text:m.question},
  sourceItems:[{id:'source-risk-2',kind:'risk',text:'Tweede fictief risico'}]}));
const snapshots=Object.fromEntries(lines.map(line=>[line.id,{line:JSON.stringify(line),sourceHash:'synthetic-source'}]));
// Keep the real draft/investigation/question/branch/model/scope/workspace validators. Only
// catalogue data and its evidence adapter are synthetic; those adapters have
// their own admission tests. An invalid fixture trace explicitly fails here.
register('data:text/javascript,'+encodeURIComponent(`
 const fixtures={
  './reviewed-reports.mjs':'export const reviewedScopeSnapshots='+${JSON.stringify(JSON.stringify(snapshots))}+';export const reviewedScopeDecisions={"WB-1":["retain","Synthetic"],"WB-2":["retain","Synthetic"]};export const reviewedResearchPresets=[];',
  './report-quality-revisions.mjs':'export const revisedReportLine=l=>l;',
  './process-catalogue.mjs':'export const activeProcesses=[],processes=[];',
  './control-objectives.mjs':'export const controlObjectiveFor=l=>l.controlObjective;',
  './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata=[];',
  './interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[];',
  './report-point-source.mjs':${JSON.stringify(`export function validateReportTrace(m){if(m.reportTrace!==${JSON.stringify(fixture.draft.investigation.materials[1].reportTrace)})throw Error('Synthetic report evidence mismatch');}`)},
  './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
  './cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO evidence");}',
  './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[];export function validateTopicalMaterial(){throw Error("Unexpected topical evidence");}',
  './wwke-law-data.mjs':${JSON.stringify(`export const wwkeMetadata={id:'TESTWWKE'},wwkeProposals=[],wwkeSourceId='TESTWWKE';export function validateWwkeMaterial(m){if(m.lawTrace!==${JSON.stringify(fixture.draft.investigation.materials[0].lawTrace)})throw Error('Synthetic law evidence mismatch');}`)},
  './investigation.mjs':${JSON.stringify(`
    export {validateInvestigation} from ${JSON.stringify(new URL('./investigation.mjs',import.meta.url).href)};
    export const investigationFramework=framework=>framework;
    export const materialMatchesLine=()=>{throw Error('Unexpected material admission');};
    export const validateExportSettings=()=>{throw Error('Unexpected export settings');};
  `)},
  'omnibus-data:lib/theme-workspaces.mjs':'export default {presets:[]};',
  '@/lib/research-flow.mjs':'export const subSuggestions=()=>[];'
 };
 export function resolve(s,c,next){
  if(s==='./theme-workspaces.mjs'&&c.parentURL.endsWith('/project-session.mjs'))
    return next(new URL('./content-adapters/theme-workspaces.mjs',c.parentURL).href,c);
  if(s.endsWith('.json'))return {url:'data:application/json,'+encodeURIComponent(JSON.stringify(s.endsWith('/report-additions.json')?{control_objectives:[],organizational_goals:[]}:{})),shortCircuit:true};
  if(s==='@/lib/reviewed-reports.mjs')s='./reviewed-reports.mjs';
  if(Object.hasOwn(fixtures,s))return {url:'data:text/javascript,'+encodeURIComponent(fixtures[s]),shortCircuit:true};
  if(s.startsWith('@/lib/'))return next(new URL('./'+s.slice(6),${JSON.stringify(import.meta.url)}).href,c);
  return next(s,c);
 }
`),import.meta.url);
const {readProject,guardedProjectStore,PROJECT_KEY}=await import('./project-session.mjs');
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
  const accepted=store.acceptProject(result,text,{replace:route==='file'});
  session.project=result.project;
  if(accepted.notice)session.notices.push(accepted.notice);
  return {result,accepted};
}

for(const route of ['file','browser']) {
  test(`${route}: rich saved v1 opens unchanged, plain and compressed`,async()=>{
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
    const bad=[...[2,99,0,-1,1.5,'1',null,undefined].map(version=>JSON.stringify({...fixture,version})),
      JSON.stringify({...fixture,format:'rijksmap-project-unknown'}),
      JSON.stringify({...JSON.parse(serializeProject(fixture)),version:2}),
      serializeProject({...fixture,version:2}),'{broken'];
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

test('sequential fictional migrations run in isolation and preserve the caller even if a step mutates then throws',()=>{
  const source=structuredClone(fixture),before=structuredClone(source),seen=[];
  const migrate=createProjectMigrator(3,[[1,value=>{seen.push(1);return {...value,version:2,workplace:value.workspace,workspace:undefined};}],
    [2,value=>{seen.push(2);const {workplace,...rest}=value;return {...rest,version:3,workspace:workplace};}]]);
  const result=migrate(source);
  assert.deepEqual(seen,[1,2]);assert.deepEqual(result.value,{...fixture,version:3});
  assert.deepEqual(result.migration,{fromVersion:1,toVersion:3});assert.deepEqual(source,before);
  assert.equal(migrate(result.value).migration,null);assert.deepEqual(seen,[1,2]);
  for(const steps of [[],[[1,v=>({...v,version:2})]],[[1,v=>({...v,version:3})]],[[1,v=>({...v,format:'wrong',version:2})]],
    [[1,v=>{v.draft.title='Damaged';throw Error('Failed step');}]]]){
    assert.throws(()=>createProjectMigrator(3,steps)(source));assert.deepEqual(source,before);
  }
  assert.equal(PROJECT_VERSION,1);assert.throws(()=>migrateProject(result.value),/projectversie/);
  assert.throws(()=>readProject(result.value,current(),options),/projectversie/);
});

test('a fictional migration receipt requires original retention and announces only the successful adoption',()=>{
  // Storage is version-agnostic. Exercise its receipt with a current-format
  // payload; future production versions remain deliberately unsupported.
  const migration=createProjectMigrator(2,[[1,v=>({...v,version:2})]])(fixture).migration;
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

test('stale restore transactions cannot adopt or write over a changed tab, including an unchanged v1 reload',()=>{
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
  ordered(file,'readProject(original','store.acceptProject(opened,originalText,','backgroundSave.current?.cancel()',
    'rememberProject(','applyProject(opened.project)','setScopeNotice(accepted.notice)');
});
