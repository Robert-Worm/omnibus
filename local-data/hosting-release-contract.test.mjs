import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {performance} from 'node:perf_hooks';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {runtimeFixture} from './test-support/runtime-fixture.mjs';
import {CatalogueRepository, digest} from './repository.mjs';
import {prepareWebResources} from './web-resources.mjs';
import {publishRuntime, readRuntimePublication} from './runtime-publication.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {serveCatalogue} from './server.mjs';

// Future integration contract, deliberately separate from baseline regression
// suites. No skips or baseline-status substitutions: public mode must work.
// .invalid names are header values only. Every connection uses a dynamic port
// on 127.0.0.1, including rejected starts; no provider or proxy is contacted.
const publicHost = 'omnibus.example.invalid';
const publicOrigin = `https://${publicHost}`;
const canary = 'SYNTHETIC-PRIVATE-REQUEST-CANARY';
const excluded = 'SYNTHETIC-EXCLUDED-PUBLICATION-CANARY';
const document = (id, text) => ({id, title:id, pages:[{page:1, text}]});

function fixture(t) {
  const selectedDocument = document('selected', '1 Bron\nExacte tekens: e\u0301 é 😀\nTweede regel.');
  const excludedDocument = document('excluded', excluded);
  const foreignDocument = document('foreign', excluded + '-FOREIGN');
  const pack = {id:'synthetic-package', title:'Synthetic package', kind:'report',
    records:[{id:'point', kind:'point', data:{text:excluded, selection_status:'HOLD'}}]};
  const f = runtimeFixture(t, {packages:[pack], documents:[selectedDocument, excludedDocument]});
  // Only construct disposable synthetic data. Close the writer before opening
  // the real read-only runtime connection; no active database/settings inputs.
  const writer = new CatalogueRepository(f.databasePath);
  let publication, refs, privateRefs, foreignRefs, foreignRelease, otherPublication, source, expected;
  try {
    foreignRelease = writer.importRelease({manifest:{baselineVersion:'synthetic-foreign'},
      packages:[], documents:[foreignDocument]});
    source = {schema:1, release:f.release, version:digest(selectedDocument),
      indexHash:digest(JSON.stringify(writer.documentIndex(f.release, digest(selectedDocument))))};
    const value = {z:'Preserve key order and Unicode: 😀 e\u0301', databaseSource:source,
      a:[{id:'selected-point', selection_status:'HOLD', text:'Synthetic published norm'}]};
    refs = prepareWebResources(writer, f.release, {selected:value});
    privateRefs = prepareWebResources(writer, f.release, {excluded:{text:excluded}});
    foreignRefs = prepareWebResources(writer, foreignRelease, {foreign:{text:excluded + '-FOREIGN'}});
    const base = readRuntimePublication(writer, {release:f.release,
      publication:f.publication, contract:runtimeContractHash});
    publication = publishRuntime(writer, {...base, refs:{...base.refs, ...refs}},
      {release:f.release, contract:runtimeContractHash});
    otherPublication = publishRuntime(writer, {...base, refs:privateRefs},
      {release:f.release, contract:runtimeContractHash});
    expected = {content:JSON.stringify(value),
      index:JSON.stringify(writer.documentIndex(f.release, source.version)),
      page:JSON.stringify(writer.page(source.version, 1))};
  } finally { writer.close(); }
  const webRoot = join(f.dir, 'web');
  mkdirSync(join(webRoot, 'assets'), {recursive:true});
  const html = '<!doctype html><meta charset="utf-8"><title>Synthetic hosting contract</title>';
  const asset = '/* Synthetic asset: é 😀 */';
  writeFileSync(join(webRoot, 'database.html'), html);
  writeFileSync(join(webRoot, 'assets', 'synthetic.js'), asset);
  writeFileSync(join(webRoot, '.env'), excluded);
  const manifest = {schema:1, release:f.release, publication, contract:runtimeContractHash};
  writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify(manifest));
  const before = digest(readFileSync(f.databasePath));
  f.beforeCleanup.push(() => assert.equal(digest(readFileSync(f.databasePath)), before,
    'HTTP requests and failed starts must preserve synthetic database bytes'));
  const repository = new CatalogueRepository(f.databasePath, {readOnly:true});
  f.beforeCleanup.push(() => {if (repository.db.isOpen) repository.close();});
  const contentPath = `/api/v1/content/${refs.selected.hash}?release=${f.release}`;
  return {...f, publication, repository, webRoot, manifest, refs, privateRefs, foreignRefs,
    foreignRelease, otherPublication, source, expected, html, asset, contentPath,
    excludedVersion:digest(excludedDocument), foreignVersion:digest(foreignDocument),
    packageVersion:digest(pack),
    async start(options = {}) {
      const app = await serveCatalogue(repository, {port:0, webRoot, publicOrigin,
        ...options, listenHost:'127.0.0.1'});
      f.beforeCleanup.push(() => app.close());
      assert.equal(app.server.address().address, '127.0.0.1');
      return app;
    }};
}

