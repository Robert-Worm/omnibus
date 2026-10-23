import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { serveCatalogue, catalogueRequestLimits as limits } from './server.mjs';
import { CatalogueRepository, digest } from './repository.mjs';
import { prepareWebResources } from './web-resources.mjs';
import { publishRuntime } from './runtime-publication.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { createDatabaseSourceClient } from '../lib/database-source-client.mjs';

const port = 4371, secondPort = 4372;
const pagePath = '/api/v1/documents/' + 'a'.repeat(64) + '/pages/1';
const large = { text: randomBytes(4 * 1024 * 1024).toString('base64') };

async function until(predicate, message, timeout = 8000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) {
    assert(performance.now() < deadline, message);
    await delay(20);
  }
}

function request(url, path = '/api/v1/health', headers = {}, agent = false) {
  return new Promise((resolve, reject) => {
    const req = http.get(url + path, { headers, agent }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

async function start(t, repository, options = {}) {
  const app = await serveCatalogue(repository, { port, ...options });
  const pending = new Set(), clients = [];
  app.server.on('request', (_req, res) => {
    if (res.statusCode !== 200) return;
    pending.add(res);
    const remove = () => pending.delete(res);
    res.once('finish', remove); res.once('close', remove);
  });
  t.after(async () => {
    for (const client of clients) client.destroy();
    await app.close();
  });
  function paused(path = pagePath, encoding = 'gzip') {
    return new Promise((resolve, reject) => {
      const req = http.get(app.url + path, { agent: false, headers: encoding ? { 'Accept-Encoding': encoding } : {} }, res => {
        res.pause();
        // Aborts/expiry intentionally terminate incomplete response streams.
        res.on('error', () => {});
        resolve({ req, res });
      });
      clients.push(req); req.on('error', reject);
    });
  }
  return { ...app, pending, clients, paused };
}

function webFixture(t) {
  const scratch = fileURLToPath(new URL('../work/', import.meta.url));
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, 'server-resilience-'));
  const databasePath = join(dir, 'synthetic.sqlite');
  let repository = new CatalogueRepository(databasePath);
  t.after(() => { repository.close(); rmSync(dir, { recursive: true, force: true }); });
  const document = { id: 'synthetic-source', title: 'Synthetic source', pages: [
    { page: 1, text: 'Synthetic Unicode 😀é '.repeat(100) },
    { page: 2, text: 'Second synthetic page' },
  ] };
  const release = repository.importRelease({ manifest: { baselineVersion: 'synthetic' }, packages: [], documents: [document] });
  const version = digest(document);
  const source = { schema: 1, release, version, indexHash: digest(JSON.stringify(repository.documentIndex(release, version))) };
  const content = { points: [{ id: 'synthetic-point', selection_status: 'HOLD', text: 'Synthetic norm '.repeat(200) }] };
  const refs = prepareWebResources(repository, release, { content });
  const publication = publishRuntime(repository, { format: 'omnibus-runtime-publication', schemaVersion: 1,
    contentGate: 'VERIFIED_APPLICATION_RELEASE', contract: runtimeContractHash, release,
    modules: { 'lib/synthetic.json': { databaseSource: source } }, refs, registrations: {}, routing: {}, summary: {},
  }, { release, contract: runtimeContractHash });
  const webRoot = join(dir, 'web'), assetPath = '/assets/synthetic-12345678.js';
  mkdirSync(join(webRoot, 'assets'), { recursive: true });
  writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>Synthetic viewer</title>');
  writeFileSync(join(webRoot, assetPath), large.text);
  writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({ schema: 1, release, publication, contract: runtimeContractHash }));
  repository.close(); repository = new CatalogueRepository(databasePath, { readOnly: true });
  return { repository, databasePath, source, refs, content, release, webRoot, assetPath };
}

test('ordinary viewer bursts preserve publication data, gzip, static cache and keep-alive', { timeout: 120000 }, async t => {
  const fixtureStarted = performance.now();
  const f = webFixture(t);
  t.diagnostic(`Durable fixture: ${(performance.now() - fixtureStarted).toFixed(1)} ms`);
  await t.test('viewer runtime after durable fixture', { timeout: 15000 }, async t => {
    const before = digest(readFileSync(f.databasePath));
    const app = await start(t, f.repository, { webRoot: f.webRoot });
    assert.equal(app.server.address().address, '127.0.0.1');
    assert.deepEqual(limits, { activeResponses: 32, connections: 128, responseMs: 30000 });
    // Three bursts of 24 requests: content, source index and page from eight viewers.
    for (let round = 0; round < 3; round++) {
      await Promise.all(Array.from({ length: 8 }, async () => {
        const client = createDatabaseSourceClient({ fetchImpl: (url, options) => {
          if (typeof url !== 'string') throw new TypeError('Expected a relative source URL');
          return fetch(app.url + url, options);
        } });
        const [content, index] = await Promise.all([client.content(f.refs.content), client.index(f.source),
          request(app.url, `/api/v1/documents/${f.source.version}/pages/2`).then(result => assert.equal(result.status, 200))]);
        assert.deepEqual(content, f.content);
        assert.deepEqual(index, f.repository.documentIndex(f.release, f.source.version));
        assert.deepEqual(await client.page(f.source, index, 1), f.repository.page(f.source.version, 1));
      }));
    }
    const contentPath = `/api/v1/content/${f.refs.content.hash}?release=${f.release}`;
    for (const path of [contentPath, f.assetPath]) {
      const plain = await request(app.url, path, { 'Accept-Encoding': 'gzip;q=0' });
      const zipped = await request(app.url, path, { 'Accept-Encoding': 'gzip' });
      assert.equal(plain.status, 200); assert.equal(zipped.status, 200);
      assert.equal(plain.headers['content-encoding'], undefined);
      assert.equal(zipped.headers['content-encoding'], 'gzip');
      assert.equal(zipped.headers.vary, 'Accept-Encoding');
      assert.deepEqual(gunzipSync(zipped.body), plain.body);
      if (path === f.assetPath) {
        assert.match(plain.headers['cache-control'], /max-age=86400/);
        const cached = await request(app.url, path, { 'If-None-Match': plain.headers.etag });
        assert.equal(cached.status, 304); assert.equal(cached.body.length, 0);
      }
    }
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    t.after(() => agent.destroy());
    for (let i = 0; i < 40; i++) assert.equal((await request(app.url, '/', {}, agent)).status, 200);
    assert.equal((await request(app.url, `/api/v1/catalogue?release=${f.release}`)).status, 404);
    assert.equal(digest(readFileSync(f.databasePath)), before);
  });
});

test('JSON transport negotiates Brotli without changing source bytes or response protections', async t => {
  const value = { text: 'Synthetic source 😀é '.repeat(100), selection_status: 'HOLD' };
  const app = await start(t, { page() { return value; } });
  const raw = Buffer.from(JSON.stringify(value));
  for (const [accept, expected, decode] of [
    ['gzip,br', 'br', brotliDecompressSync], ['br;q=0,gzip', 'gzip', gunzipSync],
    ['br;q=0.5,gzip', 'gzip', gunzipSync], ['identity', undefined, bytes => bytes],
  ]) {
    const result = await request(app.url, pagePath, { 'Accept-Encoding': accept });
    assert.equal(result.status, 200); assert.equal(result.headers['content-encoding'], expected);
    assert.equal(result.headers.vary, 'Accept-Encoding');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(decode(result.body), raw);
  }
  const refused = await request(app.url, pagePath, { 'Accept-Encoding': '*;q=0' });
  assert.equal(refused.status, 406); assert.equal(refused.body.length, 0);
  const small = await request(app.url, '/api/v1/health', { 'Accept-Encoding': 'br,identity;q=0' });
  assert.equal(small.status, 406); assert.equal(small.headers['content-encoding'], undefined);
  assert.equal(small.body.length, 0);
  const denied = await request(app.url, pagePath, { Host: 'example.invalid', 'Accept-Encoding': 'br,identity;q=0' });
  assert.equal(denied.status, 406); assert.equal(denied.headers['content-encoding'], undefined);
  assert.equal(denied.body.length, 0, 'pre-admission errors cannot allocate compressors');
});

for (const encoding of ['gzip', 'br']) test(`${encoding}: global response capacity rejects before reads and recovers exactly once after abort`, { timeout: 20000 }, async t => {
  let reads = 0;
  const app = await start(t, { page() { reads++; return large; } });
  const held = await Promise.all(Array.from({ length: 32 }, () => app.paused(pagePath, encoding)));
  assert(held.every(client => client.res.statusCode === 200));
  assert(held.every(client => client.res.headers['content-encoding'] === encoding));
  await until(() => app.pending.size === 32, 'all slow responses must remain active');
  await delay(100);
  assert.equal(app.pending.size, 32, 'completed incoming GETs do not release outgoing streams');
  const rejected = await Promise.all(Array.from({ length: 8 }, (_, i) => request(app.url, pagePath, {
    'Accept-Encoding': encoding, 'X-Forwarded-For': `192.0.2.${i}`, 'X-Request-ID': 'PRIVATE-CANARY',
  })));
  for (const result of rejected) {
    assert.equal(result.status, 503);
    assert.deepEqual(JSON.parse(result.body), { error: 'Server busy; retry shortly' });
    assert.equal(result.headers['retry-after'], '1'); assert.equal(result.headers.connection, 'close');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.headers['content-encoding'], undefined);
    assert.match(result.headers['x-request-id'], /^[a-f0-9-]{36}$/);
    assert(!JSON.stringify(result).includes('PRIVATE-CANARY'));
  }
  assert.equal(reads, 32, 'rejected requests do not reach the repository');
  assert.equal((await request(app.url, pagePath, { Host: 'example.invalid' })).status, 403);
  assert.equal((await request(app.url, pagePath, { Origin: 'https://example.invalid' })).status, 403);
  // Another listener has its own capacity, not a module-global counter.
  const independent = await start(t, {}, { port: secondPort });
  assert.equal((await request(independent.url)).status, 200);
  for (const client of held.slice(0, 4)) client.req.destroy();
  await until(() => app.pending.size === 28, 'abort must release four slots');
  for (let i = 0; i < 40; i++) assert.equal((await request(app.url)).status, 200);
  const replacements = await Promise.all(Array.from({ length: 4 }, () => app.paused(pagePath, encoding)));
  assert(replacements.every(client => client.res.statusCode === 200));
  assert.equal((await request(app.url, pagePath)).status, 503, 'finish plus close must never double-release');
  for (const client of [...held, ...replacements]) client.req.destroy();
  await until(() => app.pending.size === 0, 'all aborted streams must release');
  assert.equal((await request(app.url)).status, 200);
});

