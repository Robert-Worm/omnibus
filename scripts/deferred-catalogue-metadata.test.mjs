import test from 'node:test';
import assert from 'node:assert/strict';
import {deferredCatalogueMetadata} from './deferred-catalogue-metadata.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';

const cio='lib/cio-content.mjs', wwke='lib/wwke-content.mjs';
const example=()=>({modules:{
  [cio]:{catalogue:{source_identity:{source_id:'A'},source_dispositions:[{id:'S',quote:'Exact 🦉 <source>'}],issues:[],points:[]},
    original:{source_dispositions:[{id:'S',quote:'Exact 🦉 <source>'}],issues:[]},
    bank:{records:[],page_coverage:[{page:1}],limitations:['Source limit']},issues:{issues:[{id:'I',status:'ACCEPTED_SOURCE_LIMIT'}]},status:{title:'Synthetic'}},
  [wwke]:{source_dispositions:[{id:'W',status:'HOLD'}],points:[],version:'fixed'},
  untouched:{records:[{id:'unrelated'}]},
}, registrations:{[cio]:['foundation:A:points','source:A:pages'],[wwke]:['foundation:B:points']}, refs:{}});

await test('only allowlisted background fields wait for their existing foundation; publication remains unchanged',()=>{
  const content=example(), before=JSON.stringify(content);
  const result=deferredCatalogueMetadata(content);
  assert.equal(JSON.stringify(content),before);
  assert.equal(result.modules.untouched,content.modules.untouched);
  assert.deepEqual(result.modules[cio].catalogue.source_identity,{source_id:'A'});
  assert.equal(result.modules[wwke].version,'fixed');
  assert.deepEqual(result.modules[cio].issues.issues,[]);
  assert.deepEqual(Object.keys(result.registrations).sort(),[cio,wwke].sort());
  for(const [id,keys] of Object.entries(result.registrations)){
    const projected=result.modules[id], initial=structuredClone(projected);
    const references=keys.flatMap(key=>result.resources.get(key).map(edit=>edit.path.reduce((p,k)=>p[k],projected)));
    const undo=keys.map(key=>applyCatalogueEdits(projected,result.resources.get(key)));
    assert.equal(JSON.stringify(projected),JSON.stringify(content.modules[id]));
    keys.flatMap(key=>result.resources.get(key).map(edit=>edit.path.reduce((p,k)=>p[k],projected)))
      .forEach((value,i)=>assert.equal(value,references[i],'Existing readers retain the same arrays'));
    for(const revert of undo.reverse())revert();
    assert.deepEqual(projected,initial);
  }
});

await test('empty or absent metadata requires no resource, while ambiguous boundaries fail closed',()=>{
  const empty={modules:{[cio]:{}},registrations:{},refs:{}};
  assert.equal(deferredCatalogueMetadata(empty).resources.size,0);
  for(const keys of [[],['source:A:pages'],['foundation:A:a','foundation:B:b']]){
    const content=example();content.registrations[cio]=keys;
    assert.throws(()=>deferredCatalogueMetadata(content),/one existing foundation boundary/);
  }
  const bad=example();bad.modules[cio].bank.limitations='different contract';
  assert.throws(()=>deferredCatalogueMetadata(bad),/metadata shape/);
  const collision=example();collision.refs['foundation:A:metadata:'+cio]={};
  assert.throws(()=>deferredCatalogueMetadata(collision),/collision/);
});

await test('normal catalogue admission is atomic, reusable, and retries a failed metadata fetch',async()=>{
  const runtime=await import('../lib/catalogue-runtime.mjs?deferred-metadata-test');
  const {modules,resources,registrations}=deferredCatalogueMetadata(example());
  let loads=0,fail=true,observed=[];
  for(const [id,keys] of Object.entries(registrations))for(const key of keys){
    runtime.registerCatalogueResource(key,async()=>{
      loads++;if(fail&&key.startsWith('foundation:A:'))throw Error('Unavailable');
      return resources.get(key);
    },edits=>applyCatalogueEdits(modules[id],edits));
  }
  runtime.onCatalogueChange(()=>{observed=modules[cio].issues.issues.map(i=>i.id);});
  assert.equal(loads,0);
  assert(!runtime.catalogueReady(['foundation:A']));
  await assert.rejects(runtime.ensureCatalogue(['foundation:A']),/Unavailable/);
  assert.deepEqual(modules[cio].issues.issues,[]);
  fail=false;
  await runtime.prefetchCatalogue(['foundation:A']);
  assert.deepEqual(observed,[],'Prefetch cannot expose uncommitted source data');
  await runtime.ensureCatalogue(['foundation:A']);
  assert.deepEqual(observed,['I']);
  assert(runtime.catalogueReady(['foundation:A']));
  assert(!runtime.catalogueReady(['foundation:B']));
  await runtime.ensureCatalogue(['foundation:A']);
  assert.equal(loads,2,'Ready metadata and successful prefetch are reused');
  assert.deepEqual(modules[wwke].source_dispositions,[]);
});

await test('report review and admission metadata follow only their report without losing shared references',async()=>{
  const id='app/reviewed-reports.json', content={modules:{[id]:{
    corpus:['A','B'].map(report=>({framework:{report:{id:report,title:'Synthetic '+report,source_hash:report},
      lines:[],source_review:{reviewed:true,reason:'Exact review '+report}}})),
    scopeDecisions:{A1:['retain','Exact admission A'],B1:['hold','Exact admission B']},
    researchPresets:[{id:'unchanged suggestion'}],
  }},registrations:{[id]:['report:A:lines','report:B:lines']},refs:{},routing:{reports:{A1:'A',B1:'B'}}};
  const before=JSON.stringify(content), result=deferredCatalogueMetadata(content), data=result.modules[id];
  assert.equal(JSON.stringify(content),before);
  const scope={...data.scopeDecisions}, review=data.corpus[0].framework.source_review;
  assert.deepEqual(data.corpus.map(c=>c.framework.report.id),['A','B']);
  assert.deepEqual(data.researchPresets,content.modules[id].researchPresets);
  assert.deepEqual(scope,{A1:[],B1:[]});
  const runtime=await import('../lib/catalogue-runtime.mjs?report-metadata-test');
  for(const key of result.registrations[id])runtime.registerCatalogueResource(key,()=>result.resources.get(key),edits=>applyCatalogueEdits(data,edits));
  await runtime.ensureCatalogue(['report:B']);
  assert.deepEqual(scope.B1,['hold','Exact admission B']);
  assert.deepEqual(scope.A1,[]);
  assert.deepEqual(review,{});
  await runtime.ensureCatalogue(['report:A']);
  assert.equal(scope.A1,data.scopeDecisions.A1);
  assert.equal(review,data.corpus[0].framework.source_review);
  assert.equal(JSON.stringify(data),JSON.stringify(content.modules[id]));
  const missing=structuredClone(content);delete missing.routing.reports.B1;
  assert.throws(()=>deferredCatalogueMetadata(missing),/existing report boundary/);
  const bad=structuredClone(content);bad.modules[id].scopeDecisions.B1='not reviewed';
  assert.throws(()=>deferredCatalogueMetadata(bad),/admission decision/);
});