function request(app, {path='/', method='GET', headers={Host:publicHost}, agent=false} = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'127.0.0.1', port:app.server.address().port,
      path, method, headers, setHost:false, agent}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({status:res.statusCode, headers:res.headers,
        body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.setTimeout(5000, () => req.destroy(Error('Synthetic loopback request timed out')));
    req.on('error', reject);
    req.end();
  });
}

function fixedCors(result) {
  assert.equal(result.headers['access-control-allow-origin'], publicOrigin);
  assert.equal(result.headers['access-control-allow-credentials'], undefined);
  assert.equal(result.headers['access-control-allow-methods'], undefined);
  assert.equal(result.headers['access-control-allow-headers'], undefined);
  assert.equal(result.headers.vary, 'Accept-Encoding');
}

function noPrivateDetails(result, f) {
  for (const secret of [canary, excluded, f.databasePath, f.webRoot, f.publication,
    f.otherPublication, f.foreignRelease, f.excludedVersion, f.foreignVersion])
    assert(!JSON.stringify(result).includes(secret), `response contains synthetic private detail: ${secret}`);
}

function captureLogs(t) {
  const logs = [];
  for (const method of ['log', 'warn', 'error'])
    t.mock.method(console, method, (...args) => logs.push(args));
  return logs;
}

test('local control: the synthetic publication is valid and local defaults stay local', async t => {
  const f = fixture(t), app = await f.start({publicOrigin:undefined});
  const headers = {Host:`127.0.0.1:${app.server.address().port}`};
  const result = await request(app, {path:f.contentPath, headers});
  assert.equal(result.status, 200);
  assert.equal(result.body, f.expected.content);
  assert.equal(result.headers['access-control-allow-origin'], undefined);
  assert.equal((await request(app)).status, 403, 'public Host is not implicitly enabled');
});

test('hosting requires an explicit canonical HTTPS origin and a verified web publication', async t => {
  const f = fixture(t);
  for (const [name, options] of [
    ['no webroot', {webRoot:undefined}],
    ['empty origin', {publicOrigin:''}],
    ['null origin', {publicOrigin:null}],
    ['HTTP origin', {publicOrigin:`http://${publicHost}`}],
    ['HTTP look-alike of localhost', {publicOrigin:'http://localhost.hostile.invalid:8080'}],
    ['HTTP on a private address', {publicOrigin:'http://10.0.0.5:8080'}],
    ['HTTP localhost with trailing slash', {publicOrigin:'http://localhost:8080/'}],
    ['origin with path', {publicOrigin:publicOrigin + '/private'}],
    ['origin with credentials', {publicOrigin:'https://user:'+`secret@${publicHost}`}],
    ['noncanonical trailing slash', {publicOrigin:publicOrigin + '/'}],
  ]) await t.test(name, async () => {await assert.rejects(f.start(options));});
  await t.test('unknown publication pin cannot fall back to catalogue mode', async () => {
    writeFileSync(join(f.webRoot, 'omnibus-release.json'), JSON.stringify({...f.manifest,
      publication:digest('synthetic-missing-publication')}));
    await assert.rejects(f.start());
  });
});

