import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';

const line={id:'R1',report_id:'R',title:'Synthetic norm',criterion:{text:'Exact source'}};
// Keep the real draft, scope, source-field, branch and question validators.
// Only private catalogue data and the unrelated investigation adapter are fixtures.
register('data:text/javascript,'+encodeURIComponent(`
 const line=${JSON.stringify(line)};
 export function resolve(specifier,context,next){
  let source;
  if(specifier.endsWith('.json'))return {url:'data:application/json,'+encodeURIComponent(JSON.stringify(
   specifier.endsWith('/report-additions.json')?{control_objectives:[],organizational_goals:[]}:{})),shortCircuit:true};
  if(specifier==='./reviewed-reports.mjs')source='export const reviewedScopeSnapshots='+JSON.stringify({R1:{line:JSON.stringify(line),sourceHash:'source'}})+',reviewedScopeDecisions={R1:["retain","Reviewed"]};';
  if(specifier==='./report-quality-revisions.mjs')source='export const revisedReportLine=l=>l;';
  if(specifier==='./control-objectives.mjs')source='export const controlObjectiveFor=l=>l.controlObjective;';
  if(specifier==='./process-catalogue.mjs')source='export const activeProcesses=[];';
  if(specifier==='./foundations/registry.mjs')source='export const importedFoundationItems=[],importedFoundationMetadata={};';
  if(specifier==='./investigation.mjs')source='export const materialMatchesLine=(m,l)=>JSON.stringify(m)===JSON.stringify(l);export const validateInvestigation=()=>{throw Error("Unused investigation adapter")},investigationFramework=validateInvestigation,validateExportSettings=validateInvestigation;';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {initialDraft,prepareInitialDraft,validateDraft}=await import('./framework-model.mjs');
const {cleanScopeDraft,assertScopeExport}=await import('./product-scope.mjs');
const framework=()=>({version:'test',content_hash:'a'.repeat(64),title:'Synthetic framework',
 productScope:'internal-it-1',report:{id:'R',source_hash:'source'},lines:[structuredClone(line),{id:'held'}]});
const draft=f=>({...initialDraft(f),title:'My investigation',overrides:{R1:{criterion:'My wording'}},
 notes:{R1:'My note'},branchItems:{R1:[{id:'extra-1',kind:'risk',parent_id:'objective',text:'My risk'}]},
 research:{questions:[{id:'q-1',text:'How?',parent_id:null,origin:'user'}],links:[{question_id:'q-1',line_id:'R1'}]}});

test('restoring keeps explicit selections, edits, notes, branches and question links, without mutating input',()=>{
 const f=framework(),value=draft(f),before=structuredClone(value);
 for(const format of ['rijksmap-framework-draft-v1','rijksmap-framework-draft-v2']){
  const restored=validateDraft({...value,format},f);
  assert.deepEqual(restored,value);assert.notEqual(restored.included,value.included);
  assert.notEqual(restored.overrides.R1,value.overrides.R1);assert.notEqual(restored.research.links,value.research.links);
 }
 assert.deepEqual(value,before);
 assert.deepEqual(validateDraft({...value,included:[]},f).included,[]);
 assert.deepEqual(validateDraft({...value,format:'rijksmap-framework-draft-v1',branchItems:undefined},f).branchItems,{});
});

test('restoration never builds an unused all-source selection; new drafts still inspect complete admission',()=>{
 const f=framework(),value=draft(f);let inspected=0;
 for(let i=0;i<5000;i++)f.lines.push({id:'unrelated-'+i,get displayOnly(){inspected++;return false;}});
 assert.deepEqual(validateDraft(value,f),value);assert.equal(inspected,0);
 assert.deepEqual(initialDraft(f).included,['R1']);assert.equal(inspected,5000);
});

test('browsing prepares admitted rows and its draft in one full source check, including later changes',()=>{
 const f=framework();let inspected=0;
 for(let i=0;i<200;i++)f.lines.push({id:'new-unreviewed-'+i,get displayOnly(){inspected++;return false;}});
 const prepared=prepareInitialDraft(f);
 assert.equal(inspected,200);
 assert.deepEqual(prepared.admitted,[f.lines[0]]);
 assert.deepEqual(prepared.draft,initialDraft(f));
 assert.deepEqual(prepared.draft.included,prepared.admitted.map(l=>l.id));
 assert.equal(inspected,400);
 prepared.draft.included.push('held');
 const next=prepareInitialDraft(f);
 assert.deepEqual(next.draft.included,['R1']);assert.equal(inspected,600);
 f.lines[0].criterion.text='Changed source';
 assert.deepEqual(prepareInitialDraft(f).admitted,[]);
 assert.deepEqual(prepareInitialDraft(f).draft.included,[]);
 f.lines[0].criterion.text=line.criterion.text;f.report.source_hash='different';
 assert.deepEqual(prepareInitialDraft(f).admitted,[]);
 assert.throws(()=>prepareInitialDraft({...f,content_hash:'invalid'}),/versievingerafdruk/);
});

test('editor shares the checked source draft with its admitted rows instead of scanning twice',()=>{
 const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
 assert.match(source,/const \{admitted, draft:sourceDraft\} = useMemo\(\(\)=>prepareInitialDraft\(framework\),\[framework\]\)/);
 assert.doesNotMatch(source,/useMemo\(\(\)=>(?:initialDraft|admittedLines)\(framework\)/);
});

test('source mismatches and HOLD remain excluded by cleanup and export, not admitted by restoration',()=>{
 const f=framework(),value={...draft(f),included:['R1','held']};
 assert.deepEqual(initialDraft(f).included,['R1']);
 const restored=validateDraft(value,f);
 assert.deepEqual(cleanScopeDraft(f,restored).removed,['held']);assert.throws(()=>assertScopeExport(f,restored));
 for(const change of [f=>{f.lines[0].criterion.text='Changed source';},f=>{f.report.source_hash='changed';}]){
  const changed=framework();change(changed);
  assert.deepEqual(initialDraft(changed).included,[]);
  assert.deepEqual(cleanScopeDraft(changed,restored).removed,['R1','held']);
  assert.throws(()=>assertScopeExport(changed,restored));
 }
});

test('baseline, selection, field, branch and question validation still rejects invalid projects',()=>{
 const f=framework(),value=draft(f);
 for(const edits of [{source_hash:'wrong'},{baseline_id:'wrong'},{format:'unknown'},
  {included:['unknown']},{included:['R1','R1']},{title:'x'.repeat(501)},
  {overrides:{R1:{unknown:'No'}}},{notes:{unknown:'No'}},{branchItems:{unknown:[]}},
  {research:{...value.research,links:[{question_id:'q-1',line_id:'unknown'}]}}])
  assert.throws(()=>validateDraft({...value,...edits},f));
 assert.throws(()=>initialDraft({...f,content_hash:'wrong'}),/versievingerafdruk/);
});
