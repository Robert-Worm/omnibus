import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {viewerRowBatches,VIEWER_ROW_BATCH_SIZE,observeViewerApproach} from './viewer-rendering.mjs';
import {matrixAnchorId,matrixScrollView,matrixScrollPosition} from './viewer-scroll.mjs';

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

test('question links defer presentation without restricting group or bulk operations',()=>{
 const list=source('app/research-material-list.tsx');
 assert.match(list,/viewerRowBatches\(lines\)/);
 assert.match(list,/<DeferredViewerSection/);
 assert.match(list,/<MaterialBatch lines=\{batch\} renderItem=\{renderItem\}/);
 assert.match(list,/if \(event.currentTarget.open\) setVisited\(true\)/);
 assert.match(list,/\(expanded \|\| visited\) && children\(\)/);
 const builder=source('app/research-builder.tsx');
 assert.match(builder,/<ResearchMaterialGroup open=\{direct.length<=5\}/);
 assert.match(builder,/<ResearchDisclosure className="question-attached"/);
 assert.match(builder,/lineIds:group.lines.map\(l=>l.id\)/);
 const bulk=source('app/question-building-blocks.tsx');
 assert.match(bulk,/<ResearchMaterialList lines=\{group.lines\}/);
 assert.match(bulk,/const groupIds=group.lines.map\(l=>l.id\)/);
 assert.match(bulk,/const ids=available.filter\(l=>chosen.includes\(l.id\)\).map\(l=>l.id\)/);
});

test('broad viewer filters do not eagerly construct every matching control',()=>{
 for(const path of ['app/cio-law-browser.tsx','app/wwke-law-browser.tsx','app/report-norm-browser.tsx']){
  const viewer=source(path);
  for(const tag of viewer.matchAll(/<(?:DeferredViewerSection|CompactMatrix)\s[^>]+>/g)){
   assert.doesNotMatch(tag[0],/(?:immediate|deferRows)=\{[^}]*\b(?:query|selectedOnly|sector)\b/,path);
  }
 }
 const matrix=source('app/compact-matrix.tsx');
 assert.match(matrix,/const deferPresentation=deferRows&&!reveal&&!restorePixels/);
 assert.match(matrix,/\{\(\)=>chunk.map\(/);
 assert.match(source('app/deferred-matrix-rows.tsx'),/visible\?<TableBody>\{children\(\)\}/);
 assert.match(source('app/cev-workbench.tsx'),/immediate=\{index<4\|\|editing===q.id\}/);
 // Explicit references still reveal their own complete group, never unrelated ones.
 assert.match(source('app/report-norm-browser.tsx'),/deferRows=\{!g.lines.some\(line=>line.id===reveal\?\.id\)\}/);
});

function scrollContainer(rows,scrollTop=200){
 return {scrollTop,scrollLeft:75,getBoundingClientRect:()=>({top:100,bottom:460}),
  querySelector:()=>({getBoundingClientRect:()=>({height:40})}),
  querySelectorAll:()=>rows.map(({id,top,bottom})=>({getAttribute:()=>id,getBoundingClientRect:()=>({top,bottom})})),
 };
}
test('scroll capture keeps the first visible norm under the sticky header, not a placeholder',()=>{
 const container=scrollContainer([{id:'above',top:50,bottom:140},{id:'visible',top:130,bottom:240},{id:'next',top:240,bottom:510}]);
 assert.deepEqual(matrixScrollView(container),{top:200,left:75,anchorId:'visible',anchorOffset:-10});
 assert.deepEqual(matrixScrollView(scrollContainer([])),{top:200,left:75,anchorId:'',anchorOffset:0});
});
test('anchor restoration preserves the visible offset when earlier rows are not mounted',()=>{
 const view={top:3200,left:75,anchorId:'late',anchorOffset:-10};
 assert.equal(matrixAnchorId([{id:'early'},{id:'late'}],view),'late');
 const container=scrollContainer([{id:'early',top:100,bottom:130},{id:'late',top:2300,bottom:2470}],0);
 assert.deepEqual(matrixScrollPosition(container,view,'late'),{top:2170,left:75});
 assert.deepEqual(matrixScrollPosition(container,view,'removed'),{top:3200,left:75});
});
test('legacy, removed and malformed anchors keep safe pixel fallback; top-of-list ignores an old anchor',()=>{
 for(const view of [{top:300},{top:300,anchorId:'removed'},{top:0,anchorId:'late'},{top:Infinity,anchorId:'late'}])assert.equal(matrixAnchorId([{id:'late'}],view),'');
 assert.deepEqual(matrixScrollPosition(scrollContainer([]),{top:-20,left:Infinity},''),{top:0,left:0});
 assert.deepEqual(matrixScrollPosition(scrollContainer([{id:'late',top:150,bottom:200}],0),{left:0,anchorOffset:NaN},'late'),{top:10,left:0});
 const matrix=source('app/compact-matrix.tsx');
 assert.match(matrix,/restorePixels=Boolean\(restoreView&&restoreView.top>0&&!restoreId\)/);
 assert.match(matrix,/chunk.some\(line=>line.id===restoreId\)/);
 assert.match(matrix,/!element.matches\('\[data-slot=table-container\]'\)/);
});
