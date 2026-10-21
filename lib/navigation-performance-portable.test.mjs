import test from 'node:test';
import assert from 'node:assert/strict';
import {registerCatalogueResource,catalogueReady,catalogueRevision,ensureCatalogue,prefetchCatalogue} from './catalogue-runtime.mjs';
import {reportPointCounts} from './report-point-counts.mjs';

test('point counts match the former full scan, including retained legacy selections',()=>{
 const catalogue={blocks:[{id:'A'},{id:'B'},{id:'C'},{id:'D'}],points:[
  {id:'A/1',legacy_line_id:'A'},{id:'A/2',legacy_line_id:'A'},
  {id:'B/TC-ALL',legacy_line_id:'B'},{id:'C/1',legacy_line_id:'C'},
 ]};
 for(const included of [[],['m1'],['m1','m2','m3','m4'],['A','B','m4']]){
  const draft={included,investigation:{materials:[{id:'m1',sourcePointId:'A/1'},
   {id:'m2',sourcePointId:'B/TC-ALL'},{id:'m3',sourcePointId:'C/TC-ALL'},{id:'m4',sourcePointId:'D/TC-ALL'}]}};
  const chosen=new Set(draft.investigation.materials.filter(m=>included.includes(m.id)).map(m=>m.sourcePointId));
  const expected=Object.fromEntries(catalogue.blocks.map(b=>{
   const points=catalogue.points.filter(p=>p.legacy_line_id===b.id);
   return [b.id,{total:points.length,selected:points.filter(p=>chosen.has(p.id)).length,
    legacySelected:included.includes(b.id)||(chosen.has(b.id+'/TC-ALL')&&!points.some(p=>p.id===b.id+'/TC-ALL'))}];
  }));
  assert.deepEqual(reportPointCounts(catalogue,draft),expected);
 }
});

test('intent preparation loads only its target and does not publish until explicitly opened',async()=>{
 let loads=0,applies=0,otherLoads=0;
 registerCatalogueResource('intent:A',async()=>{loads++;return 42;},value=>{assert.equal(value,42);applies++;});
 registerCatalogueResource('intent:B',async()=>{otherLoads++;},()=>{});
 const revision=catalogueRevision();
 await prefetchCatalogue(['intent:A']);
 assert.equal(loads,1);assert.equal(applies,0);assert.equal(otherLoads,0);
 assert.equal(catalogueRevision(),revision);assert.equal(catalogueReady(['intent:A']),false);
 await ensureCatalogue(['intent:A']);
 assert.equal(loads,1);assert.equal(applies,1);assert.equal(catalogueReady(['intent:A']),true);
 await prefetchCatalogue(['intent:A']);assert.equal(loads,1);
});

test('preparation is single-flight and an explicit open joins the same validated request',async()=>{
 let resolve,loads=0,otherLoads=0,applies=0;
 registerCatalogueResource('intent:slow',()=>{loads++;return new Promise(done=>{resolve=done;});},()=>{applies++;});
 registerCatalogueResource('intent:other',async()=>{otherLoads++;},()=>{});
 const warm=prefetchCatalogue(['intent:slow']);
 const ignored=prefetchCatalogue(['intent:other']);
 const opening=ensureCatalogue(['intent:slow']);
 await Promise.resolve();resolve({});
 await Promise.all([warm,ignored,opening]);
 assert.equal(loads,1);assert.equal(applies,1);assert.equal(otherLoads,0);
});

test('failed preparation stays unpublished and an explicit open retries',async()=>{
 let attempts=0,applies=0;
 registerCatalogueResource('intent:retry',async()=>{if(++attempts===1)throw Error('offline');return {};},()=>{applies++;});
 await prefetchCatalogue(['intent:retry']);
 assert.equal(catalogueReady(['intent:retry']),false);assert.equal(applies,0);
 await ensureCatalogue(['intent:retry']);assert.equal(attempts,2);assert.equal(applies,1);
});

test('a failed group still cannot publish a prepared resource halfway',async()=>{
 let applies=0;
 registerCatalogueResource('intent:group-ok',async()=>({}),()=>{applies++;});
 registerCatalogueResource('intent:group-bad',async()=>{throw Error('invalid');},()=>{});
 await prefetchCatalogue(['intent:group-ok','intent:group-bad']);
 await assert.rejects(ensureCatalogue(['intent:group-ok','intent:group-bad']),/invalid/);
 assert.equal(applies,0);assert.equal(catalogueReady(['intent:group-ok']),false);
});
