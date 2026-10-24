import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {serveCatalogue} from './server.mjs';
import {startupCheck,startupFailureReason} from './startup-diagnostics.mjs';

function request(url,{path='/api/v1/health',method='GET',headers={}}={}) {
 return new Promise((resolve,reject)=>{
  const req=http.request(new URL(url),{path,method,headers,agent:false},res=>{
   let body='';res.setEncoding('utf8');res.on('data',part=>body+=part);
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
  });req.on('error',reject);req.end();
 });
}

test('read-only HTTP rejects cross-site, forged host, write and oversized requests',async t=>{
 const app=await serveCatalogue({});t.after(()=>app.close());
 assert.equal(app.server.address().address,'127.0.0.1');
 const ok=await request(app.url);assert.equal(ok.status,200);
 for(const [key,value] of Object.entries({'x-content-type-options':'nosniff','x-frame-options':'DENY',
  'referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin','x-robots-tag':'noindex, nofollow'}))
  assert.equal(ok.headers[key],value);
 assert(!ok.headers['access-control-allow-origin']);
 const cases=[
  [{headers:{host:'example.invalid'}},403],
  [{headers:{origin:'https://example.invalid'}},403],
  [{headers:{'sec-fetch-site':'cross-site'}},403],
  [{method:'POST'},405],[{method:'PUT'},405],[{method:'DELETE'},405],
  [{headers:{'content-length':'1'}},400],
  [{path:'/api/v1/health?'+ 'x'.repeat(2050)},414],
  [{path:'http://example.invalid/api/v1/health'},400],
  [{path:'//example.invalid/api/v1/health'},400],
  [{headers:{'x-large':'x'.repeat(9000)}},431],
  [{headers:Object.fromEntries(Array.from({length:35},(_,i)=>['x-'+i,'1']))},431],
  [{headers:{Expect:'100-continue','content-length':'100'}},417],
  [{path:'/api/v1/catalogue?release=invalid'},400],
  [{path:'/.env'},404],[{path:'/catalogue.sqlite'},404],[{path:'/admin'},404],
 ];
 for(const [options,status] of cases)assert.equal((await request(app.url,options)).status,status,JSON.stringify(options));
 assert.equal((await request(app.url,{method:'POST'})).headers.allow,'GET');
 assert.equal(app.server.requestTimeout,10000);assert.equal(app.server.headersTimeout,10000);
 assert.equal(app.server.timeout,15000);assert.equal(app.server.maxRequestsPerSocket,100);
});

test('errors do not expose database paths, queries or private input',async t=>{
 const secret='CANARY-private-database-and-question';
 const logs=[];t.mock.method(console,'error',line=>logs.push(line));
 let failure=Error(secret);
 const app=await serveCatalogue({catalogue(){throw failure;}});t.after(()=>app.close());
 const ids=new Set();
 for(const thrown of [Error(secret),null,secret]){
  failure=thrown;
  const result=await request(app.url,{path:'/api/v1/catalogue?release='+'a'.repeat(64)+'&q='+secret,
   headers:{'X-Request-ID':secret,Authorization:secret,Cookie:secret}});
  assert.equal(result.status,500);assert.deepEqual(JSON.parse(result.body),{error:'Request failed'});
  const id=result.headers['x-request-id'];assert.match(id,/^[a-f0-9-]{36}$/);ids.add(id);
  const entry=JSON.parse(logs.at(-1));
  assert.deepEqual(Object.keys(entry).sort(),['event','requestId','status','time']);
  assert.equal(entry.event,'catalogue_request_failed');assert.equal(entry.requestId,id);assert.equal(entry.status,500);
  assert.equal(new Date(entry.time).toISOString(),entry.time);
  assert(!JSON.stringify(result).includes(secret));
 }
 assert.equal(ids.size,3);assert.equal(logs.length,3);assert(!logs.join('').includes(secret));
 const healthy=await request(app.url,{headers:{'X-Request-ID':secret}});
 assert.equal(healthy.status,200);assert.match(healthy.headers['x-request-id'],/^[a-f0-9-]{36}$/);
 assert.equal(logs.length,3,'successful health requests produce no access log');
});

test('startup reasons come only from fixed checkpoints, never exception properties or text',async()=>{
 const canary='CANARY-private-start-path';
 for(const thrown of [Error(canary),null,canary,{reason:'listener',message:canary}]){
  assert.equal(startupFailureReason(thrown),'startup');
  assert.throws(()=>startupCheck('web-build',()=>{throw thrown;}),error=>{
   assert.equal(startupFailureReason(error),'web-build');return true;
  });
 }
 await assert.rejects(startupCheck('publication',()=>Promise.reject(Error(canary))),error=>{
  assert.equal(startupFailureReason(error),'publication');return true;
 });
 assert.throws(()=>startupCheck('start-options',()=>startupCheck('settings',()=>{throw Error(canary);})),error=>{
  assert.equal(startupFailureReason(error),'settings');return true;
 });
 assert.throws(()=>startupCheck(canary,()=>{throw Error(canary);}),error=>{
  assert.equal(startupFailureReason(error),'startup');return true;
 });
 assert.equal(startupCheck('web-build',()=>42),42);
 assert.equal(await startupCheck('publication',async()=>42),42);
});

test('local start failures name their check without operator paths or stack traces',()=>{
 const secret='CANARY-private-start-path';
 const root=fileURLToPath(new URL('../',import.meta.url));
 for(const [script,args,message] of [
  ['local-data/server.mjs',[secret],/Catalogue start refused\. Failed check: database-open\./],
  ['scripts/serve-database-web.mjs',['--settings',secret],/Preview start refused\. Failed check: settings\./],
  ['scripts/start-runtime-package.mjs',['--settings',secret],/Runtime start refused\. Failed check: settings\./],
 ]){
  const child=spawnSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);assert.match(child.stderr,message);
  assert(!child.stderr.includes(secret));assert(!child.stderr.includes(root));
  assert(!child.stderr.includes('at file:'));assert.equal(child.stdout,'');
  if(script==='scripts/serve-database-web.mjs')assert.match(child.stderr,/Usage:/);
 }
});

test('shutdown finishes even when a client has not finished sending headers',{timeout:10000},async()=>{
 const app=await serveCatalogue({});
 const socket=net.connect(app.server.address().port,'127.0.0.1');
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});
 socket.write('GET /api/v1/health HTTP/1.1\r\n');
 try {await app.close();assert.equal(app.server.listening,false);}finally{socket.destroy();}
});
