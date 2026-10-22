import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {parseProjectText,serializeProject} from '../lib/project-codec.mjs';

register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(specifier.startsWith('@/lib/'))return next(new URL('../lib/'+specifier.slice(6),${JSON.stringify(import.meta.url)}).href,context);
  return next(specifier,context);
 }
`),import.meta.url);
const {readProjectInBackground}=await import('./project-reader.ts');
const project={format:'rijksmap-project',version:1,draft:{included:['n1'],notes:{n1:'Eigen tekst'},
 investigation:{materials:[{id:'n1',lawTrace:'{"passages":["Exacte bron 🧭"]}'}]},
 research:{questions:[{id:'q1',text:'Hoe?'}],links:[{line_id:'n1',question_id:'q1'}]}}};
const text=serializeProject(project);
function harness({blocked=false,signal,timeoutMs=1000}={}){
 const tasks=[],sent=[];let created=0,terminated=0;
 const worker={postMessage:value=>sent.push(structuredClone(value)),terminate:()=>terminated++};
 const promise=readProjectInBackground(text,{signal,timeoutMs,schedule:run=>tasks.push(run),createWorker:()=>{
  created++;if(blocked)throw Error('Worker unavailable');return worker;
 }});
 return {promise,worker,sent,run:()=>tasks.shift()?.(),counts:()=>({created,terminated})};
}

test('restoration yields before dispatch and returns decoded data without admitting or saving it',async()=>{
 const h=harness();assert.equal(h.counts().created,0);h.run();assert.deepEqual(h.sent,[text]);
 const reply=h.worker.onmessage;reply({data:{value:parseProjectText(h.sent[0])}});
 assert.deepEqual(await h.promise,project);assert.equal(h.counts().terminated,1);
 assert.equal(h.worker.onmessage,null);assert.equal(h.worker.onerror,null);assert.equal(h.worker.onmessageerror,null);
 reply({data:{value:{stale:true}}});assert.deepEqual(await h.promise,project);
});

test('aborting queued or active restore work prevents fallback and ignores late replies',async()=>{
 for(const active of [false,true]){
  const controller=new AbortController(),h=harness({signal:controller.signal});
  const rejected=assert.rejects(h.promise,{name:'AbortError'});if(active)h.run();
  const late=h.worker.onmessage;controller.abort();h.run();late?.({data:{value:project}});
  await rejected;assert.deepEqual(h.counts(),{created:active?1:0,terminated:active?1:0});
 }
 const controller=new AbortController();controller.abort();const h=harness({signal:controller.signal});
 await assert.rejects(h.promise,{name:'AbortError'});h.run();assert.equal(h.counts().created,0);
});

test('worker startup, transport failure and missing reply fall back once through the same decoder',async()=>{
 const blocked=harness({blocked:true});blocked.run();assert.deepEqual(await blocked.promise,project);
 for(const fail of [worker=>worker.onerror(),worker=>worker.onmessageerror(),worker=>worker.onmessage({data:{}})]){
  const h=harness();h.run();const late=h.worker.onmessage,lateError=h.worker.onerror;
  fail(h.worker);lateError();late({data:{value:{stale:true}}});
  assert.deepEqual(await h.promise,project);assert.equal(h.counts().terminated,1);
 }
 const slow=harness({timeoutMs:5});slow.run();assert.deepEqual(await slow.promise,project);assert.equal(slow.counts().terminated,1);
});

test('worker-declared invalid input is not retried and syntax errors keep their original handling',async()=>{
 for(const errorName of ['Error','SyntaxError']){
  const h=harness();h.run();h.worker.onmessage({data:{error:'Damaged input',errorName}});
  await assert.rejects(h.promise,error=>error.message==='Damaged input'&&(errorName==='SyntaxError'?error instanceof SyntaxError:error instanceof Error));
  assert.equal(h.counts().terminated,1);
 }
 for(const bad of ['{',JSON.stringify({...JSON.parse(text),expandedBytes:64000001}),JSON.stringify({...JSON.parse(text),data:'damaged'})]){
  await assert.rejects(readProjectInBackground(bad,{createWorker:()=>{throw Error('Unavailable');}}));
 }
});

test('the actual worker preserves legacy/current projects and enforces the shared compressed input limits',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'self'),messages=[];
 const scope={postMessage:message=>messages.push(structuredClone(message))};
 Object.defineProperty(globalThis,'self',{configurable:true,value:scope});
 try{
  await import('./project-reader.worker.ts');
  for(const input of [text,JSON.stringify(project),JSON.stringify({format:'rijksmap-framework-draft-v2',included:['legacy']})]){
   scope.onmessage({data:input});assert.deepEqual(messages.pop(),{value:parseProjectText(input)});
  }
  scope.onmessage({data:'{'});assert.equal(messages.pop().errorName,'SyntaxError');
  for(const input of [JSON.stringify({...JSON.parse(text),expandedBytes:64000001}),JSON.stringify({...JSON.parse(text),data:'damaged'})]){
   scope.onmessage({data:input});assert.equal(messages.pop().errorName,'Error');
  }
 }finally{if(previous)Object.defineProperty(globalThis,'self',previous);else delete globalThis.self;}
});

test('startup awaits decoding before existing catalogue admission and project validation',()=>{
 const source=readFileSync(new URL('./framework-editor.tsx',import.meta.url),'utf8');
 const start=source.indexOf('const original=await readProjectInBackground(store.raw()!');assert(start>=0);
 const admission=source.indexOf('await ensureCatalogue(projectCatalogueKeys(original))',start);
 const validation=source.indexOf('const restored=readProject(original',admission);
 const apply=source.indexOf('onProjectRestored(restored.project)',validation);
 assert(admission>start&&validation>admission&&apply>validation);
 assert(source.includes('reading.abort()'));
});
