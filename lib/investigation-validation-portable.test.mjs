import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {registerCatalogueResource, ensureCatalogue} from './catalogue-runtime.mjs';

// Exercise the real investigation boundary with a small synthetic catalogue.
// Source validators have their own tests; this checks when they are called.
register('data:text/javascript,' + encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/investigation.mjs'))return next(specifier,context);
  const fixtures={
   './interview-structure.mjs':'export const starrPrompts=()=>{},modelStarrPrompts=()=>{},interviewLevels=[];',
   './point-interview.mjs':'export const pointInterviewVariants=()=>{},pointLevelProbe=()=>{};',
   './report-point-source.mjs':'export function validateReportTrace(m){globalThis.fixtureTraceChecks=(globalThis.fixtureTraceChecks||0)+1;if(m.reportTrace!=="verified")throw Error("Invalid report evidence");}',
   './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata=[];',
   './process-catalogue.mjs':'export const processes=[];',
   './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
   './cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO evidence");}',
   './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[];export function validateTopicalMaterial(){throw Error("Unexpected topical evidence");}',
   './wwke-law-data.mjs':'export const wwkeMetadata={id:"TESTWWKE"},wwkeProposals=[],wwkeSourceId="TESTWWKE";export function validateWwkeMaterial(){throw Error("Unexpected law evidence");}'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`), import.meta.url);
const {validateInvestigation, emptyInvestigation, investigationFramework, prepareInvestigationFramework} = await import('./investigation.mjs');
const material = () => ({id:'WB-1',kind:'criterion',title:'Synthetic norm',body:'Keep source evidence',
  question:'',procedure:'',sourceTitle:'Synthetic report',sourceUrl:'',location:'1',originKey:'test:1',
  rationale:'',edition:'',reportTrace:'verified'});

test('investigation reuses only unchanged evidence and still validates duplicate IDs and outer fields', () => {
  globalThis.fixtureTraceChecks=0;
  const original={...emptyInvestigation(),materials:[material()]};
  const clean=validateInvestigation(original);
  assert.deepEqual(validateInvestigation(clean),clean);
  assert.equal(globalThis.fixtureTraceChecks,1);
  assert.throws(()=>validateInvestigation({...clean,materials:[clean.materials[0],clean.materials[0]]}),/bouwsteen/);
  assert.throws(()=>validateInvestigation({...clean,purpose:'x'.repeat(2001)}),/onderzoeksgegevens/);
  assert.throws(()=>validateInvestigation({...clean,sourceIds:['unknown']}),/onderzoeksgegevens/);
  clean.materials[0].reportTrace='tampered';
  assert.throws(()=>validateInvestigation(clean),/Invalid report evidence/);
  assert.equal(validateInvestigation(original).materials[0].reportTrace,'verified');
});

test('publishing a catalogue invalidates source checks even for previously normalized materials', async () => {
  globalThis.fixtureTraceChecks=0;
  const clean=validateInvestigation({...emptyInvestigation(),materials:[material()]});
  validateInvestigation(clean);
  assert.equal(globalThis.fixtureTraceChecks,1);
  registerCatalogueResource('validation-fixture',async()=>({}),()=>{});
  await ensureCatalogue(['validation-fixture']);
  assert.deepEqual(validateInvestigation(clean),clean);
  assert.equal(globalThis.fixtureTraceChecks,2);
  clean.materials[0].title='';
  assert.throws(()=>validateInvestigation(clean),/bouwsteen/);
});

test('one preparation pass returns the same normalized investigation and framework as the former two-pass path', () => {
  const base={lines:[{id:'source'},{id:'stale',source_id:'old'}],report:{id:'synthetic'}};
  const input={...emptyInvestigation(),sourceIds:['AVG','AVG'],materials:[material(),{...material(),id:'WB-2',body:'Eigen formulering 🧭'}]};
  const before=structuredClone(input), validated=validateInvestigation(input);
  const expected=investigationFramework(base,{investigation:validated});
  const prepared=prepareInvestigationFramework(base,{investigation:input});
  assert.deepEqual(prepared.investigation,validated);
  assert.deepEqual(prepared.framework,expected);
  assert.equal(prepared.framework.workbenchMaterials,prepared.investigation.materials);
  assert.deepEqual(prepared.framework.lines.map(l=>l.id),['source','WB-1','WB-2']);
  assert.deepEqual(input,before);
  // Every invocation must still enter validation, even with a prior result.
  prepared.investigation.materials[0].reportTrace='tampered';
  assert.throws(()=>prepareInvestigationFramework(base,{investigation:prepared.investigation}),/Invalid report evidence/);
  assert.deepEqual(prepareInvestigationFramework(base,{investigation:input}).framework,expected);
});

test('empty, medium and large investigations retain every material and source value', () => {
  const base={lines:[{id:'source'}]};
  for(const count of [0,50,400]) {
    const input={...emptyInvestigation(),materials:Array.from({length:count},(_,i)=>({
      ...material(),id:'WB-'+(i+1),title:'Norm '+i,body:'Exacte eigen tekst 🧭 '+i,
    }))};
    const prepared=prepareInvestigationFramework(base,{investigation:input});
    assert.deepEqual(prepared.investigation,validateInvestigation(input));
    assert.deepEqual(prepared.framework,investigationFramework(base,{investigation:prepared.investigation}));
    assert.equal(prepared.framework.sources.length,count);
    assert.equal(prepared.framework.lines.length,count+1);
    assert.deepEqual(prepareInvestigationFramework(prepared.framework,{investigation:input}).framework,prepared.framework);
  }
});

test('preparation rejects invalid outer data and duplicates before projecting lines', () => {
  const base={get lines(){throw Error('Projection ran before validation');}};
  for(const investigation of [
    {...emptyInvestigation(),purpose:'x'.repeat(2001)},
    {...emptyInvestigation(),sourceIds:['missing']},
    {...emptyInvestigation(),materials:[material(),material()]},
    {...emptyInvestigation(),materials:[{...material(),reportTrace:'tampered'}]},
  ]) assert.throws(()=>prepareInvestigationFramework(base,{investigation}),/onderzoeksgegevens|bouwsteen|Invalid report evidence/);
});

test('editor uses the combined validation result without repeating its material pass', () => {
  const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
  const commit=source.slice(source.indexOf('const commit = useCallback('),source.indexOf('}, []);',source.indexOf('const commit = useCallback(')));
  assert.match(commit,/const prepared=prepareInvestigationFramework\(baseFramework,next\)/);
  assert.match(commit,/projectContentEqual\(validated,draftRef\.current\.investigation\)/);
  assert.match(commit,/cleanScopeDraft\(prepared\.framework, next\)/);
  assert.doesNotMatch(commit,/validateInvestigation\(|[^A-Za-z]investigationFramework\(/);
});
