import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDatabaseSourceClient} from './database-source-client.mjs';
import {parseContentBatchQuery,contentBatchLimits as limits} from './content-batch-contract.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex'),release=hash('synthetic release');
const ref=value=>({release,hash:hash(JSON.stringify(value)),bytes:Buffer.byteLength(JSON.stringify(value))});
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function service(values,observe=()=>{}) {
 const byHash=new Map(values.map(value=>[ref(value).hash,value]));
 return async(url,options)=>{
  observe(url,options);const u=new URL(url,'https://example.invalid');
  if(u.pathname==='/api/v1/content-batch'){
   const query=parseContentBatchQuery(u.searchParams);
   return json({release:query.release,items:query.hashes.map(hash=>({hash,value:byHash.get(hash)}))});
  }
  return json(byHash.get(u.pathname.split('/').at(-1)));
 };
}

test('a large restore groups only requested sources, preserving hashes, order and cache',async()=>{
 const values=Array.from({length:70},(_,id)=>({id,text:'Synthetic source 😀'})),calls=[];
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:service(values,(url,options)=>{
  assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');calls.push(url);
 })});
 assert.deepEqual(await Promise.all(values.map(value=>client.content(ref(value)))),values);
 assert(calls.length<20,calls.length+' requests instead of 70');
 assert(calls.every(url=>new URL(url,'https://example.invalid').searchParams.getAll('hash').length<=limits.entries));
 const count=calls.length;assert.deepEqual(await client.content(ref(values.at(-1))),values.at(-1));assert.equal(calls.length,count);
});

test('larger pending batches start first without regrouping sources or reordering caller results',async()=>{
 const values=Array.from({length:18},(_,id)=>({id,text:'Exacte bron 🧭 '.repeat(1+Math.floor(id/6)*100)}));
 const refs=values.map(ref),calls=[];
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:service(values,url=>calls.push(url))});
 assert.deepEqual(await Promise.all(refs.map(r=>client.content(r))),values);
 const batches=calls.map(url=>new URL(url,'https://example.invalid').searchParams.getAll('hash'));
 assert.deepEqual(batches,[refs.slice(12),refs.slice(6,12),refs.slice(0,6)].map(group=>group.map(r=>r.hash)));
 assert(batches.every(group=>group.length<=limits.entries));
 assert(batches.every(group=>group.reduce((n,id)=>n+refs.find(r=>r.hash===id).bytes,limits.overhead)<=limits.bytes));
});

test('a batch canonicalizes each source once and decodes UTF-8 only at the envelope boundary',async()=>{
 const values=[{probe:'one',text:'Exacte bron 🧭 é界',norms:Array.from({length:200},(_,id)=>({id,text:'Nieuwe norm 🧭 é界 '+id}))},
  {probe:'two',nested:{value:'Other'}}];
 const refs=values.map(ref),body=JSON.stringify({release,items:values.map((value,i)=>({hash:refs[i].hash,value}))},null,2);
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>new Response(body,{headers:{'Content-Type':'application/json'}})});
 const original=JSON.stringify,decode=Object.getOwnPropertyDescriptor(TextDecoder.prototype,'decode'),counts=new Map();let results,decodes=0;
 TextDecoder.prototype.decode=function(...args){decodes++;return decode.value.apply(this,args);};
 JSON.stringify=function(value,...args){
  if(value?.probe)counts.set(value.probe,(counts.get(value.probe)??0)+1);
  return original.call(this,value,...args);
 };
 try{results=await Promise.all(refs.map(r=>client.content(r)));}finally{JSON.stringify=original;Object.defineProperty(TextDecoder.prototype,'decode',decode);}
 assert.deepEqual(results,values);assert.deepEqual([...counts],[['one',1],['two',1]]);
 assert.equal(decodes,1,'No per-source UTF-8 round trip after the batch envelope was decoded');
});

test('concurrent duplicate consumers and worker transfers retain independent, exact source values',async()=>{
 const values=[{id:1,nested:{text:'Original'}},{id:2,nested:{text:'Other'}}];
 const client=createDatabaseSourceClient({batchContent:true,maxEntries:0,transferBytes:1024,fetchImpl:service(values)});
 const first=client.content(ref(values[0])),second=client.content(ref(values[0])),other=client.content(ref(values[1]));
 const a=await first;a.nested.text='User edit';
 const b=await second;assert.deepEqual(b,values[0]);assert.notEqual(a,b);assert.deepEqual(await other,values[1]);
 const worker=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>{throw Error('Unexpected network request');}});
 worker.stageContentTransfers(client.copyContentTransfers(values.map(ref)));
 assert.deepEqual(await Promise.all(values.map(value=>worker.content(ref(value)))),values);
});

