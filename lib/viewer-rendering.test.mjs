import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {viewerRowBatches,VIEWER_ROW_BATCH_SIZE,observeViewerApproach} from './viewer-rendering.mjs';

test('presentation batches preserve every identity, ordering and input, including late selections',()=>{
 const rows=Array.from({length:139},(_,id)=>Object.freeze({id,selected:id===138}));
 Object.freeze(rows);
 const batches=viewerRowBatches(rows);
 assert.ok(batches.every(batch=>batch.length<=VIEWER_ROW_BATCH_SIZE));
 assert.deepEqual(batches.flat(),rows);assert.equal(batches.flat().at(-1),rows.at(-1));
 assert.deepEqual(viewerRowBatches(rows,false),[rows]);
 assert.deepEqual(viewerRowBatches([]),[]);
});
test('nearby content opens once and observer cleanup releases the target',()=>{
 let callback,options,target,disconnections=0,shown=0;
 class Observer{
  constructor(cb,opts){callback=cb;options=opts;}
  observe(element){target=element;}
  disconnect(){disconnections++;}
 }
 const element={},stop=observeViewerApproach(element,()=>shown++,Observer);
 assert.equal(target,element);assert.equal(options.rootMargin,'500px 0px');
 callback([{isIntersecting:false}]);assert.equal(shown,0);
 callback([{isIntersecting:true}]);assert.equal(shown,1);assert.equal(disconnections,1);
 callback([{isIntersecting:true}]);assert.equal(shown,1);
 stop();assert.equal(disconnections,1);
});
test('without an observer all content remains available',()=>{
 let shown=0;const stop=observeViewerApproach({},()=>shown++,null);
 assert.equal(shown,1);assert.doesNotThrow(stop);
});
test('an observer callback queued before unmount cannot reveal a disposed section',()=>{
 let callback,shown=0;
 class Observer{constructor(cb){callback=cb;}observe(){}disconnect(){}}
 const stop=observeViewerApproach({},()=>shown++,Observer);stop();
 callback([{isIntersecting:true}]);assert.equal(shown,0);
});

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('viewer families share presentation primitives and matrices defer by default',()=>{
 for(const path of ['app/cio-law-browser.tsx','app/wwke-law-browser.tsx','app/report-norm-browser.tsx','app/cev-workbench.tsx','app/model-library.tsx']){
  assert.match(source(path),/import DeferredViewerSection from ['"]\.\/deferred-viewer-section['"]/);
  assert.match(source(path),/<DeferredViewerSection/);
 }
 assert.match(source('app/compact-matrix.tsx'),/deferRows = true/);
 assert.match(source('app/compact-matrix.tsx'),/viewerRowBatches\(rows,deferRows\)/);
 for(const path of ['app/deferred-viewer-section.tsx','app/deferred-matrix-rows.tsx'])assert.match(source(path),/useViewerVisibility/);
 assert.match(source('app/database-report-library.tsx'),/databaseSourceClient\.page\(ref, index, props\.page/);
});
