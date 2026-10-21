import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeFixture as fixture} from '../local-data/test-support/runtime-fixture.mjs';
import {publishedCataloguePlugin,runtimeContractHash} from './published-catalogue.mjs';
import {parseDatabaseBuildArgs} from './database-build-options.mjs';
import {parsePreviewArgs,startDatabasePreview} from './serve-database-web.mjs';
import {backupRuntime} from '../local-data/runtime-backup.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

await test('build arguments require an explicit database and pinned identities',()=>{
  const release='a'.repeat(64),publication='b'.repeat(64);
  assert.deepEqual(parseDatabaseBuildArgs(['--database','private.sqlite','--release',release,'--publication',publication]),
    {database:resolve('private.sqlite'),release,publication});
  for(const args of [[],['--database','private.sqlite'],['--database','x','--release',release,'--release',release],
    ['--database','x','--release','latest','--publication',publication]])
    assert.throws(()=>parseDatabaseBuildArgs(args),/Usage/);
  assert.equal(parsePreviewArgs(['--database','private.sqlite']).port,4319);
  for(const args of [[],['--database','x','--port','0'],['--database','x','--port','4319oops'],['--database','x','--host','0.0.0.0']])
    assert.throws(()=>parsePreviewArgs(args),/Usage/);
});

await test('code resolves only known modules; database values remain data, not executable source',async t=>{
  const options=fixture(t),plugin=publishedCataloguePlugin(options);
  await plugin.buildStart();
  const importer=join(root,'app/client.tsx');
  assert.equal(plugin.resolveId('@/lib/cio-content.mjs',importer),resolve(root,'lib/cio-content.mjs'));
  assert.equal(plugin.resolveId('@/lib/not-in-the-contract.mjs',importer),null);
  assert.throws(()=>plugin.resolveId('omnibus-data:../../secret',importer),/Unknown runtime/);
  const id=plugin.resolveId('omnibus-data:lib/cio-content.mjs',importer);
  const loadedModule=await import('data:text/javascript,'+encodeURIComponent(plugin.load(id)));
  assert.deepEqual(loadedModule.default,{});
  const exportsId=plugin.resolveId('@/lib/cio-source-context.mjs',importer);
  const source=plugin.load(exportsId);
  assert.match(source,/\/\*#__PURE__\*\/JSON.parse/);
  assert(!source.includes('import data'),'Independent exports must remain tree-shakeable');
  const exports=await import('data:text/javascript,'+encodeURIComponent(source));
  assert(Object.values(exports).every(value=>value.text==='Synthetic; not a real norm'));
  assert.equal(plugin.load(plugin.resolveId('@/lib/application-mode.mjs',importer)),
    'export const databaseSourcesEnabled=true;');
  const transportModule=join(root,'agent-tools/catalogue-transport.mjs');
  const agent=publishedCataloguePlugin({...options,transportModule});
  assert.equal(agent.resolveId('@/lib/database-source-client.mjs',importer),transportModule.replaceAll('\\','/'),
    'Agent reader and content imports must resolve to one module on Windows');
});

await test('preview validates the publication, serves the app and cannot write or expose the database',async t=>{
  const options=fixture(t),webRoot=join(options.dir,'web');
  mkdirSync(join(webRoot,'assets'),{recursive:true});
  writeFileSync(join(webRoot,'database.html'),'<!doctype html><title>Synthetic test</title>');
  writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,
    release:options.release,publication:options.publication,contract:runtimeContractHash}));
  await assert.rejects(startDatabasePreview({...options,webRoot,port:0,release:'f'.repeat(64)}),/does not match/);
  await assert.rejects(startDatabasePreview({...options,webRoot,port:0,publication:'f'.repeat(64)}),/does not match/);
  const app=await startDatabasePreview({...options,webRoot,port:0});
  options.beforeCleanup.push(()=>app.close());
  assert.equal((await fetch(app.url)).status,200);
  assert.equal((await fetch(app.url+'/api/v1/health')).status,200);
  assert.equal((await fetch(app.url+'/synthetic.sqlite')).status,404);
  assert.equal((await fetch(app.url+'/api/v1/catalogue',{method:'POST'})).status,405);
  assert.equal((await fetch(app.url+'/api/v1/health',{headers:{Origin:'https://example.invalid'}})).status,403);
  writeFileSync(join(webRoot,'omnibus-release.json'),JSON.stringify({schema:1,
    release:options.release,publication:'0'.repeat(64),contract:runtimeContractHash}));
  await assert.rejects(startDatabasePreview({databasePath:options.databasePath,webRoot,port:0}),/missing or changed publication/);
});

await test('private backup retains a verified publication without overwriting files',async t=>{
  const options=fixture(t),to=join(options.dir,'backup.sqlite');
  const result=await backupRuntime({from:options.databasePath,to,...options});
  assert.equal(result.database,to);
  const plugin=publishedCataloguePlugin({...options,databasePath:to});
  await plugin.buildStart();
  await assert.rejects(backupRuntime({from:options.databasePath,to,...options}),/never replaced/);
  await assert.rejects(backupRuntime({from:options.databasePath,to:join(options.dir,'bad.sqlite'),
    release:options.release,publication:'f'.repeat(64)}),/missing or changed publication/);
});
