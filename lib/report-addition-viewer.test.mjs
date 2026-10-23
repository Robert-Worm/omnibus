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

async function materialFor(reportId, frozen, pointChanges={}) {
  const fixture=pointFixture(reportId);
  Object.assign(fixture.catalogue.points[0],pointChanges);
  const adapter=await loadAdapter('./content-adapters/report-point-adapter.mjs',[
    ['import data from "omnibus-data:lib/report-point-adapter.mjs";', 'const data={generic:{}};'],
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
