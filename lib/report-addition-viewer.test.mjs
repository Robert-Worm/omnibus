import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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
  const {makeReportPointMaterial}=await loadAdapter('./content-adapters/report-point-adapter.mjs',[
    ['import data from "omnibus-data:lib/report-point-adapter.mjs";', 'const data={generic:{}};'],
    ['import additions from "@/app/report-additions.json" with {type:\'json\'};',
      'const additions='+JSON.stringify({locators:frozen?[{point_id:fixture.id}]:[]})+';'],
    ['import { addMaterials } from "@/lib/investigation.mjs";', 'const addMaterials=()=>{throw Error("Not used");};'],
    ['import {reportPointTrace,reportDownloadUrls} from "@/lib/report-point-source.mjs";',
      'const reportDownloadUrls={}; const reportPointTrace=()=>('+JSON.stringify(fixture.trace)+');'],
    ['import { controlObjectiveFor, objectiveGroupFor } from "@/lib/control-objectives.mjs";',
      'const controlObjectiveFor=()=>({text:"Outcome"}), objectiveGroupFor=()=>({id:"BD1",title:"Outcome"});'],
    ['import { organizationalGoalFor } from "@/lib/organizational-goals.mjs";', 'const organizationalGoalFor=()=>({text:"Goal"});'],
    ['import { selectLines } from "@/lib/workspace-view.mjs";', 'const selectLines=()=>{throw Error("Not used");};'],
  ]);
  return {material:makeReportPointMaterial(fixture.catalogue,fixture.id,'source'),trace:fixture.trace};
}

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
