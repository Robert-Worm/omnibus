import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {buildDatabase} from './build-database-web.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

await test('host recovery documents the container build target, exact pins and a fresh output',t=>{
  const instructions=read('docs/beheer/storingen-en-herstel.md').split('## Online terug naar')[1].split('## De terugweg lokaal')[0];
  const target=/npm run (build(?::runtime)?) -- --settings "<herstelinstellingen.json>" --out "<nieuwe-controlemap>"/.exec(instructions)?.[1];
  assert.equal(target,'build:runtime');
  assert.ok(read('hosting/container/Dockerfile').includes('npm run '+target+' -- --settings'));
  const script=JSON.parse(read('package.json')).scripts[target];
  assert.equal(script,'node scripts/build-runtime.mjs');
  assert.match(read('scripts/build-runtime.mjs'),/buildDatabase\(process\.argv\.slice\(2\), \{ portable: true \}\)/);
  assert.match(instructions,/nieuwe revert-commit/);assert.match(instructions,/releasehash en publicatiehash/);
  assert.match(instructions,/--web-root "<nieuwe-controlemap>"/);assert.match(instructions,/\/api\/v1\/ready/);

  // Exercise the real build dispatcher. Only the compiler subprocess is replaced;
  // this fixture creates no application/database and never deploys anything.
  const dir=mkdtempSync(join(tmpdir(),'omnibus-recovery-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const release='a'.repeat(64),publication='b'.repeat(64),settings=join(dir,'settings.json'),out=join(dir,'fresh');
  writeFileSync(settings,JSON.stringify({database:'synthetic.sqlite',release,publication}));
  const calls=[];
  const mock=t.mock.method(childProcess,'execFileSync',(_command,args,options)=>{calls.push({args,options});return Buffer.from('');});
  syncBuiltinESMExports();
  try {
    buildDatabase(['--settings',settings,'--out',out],{portable:true});
    const build=calls.find(c=>c.args[0]==='node_modules/vite/bin/vite.js');
    assert.equal(build.options.env.OMNIBUS_PORTABLE_RUNTIME,'1');
    assert.equal(build.options.env.OMNIBUS_DATABASE_RELEASE,release);
    assert.equal(build.options.env.OMNIBUS_RUNTIME_PUBLICATION,publication);
    assert.equal(build.options.env.OMNIBUS_BUILD_OUTPUT,out);
    assert.throws(()=>buildDatabase(['--settings',settings,'--out',out],{portable:true}),/EEXIST/);
  } finally { mock.mock.restore();syncBuiltinESMExports(); }
});
