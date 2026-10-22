import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createContentTransferCache,contentTransferKey,MAX_CONTENT_TRANSFER_BYTES} from './content-transfer-cache.mjs';
import {createDatabaseSourceClient} from './database-source-client.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const release=hash('Synthetic release');
const bytes=value=>new TextEncoder().encode(JSON.stringify(value));
const ref=value=>({release,hash:hash(bytes(value))});
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

await test('transfer copies survive detachment, deduplicate exact refs and never include unrelated entries',()=>{
 const a={text:'Exact source 😀'},b={text:'Other source'},cache=createContentTransferCache();
 cache.remember(ref(a),bytes(a));cache.remember(ref(b),bytes(b));
 const batch=cache.copy([ref(a),ref(a)]);assert.equal(batch.length,1);
 const received=structuredClone(batch,{transfer:batch.map(item=>item.bytes)});
 assert.equal(batch[0].bytes.byteLength,0);
 assert.deepEqual(new Uint8Array(received[0].bytes),bytes(a));
 assert.deepEqual(new Uint8Array(cache.copy([ref(a)])[0].bytes),bytes(a));
 assert.deepEqual(cache.copy([ref(a)],new Set([contentTransferKey(ref(a))])),[]);
 assert.deepEqual(cache.copy([{...ref(a),release:hash('Other release')}]),[]);
 assert.deepEqual(cache.copy([]),[]);
});

await test('retention and incoming transfers are bounded; invalid batches cannot partially replace a valid one',()=>{
 const cache=createContentTransferCache(10),a={release,hash:hash('a')},b={release,hash:hash('b')};
 cache.remember(a,new Uint8Array(6));cache.remember(b,new Uint8Array(6));
 assert.equal(cache.copy([a,b]).length,1);assert.equal(cache.stats().retainedBytes,6);
 for(const batch of [[{...a,bytes:new ArrayBuffer(11)}],[{...a,bytes:new SharedArrayBuffer(1)}],
  [{...a,bytes:new ArrayBuffer(0)}],[{...a,bytes:new ArrayBuffer(2)},{...a,bytes:new ArrayBuffer(2)}],
  [{...a,bytes:new ArrayBuffer(2)},{...b,hash:'../bad',bytes:new ArrayBuffer(2)}]]){
  assert.throws(()=>cache.stage(batch));assert.deepEqual(cache.stats(),{entries:1,retainedBytes:6});
 }
 const many=createContentTransferCache();
 for(let i=0;i<140;i++)many.remember({release,hash:hash(String(i))},new Uint8Array(1));
 assert.equal(many.stats().entries,128);
 for(let i=0;i<16;i++)many.remember({release,hash:hash('large'+i)},new Uint8Array(2*1024*1024));
 assert.equal(many.stats().retainedBytes,MAX_CONTENT_TRANSFER_BYTES);
 assert.throws(()=>createContentTransferCache(MAX_CONTENT_TRANSFER_BYTES+1));
 cache.stage([]);assert.deepEqual(cache.stats(),{entries:0,retainedBytes:0});
});

await test('a second realm validates transferred network bytes, not mutated catalogue objects; missing refs still fetch',async()=>{
 const value={text:'Synthetic exact source'},other={text:'Source not in document'};
 const main=createDatabaseSourceClient({transferBytes:1024,fetchImpl:async()=>response(value)});
 const loaded=await main.content(ref(value));loaded.text='In-memory modification';
 const batch=main.copyContentTransfers([ref(value)]);
 let fetches=0;
 const worker=createDatabaseSourceClient({fetchImpl:async()=>{fetches++;return response(other);}});
 worker.stageContentTransfers(structuredClone(batch,{transfer:batch.map(item=>item.bytes)}));
 assert.deepEqual(await worker.content(ref(value)),value);assert.equal(fetches,0);
 assert.deepEqual(await worker.content(ref(other)),other);assert.equal(fetches,1);
 assert.deepEqual(worker.transferStats(),{entries:0,retainedBytes:0});
 assert.equal(main.copyContentTransfers([ref(value)]).length,1);
});

await test('altered bytes fail closed once; explicit retry fetches and verifies the original without HTTP caching',async()=>{
 const value={text:'Valid'},expected=ref(value);let fetches=0;
 const worker=createDatabaseSourceClient({maxEntries:0,fetchImpl:async(_url,options)=>{
  fetches++;assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');return response(value);
 }});
 for(const corrupt of [bytes({text:'Changed'}),new TextEncoder().encode('{'),new Uint8Array([0xc3,0x28])]){
  worker.stageContentTransfers([{...expected,bytes:corrupt.buffer}]);
  const before=fetches;await assert.rejects(worker.content(expected));assert.equal(fetches,before);
  assert.deepEqual(worker.stats(),{entries:0,retainedBytes:0});
  assert.deepEqual(await worker.content(expected),value);assert.equal(fetches,before+1);
 }
 worker.stageContentTransfers([{...expected,release:hash('Foreign'),bytes:bytes({text:'Changed'}).buffer}]);
 assert.deepEqual(await worker.content(expected),value);
});

await test('unverified data and clients without retention never offer transfer bytes',async()=>{
 const value={text:'Expected'},expected=ref(value);
 const main=createDatabaseSourceClient({transferBytes:1024,fetchImpl:async()=>response({text:'Changed'})});
 await assert.rejects(main.content(expected));assert.deepEqual(main.copyContentTransfers([expected]),[]);
 assert.deepEqual(main.transferStats(),{entries:0,retainedBytes:0});
 const off=createDatabaseSourceClient({fetchImpl:async()=>response(value)});
 await off.content(expected);assert.deepEqual(off.copyContentTransfers([expected]),[]);
});
