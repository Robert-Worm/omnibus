import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogueRepository, digest } from './repository.mjs';
import { prepareWebResources } from './web-resources.mjs';
import { publishRuntime } from './runtime-publication.mjs';
import { serveCatalogue } from './server.mjs';
import { createStaticWeb } from './static-web.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { createDatabaseSourceClient } from '../lib/database-source-client.mjs';
import { startDatabasePreview } from '../scripts/serve-database-web.mjs';
import {contentBatchLimits} from '../lib/content-batch-contract.mjs';

const scratch = fileURLToPath(new URL('../.tmp/', import.meta.url));
// Normal runs use ephemeral ports; an isolated review can reserve an adjacent pair.
const testPort = Number(process.env.OMNIBUS_PUBLICATION_TEST_PORT || 0);
const secondPort = testPort ? testPort + 1 : 0;
const doc = (id, text) => ({ id, title: id, pages: [
  { page: 1, text: `1 Titel\n${text} 😀é` }, { page: 2, text: `${text} tweede pagina` },
] });
const pack = id => ({ id, kind: 'report', title: id, records: [
  { id: 'point', kind: 'point', data: { text: `PRIVATE-RECORD-${id}`, selection_status: 'HOLD' } },
] });

function fixture(t) {
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, 'publication-http-'));
  const databasePath = join(dir, 'synthetic.sqlite');
  let repository = new CatalogueRepository(databasePath);
  const apps = [], readers = [];
  t.after(async () => {
    for (const app of apps.reverse()) await app.close();
    for (const reader of readers) reader.close();
    repository.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const selected = doc('selected-module', 'Published module source');
  const deferred = doc('selected-resource', 'Published resource source');
  const privateDoc = doc('private-same-release', 'PRIVATE-PAGE-SAME-RELEASE');
  const foreignDoc = doc('foreign-release', 'PRIVATE-PAGE-FOREIGN-RELEASE');
  const packages = [pack('selected-package'), pack('private-package')];
  const release = repository.importRelease({ manifest: { baselineVersion: 'selected' },
    packages, documents: [selected, deferred, privateDoc] });
  const foreignRelease = repository.importRelease({ manifest: { baselineVersion: 'foreign' },
    packages: [pack('foreign-package')], documents: [foreignDoc] });
  const source = (document, pin = release) => ({ schema: 1, release: pin, version: digest(document),
    indexHash: digest(JSON.stringify(repository.documentIndex(pin, digest(document)))) });
  const selectedSource = source(selected), deferredSource = source(deferred), privateSource = source(privateDoc);
  const selectedContent = [{ path: ['sources'], value: [{ databaseSource: deferredSource }] },
    { path: ['points'], value: [{ id: 'published-point', selection_status: 'HOLD', text: 'Published norm' }] }];
  const refs = prepareWebResources(repository, release, { selected: selectedContent });
  const privateRefs = prepareWebResources(repository, release, {
    other: { text: 'PRIVATE-RESOURCE-SAME-RELEASE', databaseSource: privateSource },
    orphan: { text: 'PRIVATE-ORPHAN-RESOURCE' },
  });
  const foreignRefs = prepareWebResources(repository, foreignRelease, {
    other: { text: 'PRIVATE-RESOURCE-FOREIGN-RELEASE', databaseSource: source(foreignDoc, foreignRelease) },
  });
  const value = { format: 'omnibus-runtime-publication', schemaVersion: 1, release,
    contract: runtimeContractHash, contentGate: 'VERIFIED_APPLICATION_RELEASE',
    modules: { 'lib/example.json': { sources: [{ databaseSource: selectedSource }],
      // Hashes or release inventory do not imply permission to read a document.
      unrelatedMetadata: privateSource } }, refs,
    registrations: { 'lib/example.json': ['selected'] }, routing: {}, summary: {} };
  const publish = (input = value) => publishRuntime(repository, input,
    { release: input.release, contract: runtimeContractHash });
  const publication = publish();
  const otherPublication = publish({ ...value, modules: {}, refs: { other: privateRefs.other }, registrations: {} });
  const foreignPublication = publish({ ...value, release: foreignRelease,
    modules: {}, refs: foreignRefs, registrations: {} });
  const webRoot = join(dir, 'web');
  mkdirSync(join(webRoot, 'assets'), { recursive: true });
  writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>Synthetic viewer</title>');
  writeFileSync(join(webRoot, 'assets', 'viewer-12345678.js'), '/* synthetic asset */');
  const manifest = { schema: 1, release, publication, contract: runtimeContractHash };
  const writeManifest = (value = manifest) => writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify(value));
  writeManifest();
  return { databasePath, webRoot, manifest, writeManifest, value, publish, release, publication,
    foreignRelease, otherPublication, foreignPublication, refs, privateRefs, foreignRefs, selectedContent,
    selectedSource, deferredSource, privateSource, foreignSource: source(foreignDoc, foreignRelease),
    packageVersions: [...packages, pack('foreign-package')].map(digest),
    get repository() { return repository; },
    readOnly() { repository.close(); repository = new CatalogueRepository(databasePath, { readOnly: true }); },
    async start(options = {}) {
      // Keep the mutation connection separate from the actual read-only server,
      // including in deliberately corrupt startup cases.
      const reader = new CatalogueRepository(databasePath, { readOnly: true });
      try {
        const app = await serveCatalogue(reader, { port: testPort, webRoot, ...options });
        readers.push(reader); apps.push(app); return app;
      } catch (error) { reader.close(); throw error; }
    },
    own(app) { apps.push(app); return app; },
  };
}