test('pipelined requests cannot bypass the shared response ceiling', { timeout: 10000 }, async t => {
  let reads = 0, rejected = 0;
  const app = await start(t, { page() { reads++; return large; } });
  app.server.on('request', (_req, res) => { if (res.statusCode === 503) rejected++; });
  const socket = net.connect(port, '127.0.0.1');
  app.clients.push(socket);
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.on('error', reject); });
  socket.pause();
  socket.write((`GET ${pagePath} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nAccept-Encoding: gzip\r\n\r\n`).repeat(40));
  await until(() => rejected > 0, 'pipelined overload must be rejected');
  assert.equal(reads, 32);
  socket.destroy();
  await until(() => app.pending.size === 0, 'pipelined abort must release every slot');
  assert.equal((await request(app.url)).status, 200);
});

test('static streams share the bound and release capacity after file errors', { timeout: 120000 }, async t => {
  const fixtureStarted = performance.now();
  const f = webFixture(t);
  t.diagnostic(`Durable fixture: ${(performance.now() - fixtureStarted).toFixed(1)} ms`);
  await t.test('static runtime after durable fixture', { timeout: 20000 }, async t => {
    const app = await start(t, f.repository, { webRoot: f.webRoot });
    const held = await Promise.all(Array.from({ length: 32 }, (_, i) => app.paused(f.assetPath, i % 2 === 0 ? 'gzip' : null)));
    assert(held.every(client => client.res.statusCode === 200));
    assert.equal((await request(app.url, '/')).status, 503);
    assert.equal((await request(app.url, '/api/v1/ready')).status, 503, 'readiness cannot bypass capacity');
    assert.equal((await request(app.url, `/api/v1/content/${f.refs.content.hash}?release=${f.release}`)).status, 503);
    for (const client of held) client.req.destroy();
    await until(() => app.pending.size === 0, 'static aborts must release');
    assert.equal((await request(app.url, '/api/v1/ready')).status, 200);
    unlinkSync(join(f.webRoot, f.assetPath));
    for (let i = 0; i < 40; i++) await assert.rejects(request(app.url, f.assetPath));
    await until(() => app.pending.size === 0, 'failed file pipelines must release');
    assert.equal((await request(app.url, '/')).status, 200);
  });
});

