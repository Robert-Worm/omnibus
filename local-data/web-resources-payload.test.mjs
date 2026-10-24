import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from './repository.mjs';
import {webResourceBatchPayload,WebResourceIntegrityError} from './web-resources.mjs';
import {contentBatchLimits} from '../lib/content-batch-contract.mjs';

const release=digest('Synthetic release');
function fixture(values) {
  const texts=values.map(value=>JSON.stringify(value)),hashes=texts.map(digest);
  const rows=new Map(texts.map((payload,index)=>[hashes[index],payload]));
  const reads=[];
  const repository={db:{prepare(sql){return {get(pin,hash,remaining){
    if(sql.includes('sqlite_master'))return {name:'web_resources'};
    assert.equal(pin,release);reads.push({hash,payload:sql.startsWith('SELECT CAST')});
    const payload=rows.get(hash);if(payload===undefined)return undefined;
    const bytes=Buffer.byteLength(payload);
    if(sql.startsWith('SELECT length'))return {bytes};
    return bytes<=remaining?{payload:new TextEncoder().encode(payload)}:undefined;
  }};}}};
  return {repository,hashes,rows,reads};
}

test('direct batch JSON preserves every pinned byte and key order without parsing source trees',()=>{
  const values=[JSON.parse('{"__proto__":{"literal":true},"10":"ten","2":"two","a":"\\ud800"}'),
    {norms:Array.from({length:200},(_,id)=>({id,text:'New source 🧭 é界\n\r\t"\\',status:'HOLD',n:null}))},
    null,false,0,['text',{},[]]];
  const f=fixture(values),expected=JSON.stringify({release,items:values.map((value,i)=>({hash:f.hashes[i],value}))});
  const original=JSON.parse;let actual;
  JSON.parse=()=>{throw Error('Batch delivery must not parse source payloads');};
  try{actual=webResourceBatchPayload(f.repository,release,f.hashes);}finally{JSON.parse=original;}
  assert.deepEqual(actual,Buffer.from(expected));
  assert.deepEqual(JSON.parse(actual).items.map(item=>item.value),values);
  assert(f.reads.slice(0,values.length).every(read=>!read.payload),'Preflight every size before any payload');
});

test('missing and oversized batches refuse before any payload is read',()=>{
  const f=fixture([{text:'x'.repeat(1100000)},{text:'y'.repeat(1100000)}]);
  assert.throws(()=>webResourceBatchPayload(f.repository,release,f.hashes),/Invalid content batch size/);
  assert(f.reads.every(read=>!read.payload));
  f.reads.length=0;
  assert.equal(webResourceBatchPayload(f.repository,release,[f.hashes[0],digest('missing')]),null);
  assert(f.reads.every(read=>!read.payload));
});

test('altered JSON cannot be interpolated, even if it has the same size or tries to escape the envelope',()=>{
  for(const changed of ['{"text":"Changed!"}','null}, {"hash":"foreign","value":{}', '{invalid', '0', '']){
    const f=fixture([{text:'Original'}]);f.rows.set(f.hashes[0],changed);
    assert.throws(()=>webResourceBatchPayload(f.repository,release,f.hashes),WebResourceIntegrityError);
  }
});

test('a resource removed or enlarged after size preflight still cannot enter the response',()=>{
  for(const change of [f=>f.rows.delete(f.hashes[0]),f=>f.rows.set(f.hashes[0],'x'.repeat(contentBatchLimits.bytes))]){
    const f=fixture([{text:'Original'}]),prepare=f.repository.db.prepare.bind(f.repository.db);
    f.repository.db.prepare=sql=>{
      if(sql.startsWith('SELECT CAST'))change(f);
      return prepare(sql);
    };
    assert.throws(()=>webResourceBatchPayload(f.repository,release,f.hashes),WebResourceIntegrityError);
  }
});

test('maximum valid payload stays within the unchanged response budget',()=>{
  const value={text:'x'.repeat(contentBatchLimits.bytes-contentBatchLimits.overhead-11)};
  const f=fixture([value]);
  const text=webResourceBatchPayload(f.repository,release,f.hashes);
  assert(Buffer.byteLength(text)<=contentBatchLimits.bytes);
  assert.equal(JSON.parse(text).items[0].value.text,value.text);
});
