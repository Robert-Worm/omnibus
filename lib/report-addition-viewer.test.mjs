import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reportPointLookup} from './report-point-lookup.mjs';

// Execute the real adapters against synthetic data, replacing imports only.
// No private report package or database is needed by this contract test.
async function loadAdapter(file, imports) {
  let source = readFileSync(new URL(file, import.meta.url), 'utf8');
  for (const [declaration, replacement] of imports) {
    assert.equal(source.split(declaration).length, 2, 'Expected import: '+declaration);
    source = source.replace(declaration, replacement);
  }
  assert(!/^import /m.test(source), 'Every dependency must be explicit');
  return import('data:text/javascript,'+encodeURIComponent(source));
}

function pointFixture(reportId) {
  const id=reportId+'-N1/TP01';
  const absent={status:'NOT_SELECTED'};
  const source={id:'M1',evidence_id:'E1',quote:'Parent passage',page:1};
  const point={id,legacy_line_id:reportId+'-N1',report_id:reportId,title:'Synthetic point',text:'Synthetic norm',
    source_links:[{material_id:'M1',evidence_id:'E1'}],context_source_links:[],variant_available:false,
    source_context:{report:'Historical report',local:'Historical report'},
    phases:{opzet:absent,bestaan:absent,werking:absent,onderzoek:{status:'APPLICABLE',procedure:'Inspect',evidence:'',boundary:'Proposal'}}};
  const trace={version:1,point_id:id,report_id:reportId,
    relations:[{evidence_id:'E1',quote:'Exact point passage',page:2}],
    questions:[{text:'Synthetic question?'}],limitations:['Historical scope'],visuals:[]};
  const catalogue={fingerprint:'synthetic',points:[point],sources:[source],
    blocks:[{id:point.legacy_line_id,line:{risk:{text:'Risk'},control:{text:'Control'}},criterion:{text:'Parent norm'}}],
    reports:[{id:reportId,title:'Synthetic report',year:2025,source_hash:'synthetic'}]};
  return {id,trace,catalogue};
}

async function materialFor(reportId, frozen, pointChanges={}, generic={}) {
  const fixture=pointFixture(reportId);
  Object.assign(fixture.catalogue.points[0],pointChanges);
  const adapter=await loadAdapter('./content-adapters/report-point-adapter.mjs',[
    ['import data from "omnibus-data:lib/report-point-adapter.mjs";', 'const data='+JSON.stringify({generic})+';'],
    ['import additions from "@/app/report-additions.json" with {type:\'json\'};',
      'const additions='+JSON.stringify({locators:frozen?[{point_id:fixture.id}]:[]})+';'],
    ['import { addMaterials } from "@/lib/investigation.mjs";', 'const addMaterials=(draft,materials)=>({...draft,materials});'],
    ['import {reportPointLookup} from "@/lib/report-point-lookup.mjs";', reportPointLookup.toString()],
    ['import {reportPointTrace,reportDownloadUrls} from "@/lib/report-point-source.mjs";',
      'const reportDownloadUrls={}; const reportPointTrace=()=>('+JSON.stringify(fixture.trace)+');'],
    ['import { controlObjectiveFor, objectiveGroupFor } from "@/lib/control-objectives.mjs";',
      'const controlObjectiveFor=()=>({text:"Outcome"}), objectiveGroupFor=()=>({id:"BD1",title:"Outcome"});'],
    ['import { organizationalGoalFor } from "@/lib/organizational-goals.mjs";', 'const organizationalGoalFor=()=>({text:"Goal"});'],
    ['import { selectLines } from "@/lib/workspace-view.mjs";', 'const selectLines=()=>{throw Error("Not used");};'],
  ]);
  return {material:adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,'source'),trace:fixture.trace,adapter,fixture};
}

function freeze(value){
  if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}
  return value;
}

