import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeFixture} from '../local-data/test-support/runtime-fixture.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {packageRuntime} from './package-runtime.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const origin='https://omnibus.example.invalid';

async function unusedLoopbackPort(){
  const socket=net.createServer();
  socket.listen(0,'127.0.0.1');
  await once(socket,'listening');
  const port=socket.address().port;
  await new Promise((resolve,reject)=>socket.close(error=>error?reject(error):resolve()));
  return port;
}

function request(port,path,headers={}){
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path,agent:false,
      headers:{Host:'omnibus.example.invalid',...headers}},res=>{
      const chunks=[];
      res.on('data',chunk=>chunks.push(chunk));
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,
        body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.setTimeout(5000,()=>req.destroy(Error('Loopback request timed out')));
    req.on('error',reject);req.end();
  });
}

test('both explicit hosting CLIs serve the same pinned bytes from loopback only',
  {timeout:120000},async t=>{
    const f=runtimeFixture(t),webRoot=join(f.dir,'web'),out=join(f.dir,'package');
    mkdirSync(join(webRoot,'assets'),{recursive:true});
    const html='<!doctype html><title>Synthetic hosting startup — é 😀</title>';
    writeFileSync(join(webRoot,'database.html'),html);
    writeFileSync(join(webRoot,'assets','app-12345678.js'),'// synthetic asset only');
    writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,
      runtimeTarget:'portable-local',release:f.release,publication:f.publication,
      contract:runtimeContractHash}));
    const before=readFileSync(f.databasePath);
    packageRuntime({webRoot,databasePath:f.databasePath,out});
    f.beforeCleanup.push(()=>assert.deepEqual(readFileSync(f.databasePath),before));
    for(const packaged of [false,true]){
      await t.test(packaged?'isolated runtime package':'preview entry point',
        {timeout:20000},async t=>{
          const port=await unusedLoopbackPort();
          const args=['--database',f.databasePath,'--release',f.release,
            '--publication',f.publication,'--port',String(port),
            '--public-origin',origin,'--listen-host','127.0.0.1',
            ...(packaged?[]:['--web-root',webRoot])];
          const child=spawn(process.execPath,[packaged?'scripts/start-runtime-package.mjs':
            'scripts/serve-database-web.mjs',...args],{
            cwd:packaged?out:root,stdio:['ignore','pipe','pipe']});
          let stderr='';
          child.stderr.on('data',chunk=>{stderr+=chunk;});
          t.after(async()=>{
            if(child.exitCode!==null||child.signalCode!==null)return;
            const exited=once(child,'exit');child.kill();await exited;
          });
          await new Promise((resolve,reject)=>{
            let stdout='';
            const timer=setTimeout(()=>reject(Error('CLI startup timed out: '+stderr)),10000);
            const finish=(error)=>{
              clearTimeout(timer);child.stdout.off('data',onData);
              child.off('error',onError);child.off('exit',onExit);
              if(error)reject(error);else resolve();
            };
            const onData=chunk=>{
              stdout+=chunk;
              if(stdout.includes(`http://127.0.0.1:${port}`))finish();
            };
            const onError=error=>finish(error);
            const onExit=()=>finish(Error('CLI stopped: '+stderr));
            child.stdout.on('data',onData);child.once('error',onError);child.once('exit',onExit);
          });
          const home=await request(port,'/');
          assert.equal(home.status,200);assert.equal(home.body,html);
          assert.equal(home.headers['access-control-allow-origin'],origin);
          for(const path of ['/api/v1/health','/api/v1/ready']){
            const probe=await request(port,path);
            assert.equal(probe.status,200);assert.equal(JSON.parse(probe.body).mode,'public-read-only');
            assert.equal(probe.headers['cache-control'],'no-store');
            assert.equal((await request(port,path+'?')).status,400);
            assert.equal((await request(port,path,{Host:`localhost:${port}`})).status,403);
          }
          for(const path of ['/api/v1/catalogue','/api/v1/releases','/runtime-package.json',
            '/scripts/start-runtime-package.mjs','/synthetic.sqlite']){
            const denied=await request(port,path);
            assert.equal(denied.status,404);assert.equal(denied.headers['access-control-allow-origin'],origin);
          }
          for(const headers of [{Host:`127.0.0.1:${port}`},{Origin:'https://other.invalid'}]){
            const denied=await request(port,'/',headers);
            assert.equal(denied.status,403);assert.equal(denied.headers['access-control-allow-origin'],origin);
          }
          assert.doesNotMatch(stderr,/catalogue_request_failed/);
        });
    }
  });
