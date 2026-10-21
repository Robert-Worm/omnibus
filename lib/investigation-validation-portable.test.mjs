import test from 'node:test';
import assert from 'node:assert/strict';
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
const {validateInvestigation, emptyInvestigation} = await import('./investigation.mjs');
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