test('material wording reads immutable sources while viewer results remain independent deep copies',async()=>{
  const variants=[{}, {generic_variant:{title:'Generic title',text:'Generic norm',phases:{
    opzet:{status:'APPLICABLE',procedure:'Generic design',evidence:'Design record',boundary:'Design only'},
    bestaan:{status:'NOT_SELECTED'},werking:{status:'NOT_SELECTED'},
  }}}];
  for(const changes of variants){
    const {adapter,fixture}=await materialFor('COPY',true,changes);
    const point=fixture.catalogue.points[0],before=structuredClone(fixture.catalogue);freeze(fixture.catalogue);
    for(const mode of ['source','generic']){
      const clone=globalThis.structuredClone;let copies=0,material;
      globalThis.structuredClone=(...args)=>{copies++;return clone(...args);};
      try{material=adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,mode);}
      finally{globalThis.structuredClone=clone;}
      assert.equal(copies,0,'Read-only material projection does not copy source objects');
      assert.equal(material.body,mode==='generic'&&changes.generic_variant?changes.generic_variant.text:point.text);
      const wording=adapter.pointWording(point,mode),other=adapter.pointWording(point,mode);
      wording.source_links[0].evidence_id='Own viewer edit';wording.source_context.report='Own context';
      wording.phases.opzet.status='Own phase';if(wording.generic_variant)wording.generic_variant.title='Own variant';
      assert.notEqual(wording.source_links[0].evidence_id,other.source_links[0].evidence_id);
      assert.notEqual(wording.phases.opzet.status,other.phases.opzet.status);
      assert.deepEqual(fixture.catalogue,before);
      assert.deepEqual(adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,mode),material);
    }
    assert.throws(()=>adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,'invalid'),/formulering/);
    assert.throws(()=>adapter.pointWording(point,'invalid'),/formulering/);
  }
});

test('authored generic phase overrides preserve source wording, retained evidence and variant precedence',async()=>{
  const id='WORDING-N1/TP01',wording=['Generic title','Generic text','Generic procedure'];
  for(const evidence of [undefined,'Generic evidence']){
    const generic={[id]:evidence?[...wording,evidence]:wording};
    const {adapter,fixture}=await materialFor('WORDING',false,{},generic);
    const point=fixture.catalogue.points[0],before=structuredClone(point);freeze(point);
    const resolved=adapter.pointWording(point,'generic');
    assert.equal(resolved.title,'Generic title');assert.equal(resolved.text,'Generic text');
    assert.deepEqual(resolved.phases.onderzoek,{...point.phases.onderzoek,procedure:'Generic procedure',evidence:evidence||''});
    assert.deepEqual(adapter.pointWording(point,'source'),point);assert.deepEqual(point,before);
    assert.equal(adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,'generic').body,resolved.text);
    assert.match(adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,'generic').procedure,/Generic procedure/);
  }
  const changes={generic_variant:{title:'Variant first',text:'Variant text',phases:pointFixture('WORDING').catalogue.points[0].phases}};
  const {adapter,fixture}=await materialFor('WORDING',false,changes,{[id]:wording});freeze(fixture.catalogue);
  assert.equal(adapter.pointWording(fixture.catalogue.points[0],'generic').text,'Variant text');
  assert.equal(adapter.makeReportPointMaterial(fixture.catalogue,fixture.id,'generic').body,'Variant text');
  // Preserve the established second-phase override without sharing its edits.
  const erpId='ERP25-L02/TP01',erp=await materialFor('ERP25',false,{}, {[erpId]:wording});
  const erpPoint={...erp.fixture.catalogue.points[0],id:erpId,phases:{
    opzet:{status:'APPLICABLE',procedure:'Source design',evidence:'Design',boundary:'Design only'},
    bestaan:{status:'APPLICABLE',procedure:'Source existence',evidence:'Case',boundary:'One case'},
    werking:{status:'NOT_SELECTED'},
  }};freeze(erpPoint);
  const result=erp.adapter.pointWording(erpPoint,'generic');
  assert.equal(result.phases.opzet.procedure,'Generic procedure');
  assert.match(result.phases.bestaan.procedure,/Selecteer een recente risicoacceptatie/);
  assert.equal(result.phases.bestaan.evidence,'Case');
  assert.equal(erpPoint.phases.bestaan.procedure,'Source existence');
});

test('a future 200-point bulk selection exactly matches individual materials without repeated catalogue scans',async()=>{
  const {adapter,fixture}=await materialFor('FUTURE',false),catalogue=fixture.catalogue;
  const seed=catalogue.points[0],block=catalogue.blocks[0],source=catalogue.sources[0];
  catalogue.points=Array.from({length:200},(_,i)=>({...structuredClone(seed),id:'FUTURE-N'+i+'/TP01',legacy_line_id:'FUTURE-N'+i,
    source_links:[{material_id:'M'+i,evidence_id:'E'+i}]}));
  catalogue.blocks=catalogue.points.map(p=>({...structuredClone(block),id:p.legacy_line_id}));
  catalogue.sources=catalogue.points.map((_,i)=>({...source,id:'M'+i,evidence_id:'E'+i,quote:'Exacte bron 🧭 '+i,page:i+1}));
  const before=JSON.stringify(catalogue),ids=catalogue.points.map(p=>p.id),draft={marker:'Existing project'};
  for(const mode of ['source','generic']){
    const expected=ids.map(id=>adapter.makeReportPointMaterial(catalogue,id,mode));
    const arrays=['points','blocks','sources','reports'].map(key=>catalogue[key]);
    for(const values of arrays)values.find=()=>assert.fail('Bulk operation rescanned a catalogue');
    try{assert.deepEqual(adapter.adoptReportPoints(draft,catalogue,ids,mode),{...draft,materials:expected});}
    finally{for(const values of arrays)delete values.find;}
  }
  assert.equal(JSON.stringify(catalogue),before);assert.deepEqual(draft,{marker:'Existing project'});
  assert.throws(()=>adapter.adoptReportPoints(draft,catalogue,[ids[0],ids[0]],'source'),/selectie/);
  assert.throws(()=>adapter.adoptReportPoints(draft,catalogue,[ids[0],'missing'],'source'),/Onbekend/);
  catalogue.sources[0].quote='Corrected source';
  assert.match(adapter.adoptReportPoints(draft,catalogue,ids,'source').materials[0].sourceText,/Corrected source/);
});

