import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {registerCatalogueResource,ensureCatalogue,onCatalogueChange,catalogueReady} from './catalogue-runtime.mjs';

const hash = letter => letter.repeat(64);
const base = {version:'test',content_hash:hash('a'),corpus:[],themes:[]};
const lines = Array.from({length:200},(_,i)=>({id:'NEW-'+i,report_id:'NEW',title:'Synthetic norm '+i,criterion:{text:'Exact source 😀 '+i}}));
const report = {framework:{report:{id:'NEW',source_hash:hash('b')},lines,evidence:[],patterns:[]}};
const theme = {id:'synthetic',lineIds:lines.map(l=>l.id),reportIds:['NEW']};
const fixture = globalThis.historyFixture = {
  current:{...base,content_hash:hash('c'),corpus:[report],themes:[theme]},
  reviewed:{content_hash:hash('d'),corpus:[report],themes:[theme],history:[]},
  additions:{corpus:[],themes:[],history:[{content_hash:hash('e'),reportIds:['NEW']}]},
  snapshots:Object.fromEntries(lines.map(l=>[l.id,{line:JSON.stringify(l),sourceHash:hash('b')}])),
  decisions:Object.fromEntries(lines.map(l=>[l.id,['retain','Reviewed']])),
  compositions:0,failHash:null,
};
// Real corpus composition, source scope, project validation and publication
// rollback. Only private data and unrelated model/transport adapters are fixtures.
const corpusUrl = new URL('./corpus-model.mjs',import.meta.url).href;
const historyUrl = new URL('./report-corpus-history.mjs',import.meta.url).href;
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  let source;
  if(specifier.endsWith('.json'))return {url:'data:application/json,'+encodeURIComponent(JSON.stringify(
   specifier.endsWith('/trial-corpus.json')?${JSON.stringify(base)}:{})),shortCircuit:true};
  if(specifier==='./reviewed-reports.mjs')source=${JSON.stringify(`
   import {reportCorpusHistory} from '${historyUrl}';
   const f=globalThis.historyFixture;
   export const reviewedScopeSnapshots=f.snapshots,reviewedScopeDecisions=f.decisions;
   export const extendReportCorpus=()=>f.current;
   export const previousReportCorpora=base=>reportCorpusHistory(base,f.reviewed,f.additions);`)};
  if(specifier==='./report-quality-revisions.mjs')source='export const revisedReportLine=l=>l,reportQualityVersion="synthetic";';
  if(specifier==='./control-objectives.mjs')source='export const controlObjectiveFor=l=>l.controlObjective;';
  if(specifier==='./process-catalogue.mjs')source='export const activeProcesses=[];';
  if(specifier==='./foundations/registry.mjs')source='export const importedFoundationItems=[],importedFoundationMetadata={};';
  if(specifier==='./investigation.mjs')source='export const materialMatchesLine=()=>false;export const validateInvestigation=()=>{throw Error("Unused investigation adapter")},investigationFramework=validateInvestigation,validateExportSettings=validateInvestigation;';
  if(context.parentURL?.endsWith('/application-catalogue.mjs')){
   const fixtures={
    './corpus-model.mjs':${JSON.stringify(`import {composeCorpus as compose} from '${corpusUrl}'; export function composeCorpus(bundle){const f=globalThis.historyFixture;f.compositions++;if(f.failHash===bundle.content_hash)throw Error('Historical projection rejected');return compose(bundle);}`)},
    'omnibus-data:lib/application-catalogue.mjs':'export default {routing:{reports:{},workspaces:{}},ref:null};',
    './removed-report-content.mjs':'export const assertNoRemovedReportContent=()=>{};',
    './database-source-client.mjs':'export const databaseSourceClient={content(){throw Error("Unused transport")}};',
    './catalogue-summary.mjs':'export const foundationSummaries=[],reportSummaries=[];',
    './report-overviews.mjs':'export const reportOverviewKey=id=>id;',
    './foundation-overviews.mjs':'export const foundationOverviewKey=id=>id;',
    './model-directory.mjs':'export const modelDirectoryKey=()=>"models";',
    './model-loading.mjs':'export const modelContentKeys=()=>[],projectModelIds=()=>[];',
   };source=fixtures[specifier]??source;
  }
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const catalogue = await import('./application-catalogue.mjs');
const {composeCorpus,upgradeDraft} = await import('./corpus-model.mjs');
const {applyProductScope,admittedLines,cleanScopeDraft} = await import('./product-scope.mjs');
const {initialDraft} = await import('./framework-model.mjs');
const {reportCorpusHistory} = await import('./report-corpus-history.mjs');

