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
import {parseRuntimePackageArgs, startRuntimePackage} from './start-runtime-package.mjs';
import {readRuntimePublication} from '../local-data/runtime-publication.mjs';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {verifyRuntimePackage, bytesHash} from '../local-data/runtime-package.mjs';

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

test('separate A/B packages can restart and roll back after mixed release refusal without changing data',
  {timeout:30000},async t=>{
    const versions=[];
    for(const name of ['A','B']){
      const f=runtimeFixture(t,{baselineVersion:'synthetic-rollback-'+name});
      const webRoot=join(f.dir,'web'),out=join(f.dir,'package');
      mkdirSync(join(webRoot,'assets'),{recursive:true});
      const html='<!doctype html><title>Synthetic release '+name+'</title>';
      writeFileSync(join(webRoot,'database.html'),html);
      writeFileSync(join(webRoot,'assets','app-12345678.js'),'// synthetic '+name);
      const repository=new CatalogueRepository(f.databasePath,{readOnly:true});
      let refs;
      try { refs=readRuntimePublication(repository,{...f,contract:runtimeContractHash}).refs; }
      finally { repository.close(); }
      writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,
        runtimeTarget:'portable-local',release:f.release,publication:f.publication,
        contract:runtimeContractHash,refs}));
      packageRuntime({webRoot,databasePath:f.databasePath,out});
      const settings=join(f.dir,'local-build.json');
      writeFileSync(settings,JSON.stringify({database:'synthetic.sqlite',
        release:f.release,publication:f.publication}));
      const originals=new Map([f.databasePath,settings,join(out,'runtime-package.json')]
        .map(path=>[path,bytesHash(readFileSync(path))]));
      const unchanged=()=>{
        for(const [path,hash] of originals) assert.equal(bytesHash(readFileSync(path)),hash);
        verifyRuntimePackage(out); // Checks every package byte, not only its manifest.
      };
      f.beforeCleanup.push(unchanged);
      versions.push({...f,out,settings,html,refs,unchanged});
    }
    const [a,b]=versions;
    assert.notEqual(a.release,b.release);
    assert.notEqual(a.publication,b.publication);
    const port=await unusedLoopbackPort();
    const options=v=>({root:v.out,...parseRuntimePackageArgs(['--settings',v.settings,
      '--public-origin',origin,'--listen-host','127.0.0.1','--port',String(port)])});
    const portClosed=async()=>{
      await assert.rejects(request(port,'/api/v1/health'),error=>error.code==='ECONNREFUSED');
    };
    const serve=async(v,other)=>{
      const app=await startRuntimePackage(options(v));
      try {
        assert.equal((await request(port,'/')).body,v.html);
        const ready=await request(port,'/api/v1/ready');
        assert.equal(ready.status,200);
        assert.equal(JSON.parse(ready.body).mode,'public-read-only');
        const resource='/api/v1/content/'+v.refs.test.hash;
        const content=await request(port,resource+'?release='+v.release);
        assert.equal(content.status,200);
        assert.deepEqual(JSON.parse(content.body),{label:'Synthetic test only'});
        assert.equal((await request(port,resource+'?release='+other.release)).status,404);
        assert.equal((await request(port,'/omnibus-release.json')).status,404);
      } finally { await app.close(); }
      await portClosed();
      for(const value of versions) value.unchanged();
    };
    await t.test('previous A then candidate B use their own complete tuple',async()=>{
      await serve(a,b);
      await serve(b,a);
    });
    await t.test('mixed package, data or pins fail before listening',async()=>{
      for(const mixed of [
        {...options(b),root:a.out},
        {...options(b),databasePath:a.databasePath},
        {...options(b),publication:a.publication},
        {...options(b),release:a.release},
      ]){
        // If a regression accidentally starts a listener, close only that test
        // server before failing rather than leaving the port occupied.
        await assert.rejects(async()=>{
          const accidental=await startRuntimePackage(mixed);
          await accidental.close();
        });
        await portClosed();
        for(const value of versions) value.unchanged();
      }
    });
    await t.test('operator can return to complete A on the same port and restart it',async()=>{
      await serve(a,b);
      await serve(a,b);
    });
  });

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
            const exited=once(child,'exit');
            const deadline=setTimeout(()=>child.kill('SIGKILL'),7000);
            try {child.kill();await exited;} finally {clearTimeout(deadline);}
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
          await t.test('Linux CLI handles SIGTERM with an unfinished request and releases its port',
            {skip:process.platform!=='linux',timeout:10000},async t=>{
              // Exercise the real CLI signal handler, not a test wrapper calling
              // app.close(). A partial request must not hold up a hosting restart.
              const socket=net.connect(port,'127.0.0.1');
              const closed=new Promise(resolve=>socket.once('close',resolve));
              socket.on('error',()=>{}); // A forced shutdown may reset this client.
              t.after(()=>socket.destroy());
              await once(socket,'connect');
              socket.write('GET / HTTP/1.1\r\nHost: omnibus.example.invalid\r\n');
              assert.equal((await request(port,'/api/v1/ready')).status,200);
              assert.equal(socket.destroyed,false);
              const exited=once(child,'exit'),started=performance.now();
              assert.equal(child.kill('SIGTERM'),true);
              assert.deepEqual(await exited,[0,null],stderr);
              await closed;
              assert(performance.now()-started<8000,'CLI must finish its bounded drain');
              await assert.rejects(request(port,'/api/v1/health'),error=>error.code==='ECONNREFUSED');
              const replacement=net.createServer();
              t.after(()=>new Promise(resolve=>replacement.close(resolve)));
              replacement.listen(port,'127.0.0.1');
              await once(replacement,'listening');
              assert.deepEqual(readFileSync(f.databasePath),before);
              verifyRuntimePackage(out);
            });
        });
    }
  });