test('indexed provenance retains exact source context, first-match lookup and fresh publication values',async()=>{
  const {catalogue,id}=pointFixture('SOURCE');
  Object.assign(catalogue.sources[0],{locator_status:'EXACT',start:0,end:14,source_hash:'original'});
  catalogue.points.push({...catalogue.points[0],text:'Duplicate must not win'});
  catalogue.interview_questions=[{point_ids:[id],text:'Question'}];
  catalogue.visual_sources=[{supports_point_ids:[id],observation:'Visual context'}];
  const {reportPointTrace}=await loadAdapter('./report-point-source.mjs',[
    ["import additions from '../app/report-additions.json' with {type:'json'};",'const additions={locators:[],corpus:[]};'],
    ["import {reportPointLookup} from './report-point-lookup.mjs';",reportPointLookup.toString()],
  ]);
  const expected=reportPointTrace(catalogue,id),lookup=reportPointLookup(catalogue,true);
  assert.equal(lookup.points(id),catalogue.points[0]);assert.equal(lookup.sources('missing'),undefined);
  for(const key of ['points','sources','reports'])catalogue[key].find=()=>assert.fail('Indexed provenance rescanned a catalogue');
  try{assert.deepEqual(reportPointTrace(catalogue,id,lookup),expected);}
  finally{for(const key of ['points','sources','reports'])delete catalogue[key].find;}
  catalogue.sources=[{...catalogue.sources[0],quote:'Replacement source'}];
  assert.equal(reportPointTrace(catalogue,id,reportPointLookup(catalogue,true)).relations[0].quote,'Replacement source');
  catalogue.sources=[];
  assert.throws(()=>reportPointTrace(catalogue,id,reportPointLookup(catalogue,true)),/Exacte bronlocatie/);
});

test('report validation counts exact Unicode source offsets without changing source or admission checks',async()=>{
  const additions={locators:[],corpus:[],catalogue:{points:[]},interview_questions:[],visual_sources:[]};
  const {validateReportTrace}=await loadAdapter('./report-point-source.mjs',[
    ["import additions from '../app/report-additions.json' with {type:'json'};",'const additions='+JSON.stringify(additions)+';'],
    ["import {reportPointLookup} from './report-point-lookup.mjs';",reportPointLookup.toString()],
  ]);
  const samples=['Gewone Nederlandse brontekst','é e\u0301\r\n\t中文','🧭 👩‍💻 🇳🇱',
    '\ud800','\udc00','\ud800\ud800\udc00','\udc00\ud800\udc00','\u0000',
    'Nederlandse bronpassage met leestekens. '.repeat(1000)+'🧭'];
  // Deterministic mixtures include adjacent pairs, unmatched halves and BMP text.
  let seed=2026;
  for(let i=0;i<200;i++){
    let text='';
    for(let j=0;j<100;j++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      text+=String.fromCharCode([65,0x301,0xd800,0xdbff,0xdc00,0xdfff,0xffff][seed%7]);
    }
    samples.push(text);
  }
  for(const quote of samples){
    const relation={locator_status:'EXACT',source_hash:'source',start:10,
      end:10+Array.from(quote).length,page:1,quote};
    const trace={version:1,point_id:'point',source_hash:'source',relations:[relation],questions:[],limitations:[]};
    const material={sourcePointId:'point',sourceHash:'source',reportTrace:JSON.stringify(trace)};
    assert.deepEqual(validateReportTrace(material),trace);
    for(const changes of [{end:relation.end+1},{end:relation.end-1},{start:-1},
      {page:0},{source_hash:'changed'},{locator_status:'HOLD'}]) {
      const invalid={...trace,relations:[{...relation,...changes}]};
      assert.throws(()=>validateReportTrace({...material,reportTrace:JSON.stringify(invalid)}),/bronlocatie/);
    }
    assert.equal(material.reportTrace,JSON.stringify(trace));
    assert.throws(()=>validateReportTrace({...material,sourceHash:'changed'}),/herleiding/);
  }
});