test('canonical JSON normalization is unchanged for unusual JSON numbers and escaped text',async()=>{
 const values=[{n:null,z:0,text:'\ud800\n🧭'},null],refs=values.map(ref);
 const body='{"release":"'+release+'","items":[{"hash":"'+refs[0].hash+'","value":{"n":1e400,"z":-0,"text":"\\ud800\\n🧭"}},{"hash":"'+refs[1].hash+'","value":null}]}';
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>new Response(body,{headers:{'Content-Type':'application/json'}})});
 assert.deepEqual(await Promise.all(refs.map(r=>client.content(r))),values);
});

test('canonical markers supplied by the network or a worker cannot bypass hash checks',async()=>{
 const expected={text:'Expected'},spoofed={text:'Changed',canonical:true,bytes:[1,2,3]},refs=[ref(expected),ref({text:'Other'})];
 const raw=JSON.stringify(spoofed);
 const single=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>new Response(raw,{headers:{'Content-Type':'application/json'}})});
 await assert.rejects(single.content(refs[0]),/vastgelegde versie/);
 const incoming={...refs[0],bytes:new TextEncoder().encode(raw).buffer,canonical:true};
 const worker=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>{throw Error('Unexpected network request');}});
 worker.stageContentTransfers([incoming]);await assert.rejects(worker.content(refs[0]),/vastgelegde versie/);
 const changed={text:'Replaced'},batch=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>json({release,canonical:true,items:[
  {hash:refs[0].hash,canonical:true,value:changed},{hash:refs[1].hash,canonical:true,value:{text:'Other'}},
 ]})});
 const results=await Promise.allSettled(refs.map(r=>batch.content(r)));
 assert.equal(results[0].status,'rejected');assert.match(results[0].reason.message,/vastgelegde versie/);
 assert.equal(results[1].status,'fulfilled');assert.deepEqual(results[1].value,{text:'Other'});
});

test('batches and single reads share six response slots; queued work does not consume its network timeout',async()=>{
 const values=Array.from({length:200},(_,id)=>({id})),serve=service(values);let active=0,peak=0;
 const client=createDatabaseSourceClient({batchContent:true,timeoutMs:100,fetchImpl:async(url,options)=>{
  peak=Math.max(peak,++active);const response=await serve(url,options),text=await response.text();
  return new Response(new ReadableStream({start(body){setTimeout(()=>{
   active--;body.enqueue(new TextEncoder().encode(text));body.close();
  },30);}}),{headers:{'Content-Type':'application/json'}});
 }});
 const results=await Promise.all(values.map((value,i)=>client.content(i%17?ref(value):{release,hash:ref(value).hash})));
 assert.deepEqual(results,values);assert.equal(peak,6);assert.equal(active,0);
});

test('duplicates share a response; releases, byte budgets and size-less callers remain separate',async()=>{
 const values=[{id:1,text:'a'.repeat(1100000)},{id:2,text:'b'.repeat(1100000)},{id:3,text:'Small'}],calls=[];
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:service(values,url=>calls.push(url))});
 const refs=[ref(values[0]),ref(values[1]),ref(values[2]),{...ref(values[2]),release:hash('other release')}];
 assert.deepEqual(await Promise.all(refs.map(r=>client.content(r))),[values[0],values[1],values[2],values[2]]);
 for(const url of calls){const q=new URL(url,'https://example.invalid').searchParams;
  const bytes=q.getAll('hash').reduce((n,id)=>n+refs.find(r=>r.hash===id).bytes,limits.overhead);assert(bytes<=limits.bytes);
 }
 const small=[{id:4},{id:5}],sameCalls=[];
 const other=createDatabaseSourceClient({batchContent:true,fetchImpl:service(small,url=>sameCalls.push(url))});
 assert.deepEqual(await Promise.all([small[0],small[0],small[1]].map(v=>other.content(ref(v)))),[small[0],small[0],small[1]]);
 assert.equal(sameCalls.length,1);assert.equal(new URL(sameCalls[0],'https://example.invalid').searchParams.getAll('hash').length,2);
 const legacy=createDatabaseSourceClient({batchContent:true,fetchImpl:service(small,url=>assert(!url.includes('content-batch')))});
 await Promise.all(small.map(v=>legacy.content({release,hash:ref(v).hash})));
});

