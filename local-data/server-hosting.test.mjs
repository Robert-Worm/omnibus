import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {runtimeFixture} from './test-support/runtime-fixture.mjs';
import {CatalogueRepository,digest} from './repository.mjs';
import {prepareWebResources} from './web-resources.mjs';
import {publishRuntime,readRuntimePublication} from './runtime-publication.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {createHostingPolicy} from './hosting-policy.mjs';
import {serveCatalogue,catalogueRequestLimits} from './server.mjs';

// A header value only: every connection and listener below uses 127.0.0.1.
const authority='omnibus.example.invalid:8443',publicOrigin=`https://${authority}`;
const document=id=>({id,title:id,pages:[{page:1,text:'Synthetic Unicode 😀é '.repeat(100)}]});

function fixture(t){
 const selected=document('selected'),unselected=document('unselected');
 const pack={id:'unselected-package',kind:'report',title:'Synthetic package',records:[
  {id:'point',kind:'point',data:{selection_status:'HOLD',text:'Synthetic excluded record'}},
 ]};
 const f=runtimeFixture(t,{documents:[selected,unselected],packages:[pack]});
 const writer=new CatalogueRepository(f.databasePath);
 let publication,refs,source,foreignRelease;
 try{
  source={schema:1,release:f.release,version:digest(selected),
   indexHash:digest(JSON.stringify(writer.documentIndex(f.release,digest(selected))))};
  refs=prepareWebResources(writer,f.release,{
   selected:{databaseSource:source,text:'Synthetic published content '.repeat(100),selection_status:'HOLD'},
   excluded:{text:'Synthetic unpublished content'},
  });
  const value=readRuntimePublication(writer,{release:f.release,publication:f.publication,contract:runtimeContractHash});
  value.refs={...value.refs,selected:refs.selected};
  publication=publishRuntime(writer,value,{release:f.release,contract:runtimeContractHash});
  foreignRelease=writer.importRelease({manifest:{baselineVersion:'foreign'},packages:[],documents:[document('foreign')]});
 }finally{writer.close();}
 const webRoot=join(f.dir,'web');
 mkdirSync(join(webRoot,'assets'),{recursive:true});
 writeFileSync(join(webRoot,'database.html'),'<!doctype html><title>Synthetic hosting fixture</title>');
 writeFileSync(join(webRoot,'assets','synthetic.js'),'/* synthetic asset */');
 const manifest={schema:1,release:f.release,publication,contract:runtimeContractHash};
 const writeManifest=(value=manifest)=>writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify(value));
 writeManifest();
 const repository=new CatalogueRepository(f.databasePath,{readOnly:true});
 f.beforeCleanup.push(()=>{if(repository.db.isOpen)repository.close();});
 return {...f,webRoot,repository,refs,source,manifest,writeManifest,foreignRelease,
  unselectedVersion:digest(unselected),packageVersion:digest(pack),
  contentPath:`/api/v1/content/${refs.selected.hash}?release=${f.release}`,
  pagePath:`/api/v1/documents/${source.version}/pages/1`,
  async start(options={}){
   const app=await serveCatalogue(repository,{webRoot,publicOrigin,...options});
   assert.equal(app.server.address().address,'127.0.0.1');
   f.beforeCleanup.push(()=>app.close());return app;
  },
 };
}

function request(app,{path='/api/v1/health',method='GET',headers={Host:authority}}={}){
 return new Promise((resolve,reject)=>{
  const req=http.request(app.url,{path,method,headers,setHost:false,agent:false},res=>{
   const chunks=[];
   res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });
  req.setTimeout(5000,()=>req.destroy(Error('Synthetic request timeout')));
  req.on('error',reject);req.end();
 });
}

function rawRequest(app,wire,{timeout=5000}={}){
 return new Promise((resolve,reject)=>{
  const socket=net.connect(app.server.address().port,'127.0.0.1');
  let raw='';
  socket.setEncoding('utf8');socket.on('data',chunk=>raw+=chunk);
  socket.setTimeout(timeout,()=>socket.destroy(Error('Synthetic socket timeout')));
  socket.on('error',reject);socket.on('end',()=>resolve(raw));
  socket.on('connect',()=>socket.write(wire));
 });
}

