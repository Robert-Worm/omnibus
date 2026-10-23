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
import {CatalogueRepository} from '../local-data/repository.mjs';
import {readRuntimePublication,publishRuntime} from '../local-data/runtime-publication.mjs';
import {prepareWebResources} from '../local-data/web-resources.mjs';
import './deferred-catalogue-metadata.test.mjs';
import './report-delivery-projection.test.mjs';
import '../lib/report-asset-loader.test.mjs';

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

await test('workers share the pinned read-only catalogue but only the main build emits a release manifest',async t=>{
  const options=fixture(t),assets=[];
  const main=publishedCataloguePlugin({...options,codeRevision:'a'.repeat(40)});
  await main.buildStart();
  main.generateBundle.call({emitFile:asset=>assets.push(asset)});
  assert.equal(assets.length,1);
  assert.equal(assets[0].fileName,'omnibus-release.json');
  const manifest=JSON.parse(assets[0].source);
  assert.equal(manifest.publication,options.publication);
  assert.equal(manifest.contract,runtimeContractHash);
  assert.equal(manifest.codeRevision,'a'.repeat(40));
  assert.throws(()=>publishedCataloguePlugin({...options,codeRevision:'main'}),/Invalid explicit code revision/);
  const worker=publishedCataloguePlugin({...options,emitManifest:false});
  await worker.buildStart();
  worker.generateBundle.call({emitFile:()=>assert.fail('Worker must not duplicate the runtime manifest')});
  const importer=join(root,'app/preview-calculator.worker.ts');
  const id=worker.resolveId('omnibus-data:lib/cio-content.mjs',importer);
  assert.equal(worker.load(id),main.load(id));
  await assert.rejects(publishedCataloguePlugin({...options,emitManifest:false,
    publication:'f'.repeat(64)}).buildStart(),/missing or changed publication/);
});