async function refusesGate(f, pattern, options = {}) {
  // Preserve the specific existing gate assertion; the readiness wrapper now
  // deliberately exposes only a generic startup failure to its caller.
  assert.throws(() => createStaticWeb(f.webRoot, f.repository), pattern);
  await assert.rejects(f.start(options), {message:'Runtime readiness startup refused'});
}

async function denied(url, paths) {
  for (const path of paths) {
    const response = await fetch(url + path);
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'Not found' }, path);
  }
}

test('batched reads retain exact pinned sources, transport controls and unchanged database bytes',async t=>{
  const f=fixture(t),extraValue={points:Array.from({length:200},(_,i)=>({
    id:`new-report-point-${i}`,text:'Second synthetic source 😀é',selection_status:'HOLD',
  }))};
  const extra=prepareWebResources(f.repository,f.release,{extra:extraValue});
  f.value.refs={...f.value.refs,...extra};f.writeManifest({...f.manifest,publication:f.publish()});
  f.readOnly();const before=digest(readFileSync(f.databasePath)),app=await f.start(),calls=[];
  const client=createDatabaseSourceClient({batchContent:true,fetchImpl:(url,options)=>{
    if(typeof url!=='string')throw Error('Expected relative source URL');
    const headers=new Headers(options.headers);headers.set('Accept-Encoding','br');
    calls.push(url);return fetch(app.url+url,{...options,headers});
  }});
  assert.deepEqual(await Promise.all([f.refs.selected,extra.extra].map(ref=>client.content(ref))),[f.selectedContent,extraValue]);
  assert.equal(calls.length,1);assert(calls[0].startsWith('/api/v1/content-batch?'));
  const response=await fetch(app.url+calls[0],{headers:{'Accept-Encoding':'br'}});assert.equal(response.status,200);
  assert.equal(response.headers.get('content-encoding'),'br');
  assert.equal(response.headers.get('vary'),'Accept-Encoding');
  await response.arrayBuffer();
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await fetch(app.url+calls[0],{method:'POST'})).status,405);
  assert.equal((await fetch(app.url+calls[0],{headers:{Origin:'https://example.invalid'}})).status,403);
  assert.equal((await fetch(app.url+calls[0],{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.equal(digest(readFileSync(f.databasePath)),before);
});

test('one hidden, foreign or ambiguous batch member refuses the whole response without leaking other entries',async t=>{
  const f=fixture(t);f.readOnly();const {url}=await f.start();
  const base=`/api/v1/content-batch?release=${f.release}&hash=${f.refs.selected.hash}`;
  await denied(url,[
    ...[f.privateRefs.other,f.privateRefs.orphan,f.foreignRefs.other].map(ref=>base+'&hash='+ref.hash),
    base.replace(f.release,f.foreignRelease),base+'&hash='+'f'.repeat(64),
  ]);
  for(const path of [
    '/api/v1/content-batch','/api/v1/content-batch?release='+f.release,
    '/api/v1/content-batch?hash='+f.refs.selected.hash,
    base+'&release='+f.release,base+'&hash='+f.refs.selected.hash,
    base+'&hash=../private',base+'&publication='+f.otherPublication,
    base+'&hash='+f.refs.selected.hash.toUpperCase(),
    '/api/v1/content-batch?release='+f.release+Array.from({length:contentBatchLimits.entries+1},(_,i)=>'&hash='+digest('Synthetic '+i)).join(''),
  ])assert.equal((await fetch(url+path)).status,400,path);
});

test('batch byte budgets use actual stored sizes, not client claims, before parsing or returning contents',async t=>{
  const f=fixture(t);
  const large=prepareWebResources(f.repository,f.release,{a:{text:'A'.repeat(1100000)},b:{text:'B'.repeat(1100000)}});
  f.value.refs={...f.value.refs,...large};f.writeManifest({...f.manifest,publication:f.publish()});
  const {url}=await f.start();
  const base=`/api/v1/content-batch?release=${f.release}&hash=${large.a.hash}`;
  assert.equal((await fetch(url+base)).status,200);
  const oversized=await fetch(url+base+'&hash='+large.b.hash);
  assert.equal(oversized.status,400);assert.deepEqual(await oversized.json(),{error:'Invalid request'});
  f.repository.db.prepare('UPDATE web_resources SET payload=? WHERE release_id=? AND hash=?')
    .run(JSON.stringify({text:'Changed fixture'.repeat(180000)}),f.release,large.a.hash);
  assert.equal((await fetch(url+base)).status,400);
});

test('pinned viewer keeps exact content, source index, Unicode pages and static assets', async t => {
  const f = fixture(t);
  f.readOnly();
  const before = digest(readFileSync(f.databasePath));
  const app = await f.start();
  assert.equal(app.server.address().address, '127.0.0.1');
  const client = createDatabaseSourceClient({ fetchImpl: (url, options) => {
    assert.equal(typeof url, 'string');
    if (typeof url !== 'string') throw new TypeError('Expected a relative source URL');
    return fetch(app.url + url, options);
  } });
  assert.deepEqual(await client.content(f.refs.selected), f.selectedContent);
  for (const ref of [f.selectedSource, f.deferredSource]) {
    const index = await client.index(ref);
    assert.deepEqual(index, f.repository.documentIndex(f.release, ref.version));
    for (const number of [1, 2])
      assert.deepEqual(await client.page(ref, index, number), f.repository.page(ref.version, number));
    assert.equal((await fetch(`${app.url}/api/v1/documents/${ref.version}/pages/1?release=${f.release}`)).status, 200);
  }
  for (const path of ['/', '/assets/viewer-12345678.js', '/api/v1/health'])
    assert.equal((await fetch(app.url + path)).status, 200, path);
  const asset = await fetch(app.url + '/assets/viewer-12345678.js');
  assert.equal((await fetch(app.url + '/assets/viewer-12345678.js',
    { headers: { 'If-None-Match': asset.headers.get('etag') } })).status, 304);
  assert.equal(digest(readFileSync(f.databasePath)), before, 'read-only requests preserve the database bytes');
});

test('web reads reject other releases, other publications and unselected same-release data', async t => {
  const f = fixture(t);
  f.readOnly();
  const { url } = await f.start();
  await denied(url, [
    '/api/v1/releases', `/api/v1/releases?release=${f.release}`,
    `/api/v1/catalogue?release=${f.release}`, `/api/v1/documents?release=${f.release}`,
    `/api/v1/catalogue?release=${f.foreignRelease}`, `/api/v1/documents?release=${f.foreignRelease}`,
    ...[f.privateRefs.other, f.privateRefs.orphan, f.foreignRefs.other].flatMap(ref => [
      `/api/v1/content/${ref.hash}?release=${ref.release}`,
      `/api/v1/content/${ref.hash}?release=${f.release}&publication=${f.otherPublication}`,
    ]),
    `/api/v1/content/${f.refs.selected.hash}?release=${f.foreignRelease}`,
    ...[f.privateSource, f.foreignSource].flatMap(ref => [
      `/api/v1/documents/${ref.version}/index?release=${ref.release}`,
      `/api/v1/documents/${ref.version}/index?release=${f.release}`,
      `/api/v1/documents/${ref.version}/pages/1`,
      `/api/v1/documents/${ref.version}/pages/1?release=${f.release}`,
    ]),
    `/api/v1/documents/${f.selectedSource.version}/index?release=${f.foreignRelease}`,
    `/api/v1/documents/${f.selectedSource.version}/pages/1?release=${f.foreignRelease}`,
    ...f.packageVersions.flatMap(version => [
      `/api/v1/packages/${version}/records`, `/api/v1/packages/${version}/records/point/point`,
      `/api/v1/packages/${version}/records/point/point?release=${f.release}`,
    ]),
    '/omnibus-release.json', '/synthetic.sqlite', '/runtime-publications', '/admin',
    `/api/v1/documents/${f.selectedSource.version}/pages/3`,
  ]);
});

test('request parameters cannot widen or ambiguously replace the pinned identity', async t => {
  const f = fixture(t);
  f.readOnly();
  const { url } = await f.start();
  for (const path of [
    `/api/v1/content/${f.refs.selected.hash}`,
    `/api/v1/documents/${f.selectedSource.version}/index`,
    `/api/v1/content/${f.refs.selected.hash}?release=${f.release}&release=${f.foreignRelease}`,
    `/api/v1/documents/${f.selectedSource.version}/pages/1?release=${f.release}&release=${f.foreignRelease}`,
  ]) assert.equal((await fetch(url + path)).status, 400, path);
  await denied(url, [
    `/api/v1/content/${f.privateRefs.other.hash}?release=${f.release}&mode=standalone&webRoot=`,
    `/api/v1/documents/${f.privateSource.version}/pages/1?publication=${f.otherPublication}`,
    `/api/v1/documents/${f.foreignSource.version}/pages/1?publication=${f.foreignPublication}`,
  ]);
  assert.equal((await fetch(url + `/api/v1/content/${f.refs.selected.hash}?release=${f.release}`,
    { headers: { Origin: 'https://example.invalid' } })).status, 403);
  assert.equal((await fetch(url + `/api/v1/documents/${f.selectedSource.version}/pages/1`,
    { method: 'POST' })).status, 405);
});

test('each server is bound to its own publication, including within one release', async t => {
  const f = fixture(t);
  f.readOnly();
  const first = await f.start();
  f.writeManifest({ ...f.manifest, publication: f.otherPublication });
  const second = await f.start({ port: secondPort });
  const privatePage = `/api/v1/documents/${f.privateSource.version}/pages/1`;
  await denied(first.url, [privatePage]);
  assert.equal((await fetch(second.url + privatePage)).status, 200);
  await denied(second.url, [
    `/api/v1/content/${f.refs.selected.hash}?release=${f.release}`,
    `/api/v1/documents/${f.selectedSource.version}/pages/1`,
  ]);
  assert.equal((await fetch(first.url + `/api/v1/documents/${f.selectedSource.version}/pages/1`)).status, 200);
});

test('web startup refuses absent, legacy, mismatched and changed pins before listening', async t => {
  const f = fixture(t);
  for (const webRoot of ['', null]) await assert.rejects(f.start({ webRoot }));
  for (const manifest of [
    { schema: 1, release: f.release },
    { ...f.manifest, publication: undefined }, { ...f.manifest, publication: 'latest' },
    { ...f.manifest, publication: digest('missing-publication') },
    { ...f.manifest, publication: f.foreignPublication },
    { ...f.manifest, release: f.foreignRelease },
    { ...f.manifest, contract: digest('wrong-contract') },
  ]) {
    f.writeManifest(manifest);
    await refusesGate(f, /runtime contract|runtime publication/);
  }
  f.writeManifest();
  f.repository.db.prepare('UPDATE runtime_publications SET payload=? WHERE hash=?')
    .run(JSON.stringify({ ...f.value, summary: { changed: true } }), f.publication);
  await refusesGate(f, /changed publication/);
});

test('invalid or foreign databaseSource links fail closed in modules and delivery resources', async t => {
  const f = fixture(t);
  for (const bad of [null, {}, { ...f.selectedSource, schema: 2 },
    f.foreignSource, { ...f.foreignSource, release: f.release },
    { ...f.selectedSource, version: digest('missing-document') },
    { ...f.selectedSource, indexHash: digest('wrong-index') },
  ]) {
    for (const placement of ['module', 'resource']) {
      const value = structuredClone(f.value);
      if (placement === 'module') value.modules['lib/example.json'].extra = { databaseSource: bad };
      else value.refs = { ...value.refs, ...prepareWebResources(f.repository, f.release,
        { bad: [{ path: ['sources'], value: [{ databaseSource: bad }] }] }) };
      f.writeManifest({ ...f.manifest, publication: f.publish(value) });
      await refusesGate(f, /Invalid publication source reference/);
    }
  }
  // The original publication does not silently admit a changed navigation index.
  f.writeManifest();
  f.repository.db.prepare('UPDATE pages SET end_cp=end_cp+1 WHERE document_version=? AND number=1')
    .run(f.selectedSource.version);
  await refusesGate(f, /Invalid publication source reference/);
});

test('unselected resource corruption does not widen access; selected corruption refuses startup', async t => {
  const f = fixture(t);
  f.repository.db.prepare('UPDATE web_resources SET payload=? WHERE hash=?')
    .run('{"private":"changed"}', f.privateRefs.other.hash);
  const app = await f.start();
  await denied(app.url, [`/api/v1/content/${f.privateRefs.other.hash}?release=${f.release}`]);
  f.repository.db.prepare('UPDATE web_resources SET payload=? WHERE hash=?')
    .run('{"published":"changed"}', f.refs.selected.hash);
  await refusesGate(f, /changed delivery resource/, { port: secondPort });
});

test('standalone catalogue tooling remains explicit through absence of a web build', async t => {
  const f = fixture(t);
  f.readOnly();
  const { url } = await f.start({ webRoot: undefined });
  const releases = await (await fetch(url + '/api/v1/releases')).json();
  assert.equal(releases.length, 2);
  for (const path of [
    `/api/v1/catalogue?release=${f.foreignRelease}`,
    `/api/v1/content/${f.privateRefs.other.hash}?release=${f.release}`,
    `/api/v1/packages/${f.packageVersions[1]}/records/point/point`,
    `/api/v1/documents/${f.foreignSource.version}/pages/1`,
  ]) assert.equal((await fetch(url + path)).status, 200, path);
  assert.equal((await fetch(url + '/')).status, 404, 'standalone mode never serves an app');
});

test('supported preview entry point inherits the same publication restriction', async t => {
  const f = fixture(t);
  f.readOnly();
  const app = f.own(await startDatabasePreview({ databasePath: f.databasePath, webRoot: f.webRoot, port: testPort,
    release: f.release, publication: f.publication }));
  assert.equal((await fetch(app.url + `/api/v1/documents/${f.selectedSource.version}/pages/1`)).status, 200);
  await denied(app.url, [
    `/api/v1/catalogue?release=${f.release}`,
    `/api/v1/content/${f.privateRefs.other.hash}?release=${f.release}`,
    `/api/v1/documents/${f.privateSource.version}/pages/1`,
  ]);
});