test('matching source offsets never replace exact reviewed quotations, questions or document hashes',async()=>{
  const quote='Bron 🧭';
  const relation={locator_status:'EXACT',source_hash:'source',start:0,end:Array.from(quote).length,page:1,quote};
  const trace={version:1,point_id:'P',report_id:'R',source_hash:'source',pdf_hash:'pdf',relations:[relation],
    questions:[{point_ids:['P'],text:'Wat is vastgesteld?'}],visuals:[],limitations:['Historische bron'],source_context:{report:'Context'}};
  const additions={locators:[{point_id:'P',source_hash:'source',relations:trace.relations}],
    corpus:[{framework:{report:{id:'R',pdf_hash:'pdf'},limitations:trace.limitations}}],
    catalogue:{points:[{id:'P',report_id:'R',legacy_line_id:'N',source_context:trace.source_context}]},
    interview_questions:trace.questions,visual_sources:[]};
  const {validateReportTrace}=await loadAdapter('./report-point-source.mjs',[
    ["import additions from '../app/report-additions.json' with {type:'json'};",'const additions='+JSON.stringify(additions)+';'],
    ["import {reportPointLookup} from './report-point-lookup.mjs';",reportPointLookup.toString()],
  ]);
  const material={sourcePointId:'P',sourceHash:'source',reportTrace:JSON.stringify(trace)};
  assert.deepEqual(validateReportTrace(material),trace);
  for(const change of [t=>{t.relations[0].quote='Fout 🧭';},t=>{t.pdf_hash='other';},
    t=>{t.questions[0].text='Invented';},t=>{t.limitations=[];},t=>{t.visuals=[{text:'Invented'}];},
    t=>{t.source_context.report='Other context';},t=>{t.report_id='other';}]){
    const modified=structuredClone(trace);change(modified);
    assert.throws(()=>validateReportTrace({...material,reportTrace:JSON.stringify(modified)}),/beoordeelde/);
  }
});

test('any admitted addition retains exact point provenance, not just the first report',async()=>{
  for(const id of ['SYNTHETIC_A','SYNTHETIC_B']) {
    const {material,trace}=await materialFor(id,true);
    assert.deepEqual(JSON.parse(material.reportTrace),trace);
    assert.equal(material.sourceText,'E1 · pagina 2\nExact point passage');
    assert.equal(material.question,'Synthetic question?');
  }
});

test('legacy report selection does not acquire a new snapshot or changed wording',async()=>{
  const {material}=await materialFor('LEGACY',false);
  assert(!Object.hasOwn(material,'reportTrace'));
  assert.equal(material.sourceText,'E1 · pagina 1\nParent passage');
  assert.match(material.sourceMethodology,/volgt de afzonderlijke doelreview/);
});

test('retained source-analysis goals are not described as a separate goal review',async()=>{
  const {material}=await materialFor('SYNTHETIC_NEW',true,{goal_review:'RETAINED_CHAIN_CONTEXT'});
  assert.match(material.sourceMethodology,/is behouden uit de beoordeelde bronanalyse/);
  assert(!material.sourceMethodology.includes('afzonderlijke doelreview'));
  assert.equal(material.rationale,'Goal');
});

test('visual context belongs to its report even when page numbers coincide',async()=>{
  const additions={corpus:['A','B'].map(id=>({framework:{report:{id}}})),visual_sources:
    ['A','B'].map(id=>({id:id+'-V1',report_id:id,page:1,observation:id+' observation',interpretation_limit:'Limit',image_sha256:id}))};
  const {reportDisplaySource}=await loadAdapter('./report-display-context.mjs',[
    ...['ivho','boc','begroting','hvp','bsa'].map(name=>[
      `import ${name} from '../app/reviewed-${name}-display.json' with {type:'json'};`, `const ${name}={};`]),
    ["import additions from '../app/report-additions.json' with {type:'json'};",'const additions='+JSON.stringify(additions)+';'],
  ]);
  const source={pages:[{page:1,text:'Exact original text'},{page:2,text:'Another page'}]};
  for(const id of ['A','B']) {
    const displayed=reportDisplaySource(id,source);
    assert.deepEqual(displayed.pages[0].visualContext.map(v=>v.id),[id+'-V1']);
    assert.equal(displayed.pages[0].text,source.pages[0].text);
    assert.equal(displayed.pages[1],source.pages[1]);
  }
  assert(!Object.hasOwn(source.pages[0],'visualContext'));
  assert.equal(reportDisplaySource('UNKNOWN',source),source);
});