await test('deferred browser metadata is a known dynamic module, without changing pinned data or default readers',async t=>{
  const options=fixture(t), repository=new CatalogueRepository(options.databasePath);
  const moduleId='lib/cio-content.mjs', boundary='foundation:synthetic:points';
  const original={catalogue:{source_identity:{source_id:'synthetic'},source_dispositions:[{quote:'Exact <source> 🦉'}]}};
  try{
    const content=readRuntimePublication(repository,{...options,contract:runtimeContractHash});
    content.modules[moduleId]=original;
    content.refs[boundary]=content.refs.test;
    content.registrations[moduleId]=[boundary];
    options.publication=publishRuntime(repository,content,{...options,contract:runtimeContractHash});
  }finally{repository.close();}
  const browser=publishedCataloguePlugin({...options,deferMetadata:true});
  const worker=publishedCataloguePlugin({...options,deferMetadata:true,emitManifest:false});
  const defaultReader=publishedCataloguePlugin(options);
  for(const plugin of [browser,worker,defaultReader])await plugin.buildStart();
  const id=browser.resolveId('omnibus-data:'+moduleId);
  const emitted=[],context={emitFile:asset=>{emitted.push(asset);return 'syntheticMetadata';}};
  const source=browser.load.call(context,id);
  assert.equal(worker.load.call(context,id),source,'Preview worker follows the same load boundary');
  assert(!source.includes('Exact'),'Background source metadata is absent from initial data');
  assert.match(source,/registerCatalogueResource\("foundation:synthetic:metadata:/);
  assert.match(source,/featureLoader\(attempt=>import\(/);
  assert.match(source,/\?retry=/,'Failed requests must not stay in the native module cache');
  assert(emitted.every(asset=>asset.type==='asset'&&/^assets\/catalogue-metadata-[a-f0-9]{64}\.js$/.test(asset.fileName)),
    'Data must not become extra worker entry chunks');
  assert.deepEqual(emitted[0],emitted[1],'Main and worker share the same immutable metadata asset');
  const loaded=await import('data:text/javascript,'+encodeURIComponent(emitted[0].source));
  assert.deepEqual(loaded.default,[{path:['catalogue','source_dispositions'],value:original.catalogue.source_dispositions}]);
  assert(!emitted[0].source.includes('<source>'),'Generated strings escape surrounding HTML contexts');
  assert(defaultReader.load(id).includes('Exact'),'Build-time and agent readers retain their complete initial metadata');
  const reader=new CatalogueRepository(options.databasePath,{readOnly:true});
  try{assert.deepEqual(readRuntimePublication(reader,{...options,contract:runtimeContractHash}).modules[moduleId],original);}
  finally{reader.close();}
});

await test('web and preview worker partition identical model assets while agent readers keep the original resources',async t=>{
  const options=fixture(t),repository=new CatalogueRepository(options.databasePath),moduleId='lib/model-library.mjs';
  const models=[{id:'first',items:[{question:'Exact <question> 🦉'}]},{id:'second',items:[]}];
  try{
    const content=readRuntimePublication(repository,{...options,contract:runtimeContractHash});
    content.modules[moduleId]={models:[],history:[]};
    const refs=prepareWebResources(repository,options.release,{'models:library:0':[{path:['models'],value:models},{path:['history'],value:['Original wording']}]});
    Object.assign(content.refs,refs);content.registrations[moduleId]=['models:library:0'];
    options.publication=publishRuntime(repository,content,{...options,contract:runtimeContractHash});
  }finally{repository.close();}
  const main=publishedCataloguePlugin({...options,deferMetadata:true}),worker=publishedCataloguePlugin({...options,deferMetadata:true,emitManifest:false}),agent=publishedCataloguePlugin(options);
  for(const plugin of [main,worker,agent])await plugin.buildStart();
  const importer=join(root,'app/client.tsx'),routing=main.resolveId('@/lib/model-resource-routing.mjs',importer);
  assert.deepEqual((await import('data:text/javascript,'+encodeURIComponent(main.load(routing)))).default,['first','second']);
  assert.equal(agent.resolveId('@/lib/model-resource-routing.mjs',importer),null);
  const emitted=[],context={emitFile:asset=>{emitted.push(asset);return 'asset'+emitted.length;}};
  const source=main.load.call(context,main.resolveId('omnibus-data:'+moduleId));
  assert.match(source,/registerCatalogueResource\("models:item:first"/);assert.match(source,/registerCatalogueResource\("models:shared:library"/);
  assert(!source.includes('Exact'));assert(!source.includes('models:library:0'));
  assert(emitted.every(asset=>/^assets\/model-content-[a-f0-9]{64}\.js$/.test(asset.fileName)&&asset.type==='asset'));
  const mainAssets=[...emitted];emitted.length=0;
  assert.equal(worker.load.call(context,worker.resolveId('omnibus-data:'+moduleId)),source);
  assert.deepEqual(emitted,mainAssets);assert.equal(emitted.length,3);
  const first=await import('data:text/javascript,'+encodeURIComponent(emitted[1].source));assert.deepEqual(first.default,[{path:['models'],value:[models[0]]}]);
  assert(!emitted[1].source.includes('<question>'));assert(!emitted[1].source.includes('second'));
  assert.match(agent.load(agent.resolveId('omnibus-data:'+moduleId)),/registerCatalogueResource\("models:library:0"/);
});

await test('report parts use identical pinned data-only assets in browser and worker, with original agent fallback',async t=>{
  const options=fixture(t),repository=new CatalogueRepository(options.databasePath),moduleId='app/report-point-catalogue.json';
  try{
    const content=readRuntimePublication(repository,{...options,contract:runtimeContractHash});
    content.modules[moduleId]={points:[]};content.routing.reports={'R-1':'R'};
    const refs=prepareWebResources(repository,options.release,{'report:R:points':[{path:['points'],value:[{id:'R-1/P',legacy_line_id:'R-1',text:'Exact <point> 🦉'}]}]});
    Object.assign(content.refs,refs);content.registrations[moduleId]=['report:R:points'];
    options.publication=publishRuntime(repository,content,{...options,contract:runtimeContractHash});
  }finally{repository.close();}
  const main=publishedCataloguePlugin({...options,deferMetadata:true}),worker=publishedCataloguePlugin({...options,deferMetadata:true,emitManifest:false}),agent=publishedCataloguePlugin(options);
  for(const plugin of [main,worker,agent])await plugin.buildStart();
  const importer=join(root,'app/client.tsx'),route=main.resolveId('@/lib/report-resource-routing.mjs',importer);
  const routing=(await import('data:text/javascript,'+encodeURIComponent(main.load(route)))).default;
  assert.equal(routing['R-1'].length,1);assert.equal(agent.resolveId('@/lib/report-resource-routing.mjs',importer),null);
  const emitted=[],context={emitFile:asset=>{emitted.push(asset);return 'reportAsset';}};
  const source=main.load.call(context,main.resolveId('omnibus-data:'+moduleId));
  assert(!source.includes('Exact'));assert.match(source,/registerCatalogueResource\("report:R:part:/);
  const original=structuredClone(emitted);emitted.length=0;
  assert.equal(worker.load.call(context,worker.resolveId('omnibus-data:'+moduleId)),source);assert.deepEqual(emitted,original);
  assert.match(emitted[0].fileName,/^assets\/report-content-[a-f0-9]{64}\.js$/);
  const loaded=(await import('data:text/javascript,'+encodeURIComponent(emitted[0].source))).default;
  assert.deepEqual(loaded[moduleId][0].positions,[0]);assert.equal(loaded[moduleId][0].value[0].text,'Exact <point> 🦉');
  assert(!emitted[0].source.includes('<point>'));
  assert.match(agent.load(agent.resolveId('omnibus-data:'+moduleId)),/registerCatalogueResource\("report:R:points"/);
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