test('repository and serialization errors leave capacity available and redact failures', { timeout: 10000 }, async t => {
  const logs = []; t.mock.method(console, 'error', line => logs.push(line));
  let mode = 'throw'; const circular = {}; circular.self = circular;
  const app = await start(t, { page() {
    if (mode === 'throw') throw Error('PRIVATE-CANARY');
    if (mode === 'invalid') throw Error('Invalid PRIVATE-CANARY');
    if (mode === 'circular') return circular;
    return { text: 'recovered' };
  } });
  for (const [next, status, error] of [['throw', 500, 'Request failed'], ['invalid', 400, 'Invalid request'], ['circular', 500, 'Request failed']]) {
    mode = next;
    for (let i = 0; i < 40; i++) {
      const response = await request(app.url, pagePath);
      assert.equal(response.status, status); assert.deepEqual(JSON.parse(response.body), { error });
    }
  }
  assert.equal(logs.length, 80); assert(!logs.join('').includes('PRIVATE-CANARY'));
  mode = 'ok'; assert.equal((await request(app.url, pagePath)).status, 200);
});

test('absolute response deadline closes slow readers even with socket inactivity disabled', { timeout: 40000 }, async t => {
  // One paused Linux connection can buffer the smaller shared payload in full.
  // Exceed its socket buffers so this tests the unchanged real 30-second deadline.
  const slow = { text: randomBytes(16 * 1024 * 1024).toString('base64') };
  const app = await start(t, { page() { return slow; } });
  // Isolate the real wall-clock deadline from the existing 15s idle timeout.
  app.server.setTimeout(0);
  const started = performance.now(), held = await app.paused();
  assert.equal(held.res.statusCode, 200);
  await until(() => app.pending.size === 0, 'response deadline must close the stream', 35000);
  assert(performance.now() - started >= 29000, 'deadline is not an early idle/abort close');
  assert.equal((await request(app.url)).status, 200);
});

