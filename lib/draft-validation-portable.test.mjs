import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';

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
const {emptyDraft,initialDraft,prepareInitialDraft,validateDraft,draftValue,isEdited,updateValue}=await import('./framework-model.mjs');
const {fieldIncluded}=await import('./research-plan.mjs');
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

test('overview display needs no full-source selection and retains the same original field values',()=>{
 const f=framework(),full=initialDraft(f);let inspected=0;
 for(let i=0;i<5000;i++)f.lines.push({id:'future-'+i,get displayOnly(){inspected++;return false;}});
 const display=emptyDraft(f);
 assert.equal(inspected,0);
 assert.deepEqual(display,{...full,included:[]});
 for(const value of [f.lines[0],{...f.lines[0],displayOnly:true}]) {
  assert.equal(draftValue(value,'criterion',display),draftValue(value,'criterion',full));
  assert.equal(isEdited(value,'criterion',display),isEdited(value,'criterion',full));
  assert.equal(fieldIncluded(display,value.id,'criterion'),fieldIncluded(full,value.id,'criterion'));
 }
 assert.deepEqual(initialDraft(f).included,['R1']);assert.equal(inspected,5000);
 // Empty presentation state cannot admit an overview, altered text or a HOLD.
 for(const changed of [{...line,displayOnly:true},{...line,title:'Altered'}, {id:'held'}]) {
  const changedFramework={...f,lines:[changed]},selected={...display,included:[changed.id]};
  assert.deepEqual(cleanScopeDraft(changedFramework,selected).removed,[changed.id]);
  assert.throws(()=>assertScopeExport(changedFramework,selected));
 }
 display.overrides.R1={criterion:'Not shared'};display.included.push('held');
 assert.deepEqual(emptyDraft(f).overrides,{});assert.deepEqual(emptyDraft(f).included,[]);
 assert.throws(()=>emptyDraft({...f,content_hash:'invalid'}),/versievingerafdruk/);
});

test('editor skips the unused all-source selection only for non-editable overview rows',()=>{
 const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
 assert.match(source,/const display=\{admitted:\[\], draft:emptyDraft\(framework\)\}/);
 assert.match(source,/return \{display, checked:\(\)=>checked\?\?=prepareInitialDraft\(framework\)\};\s*\},\[framework\]\)/);
 assert.match(source,/overview && !editable \? sourceViews.display : sourceViews.checked\(\)/);
 assert.match(source,/const browseSourceLines = overview\?\.lines \?\? admitted/);
 assert.match(source,/const viewDraft = editable \? draft : sourceDraft/);
 assert.match(source,/withContent\(keys,\(\)=>commit\(selectReportRows\(draftRef.current,reportPointCatalogue,ids,selected\)/);
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

test('source question presentation shares the form gate, including extra source fields, without changing saved questions',()=>{
 const f=framework(),value=draft(f),before=structuredClone(value);
 for(const [,text] of SLECHTE_VRAGEN){
  const item={...line,auditQuestion:{text},sourceItems:[{id:'source-question-2',kind:'auditQuestion',text}]};
  for(const key of ['auditQuestion','source-question-2']){
   assert.equal(draftValue(item,key,value),questionCandidate(text,'toetsvraag'));
   for(const own of ['',text,'Eigen formulering 🧭']) {
    const edited={...value,overrides:{R1:{[key]:own}}};
    assert.equal(draftValue(item,key,edited),own);
   }
   assert.equal(draftValue({...item,source_id:'R1'},key,value),text,'Saved material text remains literal');
   const explicitlyChosen=updateValue(value,item,key,text);
   assert.equal(draftValue(item,key,explicitlyChosen),text,'An explicitly retyped source question stays the user choice');
   if(text && !questionCandidate(text,'toetsvraag'))assert.equal(isEdited(item,key,explicitlyChosen),true);
  }
 }
 assert.deepEqual(value,before);
 assert.deepEqual(validateDraft(JSON.parse(JSON.stringify(value)),f).research,value.research);
});
