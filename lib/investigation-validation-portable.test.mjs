import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {registerCatalogueResource, ensureCatalogue, onCatalogueChange} from './catalogue-runtime.mjs';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';

// Exercise the real investigation boundary with a small synthetic catalogue.
// Source validators have their own tests; this checks when they are called.
register('data:text/javascript,' + encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(context.parentURL?.endsWith('/product-scope.mjs')) {
   if(specifier.endsWith('.json'))return {url:'data:application/json,%7B%7D',shortCircuit:true};
   const fixtures={
    './reviewed-reports.mjs':'export const reviewedScopeSnapshots={},reviewedScopeDecisions={};',
    './report-quality-revisions.mjs':'export const revisedReportLine=l=>l;'
   };
   if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  }
  if(!context.parentURL?.endsWith('/investigation.mjs'))return next(specifier,context);
  const fixtures={
   './interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[{id:"operational",label:"Operationeel"},{id:"management",label:"Management"},{id:"strategic",label:"Strategisch"}];',
   './report-point-source.mjs':'export function validateReportTrace(m){globalThis.fixtureTraceChecks=(globalThis.fixtureTraceChecks||0)+1;if(m.reportTrace!=="verified")throw Error("Invalid report evidence");}',
   './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata=[];globalThis.fixtureFoundationItems=importedFoundationItems;',
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
const {validateInvestigation, emptyInvestigation, investigationFramework, prepareInvestigationFramework, materialLine, materialMatchesLine, materialInterview, NO_APPROVED_QUESTION, foundationProposals} = await import('./investigation.mjs');
const {scopeDecision,cleanScopeDraft,admittedLines}=await import('./product-scope.mjs');
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

test('material text rules preserve field order, optional legacy fields and exact length limits', () => {
  const validate=m=>validateInvestigation({...emptyInvestigation(),materials:[m]}).materials[0];
  const original=material();delete original.reportTrace;
  const baseKeys=Object.keys(original);
  const required=['questionOperational','questionManagement','questionStrategic','interviewLevel',
    'documents','observation','risk','control','foundationId','sourceControlId','sourceHash','sourceAccess',
    'sourceContext','sourceText','sourceAssessment','sourceMappings','sourceMaturity','sourceLicense',
    'sourceChanges','sourceMethodology','reviewStatus','effectiveStatus','effectiveFrom','statusAsOf',
    'statusNote','statusSource','sourceDocumentHashes','topic','testDesign','testExistence','testOperation'];
  const optional=['objective','controlObjective','controlObjectiveId','controlObjectiveTitle','parentCriterion',
    'sourcePointId','originalLineId','wordingMode','cioTrace','lawTrace','reportTrace','topicalTrace'];
  assert.deepEqual(Object.keys(validate(original)),[...baseKeys,...required]);
  const allEmpty=Object.fromEntries([...required,...optional].map(key=>[key,'']));
  assert.deepEqual(validate({...original,...allEmpty}),{...original,...allEmpty});
  assert.equal(JSON.stringify(validate({...original,...allEmpty})),JSON.stringify({...original,...allEmpty}));
  const specialized=new Set(['interviewLevel','effectiveStatus','sourceDocumentHashes','cioTrace','lawTrace','reportTrace','topicalTrace']);
  for(const key of [...required,...optional].filter(k=>!specialized.has(k))) {
    const limit=['sourceText','sourceContext'].includes(key)?100000:10000;
    const input={...original,[key]:'x'.repeat(limit)};
    assert.equal(validate(input)[key],input[key]);
    assert.throws(()=>validate({...input,[key]:input[key]+'x'}),/modelvraag/);
    // Some identity fields are rejected by their source-specific guard first.
    for(const value of [null,1,{},[]])assert.throws(()=>validate({...original,[key]:value}));
  }
  assert.throws(()=>validate({...original,reportTrace:'x'.repeat(700001)}),/modelvraag/);
  assert.throws(()=>validate({...original,cioTrace:'x'.repeat(300001)}),/modelvraag/);
  assert.throws(()=>validate({...original,reportTrace:'wrong'}),/Invalid report evidence/);
  assert.throws(()=>validate({...original,lawTrace:'wrong'}),/Unexpected law evidence/);
  assert.throws(()=>validate({...original,topicalTrace:'wrong'}),/Unexpected topical evidence/);
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

test('only generated viewer projections are immutable; owner edits and imported lines use exact comparison', () => {
  const input={...emptyInvestigation(),materials:[{...material(),risk:'Risk',control:'Control',
    controlObjective:'Objective',controlObjectiveId:'goal',sourcePointId:'point',parentCriterion:'Parent'}]};
  const prepared=prepareInvestigationFramework({lines:[],productScope:'internal-it-1'},{investigation:input});
  const owner=prepared.investigation.materials[0],line=prepared.framework.lines[0];
  assert.equal(materialMatchesLine(owner,line),true);
  assert.deepEqual(line,materialLine(owner));
  assert.equal(Object.isFrozen(owner),false);
  for(const change of [l=>{l.title='changed';},l=>{l.criterion.text='changed';},
    l=>{l.controlStatus.design.value='changed';},l=>{l.relationships.push({});},
    l=>{l.collectionGroup.title='changed';},l=>{l.risk.evidence_ids.push('invented');}]) {
    assert.throws(()=>change(line),TypeError);
    const copy=structuredClone(line);change(copy);
    assert.equal(materialMatchesLine(owner,copy),false);
  }
  assert.equal(materialMatchesLine(owner,structuredClone(line)),true);
  const stringify=JSON.stringify;let serializations=0;
  try {
    JSON.stringify=(...args)=>{serializations++;return stringify(...args);};
    assert.equal(materialMatchesLine(owner,line),true);
    assert.equal(serializations,0);
    assert.equal(materialMatchesLine(owner,structuredClone(line)),true);
    assert.equal(serializations,2);
  } finally {JSON.stringify=stringify;}
  // Mutating an owner is supported, but cannot retain an old projection.
  owner.body='Eigen formulering 🧭';
  assert.equal(scopeDecision(prepared.framework,line).status,'hold');
  const next=prepareInvestigationFramework({lines:[],productScope:'internal-it-1'},{investigation:prepared.investigation});
  assert.equal(next.framework.lines[0].criterion.text,owner.body);
  assert.equal(scopeDecision(next.framework,next.framework.lines[0]).status,'retain');
  assert.equal(input.materials[0].body,'Keep source evidence');
  assert.equal(Object.isFrozen(materialLine(owner)),false);
  assert.equal(materialMatchesLine({...owner,title:'different'},next.framework.lines[0]),false);
});

test('all scalar owner fields and unusual shapes fall back to the established exact comparison', () => {
  const prepared=prepareInvestigationFramework({lines:[]},{investigation:{...emptyInvestigation(),materials:[material()]}});
  const owner=prepared.investigation.materials[0],line=prepared.framework.lines[0];
  const variants=Object.keys(owner).map(key=>({...owner,[key]:'different'}));
  variants.push({...owner,extra:'ignored by projection'},{...owner,get body(){return 'Getter change';}},
    Object.assign(Object.create({}),owner),{...owner,[Symbol('extra')]:'symbol'});
  for(const value of variants)
    assert.equal(materialMatchesLine(value,line),JSON.stringify(materialLine(value))===JSON.stringify(line));
});

test('a later 200-norm source inherits preparation, full selection, links and catalogue invalidation', async () => {
  const items=Array.from({length:200},(_,i)=>({...material(),id:'WB-'+(i+1),title:'Nieuwe norm '+i,
    originKey:'FUTURE:'+i,foundationId:'FUTURE',body:'Exacte passage 🧭 '+i}));
  const originals=items.map(m=>({...m,sourceId:'FUTURE',groupId:'new',groupTitle:'Nieuw kader'}));
  registerCatalogueResource('future-source',async()=>originals,value=>{
    globalThis.fixtureFoundationItems.push(...value);
    return ()=>globalThis.fixtureFoundationItems.splice(0);
  });
  const before=prepareInvestigationFramework({lines:[],productScope:'internal-it-1'},{investigation:{...emptyInvestigation(),materials:items}});
  await ensureCatalogue(['future-source']);
  assert.equal(materialMatchesLine(before.investigation.materials[199],before.framework.lines[199]),false);
  const prepared=prepareInvestigationFramework({lines:[],productScope:'internal-it-1'},{investigation:before.investigation});
  assert.equal(prepared.framework.lines[199].collectionGroup.title,'Nieuw kader');
  const draft={included:items.map(m=>m.id),research:{links:items.map(m=>({line_id:m.id,question_id:'q'}))}};
  assert.equal(admittedLines(prepared.framework).length,200);
  assert.equal(cleanScopeDraft(prepared.framework,draft).draft,draft);
  assert.deepEqual(investigationFramework({lines:[]},{investigation:JSON.parse(JSON.stringify(prepared.investigation))}).lines,prepared.framework.lines);
  const tampered=structuredClone(prepared.framework);tampered.lines[199].criterion.text='Other source';
  const cleaned=cleanScopeDraft(tampered,draft);
  assert.deepEqual(cleaned.removed,['WB-200']);assert.equal(cleaned.draft.research.links.length,199);
  // A corrected origin replaces the index entry; it must not retain stale text.
  registerCatalogueResource('future-correction',async()=>null,()=>{
    const previous=globalThis.fixtureFoundationItems[199];
    globalThis.fixtureFoundationItems[199]={...previous,groupTitle:'Bijgewerkt kader'};
    return ()=>{globalThis.fixtureFoundationItems[199]=previous;};
  });
  await ensureCatalogue(['future-correction']);
  assert.equal(materialMatchesLine(prepared.investigation.materials[199],prepared.framework.lines[199]),false);
  const updated=prepareInvestigationFramework({lines:[]},{investigation:prepared.investigation});
  assert.equal(updated.framework.lines[199].collectionGroup.title,'Bijgewerkt kader');
  assert.equal(materialMatchesLine(updated.investigation.materials[199],updated.framework.lines[199]),true);
  registerCatalogueResource('future-failed-publication',async()=>null,()=>{
    const previous=globalThis.fixtureFoundationItems[199];
    globalThis.fixtureFoundationItems[199]={...previous,groupTitle:'Niet gepubliceerd'};
    return ()=>{globalThis.fixtureFoundationItems[199]=previous;};
  });
  let fail=true;const stop=onCatalogueChange(()=>{if(fail){fail=false;throw Error('Publication failed');}});
  try {await assert.rejects(ensureCatalogue(['future-failed-publication']),/Publication failed/);}
  finally {stop();}
  assert.equal(materialLine(updated.investigation.materials[199]).collectionGroup.title,'Bijgewerkt kader');
  assert.equal(materialMatchesLine(updated.investigation.materials[199],updated.framework.lines[199]),true);
  updated.investigation.materials[199].reportTrace='tampered';
  assert.throws(()=>prepareInvestigationFramework({lines:[]},{investigation:updated.investigation}),/Invalid report evidence/);
});

test('editor uses the combined validation result without repeating its material pass', () => {
  const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
  const commit=source.slice(source.indexOf('const commit = useCallback('),source.indexOf('}, []);',source.indexOf('const commit = useCallback(')));
  assert.match(commit,/const prepared=prepareInvestigationFramework\(baseFramework,next\)/);
  assert.match(commit,/projectContentEqual\(validated,draftRef\.current\.investigation\)/);
  assert.match(commit,/cleanScopeDraft\(prepared\.framework, next\)/);
  assert.doesNotMatch(commit,/validateInvestigation\(|[^A-Za-z]investigationFramework\(/);
});

test('editor hands checked rows to rendering atomically and discards them on restore or publication', () => {
  const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
  assert.match(source,/const \{draft,prepared:preparedView\} = draftState/);
  assert.match(source,/preparedView\?\.base===catalogueSnapshot\.framework && preparedView\.revision===catalogueSnapshot\.revision\s*\? preparedView\.framework\s*: investigationFramework\(catalogueSnapshot\.framework, \{ investigation \}\)/);
  assert.match(source,/\[investigation,catalogueSnapshot,preparedView\]/);
  assert.match(source,/setDraftState\(\{draft:project\.draft\}\)/);
  const commit=source.slice(source.indexOf('const commit = useCallback('),source.indexOf('}, []);',source.indexOf('const commit = useCallback(')));
  assert.ok(commit.indexOf('cleanScopeDraft(')<commit.indexOf('setDraftState('));
  assert.match(commit,/const view=\{base:baseFramework,revision:catalogueRevision\(\),framework:prepared\.framework as Framework\}/);
  assert.match(commit,/setDraftState\(previous=>\(\{draft:next,/);
  assert.match(commit,/previous\.draft\.investigation===next\.investigation &&\s*previous\.prepared\?\.base===view\.base && previous\.prepared\.revision===view\.revision\s*\? previous\.prepared : view/);
  assert.match(commit,/projectRef\.current=\{\.\.\.projectRef\.current,draft:next\}/);
  assert.doesNotMatch(source,/setDraft\(/);
});

test('liever geen vraag dan een slechte vraag: Omnibus bedenkt geen interviewvraag voor een toetspunt', () => {
  const punt = {...material(), question: ''};
  assert.equal(materialInterview(punt), NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...punt, question: 'Vraag nog uit te werken'}), NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...punt, question: 'Hoe houdt u zicht op de uitvoering?'}), 'Hoe houdt u zicht op de uitvoering?');
  // Eigen tekst van de gebruiker gaat altijd voor, ook in bestaande projecten.
  assert.equal(materialInterview(punt, null, 'Mijn eigen vraag?'), 'Mijn eigen vraag?');
  assert.doesNotMatch(materialInterview(punt), /toetspunt ‘|Wat is uw eigen rol/);
});

test('interview export rejects the fixed bad set and HOLD at every audience, without rewriting the project', () => {
  for (const question of [...SLECHTE_VRAGEN.map(([,text])=>text), 'Welke stappen zet u, bijvoorbeeld bij een melding?']) {
    const point={...material(),id:undefined,question,questionOperational:question,questionManagement:question,questionStrategic:question};
    const before=structuredClone(point);
    assert.equal(materialInterview(point),NO_APPROVED_QUESTION,question);
    for(const level of ['operational','management','strategic']) {
      const output=materialInterview(point,{levels:[level]});
      assert.ok(output.includes(NO_APPROVED_QUESTION),question);
    }
    assert.deepEqual(point,before);
  }
});

test('rejected audience text does not fall back to a different audience, and own overrides/additions stay exact', () => {
  const point={...material(),id:undefined,question:'Hoe verloopt uw werk?',questionManagement:'Hoe goed stuurt u het team?',procedure:'Controleer een dossier.'};
  const settings={levels:['management']};
  const output=materialInterview(point,settings);
  assert.ok(output.includes(NO_APPROVED_QUESTION));
  assert.ok(!output.includes(point.question));
  assert.ok(output.includes(point.procedure));
  for(const question of ['',...SLECHTE_VRAGEN.map(([,text])=>text),'Eigen tekst 🧭\nmet opmaak']) {
    assert.equal(materialInterview(point,null,question,''),question);
    assert.equal(materialInterview(point,settings,question,''),'Management\n'+question);
    assert.ok(materialInterview(point,settings,question,'',{questions:'Eigen aanvulling 🧭'}).includes('Eigen aanvulling 🧭'));
  }
});

test('legacy saved model wording remains literal because its author provenance is absent', () => {
  const point={...material(),kind:'model-question',question:'Mijn eigen tekst zonder vraagteken',questionOperational:'Mijn eigen tekst zonder vraagteken'};
  const reopened=validateInvestigation(JSON.parse(JSON.stringify({...emptyInvestigation(),materials:[point]}))).materials[0];
  assert.equal(materialInterview(reopened),point.question);
  assert.equal(materialInterview({...reopened,question:''}),NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...reopened,questionOperational:''},{levels:['operational']},''),'Operationeel\n');
  assert.doesNotThrow(()=>materialInterview({...reopened,questionOperational:''},{levels:['operational']},undefined,undefined,{excludeQuestion:true}));
  assert.throws(()=>materialInterview({...reopened,questionOperational:''},{levels:['operational']}),/ontbreekt een formulering/);
});

test('saved catalogue defaults are checked but in-place user text and unavailable-source snapshots survive', () => {
  const source={originKey:'synthetic-question-source',question:'Hoe goed werkt het?',questionManagement:'De rol van het team'};
  foundationProposals.push(source);
  try {
    const point={...material(),...source};
    assert.equal(materialInterview(point),NO_APPROVED_QUESTION);
    assert.ok(materialInterview(point,{levels:['management']}).includes(NO_APPROVED_QUESTION));
    const own='Eigen tekst zonder vraagteken 🧭';
    assert.equal(materialInterview({...point,question:own}),own);
    assert.equal(materialInterview({...point,questionManagement:own},{levels:['management']}),'Management\n'+own);
    assert.equal(materialInterview({...point,originKey:'unavailable-source',question:own}),own);
    assert.equal(materialInterview({...point,originKey:'',question:own}),own);
  } finally {foundationProposals.splice(foundationProposals.indexOf(source),1);}
});
