import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runtimeFixture} from './test-support/runtime-fixture.mjs';
import {CatalogueRepository, digest} from './repository.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {serveCatalogue} from './server.mjs';

async function fixture(t) {
  const f=runtimeFixture(t), webRoot=join(f.dir,'web');
  mkdirSync(join(webRoot,'assets'),{recursive:true});
  writeFileSync(join(webRoot,'database.html'),'<!doctype html><title>Synthetic readiness</title>');
  writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,
    release:f.release,publication:f.publication,contract:runtimeContractHash}));
  const repository=new CatalogueRepository(f.databasePath,{readOnly:true});
  f.beforeCleanup.push(()=>{if(repository.db.isOpen)repository.close();});
  const app=await serveCatalogue(repository,{webRoot});
  f.beforeCleanup.push(()=>app.close());
  return {...f,repository,app};
}

function request(url,path='/api/v1/ready',options={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request(url+path,options,res=>{
      let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);
      res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
    });
    req.on('error',reject);req.end();
  });
}
const payload=status=>({status,mode:'local-read-only',schema:1});

test('web readiness is pinned, no-store, read-only and behind existing request guards',async t=>{
  const f=await fixture(t),before=digest(readFileSync(f.databasePath));
  const result=await request(f.app.url);
  assert.equal(result.status,200);assert.deepEqual(JSON.parse(result.body),payload('ready'));
  assert.equal(result.headers['cache-control'],'no-store');
  for(const [options,status] of [
    [{headers:{Host:'hostile.invalid'}},403],
    [{headers:{Origin:'https://hostile.invalid'}},403],
    [{headers:{'Sec-Fetch-Site':'cross-site'}},403],
    [{method:'POST'},405],
    [{headers:{'Content-Length':'1'}},400],
  ]) assert.equal((await request(f.app.url,'/api/v1/ready',options)).status,status);
  for(const query of ['?release='+f.release,'?publication='+f.publication,'?release=other&release=other'])
    assert.equal((await request(f.app.url,'/api/v1/ready'+query)).status,400);
  assert.equal((await request(f.app.url,'/api/v1/catalogue?release='+f.release)).status,404);
  assert.equal(digest(readFileSync(f.databasePath)),before);
});

test('readiness fails closed after database closure while liveness stays explicit',async t=>{
  const f=await fixture(t);f.repository.close();
  const response=await request(f.app.url);
  assert.equal(response.status,503);assert.equal(response.headers['retry-after'],'1');
  assert.equal(response.headers['cache-control'],'no-store');
  assert.deepEqual(JSON.parse(response.body),payload('not-ready'));
  assert(!response.body.includes(f.databasePath));assert(!response.body.includes(f.publication));
  const health=await request(f.app.url,'/api/v1/health');
  assert.equal(health.status,200);assert.deepEqual(JSON.parse(health.body),payload('ok'));
});

test('temporary locks recover but an observed commit cannot silently establish a new baseline',async t=>{
  const f=await fixture(t),writer=new CatalogueRepository(f.databasePath);
  f.beforeCleanup.push(()=>{if(writer.db.isTransaction)writer.db.exec('ROLLBACK');writer.close();});
  writer.db.exec('BEGIN EXCLUSIVE');
  assert.equal((await request(f.app.url)).status,503);
  assert.equal(f.repository.db.prepare('PRAGMA busy_timeout').get().timeout,5000);
  writer.db.exec('ROLLBACK');
  assert.equal((await request(f.app.url)).status,200);
  // Only this disposable synthetic database is changed. Metadata change is
  // terminal for this process, even when the original payload is restored.
  const original=writer.db.prepare('SELECT payload FROM runtime_publications WHERE hash=?').get(f.publication).payload;
  writer.db.prepare('UPDATE runtime_publications SET payload=? WHERE hash=?').run('{"synthetic":"changed"}',f.publication);
  assert.equal((await request(f.app.url)).status,503);
  writer.db.prepare('UPDATE runtime_publications SET payload=? WHERE hash=?').run(original,f.publication);
  assert.equal((await request(f.app.url)).status,503);
  assert.equal((await request(f.app.url,'/api/v1/health')).status,200);
});

test('standalone tooling does not advertise publication readiness',async t=>{
  const app=await serveCatalogue({});t.after(()=>app.close());
  assert.equal((await request(app.url)).status,404);
  assert.equal((await request(app.url,'/api/v1/health')).status,200);
});