function cors(result,origin=publicOrigin){
 assert.equal(result.headers['access-control-allow-origin'],origin);
 assert.equal(result.headers['strict-transport-security'],'max-age=31536000');
 for(const name of ['access-control-allow-credentials','access-control-allow-methods','access-control-allow-headers'])
  assert.equal(result.headers[name],undefined);
 assert(!String(result.headers.vary).toLowerCase().includes('origin'));
}

test('hosting configuration is explicit, canonical and never resolves or binds aliases',async t=>{
 assert.deepEqual(createHostingPolicy(),{publicMode:false,listenHost:'127.0.0.1',mode:'local-read-only'});
 for(const origin of ['https://omnibus.example.invalid',publicOrigin,'https://192.0.2.1','https://[2001:db8::1]:8443']){
  const policy=createHostingPolicy({publicOrigin:origin,webRoot:'synthetic',listenHost:'0.0.0.0'});
  assert.equal(policy.publicOrigin,origin);assert.equal(policy.listenHost,'0.0.0.0');
  assert.equal(policy.authority,new URL(origin).host);assert.equal(policy.mode,'public-read-only');
 }
 // All-interface configuration is validated above, NEVER passed to listen.
 const listening=t.mock.method(net.Server.prototype,'listen',()=>{throw Error('Unexpected listener');});
 const invalidOrigins=[null,'',false,42,{},'http://omnibus.example.invalid','HTTPS://omnibus.example.invalid',
  'https://OMNIBUS.example.invalid','https://omnibus.example.invalid/','https://omnibus.example.invalid/path',
  'https://omnibus.example.invalid?','https://omnibus.example.invalid?q=1','https://omnibus.example.invalid#',
  'https://user@omnibus.example.invalid','https://user:'+'secret@omnibus.example.invalid',
  'https://omnibus.example.invalid:443','https://omnibus.example.invalid:08443','https://omnibus.example.invalid:0',
  'https://omnibus.example.invalid:65536',' https://omnibus.example.invalid','https://omnibus.example.invalid\n',
  'https://*.example.invalid','https://omnibus.example.invalid.','https://a..example.invalid',
  'https://-bad.example.invalid','https://bad_.example.invalid','https://%6fmnibus.example.invalid',
  'https://omnibus.example.invalid\\','https://omnibus.example.invalid\r\nX-Injected: yes',
  'https://127.1','https://0177.0.0.1','https://[2001:DB8::1]'];
 for(const origin of invalidOrigins)
  await assert.rejects(serveCatalogue({}, {publicOrigin:origin,webRoot:'synthetic'}),{message:'Invalid hosting configuration'});
 for(const listenHost of ['0.0.0.0','localhost','::1','::','127.0.0.2','192.0.2.1','',null])
  await assert.rejects(serveCatalogue({}, {listenHost}),{message:'Invalid hosting configuration'});
 for(const listenHost of ['localhost','::1','::','127.0.0.2','192.0.2.1','',null])
  await assert.rejects(serveCatalogue({}, {listenHost,publicOrigin,webRoot:'synthetic'}),{message:'Invalid hosting configuration'});
 for(const webRoot of [undefined,null,'','   ',42])
  await assert.rejects(serveCatalogue({}, {publicOrigin,webRoot}),{message:'Invalid hosting configuration'});
 for(const port of [-1,65536,1.5,'8080',null,NaN])
  await assert.rejects(serveCatalogue({}, {port}),{message:'Invalid catalogue port'});
 assert.equal(listening.mock.callCount(),0);
});

test('public startup validates read-only connection, publication, source scope and web pins before listening',async t=>{
 const f=fixture(t),before=digest(readFileSync(f.databasePath));
 const listening=t.mock.method(net.Server.prototype,'listen',()=>{throw Error('Unexpected listener');});
 const writer=new CatalogueRepository(f.databasePath);
 try{
  await assert.rejects(serveCatalogue(writer,{publicOrigin,webRoot:f.webRoot}),{message:'Runtime readiness startup refused'});
 }finally{writer.close();}
 for(const manifest of [
  {...f.manifest,publication:undefined},{...f.manifest,publication:digest('absent')},
  {...f.manifest,release:f.foreignRelease},{...f.manifest,contract:digest('wrong')},
 ]){
  f.writeManifest(manifest);
  await assert.rejects(f.start(),{message:'Runtime readiness startup refused'});
 }
 f.writeManifest();
 // A valid pinned publication must still fail if its linked source index cannot be verified.
 const index=t.mock.method(f.repository,'documentIndex',()=>null);
 await assert.rejects(f.start(),{message:'Runtime readiness startup refused'});index.mock.restore();
 await assert.rejects(f.start({webRoot:join(f.dir,'absent')}),{message:'Runtime readiness startup refused'});
 assert.equal(listening.mock.callCount(),0);assert.equal(digest(readFileSync(f.databasePath)),before);
});