test('hosting preserves published JSON bytes, source pages, static bytes and 304 CORS', async t => {
  const f = fixture(t), app = await f.start();
  for (const [path, body] of [
    [f.contentPath, f.expected.content],
    [`/api/v1/documents/${f.source.version}/index?release=${f.release}`, f.expected.index],
    [`/api/v1/documents/${f.source.version}/pages/1?release=${f.release}`, f.expected.page],
    ['/', f.html], ['/assets/synthetic.js', f.asset],
  ]) {
    const result = await request(app, {path, headers:{Host:publicHost, Origin:publicOrigin}});
    assert.equal(result.status, 200, path);
    assert.equal(result.body, body, 'publication bytes and Unicode must not be normalized');
    fixedCors(result);
  }
  const asset = await request(app, {path:'/assets/synthetic.js'});
  assert(asset.headers.etag);
  const cached = await request(app, {path:'/assets/synthetic.js',
    headers:{Host:publicHost, 'If-None-Match':asset.headers.etag}});
  assert.equal(cached.status, 304);assert.equal(cached.body, '');fixedCors(cached);
});

test('hosting cannot expose catalogue, excluded same-release data or a different release', async t => {
  const f = fixture(t), app = await f.start();
  for (const path of [
    '/api/v1/releases', `/api/v1/catalogue?release=${f.release}`, `/api/v1/documents?release=${f.release}`,
    `/api/v1/packages/${f.packageVersion}/records/point/point`,
    `/api/v1/content/${f.privateRefs.excluded.hash}?release=${f.release}&publication=${f.otherPublication}&mode=standalone&webRoot=`,
    `/api/v1/content/${f.foreignRefs.foreign.hash}?release=${f.foreignRelease}`,
    `/api/v1/content/${f.refs.selected.hash}?release=${f.foreignRelease}`,
    `/api/v1/documents/${f.excludedVersion}/index?release=${f.release}`,
    `/api/v1/documents/${f.excludedVersion}/pages/1`,
    `/api/v1/documents/${f.foreignVersion}/pages/1?release=${f.release}`,
    '/.env', '/synthetic.sqlite', '/omnibus-release.json', '/admin', '/api/v1/mcp',
  ]) {
    const result = await request(app, {path});
    assert.equal(result.status, 404, path);
    assert.deepEqual(JSON.parse(result.body), {error:'Not found'});
    fixedCors(result);noPrivateDetails(result, f);
  }
  const ambiguous = await request(app, {path:f.contentPath + `&release=${f.foreignRelease}`});
  assert.equal(ambiguous.status, 400);fixedCors(ambiguous);noPrivateDetails(ambiguous, f);
});

test('hosting rejects ambiguous Host/Origin and never trusts forwarded authority', async t => {
  const f = fixture(t), app = await f.start();
  const localHost = `127.0.0.1:${app.server.address().port}`;
  const forged = {Forwarded:`for=127.0.0.1;host=${publicHost};proto=https`,
    'X-Forwarded-Host':publicHost, 'X-Forwarded-Proto':'https', 'X-Forwarded-For':'127.0.0.1',
    'CF-Connecting-IP':'127.0.0.1', 'X-Real-IP':'127.0.0.1', 'X-Request-ID':canary};
  for (const [name, headers, status] of [
    ['duplicate Host, allowed first', ['Host',publicHost,'hOsT','hostile.invalid'], 400],
    ['duplicate Host, allowed last', ['Host','hostile.invalid','Host',publicHost], 400],
    ['identical duplicate Origin', ['Host',publicHost,'Origin',publicOrigin,'oRiGiN',publicOrigin], 400],
    ['conflicting duplicate Origin', ['Host',publicHost,'Origin',publicOrigin,'Origin','https://hostile.invalid'], 400],
    ['local Host with forged authority', {Host:localHost, ...forged}, 403],
    ['Host suffix', {Host:publicHost + '.hostile.invalid'}, 403],
    ['Host trailing dot', {Host:publicHost + '.'}, 403],
    ['implicit extra Host port', {Host:publicHost + ':443'}, 403],
    ['empty Origin is present, not absent', {Host:publicHost, Origin:''}, 403],
    ['null Origin', {Host:publicHost, Origin:'null', ...forged}, 403],
    ['HTTP Origin', {Host:publicHost, Origin:`http://${publicHost}`}, 403],
    ['Origin list', {Host:publicHost, Origin:publicOrigin + ', https://hostile.invalid'}, 403],
    ['Origin port alias', {Host:publicHost, Origin:publicOrigin + ':443'}, 403],
    ['cross-site', {Host:publicHost, Origin:publicOrigin, 'Sec-Fetch-Site':'cross-site'}, 403],
  ]) await t.test(name, async () => {
    const result = await request(app, {headers});
    assert.equal(result.status, status);fixedCors(result);noPrivateDetails(result, f);
  });
  await t.test('missing Host is refused', async () => {
    assert.equal((await request(app, {headers:{}})).status, 400);
  });
  await t.test('valid authority ignores forged headers and generates its own request ID', async () => {
    const result = await request(app, {headers:{Host:publicHost, ...forged}});
    assert.equal(result.status, 200);fixedCors(result);noPrivateDetails(result, f);
    assert.match(result.headers['x-request-id'], /^[a-f0-9-]{36}$/);
  });
});