test('partial headers are connection-bounded and capacity returns after disconnect', { timeout: 10000 }, async t => {
  const app = await start(t, {}), sockets = [];
  t.after(() => { for (const socket of sockets) socket.destroy(); });
  const count = () => new Promise((resolve, reject) => app.server.getConnections((error, n) => error ? reject(error) : resolve(n)));
  let dropped = 0; app.server.on('drop', () => dropped++);
  for (let i = 0; i < 128; i++) await new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => { socket.write('GET / HTTP/1.1\r\n'); resolve(); });
    sockets.push(socket); socket.on('error', reject);
  });
  assert.equal(await count(), 128);
  await assert.rejects(request(app.url));
  assert.equal(dropped, 1); assert.equal(await count(), 128);
  for (const socket of sockets) socket.destroy();
  const deadline = performance.now() + 2000;
  while (await count()) { assert(performance.now() < deadline); await delay(20); }
  assert.equal((await request(app.url)).status, 200);
});

test('shutdown still drains for at most five seconds with active and incomplete reads', { timeout: 10000 }, async () => {
  const app = await serveCatalogue({ page() { return large; } }, { port });
  const clients = [];
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(app.url + pagePath, { agent: false }, res => { res.pause(); res.on('error', () => {}); resolve(); });
      clients.push(req); req.on('error', reject);
    });
    await new Promise((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1', () => { socket.write('GET / HTTP/1.1\r\n'); resolve(); });
      clients.push(socket); socket.on('error', reject);
    });
    const started = performance.now();
    await app.close();
    assert(performance.now() - started < 6500); assert.equal(app.server.listening, false);
  } finally { for (const client of clients) client.destroy(); if (app.server.listening) await app.close(); }
});