test('public HTTP uses only its fixed origin while preserving read and response boundaries',{timeout:60000},async t=>{
 const f=fixture(t),before=digest(readFileSync(f.databasePath)),app=await f.start();
 assert.equal(app.server.requestTimeout,10000);assert.equal(app.server.headersTimeout,10000);
 assert.equal(app.server.timeout,15000);assert.equal(app.server.maxRequestsPerSocket,100);
 assert.equal(app.server.maxConnections,catalogueRequestLimits.connections);
 assert.notEqual(app.server.address().port,8443,'public authority is independent of the backend socket');

 await t.test('published content, sources, static files, gzip and 304 carry fixed CORS',async()=>{
  for(const path of ['/',f.contentPath,f.pagePath,`/api/v1/documents/${f.source.version}/index?release=${f.release}`]){
   const result=await request(app,{path,headers:{Host:authority,Origin:publicOrigin}});
   assert.equal(result.status,200,path);cors(result);
   assert.equal(result.headers.vary,'Accept-Encoding');
  }
  const content=await request(app,{path:f.contentPath,headers:{Host:authority,'Accept-Encoding':'gzip'}});
  assert.equal(content.headers['content-encoding'],'gzip');cors(content);
  assert.equal(JSON.parse(gunzipSync(content.body)).selection_status,'HOLD');
  const asset=await request(app,{path:'/assets/synthetic.js'});cors(asset);
  const cached=await request(app,{path:'/assets/synthetic.js',headers:{Host:authority,'If-None-Match':asset.headers.etag}});
  assert.equal(cached.status,304);assert.equal(cached.body.length,0);cors(cached);
 });

 await t.test('only exact public Host and Origin are accepted; raw duplicates are rejected',async()=>{
  const local=new URL(app.url).host;
  for(const host of [local,'localhost:'+app.server.address().port,'omnibus.example.invalid',
   authority+'.hostile.invalid','omnibus.example.invalid.:8443','OMNIBUS.example.invalid:8443',
   authority+':443',authority+', hostile.invalid','other.example.invalid','']){
   const result=await request(app,{headers:{Host:host}});assert.equal(result.status,403,host);cors(result);
  }
  for(const origin of ['', 'null','http://'+authority,publicOrigin+'/',publicOrigin+'.hostile.invalid',
   'https://omnibus.example.invalid','https://OMNIBUS.example.invalid:8443',app.url,publicOrigin+', '+publicOrigin]){
   const result=await request(app,{headers:{Host:authority,Origin:origin}});assert.equal(result.status,403,origin);cors(result);
  }
  for(const headers of [[],['Origin',publicOrigin],['Host',authority,'hOsT',authority],
   ['Host',authority,'Host',local],['Host',local,'Host',authority],
   ['Host',authority,'Origin',publicOrigin,'oRiGiN',publicOrigin],
   ['Host',authority,'Origin','','Origin',publicOrigin]]){
   const result=await request(app,{headers});assert.equal(result.status,400,JSON.stringify(headers));cors(result);
  }
  for(const headers of [{Host:authority,Origin:publicOrigin,'Sec-Fetch-Site':'cross-site'},
   ['Host',authority,'Sec-Fetch-Site','same-origin','Sec-Fetch-Site','cross-site']]){
   const crossSite=await request(app,{headers});assert.equal(crossSite.status,403);cors(crossSite);
  }
  const navigate={'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'};
  const opened=await request(app,{path:'/',headers:{Host:authority,...navigate}});
  assert.equal(opened.status,200,'a link from another site opens the start page');
  for(const [path,headers] of [
   ['/api/v1/health',{Host:authority,...navigate}],
   [f.contentPath,{Host:authority,...navigate}],
   ['/',{Host:authority,...navigate,'Sec-Fetch-Dest':'iframe'}],
   ['/',{Host:authority,...navigate,'Sec-Fetch-Mode':'cors'}],
   ['/',{Host:authority,...navigate,Origin:publicOrigin}],
   ['/',['Host',authority,'Sec-Fetch-Site','cross-site','Sec-Fetch-Mode','navigate','Sec-Fetch-Mode','navigate','Sec-Fetch-Dest','document']],
   ['/',{Host:'localhost:'+app.server.address().port,...navigate}]]){
   const refused=await request(app,{path,headers});assert.equal(refused.status,403,path+' '+JSON.stringify(headers));
  }
 });

 await t.test('forwarded headers and probe aliases never grant access or choose correlation IDs',async()=>{
  const canary='SYNTHETIC-UNTRUSTED-PROXY';
  const spoof={Forwarded:`for=192.0.2.4;host=${authority};proto=https`,'X-Forwarded-Host':authority,
   'X-Forwarded-For':'127.0.0.1','X-Forwarded-Proto':'https','X-Real-IP':'127.0.0.1',
   'CF-Connecting-IP':'127.0.0.1','X-Original-URI':'/api/v1/health','X-Request-ID':canary,'User-Agent':'synthetic-probe'};
  for(const path of ['/',f.contentPath,'/api/v1/health','/api/v1/ready']){
   const denied=await request(app,{path,headers:{Host:'localhost:'+app.server.address().port,...spoof}});
   assert.equal(denied.status,403);cors(denied);
  }
  const denied=await request(app,{headers:{Host:authority,Origin:'https://hostile.invalid',...spoof}});
  assert.equal(denied.status,403);cors(denied);
  const accepted=await request(app,{headers:{Host:authority,...spoof}});
  assert.equal(accepted.status,200);cors(accepted);
  assert.match(accepted.headers['x-request-id'],/^[a-f0-9-]{36}$/);
  assert(!JSON.stringify(accepted).includes(canary));
 });

 await t.test('method, body, target, header and publication restrictions still apply',async()=>{
  const cases=[
   ...['POST','PUT','DELETE','HEAD','OPTIONS'].map(method=>[{method},405]),
   [{headers:{Host:authority,'Content-Length':'1'}},400],
   [{headers:{Host:authority,'Transfer-Encoding':'chunked'}},400],
   [{path:'http://'+authority+'/api/v1/health'},400],
   [{path:'//'+authority+'/api/v1/health'},400],[{path:'/\\api/v1/health'},400],
   [{path:'/api/v1/health?'+'x'.repeat(2050)},414],
   [{headers:{Host:authority,...Object.fromEntries(Array.from({length:33},(_,i)=>['X-'+i,'1']))}},431],
   [{path:`/api/v1/content/${f.refs.selected.hash}`},400],
   [{path:f.contentPath+'&release='+f.release},400],
   ...['/api/v1/releases',`/api/v1/catalogue?release=${f.release}`,`/api/v1/documents?release=${f.release}`,
    `/api/v1/content/${f.refs.excluded.hash}?release=${f.release}`,
    `/api/v1/content/${f.refs.selected.hash}?release=${f.foreignRelease}`,
    `/api/v1/documents/${f.unselectedVersion}/pages/1`,
    `/api/v1/packages/${f.packageVersion}/records`,
    '/omnibus-release.json','/synthetic.sqlite','/.env','/admin','/workbench'].map(path=>[{path},404]),
  ];
  for(const [options,status] of cases){
   const result=await request(app,options);assert.equal(result.status,status,JSON.stringify(options));cors(result);
   if(status===405)assert.equal(result.headers.allow,'GET');
  }
 });

 await t.test('health and ready reject every query form and reveal only small fixed states',async()=>{
  for(const [path,status] of [['/api/v1/health','ok'],['/api/v1/ready','ready']]){
   const result=await request(app,{path});assert.equal(result.status,200);cors(result);
   assert.deepEqual(JSON.parse(result.body),{status,mode:'public-read-only',schema:1});
   assert.equal(result.headers['cache-control'],'no-store');
   for(const query of ['?probe=1','?','?&&','?release='+f.release]){
    const denied=await request(app,{path:path+query});assert.equal(denied.status,400);cors(denied);
   }
  }
 });

 await t.test('Expect paths reject before reads, without sending 100 Continue',async()=>{
  for(const expect of ['100-continue','synthetic-expectation']){
   for(const [extra,status] of [['',417],['Origin: null\r\n',403],['Host: '+authority+'\r\n',400]]){
    const raw=await rawRequest(app,`GET ${f.pagePath} HTTP/1.1\r\nHost: ${authority}\r\n`+
     `Expect: ${expect}\r\nContent-Length: 100\r\n${extra}\r\n`);
    assert.match(raw,new RegExp(`^HTTP/1.1 ${status} `));assert(!raw.includes('100 Continue'));
    assert(raw.includes(`Access-Control-Allow-Origin: ${publicOrigin}\r\n`));
   }
  }
 });

 await t.test('parser and automatic missing-Host errors retain fixed CORS without input leakage',async()=>{
  const canary='SYNTHETIC-PARSER-PRIVATE';
  for(const [wire,status] of [
   ['BROKEN\r\n\r\n',400],
   ['GET /api/v1/health HTTP/1.1\r\nConnection: close\r\n\r\n',400],
   ['GET /api/v1/health HTTP/1.0\r\n\r\n',400],
   [`GET /${canary} HTTP/1.1\r\nHost: ${authority}\r\nX-Bad: \x01${canary}\r\n\r\n`,400],
   [`GET / HTTP/1.1\r\nHost: ${authority}\r\nContent-Length: 0\r\nContent-Length: 0\r\n\r\n`,400],
   [`GET / HTTP/1.1\r\nHost: ${authority}\r\nContent-Length: 1\r\nTransfer-Encoding: chunked\r\n\r\n`,400],
   [`GET / HTTP/1.1\r\nHost: ${authority}\r\nX-Large: ${'x'.repeat(9000)}\r\n\r\n`,431],
  ]){
   const raw=await rawRequest(app,wire);
   assert.match(raw,new RegExp(`^HTTP/1.1 ${status} `));
   assert(raw.includes(`Access-Control-Allow-Origin: ${publicOrigin}\r\n`));assert(!raw.includes(canary));
   assert(raw.includes('Strict-Transport-Security: max-age=31536000\r\n'));
  }
 });

 await t.test('header timeout returns fixed CORS and malformed pipelines close without a second response',async()=>{
  const timeout=await rawRequest(app,`GET / HTTP/1.1\r\nHost: ${authority}\r\n`,{timeout:14000});
  assert.match(timeout,/^HTTP\/1.1 408 /);
  assert(timeout.includes(`Access-Control-Allow-Origin: ${publicOrigin}\r\n`));
  assert(timeout.includes('Strict-Transport-Security: max-age=31536000\r\n'));
  const pipeline=await rawRequest(app,`GET /assets/synthetic.js HTTP/1.1\r\nHost: ${authority}\r\n\r\nBROKEN\r\n\r\n`);
  assert(!pipeline.includes('HTTP/1.1 400'),'never append a parser status inside a pending static response');
  assert.equal((await request(app)).status,200);
 });

 await t.test('Node per-socket overflow responses have the same fixed CORS',async()=>{
  // The production limit remains 100; exercise the automatic response with a
  // smaller limit only on this test instance, then restore it immediately.
  app.server.maxRequestsPerSocket=1;
  try{
   const wire=`GET /api/v1/health HTTP/1.1\r\nHost: ${authority}\r\n\r\n`;
   const raw=await rawRequest(app,wire+`GET /api/v1/health HTTP/1.1\r\nHost: ${authority}\r\nConnection: close\r\n\r\n`);
   const responses=raw.split(/(?=HTTP\/1\.1 \d{3} )/).filter(Boolean);
   assert.equal(responses.length,2);assert.match(responses[1],/^HTTP\/1.1 503 /);
   for(const response of responses){
    assert(response.includes(`Access-Control-Allow-Origin: ${publicOrigin}\r\n`));
    assert(response.includes('Strict-Transport-Security: max-age=31536000\r\n'));
   }
  }finally{app.server.maxRequestsPerSocket=100;}
 });

 await t.test('application errors redact input and readiness failure keeps fixed CORS',async()=>{
  const canary='SYNTHETIC-SECRET-SOURCE-AND-PATH',logs=[];
  const logger=t.mock.method(console,'error',line=>logs.push(line));
  const page=t.mock.method(f.repository,'page',()=>{throw Error(canary);});
  const result=await request(app,{path:f.pagePath+'?q='+canary,
   headers:{Host:authority,Authorization:canary,Cookie:canary,'X-Request-ID':canary}});
  assert.equal(result.status,500);cors(result);assert.deepEqual(JSON.parse(result.body),{error:'Request failed'});
  assert.equal(logs.length,1);const entry=JSON.parse(logs[0]);
  assert.deepEqual(Object.keys(entry).sort(),['event','requestId','status','time']);
  assert.equal(entry.requestId,result.headers['x-request-id']);assert.equal(entry.status,500);
  assert(!JSON.stringify(result).includes(canary));assert(!logs[0].includes(canary));
  page.mock.restore();logger.mock.restore();
  assert.equal(digest(readFileSync(f.databasePath)),before,'all requests preserve synthetic database bytes');
  f.repository.close();
  const ready=await request(app,{path:'/api/v1/ready'});assert.equal(ready.status,503);cors(ready);
  assert.equal(ready.headers['retry-after'],'1');
  assert.deepEqual(JSON.parse(ready.body),{status:'not-ready',mode:'public-read-only',schema:1});
  const health=await request(app);assert.equal(health.status,200);cors(health);
 });
});