test('malformed envelopes, wrong release, duplicate/foreign entries, wrong size and changed hashes are rejected',async()=>{
 const values=[{text:'Original A'},{text:'Original B'}],refs=values.map(ref);
 const valid=()=>({release,items:values.map((value,i)=>({hash:refs[i].hash,value}))});
 for(const corrupt of [()=>({}),()=>({...valid(),release:hash('wrong')}),()=>({...valid(),items:[]}),
  ()=>({...valid(),items:[valid().items[0],valid().items[0]]}),
  ()=>({...valid(),items:valid().items.map(item=>({...item,hash:hash('foreign')}))}),
  ()=>({...valid(),items:valid().items.map(item=>({...item,value:{text:'Wrong size'}}))}),
  ()=>({...valid(),items:valid().items.map(item=>({...item,value:{text:item.value.text.replace('Original','Replaced')}}))}),
 ]){
  const client=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>json(corrupt())});
  const results=await Promise.allSettled(refs.map(r=>client.content(r)));
  assert(results.every(result=>result.status==='rejected'));assert.equal(client.stats().entries,0);
 }
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:service(values)});
 assert.deepEqual(await Promise.all(refs.map(r=>client.content(r))),values);
});

test('only an unsupported 404 batch falls back to the original scoped routes; other errors remain visible',async()=>{
 const values=[{id:1},{id:2},{id:3},{id:4}],calls=[];
 const serve=service(values);
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:async(url,options)=>{
  calls.push(url);return url.includes('content-batch')?new Response('{}',{status:404}):serve(url,options);
 }});
 assert.deepEqual(await Promise.all(values.slice(0,2).map(v=>client.content(ref(v)))),values.slice(0,2));
 assert.deepEqual(await Promise.all(values.slice(2).map(v=>client.content(ref(v)))),values.slice(2));
 assert.equal(calls.filter(url=>url.includes('content-batch')).length,1);
 for(const status of [400,403,429,500,503]){
  let count=0;const refused=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>{count++;return new Response('{}',{status});}});
  const results=await Promise.allSettled(values.slice(0,2).map(v=>refused.content(ref(v))));
  assert(results.every(r=>r.status==='rejected'));assert.equal(count,1);assert.equal(refused.stats().entries,0);
 }
});

test('cancelling one consumer does not abort its neighbours; cancelling all releases the fetch and retries work',async()=>{
 const values=[{id:1},{id:2}],controllers=values.map(()=>new AbortController());let started,continueFetch,shared;
 const begun=new Promise(resolve=>started=resolve),serve=service(values);
 const client=createDatabaseSourceClient({batchContent:true,fetchImpl:async(url,options)=>{
  shared=options.signal;started();await new Promise(resolve=>continueFetch=resolve);return serve(url,options);
 }});
 const first=client.content(ref(values[0]),{signal:controllers[0].signal}),failed=assert.rejects(first,{name:'AbortError'});
 const second=client.content(ref(values[1]),{signal:controllers[1].signal});
 await begun;controllers[0].abort();await failed;assert.equal(shared.aborted,false);continueFetch();
 assert.deepEqual(await second,values[1]);assert.equal(client.stats().entries,1);
 let retry=false,aborted=0;
 const slow=createDatabaseSourceClient({batchContent:true,timeoutMs:20,fetchImpl:async(url,options)=>{
  if(retry)return serve(url,options);
  return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted++;reject(options.signal.reason);},{once:true}));
 }});
 const results=await Promise.allSettled(values.map(v=>slow.content(ref(v))));
 assert(results.every(r=>r.status==='rejected'));assert.equal(aborted,1);assert.equal(slow.stats().entries,0);
 retry=true;assert.deepEqual(await Promise.all(values.map(v=>slow.content(ref(v)))),values);
 const c=new AbortController();c.abort();let fetched=false;
 const cancelled=createDatabaseSourceClient({batchContent:true,fetchImpl:async()=>{fetched=true;return json({});}});
 await assert.rejects(cancelled.content(ref(values[0]),{signal:c.signal}),{name:'AbortError'});await delay(5);assert.equal(fetched,false);
});