test('current 200-norm selection and current-project restore build no historical frameworks',()=>{
  assert.equal(fixture.compositions,1);
  assert.equal(admittedLines(catalogue.baseFramework).length,200);
  const draft=initialDraft(catalogue.baseFramework);
  assert.equal(draft.included.length,200);
  assert.deepEqual(upgradeDraft(draft,catalogue.baseFramework,catalogue.baseFramework,catalogue.getPreviousFrameworks),draft);
  assert.equal(fixture.compositions,1);
});

test('old project restores exactly as eager history, with all source checks and own fields',()=>{
  const bundles=reportCorpusHistory(base,fixture.reviewed,fixture.additions);
  const eager=bundles.map(b=>applyProductScope(composeCorpus(b)));
  const old={...initialDraft(eager[0]),overrides:{'NEW-199':{criterion:'Own wording'}},notes:{'NEW-199':'Own note'},
    research:{questions:[{id:'q-1',text:'How?',parent_id:null,origin:'user'}],links:[{line_id:'NEW-199',question_id:'q-1'}]}};
  const before=structuredClone(old),expected=upgradeDraft(old,catalogue.baseFramework,catalogue.baseFramework,eager);
  assert.deepEqual(upgradeDraft(old,catalogue.baseFramework,catalogue.baseFramework,catalogue.getPreviousFrameworks),expected);
  assert.deepEqual(old,before);
  assert.deepEqual(catalogue.getPreviousFrameworks().slice(0,eager.length),eager);
  assert.equal(fixture.compositions,1+eager.length);
  const cached=catalogue.getPreviousFrameworks();assert.equal(catalogue.getPreviousFrameworks(),cached);
  assert.deepEqual(cached.slice(-2).map(f=>f.version),['4.25-trial','4.24']);
  for(const legacy of cached.slice(-2))assert.equal(upgradeDraft(initialDraft(legacy),catalogue.baseFramework,catalogue.baseFramework,catalogue.getPreviousFrameworks).baseline_id,expected.baseline_id);
  assert.throws(()=>upgradeDraft({...old,baseline_id:'unknown'},catalogue.baseFramework,catalogue.baseFramework,catalogue.getPreviousFrameworks),/bekende bronversie/);
  assert.throws(()=>upgradeDraft({...old,included:['missing']},catalogue.baseFramework,catalogue.baseFramework,catalogue.getPreviousFrameworks),/bekende bronversie/);
});

test('a catalogue correction invalidates lazy history and does not admit changed source text',async()=>{
  const previous=catalogue.getPreviousFrameworks(),before=fixture.compositions;
  registerCatalogueResource('history:correction',async()=>null,()=>{
    const old=lines[199].criterion.text;lines[199].criterion.text='Not reviewed';
    return ()=>{lines[199].criterion.text=old;};
  });
  await ensureCatalogue(['history:correction']);
  assert.equal(fixture.compositions,before+1,'only the current framework is built on publication');
  assert.equal(admittedLines(catalogue.baseFramework).length,199);
  const next=catalogue.getPreviousFrameworks();assert.notEqual(next,previous);
  assert.equal(admittedLines(next[0]).length,199);
  assert.deepEqual(cleanScopeDraft(next[0],{included:['NEW-199']}).removed,['NEW-199']);
  fixture.failHash=hash('e');
  registerCatalogueResource('history:refresh',async()=>null,()=>{});
  await ensureCatalogue(['history:refresh']);
  assert.throws(catalogue.getPreviousFrameworks,/Historical projection rejected/);
  assert.throws(catalogue.getPreviousFrameworks,/Historical projection rejected/);
  fixture.failHash=null;assert.equal(catalogue.getPreviousFrameworks().length,next.length);
});

test('invalid history membership and a failed publication still roll back before selection',async()=>{
  const before=catalogue.baseFramework,previous=catalogue.getPreviousFrameworks();
  registerCatalogueResource('history:invalid',async()=>null,()=>{
    fixture.additions.history.push({content_hash:hash('f'),reportIds:['missing']});
    return ()=>fixture.additions.history.pop();
  });
  await assert.rejects(ensureCatalogue(['history:invalid']),/Ontbrekend bewaard bronrapport/);
  assert.equal(catalogueReady(['history:invalid']),false);
  assert.deepEqual(catalogue.baseFramework,before);
  assert.deepEqual(catalogue.getPreviousFrameworks(),previous);
  assert.notEqual(catalogue.getPreviousFrameworks(),previous);
  registerCatalogueResource('history:rollback',async()=>null,()=>{
    const old=lines[0].title;lines[0].title='Uncommitted title';return ()=>{lines[0].title=old;};
  });
  const stop=onCatalogueChange(()=>{throw Error('Rejected publication');});
  try{await assert.rejects(ensureCatalogue(['history:rollback']),/Rejected publication/);}finally{stop();}
  assert.deepEqual(catalogue.baseFramework,before);
  assert.deepEqual(catalogue.getPreviousFrameworks(),previous);
});
