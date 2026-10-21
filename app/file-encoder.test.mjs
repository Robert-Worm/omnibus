import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createFileEncoder} from './file-encoder.ts';
import {parseProjectText,serializeProject} from '../lib/project-codec.mjs';
import {workbookFileSnapshot} from '../lib/workbook-file-snapshot.mjs';
import {workbookPackage,zipStored} from '../lib/excel-package.mjs';

register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(specifier.startsWith('@/lib/'))return next(new URL('../lib/'+specifier.slice(6),${JSON.stringify(import.meta.url)}).href,context);
  return next(specifier,context);
 }
`),import.meta.url);
const {encodeFile}=await import('./encode-file.ts');
const project={format:'rijksmap-project',version:1,draft:{included:['n1'],
 investigation:{materials:[{id:'n1',sourceContext:'Exacte bron 🧭',lawTrace:'{"passages":["bron"]}'}]},
 research:{questions:[{id:'q1',text:'Hoe?'}],links:[{line_id:'n1',question_id:'q1'}]},notes:{n1:'Eigen notitie'}}};

function harness({fallback=encodeFile,blocked=false}={}){
 const queued=[],sent=[];let created=0,terminated=0,fallbacks=0;
 const worker={postMessage:r=>sent.push(structuredClone(r)),terminate:()=>terminated++};
 const encoder=createFileEncoder({schedule:run=>queued.push(run),
  createWorker:()=>{created++;if(blocked)throw Error('Workers unavailable');return worker;},
  fallback:r=>{fallbacks++;return fallback(r);}});
 return {encoder,worker,sent,run:()=>queued.shift()?.(),counts:()=>({created,terminated,fallbacks})};
}

test('file work yields before dispatch, permits one job and preserves the captured project',async()=>{
 const h=harness(),job=h.encoder.encode({kind:'project',project});
 assert.equal(h.counts().created,0);assert.equal(h.sent.length,0);
 await assert.rejects(h.encoder.encode({kind:'project',project}),/al een bestand/);
 h.run();assert.deepEqual(h.sent[0].project,project);assert.notEqual(h.sent[0].project,project);
 const reply=h.worker.onmessage;
 h.worker.onmessage({data:{content:encodeFile(h.sent[0])}});
 assert.deepEqual(parseProjectText(await job),project);
 assert.equal(h.worker.onmessage,null);assert.equal(h.worker.onerror,null);
 const next=h.encoder.encode({kind:'project',project:{...project,draft:{...project.draft,notes:{}}}});
 h.run();reply({data:{content:'stale response'}});
 h.worker.onmessage({data:{content:encodeFile(h.sent[1])}});
 assert.deepEqual(parseProjectText(await next).draft.notes,{});
 assert.equal(h.counts().created,1);assert.equal(h.counts().fallbacks,0);
});

test('worker transport failure falls back once, ignores stale events and retains codec validation',async()=>{
 const h=harness(),job=h.encoder.encode({kind:'project',project});h.run();
 const lateMessage=h.worker.onmessage,lateError=h.worker.onerror;
 lateError();lateError();lateMessage({data:{content:'stale'}});
 assert.equal(await job,serializeProject(project));assert.equal(h.counts().fallbacks,1);
 const next=h.encoder.encode({kind:'project',project});h.run();lateMessage({data:{content:'stale'}});
 assert.equal(await next,serializeProject(project));assert.equal(h.counts().created,1);
 const blocked=harness({blocked:true}),fallback=blocked.encoder.encode({kind:'project',project});blocked.run();
 assert.equal(await fallback,serializeProject(project));
 const invalid=harness({blocked:true}),rejected=invalid.encoder.encode({kind:'project',project:{draft:{investigation:{materials:[{lawTrace:'bad JSON'}]}}}});
 invalid.run();await assert.rejects(rejected,/JSON/);
});

test('worker-declared file errors are not silently retried and disposal rejects unfinished work',async()=>{
 const h=harness(),job=h.encoder.encode({kind:'project',project});h.run();
 h.worker.onmessage({data:{error:'Project te groot'}});await assert.rejects(job,/Project te groot/);
 assert.equal(h.counts().fallbacks,0);
 const next=h.encoder.encode({kind:'project',project});h.encoder.dispose();h.run();
 await assert.rejects(next,/afgesloten/);assert.equal(h.sent.length,1);
 await assert.rejects(h.encoder.encode({kind:'project',project}),/afgesloten/);
});

const oldDate='2026-01-02T00:00:00.000Z',newDate='2026-02-03T04:05:06.000Z';
const book={title:'Fictief werkboek',meta:{exportedAt:oldDate},stylesXml:'<styleSheet/>',
 evidence:[{savedMaterial:project.draft.investigation.materials[0]}],applicability:[{id:'n1',state:'included'}],
 definedNames:[{name:'Selected',ref:"'Register'!$A$2"}],sheets:[{
 name:'Register',widths:[20,30],rows:[['Norm','Datum'],[{formula:'1+1',value:2},new Date(oldDate)]],
 exportedAtCell:{row:2,column:1},merges:[],heights:{2:24},cellStyles:{},rowStyles:{},
 entries:[{render:()=>null}],viewer:{labels:['Norm']},detailRecords:[{get:()=>''}],
 } ]};

test('download snapshot is cloneable and retains exact OOXML, formulas and source evidence',()=>{
 const snapshot=workbookFileSnapshot(book,newDate);
 assert.equal(snapshot.sheets[0].entries,undefined);assert.equal(snapshot.sheets[0].viewer,undefined);
 assert.equal(snapshot.sheets[0].detailRecords,undefined);
 assert.equal(book.sheets[0].rows[1][1].toISOString(),oldDate);
 assert.equal(book.meta.exportedAt,oldDate);
 const expected={...book,meta:{exportedAt:newDate},sheets:[{...book.sheets[0],rows:[book.sheets[0].rows[0],[book.sheets[0].rows[1][0],new Date(newDate)]]}]};
 assert.deepEqual(workbookPackage(structuredClone(snapshot)),workbookPackage(expected));
 assert.deepEqual(new Uint8Array(encodeFile({kind:'xlsx',model:structuredClone(snapshot)})),zipStored(workbookPackage(expected)));
 assert.deepEqual(snapshot.evidence,book.evidence);assert.deepEqual(snapshot.applicability,book.applicability);
 assert.throws(()=>workbookFileSnapshot(book,'bad date'),/exportdatum/);
 assert.throws(()=>workbookFileSnapshot({...book,sheets:[{...book.sheets[0],exportedAtCell:{row:1,column:1}}]}),/exportdatum/);
});
