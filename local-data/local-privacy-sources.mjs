// Optional end-to-end privacy rehearsal with NEW runtimes and synthetic additions.
// Reuse the shared fixture unchanged; these simulated reviews are never real admission.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newPrivacyRun, root, guard, runBrowserPrivacy} from './local-privacy.mjs';
import {bytesHash, saveJson} from './local-privacy-fixture.mjs';
import {readDatabaseSettings} from '../scripts/database-build-options.mjs';

const self=fileURLToPath(import.meta.url);
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));

export async function prepareSyntheticRuntime(kind, dir, base) {
  assert(['report','framework'].includes(kind));
  const {sourceRuntimeFixture}=await import('../content-tools/test-support/local-source-runtime-fixture.mjs');
  const {buildLocalDatabase}=await import('../content-tools/local-database.mjs');
  // Keep the generated evidence for review. The caller confines tmpdir to this run.
  const f=await sourceRuntimeFixture({after(){}},kind);
  const before=bytesHash(readFileSync(f.baseline.databasePath));
  if(base) f.options.base=base;
  const builderBase=readDatabaseSettings(f.options.base).database, baseBefore=bytesHash(readFileSync(builderBase));
  const built=await buildLocalDatabase(f.options);
  assert.equal(built.runtime.status,'LOCAL_READY');
  assert.equal(bytesHash(readFileSync(f.baseline.databasePath)),before);
  assert.equal(bytesHash(readFileSync(builderBase)),baseBefore);
  const point=kind==='report'?f.read('REUSE-CANDIDATE.json').points[0]:f.read('CATALOGUE.json').points[0];
  const marker=kind==='report'?f.read('APP-FINAL.json').framework.evidence[0].quote:
    f.read('RECONCILED-SOURCE.json').records[0].source_spans[0].quote;
  const pins=readJson(join(f.options.out,'local-build.json'));
  saveJson(join(dir,'probe.json'),{schema:2,kind,sourceId:f.manifest.package.id,release:pins.release,
    publication:pins.publication,criterionId:kind==='report'?point.legacy_line_id:point.criterion_id,pointId:point.id,
    sourceTextMarker:marker.split(/\r?\n/)[0]});
  saveJson(join(dir,'runtime-result.json'),{status:'passed',kind,runtime:built.runtime.status,
    baselineUnchanged:true,baseDatabaseSha256:baseBefore,settings:join(f.options.out,'local-build.json')});
}

export function prepareGuardedRuntime(kind, dir, base) {
  const temp=join(dir,'tmp'); mkdirSync(temp);
  const receipt=join(dir,'runtime-network.json');
  const child=spawnSync(process.execPath,['--import',guard,self,'--prepare',kind,dir,...(base?[base]:[])],{
    cwd:root,windowsHide:true,encoding:'utf8',timeout:180000,
    env:{...Object.fromEntries(['PATH','SystemRoot','WINDIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),
      TEMP:temp,TMP:temp,TMPDIR:temp,OMNIBUS_PRIVACY_GUARD:'1',OMNIBUS_PRIVACY_RECEIPT:receipt}});
  assert.ifError(child.error); assert.equal(child.status,0,child.stderr);
  assert.deepEqual(readJson(receipt).attempts,[],'Runtime construction attempted networking');
  return readJson(join(dir,'runtime-result.json'));
}

if(process.argv[1] && resolve(process.argv[1])===self) {
  if(process.argv[2]==='--prepare') {
    assert.equal(process.env.OMNIBUS_PRIVACY_GUARD,'1');
    await prepareSyntheticRuntime(process.argv[3],process.argv[4],process.argv[5]);
  } else if(process.argv[2]==='--build') {
    const settings=readDatabaseSettings(process.argv[3]), folder=process.argv[4];
    const {buildCodeRevision}=await import('../scripts/build-code-revision.mjs');
    Object.assign(process.env,{OMNIBUS_DATABASE_PATH:settings.database,OMNIBUS_DATABASE_RELEASE:settings.release,
      OMNIBUS_RUNTIME_PUBLICATION:settings.publication,OMNIBUS_BUILD_OUTPUT:join(folder,'web'),
      OMNIBUS_PORTABLE_RUNTIME:'0',OMNIBUS_CODE_REVISION:buildCodeRevision(root)||''});
    mkdirSync(process.env.OMNIBUS_BUILD_OUTPUT);
    // The unchanged supported Vite configuration; Node 24's native loader avoids the shared
    // node_modules/.vite-temp directory when dependencies are a junction.
    const {build}=await import('vite');
    await build({configFile:join(root,'vite.database.config.ts'),configLoader:'native',cacheDir:join(folder,'cache')});
  } else {
    const args=process.argv.slice(2), options={};
    assert(args.length%2===0,'Use --base <checked local-build.json> --browser <executable> --playwright <module>');
    for(let i=0;i<args.length;i+=2) {
      assert(['--base','--browser','--playwright'].includes(args[i]) && !Object.hasOwn(options,args[i]));
      options[args[i]]=args[i+1];
    }
    assert(options['--base'] && options['--browser'],'An explicit checked browser base is required');
    const base=resolve(options['--base']), baseDatabase=readDatabaseSettings(base).database;
    const baseBefore=bytesHash(readFileSync(baseDatabase));
    const dir=newPrivacyRun(); console.log('Local rehearsal evidence: '+dir);
    try {
      for(const kind of ['report','framework']) {
        const folder=join(dir,kind); mkdirSync(folder);
        const runtime=prepareGuardedRuntime(kind,folder,base), webRoot=join(folder,'web');
        Object.assign(process.env,{TEMP:join(folder,'tmp'),TMP:join(folder,'tmp'),TMPDIR:join(folder,'tmp')});
        const build=spawnSync(process.execPath,[self,'--build',runtime.settings,folder],
          {cwd:root,windowsHide:true,encoding:'utf8',timeout:180000});
        writeFileSync(join(folder,'build.log'),(build.stdout||'')+(build.stderr||''),{flag:'wx'});
        assert.ifError(build.error); assert.equal(build.status,0,'Web build failed; inspect local build.log');
        await runBrowserPrivacy({settings:runtime.settings,webRoot,executablePath:options['--browser'],
          playwrightModule:options['--playwright'],probeFile:join(folder,'probe.json')},folder);
        console.log(kind+': synthetic runtime construction and browser rehearsal passed');
      }
    } finally {
      const baseAfter=bytesHash(readFileSync(baseDatabase));
      saveJson(join(dir,'base-result.json'),{before:baseBefore,after:baseAfter,unchanged:baseBefore===baseAfter});
      assert.equal(baseAfter,baseBefore,'Read-only browser base must remain byte-identical');
    }
    saveJson(join(dir,'sources-result.json'),{status:'passed',kinds:['report','framework'],
      baseDatabaseSha256:baseBefore,
      scope:'Synthetic own report/framework added to a checked read-only base; no real review, cloud AI or general privacy certification'});
  }
}
