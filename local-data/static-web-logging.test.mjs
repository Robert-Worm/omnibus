import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {brotliCompressSync, brotliDecompressSync} from 'node:zlib';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {runtimeFixture} from './test-support/runtime-fixture.mjs';
import {CatalogueRepository, digest} from './repository.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {serveCatalogue} from './server.mjs';

const authority='omnibus.example.invalid', publicOrigin='https://'+authority;
function request(app,path,headers={Host:authority}) {
  return new Promise((resolve,reject)=>{
    const req=http.get(app.url,{path,headers,agent:false},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.once('error',reject);
      res.once('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });req.once('error',reject);
  });
}
function fixture(t) {
  const f=runtimeFixture(t), webRoot=join(f.dir,'web');
  mkdirSync(join(webRoot,'assets'),{recursive:true});
  writeFileSync(join(webRoot,'database.html'),'<!doctype html><title>Synthetic</title>');
  writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,release:f.release,publication:f.publication,contract:runtimeContractHash}));
  const repository=new CatalogueRepository(f.databasePath,{readOnly:true});
  f.beforeCleanup.push(()=>repository.close());
  return {...f,webRoot,async start() {
    const app=await serveCatalogue(repository,{webRoot,publicOrigin});
    f.beforeCleanup.push(()=>app.close()); return app;
  }};
}

await test('asynchronous asset failures log only the server request ID once and still fail closed',async t=>{
  const f=fixture(t), source='/* '+'synthetic source 🧭 '.repeat(100)+' */';
  const filename='report-content-'+digest(source)+'.js', file=join(f.webRoot,'assets',filename);
  const compressed=brotliCompressSync(source);
  writeFileSync(file,source);writeFileSync(file+'.br',compressed);
  const before=digest(readFileSync(f.databasePath)),app=await f.start(), logs=[];
  t.mock.method(console,'error',line=>logs.push(line));
  const headers={Host:authority,'Accept-Encoding':'br','X-Request-ID':'private-caller-canary','Cookie':'private-cookie-canary'};
  for(const change of [()=>writeFileSync(file,source.replace('source','wrong!')),()=>rmSync(file),
    ()=>writeFileSync(file+'.br',Buffer.from('private-content-canary')),()=>rmSync(file+'.br')]) {
    writeFileSync(file,source);writeFileSync(file+'.br',compressed);change();
    const previous=logs.length;
    const response=await request(app,'/assets/'+filename+'?private-query-canary',headers);
    assert.equal(response.status,500);assert.equal(response.body.length,0);
    assert.equal(response.headers.etag,undefined);assert.equal(response.headers['cache-control'],'no-store');
    await nextTurn();
    assert.equal(logs.length,previous+1);
    const event=JSON.parse(logs.at(-1));
    assert.deepEqual(Object.keys(event),['event','requestId','status','time']);
    assert.equal(event.event,'catalogue_request_failed');assert.equal(event.status,500);
    assert.equal(event.requestId,response.headers['x-request-id']);assert.match(event.requestId,/^[\da-f-]{36}$/);
    assert.ok(Number.isFinite(Date.parse(event.time)));
  }
  writeFileSync(file,source);writeFileSync(file+'.br',compressed);
  const restored=await request(app,'/assets/'+filename,headers);assert.equal(brotliDecompressSync(restored.body).toString(),source);
  assert.equal(logs.length,4,JSON.stringify(logs));
  assert.ok(!logs.join('').includes('canary'));assert.ok(!logs.join('').includes(f.dir));assert.ok(!logs.join('').includes(filename));
  assert.equal(digest(readFileSync(f.databasePath)),before);
});

await test('ordinary asset stream errors are logged, but client disconnects are not',async t=>{
  const f=fixture(t), file=join(f.webRoot,'assets','synthetic.js');
  writeFileSync(file,'/*'+'x'.repeat(8*1024*1024)+'*/');
  const app=await f.start(),logs=[];
  let logged;
  const failed=new Promise(resolve=>logged=resolve);
  t.mock.method(console,'error',line=>{logs.push(line);logged();});
  const closed=new Promise(resolve=>app.server.once('request',(_req,res)=>res.once('close',resolve)));
  await new Promise((resolve,reject)=>{
    const req=http.get(app.url+'/assets/synthetic.js',{headers:{Host:authority,'Accept-Encoding':'identity'}},res=>{
      res.once('data',()=>{res.destroy();resolve();});res.once('error',reject);
    });req.once('error',reject);
  });
  await closed;await nextTurn();assert.equal(logs.length,0);
  rmSync(file);
  await assert.rejects(request(app,'/assets/synthetic.js'));
  await failed;assert.equal(logs.length,1);
  assert.deepEqual(Object.keys(JSON.parse(logs[0])),['event','requestId','status','time']);
  assert.ok(!logs[0].includes(f.dir));assert.ok(!logs[0].includes('synthetic.js'));
});