test('local defaults and standalone routes retain local Host, Origin, mode and absence of CORS',async t=>{
 const app=await serveCatalogue({releases:()=>[]});t.after(()=>app.close());
 const local=new URL(app.url).host;
 assert.equal(app.server.address().address,'127.0.0.1');
 for(const path of ['/api/v1/health','/api/v1/releases']){
  const result=await request(app,{path,headers:{Host:local,Origin:app.url}});
  assert.equal(result.status,200);assert.equal(result.headers['access-control-allow-origin'],undefined);
  assert.equal(result.headers['strict-transport-security'],undefined);
  if(path.endsWith('health'))assert.deepEqual(JSON.parse(result.body),{status:'ok',mode:'local-read-only',schema:1});
 }
 for(const path of ['/api/v1/health?probe=1','/api/v1/ready?probe=1'])
  assert.equal((await request(app,{path,headers:{Host:local}})).status,400);
 assert.equal((await request(app,{path:'/api/v1/ready',headers:{Host:local}})).status,404);
 for(const headers of [{Host:authority},{Host:local,Origin:publicOrigin},{Host:local,Expect:'100-continue'}]){
  const result=await request(app,{headers});assert.equal(result.status,headers.Expect?417:403);
  assert.equal(result.headers['access-control-allow-origin'],undefined);
 }
});

