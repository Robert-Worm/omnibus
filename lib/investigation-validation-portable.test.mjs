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
   './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";globalThis.fixtureCioProposals=cioProposals;',
   './cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO evidence");}',
   './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[];export function validateTopicalMaterial(){throw Error("Unexpected topical evidence");}',
   './wwke-law-data.mjs':'export const wwkeMetadata={id:"TESTWWKE"},wwkeProposals=[],wwkeSourceId="TESTWWKE";export function validateWwkeMaterial(){throw Error("Unexpected law evidence");}'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`), import.meta.url);
const {validateInvestigation, emptyInvestigation, investigationFramework, prepareInvestigationFramework, materialLine, materialMatchesLine, materialInterview, NO_APPROVED_QUESTION, foundationProposals, selectedModelMaterials} = await import('./investigation.mjs');
const {scopeDecision,cleanScopeDraft,admittedLines}=await import('./product-scope.mjs');
const {syncModelLibrarySelection,applyModelAdoption}=await import('./model-adoption.mjs');
const material = () => ({id:'WB-1',kind:'criterion',title:'Synthetic norm',body:'Keep source evidence',
  question:'',procedure:'',sourceTitle:'Synthetic report',sourceUrl:'',location:'1',originKey:'test:1',
  rationale:'',edition:'',reportTrace:'verified'});

function modelEditFixture() {
  const model={id:'SYNTHETIC',title:'Synthetic model',version:'1',selected:true,items:[{
    id:'SYN-D',title:'Synthetic dimension',included:true,questions:[
      {id:'SYN-D-Q1',title:'One',question:'How is the work checked?',probes:'Describe one case.',included:true},
      {id:'SYN-D-Q2',title:'Two',question:'Who records the result?',probes:'Show one record.',included:true},
    ],
  }]};
  const reports=Array.from({length:200},(_,i)=>({...material(),id:'WB-'+(i+1),originKey:'report:'+i}));
  const questions=selectedModelMaterials(model).map((m,i)=>({...m,id:'WB-'+(201+i)}));
  const investigation=validateInvestigation({...emptyInvestigation(),materials:[...reports,...questions]});
  const draft={investigation,included:investigation.materials.map(m=>m.id),overrides:{},
    notes:{'WB-201':'Keep my note'},fieldChoices:{'WB-201':{criterion:'user'}},
    research:{questions:[{id:'Q',text:'Own research question'}],links:[{question_id:'Q',line_id:'WB-201'}]}};
  const changed=structuredClone(model);changed.items[0].questions[0].question+=' Explain the decision.';
  return {draft,model,changed};
}

await test('editing a selected model question preserves the other 201 records, links and custom builder wording',()=>{
  const {draft,model,changed}=modelEditFixture();
  draft.overrides['WB-202']={auditQuestion:'My separate builder question'};
  changed.items[0].questions[1].question+=' Who checks that?';
  const before=structuredClone(draft);
  const next=syncModelLibrarySelection(draft,{models:[model]},{models:[changed]});
  assert.deepEqual(draft,before,'No in-place change to saved work or Undo input');
  assert.deepEqual(next.included,draft.included);
  assert.deepEqual(next.research,draft.research);
  assert.deepEqual(next.notes,draft.notes);
  assert.deepEqual(next.fieldChoices,draft.fieldChoices);
  assert.deepEqual(next.overrides,draft.overrides);
  assert.deepEqual(next.investigation.materials.slice(0,200),draft.investigation.materials.slice(0,200));
  assert.deepEqual(next.investigation.materials[201],draft.investigation.materials[201]);
  assert.equal(next.investigation.materials[200].question,changed.items[0].questions[0].question);
  assert.deepEqual(validateInvestigation(next.investigation),next.investigation);
  // Deselecting leaves the evidence and links; reselecting never duplicates it.
  const deselected=structuredClone(changed);deselected.items[0].questions[0].included=false;
  const removed=syncModelLibrarySelection(next,{models:[changed]},{models:[deselected]});
  assert(!removed.included.includes('WB-201'));
  assert.deepEqual(removed.investigation.materials,next.investigation.materials);
  const restored=syncModelLibrarySelection(removed,{models:[deselected]},{models:[changed]});
  assert.equal(restored.included.filter(id=>id==='WB-201').length,1);
  assert.deepEqual(restored.investigation.materials,next.investigation.materials);
});

await test('model edits still reject unrelated corrupt evidence and invalid changed question text',()=>{
  const {draft,model,changed}=modelEditFixture();
  const original=structuredClone(draft);
  draft.investigation.materials[199].reportTrace='tampered';
  draft.included=draft.included.filter(id=>id!=='WB-200');
  assert.throws(()=>syncModelLibrarySelection(draft,{models:[model]},{models:[changed]}),/Invalid report evidence/);
  const bad=structuredClone(changed);bad.items[0].questions[0].question='x'.repeat(10001);
  assert.throws(()=>syncModelLibrarySelection(original,{models:[model]},{models:[bad]}),/bouwsteen/);
  assert.equal(original.investigation.materials[200].question,model.items[0].questions[0].question);
  assert.throws(()=>syncModelLibrarySelection({...original,investigation:{...original.investigation,
    materials:[...original.investigation.materials,original.investigation.materials[0]]}},{models:[model]},{models:[changed]}),/bouwsteen/);
});

await test('explicit model updates retain source checks, stable IDs and non-model overrides',()=>{
  const {draft,changed}=modelEditFixture(),incoming=selectedModelMaterials(changed)[0],id='WB-201';
  draft.overrides[id]={auditQuestion:'Old custom question',owner:'Keep my owner'};
  const row={incoming,candidates:[draft.investigation.materials[200]],identicalId:''};
  const decisions={[incoming.originKey]:{mode:'update',targetId:id}};
  const next=applyModelAdoption(draft,[row],decisions);
  assert.deepEqual(next.overrides[id],{owner:'Keep my owner'});
  assert.deepEqual(next.research,draft.research);
  assert.deepEqual(next.notes,draft.notes);
  assert.deepEqual(next.included,draft.included);
  assert.deepEqual(next.investigation.materials.slice(0,200),draft.investigation.materials.slice(0,200));
  assert.equal(next.investigation.materials[200].id,id);
  assert.equal(next.investigation.materials[200].question,incoming.question);
  assert.throws(()=>applyModelAdoption(draft,[row],{[incoming.originKey]:{mode:'update',targetId:'unknown'}}),/Kies welke/);
  assert.throws(()=>applyModelAdoption(draft,[{...row,incoming:{...incoming,reportTrace:'tampered'}}],decisions),/Invalid report evidence/);
  const bad=structuredClone(draft);bad.investigation.materials[0].reportTrace='tampered';
  assert.throws(()=>applyModelAdoption(bad,[row],decisions),/Invalid report evidence/);
});

await test('one model edit updates multiple untouched copies and retains legacy level identities',()=>{
  const {draft,model,changed}=modelEditFixture();
  draft.investigation.materials.push({...draft.investigation.materials[200],id:'WB-203'});
  draft.included.push('WB-203');
  const next=syncModelLibrarySelection(draft,{models:[model]},{models:[changed]});
  for(const id of ['WB-201','WB-203'])
    assert.equal(next.investigation.materials.find(m=>m.id===id).question,changed.items[0].questions[0].question);
  const explicit=structuredClone(changed);
  for(const q of explicit.items[0].questions){q.selectedLevels=['operational'];q.variants={operational:q.question};}
  const migrated=syncModelLibrarySelection(next,{models:[changed]},{models:[explicit]});
  assert.equal(migrated.investigation.materials.length,203);
  assert.deepEqual(migrated.included,next.included);
  assert.deepEqual(migrated.research,next.research);
  for(const m of migrated.investigation.materials.slice(200)){
    assert.equal(m.interviewLevel,'operational');
    assert(m.originKey.endsWith(':operational'));
  }
  assert.deepEqual(validateInvestigation(migrated.investigation),migrated.investigation);
});

await test('investigation reuses only unchanged evidence and still validates duplicate IDs and outer fields', () => {
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

await test('publishing a catalogue invalidates source checks even for previously normalized materials', async () => {
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

await test('material text rules preserve field order, optional legacy fields and exact length limits', () => {
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

await test('one preparation pass returns the same normalized investigation and framework as the former two-pass path', () => {
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

await test('empty, medium and large investigations retain every material and source value', () => {
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

await test('preparation rejects invalid outer data and duplicates before projecting lines', () => {
  const base={get lines(){throw Error('Projection ran before validation');}};
  for(const investigation of [
    {...emptyInvestigation(),purpose:'x'.repeat(2001)},
    {...emptyInvestigation(),sourceIds:['missing']},
    {...emptyInvestigation(),materials:[material(),material()]},
    {...emptyInvestigation(),materials:[{...material(),reportTrace:'tampered'}]},
  ]) assert.throws(()=>prepareInvestigationFramework(base,{investigation}),/onderzoeksgegevens|bouwsteen|Invalid report evidence/);
});

await test('only generated viewer projections are immutable; owner edits and imported lines use exact comparison', () => {
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

await test('all scalar owner fields and unusual shapes fall back to the established exact comparison', () => {
  const prepared=prepareInvestigationFramework({lines:[]},{investigation:{...emptyInvestigation(),materials:[material()]}});
  const owner=prepared.investigation.materials[0],line=prepared.framework.lines[0];
  const variants=Object.keys(owner).map(key=>({...owner,[key]:'different'}));
  variants.push({...owner,extra:'ignored by projection'},{...owner,get body(){return 'Getter change';}},
    Object.assign(Object.create({}),owner),{...owner,[Symbol('extra')]:'symbol'});
  for(const value of variants)
    assert.equal(materialMatchesLine(value,line),JSON.stringify(materialLine(value))===JSON.stringify(line));
});

await test('batch scope checks preserve live owner edits, first duplicates and unselected links',()=>{
  const input={...emptyInvestigation(),materials:Array.from({length:400},(_,i)=>({...material(),id:'WB-'+(i+1)}))};
  const {framework:f}=prepareInvestigationFramework({lines:[],productScope:'internal-it-1'},{investigation:input});
  Object.defineProperty(f,'reports',{get(){throw Error('Unused report metadata scanned');}});
  const draft={included:f.lines.slice(0,399).map(l=>l.id),research:{links:f.lines.map(l=>({line_id:l.id,question_id:'Q'}))}};
  const compare=()=>{
    const expected=f.lines.filter(l=>scopeDecision(f,l).status==='retain');
    assert.deepEqual(admittedLines(f),expected);
    const allowed=new Set(expected.map(l=>l.id)),cleaned=cleanScopeDraft(f,draft);
    assert.deepEqual(cleaned.removed,draft.included.filter(id=>!allowed.has(id)));
    assert.deepEqual(cleaned.draft.research.links,draft.research.links.filter(l=>allowed.has(l.line_id)));
  };
  compare();assert.equal(cleanScopeDraft(f,draft).draft,draft);
  f.workbenchMaterials.unshift({...f.workbenchMaterials[0],body:'Changed first copy'});
  compare();assert.deepEqual(cleanScopeDraft(f,draft).removed,['WB-1']);
  f.workbenchMaterials.shift();f.workbenchMaterials[399].body='Changed unselected linked owner';
  compare();assert.equal(cleanScopeDraft(f,draft).draft.research.links.length,399);
  f.workbenchMaterials[399]={...f.workbenchMaterials[399],body:material().body};compare();
  assert.equal(cleanScopeDraft(f,draft).draft,draft);
  f.workbenchMaterials=f.workbenchMaterials.filter(m=>m.id!=='WB-1');compare();
  f.lines[1]={...f.lines[1],displayOnly:true};compare();
  f.lines[2]=structuredClone(f.lines[2]);f.lines[2].criterion.text='Changed projection';compare();
  assert.deepEqual(cleanScopeDraft(f,draft).removed,['WB-1','WB-2','WB-3']);
});

await test('a later 200-norm source inherits preparation, full selection, links and catalogue invalidation', async () => {
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

await test('editor uses the combined validation result without repeating its material pass', () => {
  const source=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
  const commit=source.slice(source.indexOf('const commit = useCallback('),source.indexOf('}, []);',source.indexOf('const commit = useCallback(')));
  assert.match(commit,/const prepared=prepareInvestigationFramework\(baseFramework,next\)/);
  assert.match(commit,/projectContentEqual\(validated,draftRef\.current\.investigation\)/);
  assert.match(commit,/cleanScopeDraft\(prepared\.framework, next\)/);
  assert.doesNotMatch(commit,/validateInvestigation\(|[^A-Za-z]investigationFramework\(/);
});

await test('editor hands checked rows to rendering atomically and discards them on restore or publication', () => {
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

await test('liever geen vraag dan een slechte vraag: Omnibus bedenkt geen interviewvraag voor een toetspunt', () => {
  const punt = {...material(), question: ''};
  assert.equal(materialInterview(punt), NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...punt, question: 'Vraag nog uit te werken'}), NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...punt, question: 'Hoe houdt u zicht op de uitvoering?'}), 'Hoe houdt u zicht op de uitvoering?');
  // Eigen tekst van de gebruiker gaat altijd voor, ook in bestaande projecten.
  assert.equal(materialInterview(punt, null, 'Mijn eigen vraag?'), 'Mijn eigen vraag?');
  assert.doesNotMatch(materialInterview(punt), /toetspunt ‘|Wat is uw eigen rol/);
});

await test('interview export rejects the fixed bad set and HOLD at every audience, without rewriting the project', () => {
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

await test('rejected audience text does not fall back to a different audience, and own overrides/additions stay exact', () => {
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

await test('legacy saved model wording remains literal because its author provenance is absent', () => {
  const point={...material(),kind:'model-question',question:'Mijn eigen tekst zonder vraagteken',questionOperational:'Mijn eigen tekst zonder vraagteken'};
  const reopened=validateInvestigation(JSON.parse(JSON.stringify({...emptyInvestigation(),materials:[point]}))).materials[0];
  assert.equal(materialInterview(reopened),point.question);
  assert.equal(materialInterview({...reopened,question:''}),NO_APPROVED_QUESTION);
  assert.equal(materialInterview({...reopened,questionOperational:''},{levels:['operational']},''),'Operationeel\n');
  assert.doesNotThrow(()=>materialInterview({...reopened,questionOperational:''},{levels:['operational']},undefined,undefined,{excludeQuestion:true}));
  assert.throws(()=>materialInterview({...reopened,questionOperational:''},{levels:['operational']}),/ontbreekt een formulering/);
});

await test('saved catalogue defaults are checked but in-place user text and unavailable-source snapshots survive', async () => {
  const source={originKey:'synthetic-question-source',question:'Hoe goed werkt het?',questionManagement:'De rol van het team'};
  const originals=globalThis.fixtureCioProposals;
  registerCatalogueResource('question-defaults',async()=>source,value=>{
    originals.push(value);return ()=>originals.splice(originals.indexOf(value),1);
  });
  await ensureCatalogue(['question-defaults']);
  try {
    const point={...material(),...source};
    assert.equal(materialInterview(point),NO_APPROVED_QUESTION);
    assert.ok(materialInterview(point,{levels:['management']}).includes(NO_APPROVED_QUESTION));
    const own='Eigen tekst zonder vraagteken 🧭';
    assert.equal(materialInterview({...point,question:own}),own);
    assert.equal(materialInterview({...point,questionManagement:own},{levels:['management']}),'Management\n'+own);
    assert.equal(materialInterview({...point,originKey:'unavailable-source',question:own}),own);
    assert.equal(materialInterview({...point,originKey:'',question:own}),own);
  } finally {
    registerCatalogueResource('question-defaults-cleanup',async()=>null,()=>{originals.splice(originals.indexOf(source),1);});
    await ensureCatalogue(['question-defaults-cleanup']);
  }
});

await test('interview lookup avoids per-material catalogue scans and refreshes on correction and rollback', async () => {
  const originals=globalThis.fixtureCioProposals,before=[...originals];let originReads=0;
  const sources=Array.from({length:250},(_,i)=>({
    get originKey(){originReads++;return 'question-lookup:'+i;},
    question:'Hoe goed werkt het?',questionManagement:'Hoe goed stuurt u het team?',
  }));
  const points=sources.map((source,i)=>({...material(),...source,id:'lookup-'+i}));
  const duplicate={originKey:points[249].originKey,question:'Andere catalogustekst zonder vraagteken'};
  registerCatalogueResource('question-lookup',async()=>sources,value=>{
    originals.push(...value,duplicate);return ()=>originals.splice(0,originals.length,...before);
  });
  await ensureCatalogue(['question-lookup']);
  try {
    assert.ok(originReads>0,'The index was built when the catalogue loaded');
    assert.equal(foundationProposals.filter(p=>p.originKey===points[249].originKey).length,2);
    originReads=0;
    for(const point of points) {
      assert.equal(materialInterview(point),NO_APPROVED_QUESTION);
      assert.equal(materialInterview(point,{levels:['management']}),'Management\n'+NO_APPROVED_QUESTION);
    }
    assert.equal(materialInterview({...points[249],question:duplicate.question}),duplicate.question,'First duplicate wins, as with the former find');
    assert.equal(originReads,0,'Rendering does not scan the source records again');
    const point=points[249],own=point.question+' ';
    assert.equal(materialInterview({...point,question:own}),own,'Whitespace is an exact user edit, not a normalized source match');
    const corrected={...sources[249],question:'Hoe goed verloopt het werk?',questionManagement:'Hoe goed bewaakt u het werk?'};
    const index=originals.indexOf(sources[249]);
    registerCatalogueResource('question-lookup-correction',async()=>corrected,value=>{
      const previous=originals[index];originals[index]=value;return ()=>{originals[index]=previous;};
    });
    await ensureCatalogue(['question-lookup-correction']);
    assert.equal(materialInterview(point),point.question,'An old snapshot is no longer an exact default');
    assert.equal(materialInterview(point,{levels:['management']}),'Management\n'+point.questionManagement);
    const updated={...point,...corrected};
    assert.equal(materialInterview(updated),NO_APPROVED_QUESTION);
    assert.equal(materialInterview(updated,{levels:['management']}),'Management\n'+NO_APPROVED_QUESTION);
    assert.equal(materialInterview({...updated,question:own}),own);
    registerCatalogueResource('question-lookup-failed',async()=>null,()=>{
      const previous=originals[index];originals[index]=sources[249];return ()=>{originals[index]=previous;};
    });
    let fail=true;const stop=onCatalogueChange(()=>{if(fail){fail=false;throw Error('Question publication failed');}});
    try {await assert.rejects(ensureCatalogue(['question-lookup-failed']),/Question publication failed/);}
    finally {stop();}
    assert.equal(materialInterview(point),point.question,'Rollback restores the corrected source lookup');
    assert.equal(materialInterview(updated),NO_APPROVED_QUESTION);
    assert.equal(materialInterview(updated,{levels:['management']}),'Management\n'+NO_APPROVED_QUESTION);
  } finally {
    registerCatalogueResource('question-lookup-cleanup',async()=>null,()=>{originals.splice(0,originals.length,...before);});
    await ensureCatalogue(['question-lookup-cleanup']);
  }
});
