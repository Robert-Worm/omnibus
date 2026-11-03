import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// De downloadknop mag nooit vast blijven zitten (#292). De encoder en de download zijn stand-ins.
globalThis.downloadProef={gedownload:[],encode:async()=>new Uint8Array([1])};
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/file-download.ts'))return next(specifier,context);
  if(specifier==='@/lib/browser-download.mjs')return {url:'data:text/javascript,'+encodeURIComponent('export const download=(c,n)=>globalThis.downloadProef.gedownload.push(n);'),shortCircuit:true};
  if(specifier==='./file-encoder')return {url:'data:text/javascript,'+encodeURIComponent('export const createFileEncoder=()=>({encode:r=>globalThis.downloadProef.encode(r)});'),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {downloadFile}=await import('./file-download.ts');
const proef=globalThis.downloadProef;

test('een tweede download tijdens de eerste wordt geweigerd',async()=>{
 let klaar;proef.encode=()=>new Promise(r=>{klaar=r;});
 const eerste=downloadFile({},'a.xlsx','x');
 assert.equal(await downloadFile({},'b.xlsx','x'),false);
 klaar(new Uint8Array([1]));
 assert.equal(await eerste,true);
 assert.deepEqual(proef.gedownload,['a.xlsx']);
});

test('na een fout is de knop weer vrij',async()=>{
 proef.encode=async()=>{throw Error('Kapot');};
 assert.equal(await downloadFile({},'c.xlsx','x'),false);
 proef.encode=async()=>new Uint8Array([1]);
 assert.equal(await downloadFile({},'d.xlsx','x'),true);
 assert.deepEqual(proef.gedownload.slice(-1),['d.xlsx']);
});