test('local HTTP, localhost HTTPS and IP origins never enable HSTS through forged proxy headers',async t=>{
 const f=fixture(t);
 for(const origin of ['http://localhost:8080','http://127.0.0.1:8080',
  'https://localhost','https://preview.localhost','https://127.0.0.1','https://[::1]',
  'https://192.0.2.1','https://[2001:db8::1]']){
  assert.equal(createHostingPolicy({publicOrigin:origin,webRoot:f.webRoot}).hsts,null);
  const app=await f.start({publicOrigin:origin});
  const headers={Host:new URL(origin).host,'X-Forwarded-Proto':'https',
   'X-Forwarded-Host':authority,Forwarded:'proto=https;host='+authority};
  for(const path of ['/','/api/v1/health','/api/v1/ready','/missing']){
   const result=await request(app,{path,headers});
   assert.equal(result.status,path==='/missing'?404:200);
   assert.equal(result.headers['strict-transport-security'],undefined);
  }
  const raw=await rawRequest(app,'BROKEN\r\n\r\n');
  assert.match(raw,/^HTTP\/1.1 400 /);assert(!raw.toLowerCase().includes('strict-transport-security'));
 }
 const local=await serveCatalogue({});t.after(()=>local.close());
 const response=await request(local,{headers:{Host:new URL(local.url).host,'X-Forwarded-Proto':'https'}});
 assert.equal(response.status,200);assert.equal(response.headers['strict-transport-security'],undefined);
});