test('probes share the exact public authority and offer no query, path or method bypass', async t => {
  const f = fixture(t), app = await f.start();
  const logs = captureLogs(t);
  for (const [path, status] of [['/api/v1/health', 'ok'], ['/api/v1/ready', 'ready']]) {
    const result = await request(app, {path});
    assert.equal(result.status, 200);assert.equal(JSON.parse(result.body).status, status);
    assert(result.body.length < 256);assert.equal(result.headers['cache-control'], 'no-store');
    fixedCors(result);noPrivateDetails(result, f);
    const queried = await request(app, {path:path + '?probe=1'});
    assert.equal(queried.status, 400);fixedCors(queried);
  }
  const fakeProbe = {Host:`localhost:${app.server.address().port}`, 'User-Agent':'synthetic-health-check',
    Forwarded:`for=127.0.0.1;host=${publicHost};proto=https`, 'X-Forwarded-Host':publicHost,
    'X-Original-URI':'/api/v1/ready', 'X-Real-IP':'127.0.0.1'};
  for (const path of ['/api/v1/health', '/api/v1/ready', '/', f.contentPath]) {
    const result = await request(app, {path, headers:fakeProbe});
    assert.equal(result.status, 403, 'no unverified localhost probe alias');fixedCors(result);
  }
  for (const path of ['/api/v1/%68ealth', '/api/v1/ready/'])
    assert.equal((await request(app, {path})).status, 404);
  for (const method of ['HEAD', 'OPTIONS']) {
    const result = await request(app, {path:'/api/v1/ready', method});
    assert.equal(result.status, 405);assert.equal(result.headers.allow, 'GET');fixedCors(result);
  }
  assert.equal(logs.length, 0, 'probes and expected rejections create no access/error log');
});

test('hosting failures keep fixed CORS, independent liveness and minimal private-free diagnostics', async t => {
  const f = fixture(t), app = await f.start(), logs = captureLogs(t);
  t.mock.method(f.repository, 'page', () => {throw Error(canary + ' ' + f.databasePath);});
  const result = await request(app, {
    path:`/api/v1/documents/${f.source.version}/pages/1?q=${canary}`,
    headers:{Host:publicHost, 'X-Request-ID':canary, Authorization:canary, Cookie:canary,
      Forwarded:`for=192.0.2.1;host=${canary}`, 'X-Original-URI':canary},
  });
  assert.equal(result.status, 500);fixedCors(result);noPrivateDetails(result, f);
  assert.deepEqual(JSON.parse(result.body), {error:'Request failed'});
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.match(result.headers['x-request-id'], /^[a-f0-9-]{36}$/);
  assert.equal(logs.length, 1);assert.equal(logs[0].length, 1);
  const entry = JSON.parse(logs[0][0]);
  assert.deepEqual(Object.keys(entry).sort(), ['event', 'requestId', 'status', 'time']);
  assert.equal(entry.event, 'catalogue_request_failed');assert.equal(entry.status, 500);
  assert.equal(entry.requestId, result.headers['x-request-id']);
  assert.equal(new Date(entry.time).toISOString(), entry.time);noPrivateDetails(logs, f);
  f.repository.close();
  const unavailable = await request(app, {path:'/api/v1/ready'});
  assert.equal(unavailable.status, 503);assert.equal(unavailable.headers['retry-after'], '1');
  assert.equal(unavailable.headers['cache-control'], 'no-store');
  assert.equal(JSON.parse(unavailable.body).status, 'not-ready');
  fixedCors(unavailable);noPrivateDetails(unavailable, f);
  const healthy = await request(app, {path:'/api/v1/health'});
  assert.equal(healthy.status, 200);fixedCors(healthy);noPrivateDetails(healthy, f);
  assert.notEqual(healthy.headers['x-request-id'], result.headers['x-request-id']);
  assert.equal(logs.length, 1, 'health and failed readiness do not dump exceptions or access logs');
});

test('hosting admission budget is shared by content and probes; forwarded identities cannot reset it', async t => {
  // Freeze the limiter's standard monotonic clock only in this test. No sleeps, parallel
  // pressure or throughput claims: 120 sequential admissions exercise one burst.
  let clock = 1000;
  t.mock.method(performance, 'now', () => clock);
  const f = fixture(t), app = await f.start(), logs = captureLogs(t);
  const databaseReads = t.mock.method(f.repository.db, 'prepare');
  const agent = new http.Agent({keepAlive:true, maxSockets:1});
  t.after(() => agent.destroy());
  const paths = ['/', f.contentPath, '/api/v1/health', '/api/v1/ready'];
  const attempt = (index, target = app, path = paths[index % paths.length], local = false) => request(target, {
    path, agent, headers:{Host:local ? `127.0.0.1:${target.server.address().port}` : publicHost,
      'X-Forwarded-For':`192.0.2.${index % 254 + 1}`, 'X-Real-IP':`198.51.100.${index % 254 + 1}`,
      'CF-Connecting-IP':`203.0.113.${index % 254 + 1}`,
      Forwarded:`for=192.0.2.${index % 254 + 1};host=${publicHost};proto=https`},
  });
  for (let index = 0; index < 120; index++)
    assert.equal((await attempt(index)).status, 200, `public burst admission ${index + 1}`);
  const admittedReads = databaseReads.mock.callCount();
  assert(admittedReads > 0, 'the admitted content and readiness requests used the real database');
  for (const [index, path] of paths.entries()) {
    const denied = await attempt(120 + index, app, path);
    assert.equal(denied.status, 429, path);
    assert.equal(denied.headers['retry-after'], '1');
    assert.equal(denied.headers['cache-control'], 'no-store');fixedCors(denied);noPrivateDetails(denied, f);
    assert.equal(databaseReads.mock.callCount(), admittedReads, '429 precedes content and readiness database reads');
  }
  clock += 1000;
  assert.equal((await attempt(124)).status, 200, 'admission recovers after refill');
  const local = await f.start({publicOrigin:undefined});
  for (let index = 0; index < 121; index++) {
    const result = await attempt(index, local, '/api/v1/health', true);
    assert.equal(result.status, 200, 'local mode does not inherit the public request budget');
    assert.equal(result.headers['access-control-allow-origin'], undefined);
  }
  assert.equal(logs.length, 0, 'normal admissions and budget rejections create no access/error log');
});

test('plain HTTP is accepted only for exact loopback origins of a local container', async () => {
  const {createHostingPolicy} = await import('./hosting-policy.mjs');
  for (const origin of ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost']) {
    const policy = createHostingPolicy({publicOrigin:origin, listenHost:'0.0.0.0', webRoot:'/synthetic'});
    assert.equal(policy.publicOrigin, origin);
    assert.equal(policy.authority, new URL(origin).host);
  }
  for (const origin of ['http://LOCALHOST:8080', 'http://localhost:0', 'http://[::1]:8080', 'http://192.168.1.2:8080'])
    assert.throws(() => createHostingPolicy({publicOrigin:origin, listenHost:'0.0.0.0', webRoot:'/synthetic'}), origin);
});
