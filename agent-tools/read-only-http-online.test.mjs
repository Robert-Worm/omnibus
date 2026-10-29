import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {request} from 'node:http';
import {once} from 'node:events';
import childProcess, {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {publishRuntime} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {createIndex, insertEntry, sha256} from './index-store.mjs';
import {readOnlyOnlineConfig, acceptsReadOnlyRequest} from './read-only-http-config.mjs';
import {openIsolatedReadOnlyService} from './read-only-http-service.mjs';
import {createReadOnlyHttpServer, readOnlyHttpLimits} from './read-only-http.mjs';
import {createReadOnlyHttpGateway} from './read-only-http-gateway.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, 'work/read-only-http-online');
const publicOrigin = 'https://omnibus.example.invalid', host = new URL(publicOrigin).host;
const canary = 'SYNTHETIC-PRIVATE-COLLECTION-CANARY';
const rpc = (method = 'ping', params) => ({jsonrpc: '2.0', id: 1, method, ...(params && {params})});
const call = (name, args = {}) => rpc('tools/call', {name, arguments: args});
const payload = response => JSON.parse(response.body.result.content[0].text);
const readTools = ['get_workflow_guide', 'list_sources', 'search_building_blocks', 'get_building_block'];

// Small data-only runtime plus the real derived index. No original database,
// source packages, workflow import, published endpoint or shared fixture edits.
function fixture(t, releaseFields = {}) {
  fs.mkdirSync(scratch, {recursive: true});
  const build = fs.mkdtempSync(join(scratch, 'fixture-')), database = join(build, 'catalogue.sqlite');
  const repository = new CatalogueRepository(database);
  let release, publication;
  try {
    release = repository.importRelease({manifest: {format: 'omnibus-catalogue-release', schema: 1,
      baselineVersion: 'synthetic-public-only', ...releaseFields}, packages: [], documents: []});
    const modules = Object.fromEntries(Object.entries(runtimeContract).map(([id, entry]) => [id,
      entry.kind === 'exports' ? Object.fromEntries(entry.names.map(name => [name, {}])) : entry.property ? {[entry.property]: []} : {}]));
    modules['lib/model-choice-guide.mjs'] = {guides: {}, summaries: {}};
    modules['lib/research-models.mjs'] = {ids: [], presentations: {}};
    // Local review format is intentionally inserted as data below: the publisher
    // itself rejects it. This tests that the HTTP reader independently refuses it.
    const value = {format: 'omnibus-runtime-publication', schemaVersion: 1, contentGate: 'VERIFIED_APPLICATION_RELEASE',
      release, contract: runtimeContractHash, modules, refs: {}, registrations: {}, routing: {}, summary: {}};
    repository.db.exec('CREATE TABLE web_resources(release_id TEXT, hash TEXT, payload TEXT)');
    if (releaseFields.format === 'omnibus-local-review-database') {
      const raw = JSON.stringify(value); publication = sha256(raw);
      repository.db.exec('CREATE TABLE runtime_publications(release_id TEXT, hash TEXT, payload TEXT)');
      repository.db.prepare('INSERT INTO runtime_publications VALUES(?,?,?)').run(release, publication, raw);
    } else publication = publishRuntime(repository, value, {release, contract: runtimeContractHash});
    createIndex(repository.db, release);
    insertEntry(repository.db, {key: 'R|HOLD', kind: 'report', sourceId: 'R', pointId: 'HOLD', sourceTitle: 'Synthetic public',
      selectionStatus: 'HOLD', draftSelectable: false, selectionReason: 'Synthetic unresolved source question',
      material: {title: 'Synthetic norm', body: 'Public synthetic criterion', sourceText: 'Bron 🧭 '.repeat(30),
        sourceContext: 'Synthetic context', sourceHash: 'c'.repeat(64), reportTrace: '{"synthetic":true}'}});
  } finally { repository.close(); }
  const manifestPath = join(build, 'omnibus-release.json');
  fs.writeFileSync(manifestPath, JSON.stringify({schema: 1, contract: runtimeContractHash, release, publication}));
  const databaseSha256 = sha256(fs.readFileSync(database));
  const online = {enabled: true, publicOrigin, missingOrigin: 'reject', publicRuntime: {release, publication, databaseSha256}};
  t.after(() => {
    assert.equal(sha256(fs.readFileSync(database)), databaseSha256, 'synthetic database restored/unchanged');
    const actual = fs.realpathSync(build), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
    fs.rmSync(actual, {recursive: true});
  });
  return {build, database, manifestPath, online, release, publication};
}

async function start(t, f, online = f.online, limits, gateway = false) {
  const service = await openIsolatedReadOnlyService({buildDirectory: f.build, publicRuntime: online.publicRuntime});
  const server = gateway ? await createReadOnlyHttpGateway({service, online, limits}) : createReadOnlyHttpServer({service, online, limits});
  t.after(async () => {
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections(); await closed; await service.close();
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return {url: new URL(`http://127.0.0.1:${server.address().port}/mcp`), server, service};
}

function post(url, body = rpc(), overrides = {}, method = 'POST') {
  return new Promise((resolve, reject) => {
    const headers = {host, origin: publicOrigin, 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...overrides};
    for (const key of Object.keys(headers)) if (headers[key] === undefined) delete headers[key];
    const req = request(url, {method, agent: false,
      headers: Object.entries(headers).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).flatMap(item => [key, String(item)]))}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        assert(!text.includes(canary)); assert(!text.includes(scratch));
        assert(Buffer.byteLength(text) <= readOnlyHttpLimits.responseBytes);
        assert.equal(res.headers['access-control-allow-origin'], undefined);
        resolve({status: res.statusCode, headers: res.headers, text, body: text ? JSON.parse(text) : null});
      });
    });
    req.on('error', reject); req.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
}

test('online opt-in is exact and requires an isolated reader verified against the same public pins', async t => {
  const f = fixture(t);
  for (const value of [null, {}, {...f.online, enabled: false}, {...f.online, enabled: 'true'},
    {...f.online, trustProxy: true}, {...f.online, missingOrigin: 'allow'}, {...f.online, publicRuntime: {...f.online.publicRuntime, databaseSha256: undefined}},
    ...['*', 'null', 'http://localhost:8080', publicOrigin + '/', publicOrigin + ':443', publicOrigin + '/mcp',
      'https://user@omnibus.example.invalid'].map(origin => ({...f.online, publicOrigin: origin}))])
    assert.throws(() => readOnlyOnlineConfig(value), /configuratie/);
  assert.throws(() => createReadOnlyHttpServer({service: {}, online: f.online}), /niet gecontroleerd/);
  const local = await openIsolatedReadOnlyService({buildDirectory: f.build});
  try { assert.throws(() => createReadOnlyHttpServer({service: local, online: f.online}), /niet gecontroleerd/); }
  finally { await local.close(); }
  const {service} = await start(t, f);
  assert(Object.isFrozen(service), 'verified reader cannot be replaced after admission');
  assert.throws(() => createReadOnlyHttpServer({service: {...service}, online: f.online}), /niet gecontroleerd/);
  assert.throws(() => createReadOnlyHttpServer({service, online: {...f.online,
    publicRuntime: {...f.online.publicRuntime, databaseSha256: 'f'.repeat(64)}}}), /niet gecontroleerd/);
});

async function checkProxyProtocol(t, gateway) {
  const f = fixture(t), {url} = await start(t, f, f.online, undefined, gateway);
  const client = new Client({name: 'synthetic-proxy-contract', version: '1.0.0'});
  // Native fetch derives Host from the loopback URL. Use its SDK-supported
  // fetch adapter to send the synthetic ingress authority over node:http,
  // with the real SDK messages/headers intact and no DNS/TLS/external endpoint.
  await client.connect(new StreamableHTTPClientTransport(url, {
    requestInit: {headers: {Host: host, Origin: publicOrigin}},
    fetch: async (input, init) => {
      assert.equal(String(input), String(url));
      const result = await post(url, init.body ?? '', Object.fromEntries(new Headers(init.headers)), init.method);
      return new Response(result.text || null, {status: result.status, headers: result.headers});
    },
  }));
  try {
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), readTools);
    const guide = JSON.parse((await client.callTool({name: 'get_workflow_guide'})).content[0].text);
    assert.equal(guide.release, f.release); assert.equal(guide.publication, f.publication);
    assert.deepEqual(guide.transportLimits, readOnlyHttpLimits);
    assert.equal(payload(await post(url, call('list_sources'))).sources[0].holdItems, 1);
    assert.equal(payload(await post(url, call('search_building_blocks', {query: 'Synthetic'}))).items[0].selectionStatus, 'HOLD');
    const item = payload(await post(url, call('get_building_block', {key: 'R|HOLD'})));
    assert.equal(item.selectionStatus, 'HOLD'); assert.equal(item.draftSelectable, false);
    assert.equal(item.material.sourceHash, 'c'.repeat(64));
    const section = payload(await post(url, call('get_building_block', {key: 'R|HOLD', section: 'sourceText', limit: 100})));
    assert.equal(Array.from(section.text).length, 100); assert.equal(section.nextOffset, 100);
    for (const name of ['prepare_research_draft', 'export_research_draft', 'read_file', 'save_project'])
      assert.equal((await post(url, call(name, {path: canary}))).body.result.isError, true);
    assert.equal((await post(url, rpc('resources/read', {uri: canary}))).body.error.code, -32601);
    for (const path of ['/mcp/', '/mcp?project=1', '/api/v1/content', '/files', '/mcp%2f'])
      assert.equal((await post(new URL(path, url))).status, 404);
  } finally { await client.close(); }
}

test('configured proxy path preserves SDK protocol, exactly four tools, HOLD, hashes and source sections', async t => {
  for (const gateway of [false, true])
    await t.test(gateway ? 'through HTTP ingress' : 'direct loopback', t => checkProxyProtocol(t, gateway));
});

test('optional ingress enforces original authority and fetch metadata before forwarding', async t => {
  const f = fixture(t);
  await assert.rejects(createReadOnlyHttpGateway({service: {}}), /configuratie/);
  await assert.rejects(createReadOnlyHttpGateway({service: {}, online: f.online}), /niet gecontroleerd/);
  const {url} = await start(t, f, {...f.online, missingOrigin: 'server-client'}, undefined, true);
  assert.equal((await post(url, rpc(), {origin: undefined})).status, 200);
  for (const headers of [{host: url.host}, {host: [host, 'attacker.invalid']}, {origin: [publicOrigin, 'null']},
    {origin: 'https://attacker.invalid', 'x-forwarded-origin': publicOrigin},
    {host: 'attacker.invalid', 'x-forwarded-host': host}, {'sec-fetch-site': 'cross-site'},
    {'sec-fetch-site': ['same-origin', 'cross-site']},
    {origin: undefined, 'sec-fetch-mode': 'cors'}, {origin: undefined, 'sec-fetch-custom': 'browser'}])
    assert.equal((await post(url, rpc(), headers)).status, 403);
  assert.equal((await post(url, rpc(), {connection: 'origin'})).status, 400);
  assert.equal((await post(url, rpc(), {'x-forwarded-for': '127.0.0.1'})).status, 200);
  for (const method of ['GET', 'OPTIONS', 'DELETE']) {
    const response = await post(url, '', {}, method);
    assert.equal(response.status, 405); assert.equal(response.headers.allow, 'POST');
  }
});

void test('hosting health probe is exact, data-free and does not relax MCP access', async t => {
  const f = fixture(t), {url, server} = await start(t, f, f.online, undefined, true);
  const health = new URL('/health', url), internal = {host: url.host, origin: undefined};
  const fork = t.mock.method(childProcess, 'fork');
  const response = await post(health, '', internal, 'GET');
  assert.equal(response.status, 200);
  assert.equal(response.text, '{"status":"ok"}');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(response.headers['set-cookie'], undefined);
  for (const method of ['POST', 'OPTIONS', 'DELETE', 'HEAD']) {
    const denied = await post(health, '', internal, method);
    assert.equal(denied.status, 405); assert.equal(denied.headers.allow, 'GET');
  }
  for (const headers of [{'content-length': '2'}, {'transfer-encoding': 'chunked'}])
    assert.equal((await post(health, '{}', {...internal, ...headers}, 'GET')).status, 400);
  for (const path of ['/health/', '/health?tool=list_sources', '/%68ealth', '/health/mcp'])
    assert.equal((await post(new URL(path, url), '', {}, 'GET')).status, 404);
  assert.equal((await post(url, call('list_sources'), internal)).status, 403);
  assert.equal(fork.mock.callCount(), 0, 'health and refusals never spawn a database reader');
  assert.equal(payload(await post(url, call('list_sources'))).sources[0].holdItems, 1);
  assert.equal(fork.mock.callCount(), 1, 'permitted MCP reads still use the isolated reader');
  const direct = await start(t, f);
  assert.equal((await post(new URL('/health', direct.url), '', {}, 'GET')).status, 404);
  // Reopen only the ingress after shutdown closed its internal listener.
  // A reachable ingress without that listener must not report healthy.
  await new Promise(resolve => server.close(resolve));
  server.listen(Number(url.port), '127.0.0.1'); await once(server, 'listening');
  const unavailable = await post(health, '', internal, 'GET');
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.text, '{"status":"unavailable"}');
});

void test('health and MCP request budgets are independently bounded', async t => {
  t.mock.method(performance, 'now', () => 1000);
  const f = fixture(t), {url} = await start(t, f, f.online, {requestBurst: 2}, true);
  const health = new URL('/health', url), internal = {host: url.host, origin: undefined};
  assert.equal((await post(url)).status, 200);
  assert.equal((await post(url)).status, 200);
  assert.equal((await post(url)).status, 429);
  assert.equal((await post(health, '', internal, 'GET')).status, 200);
  assert.equal((await post(health, '', internal, 'GET')).status, 200);
  const limited = await post(health, '', internal, 'GET');
  assert.equal(limited.status, 429); assert.equal(limited.headers['retry-after'], '1');
  const other = await start(t, f, f.online, {requestBurst: 2}, true);
  for (let i = 0; i < 2; i++) assert.equal((await post(new URL('/health', other.url), '', internal, 'GET')).status, 200);
  assert.equal((await post(new URL('/health', other.url), '', internal, 'GET')).status, 429);
  assert.equal((await post(other.url)).status, 200, 'health traffic does not consume the read budget');
});

test('ingress keeps body, response and global request budgets bounded across both hops', async t => {
  const f = fixture(t), {url} = await start(t, f, f.online, {requestBurst: 4, responseBytes: 1024}, true);
  assert.equal((await post(url, ' '.repeat(readOnlyHttpLimits.bodyBytes + 1))).status, 413);
  assert.equal((await post(url, '[{}]')).status, 400);
  assert.equal((await post(url, rpc('tools/list'))).status, 413);
  assert.equal((await post(url, rpc())).status, 200);
  assert.equal((await post(url, rpc(), {'x-forwarded-for': '192.0.2.8'})).status, 429);
});

test('ingress deadline releases a slow upload slot without buffering or queueing another request', async t => {
  const f = fixture(t), {url, server} = await start(t, f, f.online, {concurrentRequests: 1, connectionMs: 800}, true);
  const admitted = once(server, 'request');
  const slow = request(url, {method: 'POST', agent: false, headers: {host, origin: publicOrigin,
    'content-type': 'application/json', 'content-length': 100}});
  const stopped = new Promise(resolve => slow.once('error', resolve));
  t.after(() => slow.destroy());
  slow.write('{');
  await admitted;
  assert.equal((await post(url)).status, 429);
  await stopped;
  assert.equal((await post(url)).status, 200);
});

test('proxy Host/Origin and actual loopback peer remain mandatory; forwarded headers cannot repair failures', async t => {
  const f = fixture(t), {url} = await start(t, f);
  for (const headers of [{host: url.host}, {host: 'attacker.invalid'}, {host: host + ':443'},
    {host: [host, 'attacker.invalid']}, {origin: [publicOrigin, 'null']}, {origin: undefined},
    {origin: 'null'}, {origin: '*'}, {origin: publicOrigin + '/'}, {origin: 'https://attacker.invalid'},
    {'sec-fetch-site': 'cross-site'}, {'sec-fetch-site': 'same-site'}, {'sec-fetch-site': 'invalid'},
    {host: 'attacker.invalid', forwarded: `host=${host};proto=https`, 'x-forwarded-host': host},
    {origin: undefined, 'x-forwarded-origin': publicOrigin},
    {origin: 'https://attacker.invalid', 'x-forwarded-for': '127.0.0.1'}])
    assert.equal((await post(url, rpc(), headers)).status, 403, JSON.stringify(headers));
  assert.equal((await post(url, rpc(), {'x-forwarded-host': 'attacker.invalid', 'x-forwarded-proto': 'http'})).status, 200);
  const req = {rawHeaders: ['Host', host, 'Origin', publicOrigin], headers: {host, origin: publicOrigin},
    socket: {localAddress: '127.0.0.1', remoteAddress: '192.0.2.7'}};
  assert.equal(acceptsReadOnlyRequest(req, readOnlyOnlineConfig(f.online)), false);
  req.socket = {localAddress: '192.0.2.7', remoteAddress: '127.0.0.1'};
  assert.equal(acceptsReadOnlyRequest(req, readOnlyOnlineConfig(f.online)), false);
});

test('headerless server clients need explicit permission and no browser fetch metadata', async t => {
  const f = fixture(t), {url} = await start(t, f, {...f.online, missingOrigin: 'server-client'});
  assert.equal((await post(url, rpc(), {origin: undefined})).status, 200);
  for (const headers of [{origin: 'null'}, {origin: 'https://attacker.invalid'},
    {origin: undefined, 'sec-fetch-site': 'none'}, {origin: undefined, 'sec-fetch-mode': 'cors'},
    {origin: undefined, 'sec-fetch-dest': 'empty'}])
    assert.equal((await post(url, rpc(), headers)).status, 403);
});

test('public pins do not grant publication to local, confidential, review or unknown release formats', async t => {
  for (const fields of [
    {format: 'omnibus-local-model-publication', scope: 'local-database-only', contentGate: 'LOCAL_OWNER_ADMITTED'},
    {format: 'omnibus-local-source-publication', scope: 'local-database-only', contentGate: 'LOCAL_OWNER_ADMITTED'},
    {format: 'omnibus-local-review-database', contentGate: 'VERIFIED_APPLICATION_RELEASE'},
    {scope: 'confidential'}, {scope: 'local-database-only'}, {format: 'unknown'}, {contentGate: 'LOCAL_OWNER_ADMITTED'},
  ]) {
    const f = fixture(t, fields);
    // Same valid pins and same index remain readable in the LOCAL-only service.
    const local = await openIsolatedReadOnlyService({buildDirectory: f.build});
    try { assert.equal((await local.sources()).sources[0].id, 'R'); } finally { await local.close(); }
    await assert.rejects(openIsolatedReadOnlyService({buildDirectory: f.build, publicRuntime: f.online.publicRuntime}), /Leesverzoek niet uitgevoerd/);
  }
});

test('explicit database pin covers injected index/search data and is checked on every isolated read', async t => {
  const f = fixture(t), {url} = await start(t, f);
  const original = fs.readFileSync(f.database), manifest = fs.readFileSync(f.manifestPath);
  try {
    const writer = new DatabaseSync(f.database);
    try { insertEntry(writer, {key: 'PRIVATE', kind: 'report', sourceId: 'PRIVATE', sourceTitle: canary,
      material: {title: canary, body: canary}}); } finally { writer.close(); }
    for (const body of [call('get_workflow_guide'), call('list_sources'), call('search_building_blocks', {query: canary}),
      call('get_building_block', {key: 'PRIVATE'})])
      assert.equal((await post(url, body)).body.result.isError, true);
    await assert.rejects(openIsolatedReadOnlyService({buildDirectory: f.build, publicRuntime: f.online.publicRuntime}));
    fs.writeFileSync(f.database, original);
    fs.writeFileSync(f.manifestPath, JSON.stringify({schema: 1, release: f.release, publication: 'f'.repeat(64), contract: runtimeContractHash}));
    assert.equal((await post(url, call('list_sources'))).body.result.isError, true);
    fs.writeFileSync(f.manifestPath, manifest);
    for (const suffix of ['-wal', '-journal']) {
      fs.writeFileSync(f.database + suffix, canary);
      try { assert.equal((await post(url, call('list_sources'))).body.result.isError, true); }
      finally { fs.unlinkSync(f.database + suffix); }
    }
  } finally { fs.writeFileSync(f.database, original); fs.writeFileSync(f.manifestPath, manifest); }
  assert.equal(payload(await post(url, call('list_sources'))).release, f.release);
});

test('proxy mode shares the bounded transport and one budget regardless of forwarded client identity', async t => {
  const f = fixture(t), {url} = await start(t, f, f.online, {requestBurst: 4, responseBytes: 1024});
  assert.equal((await post(url, ' '.repeat(readOnlyHttpLimits.bodyBytes + 1))).status, 413);
  assert.equal((await post(url, '[{}]')).status, 400);
  assert.equal((await post(url, rpc('tools/list'))).status, 413);
  assert.equal((await post(url)).status, 200);
  assert.equal((await post(url, rpc(), {'x-forwarded-for': '192.0.2.1'})).status, 429);
});

test('standalone startup keeps loopback default, requires explicit ingress and safely fails invalid configuration', async t => {
  const f = fixture(t), config = join(f.build, 'online.json');
  const online = {...f.online, missingOrigin: 'server-client'};
  fs.writeFileSync(config, JSON.stringify(online));
  const args = [join(root, 'agent-tools/start-read-only-http.mjs'), '--build-directory', f.build];
  for (const gatewayArgs of [[], ['--gateway-host', '127.0.0.1']]) {
    const child = spawn(process.execPath, [...args, '--online-config', config, ...gatewayArgs], {windowsHide: true});
    const exited = once(child, 'exit');
    try {
      const [output] = await once(child.stdout, 'data');
      const address = output.toString().match(/http:\/\/127\.0\.0\.1:\d+\/mcp/);
      assert(address);
      assert.equal(payload(await post(new URL(address[0]), call('list_sources'), {origin: undefined})).release, f.release);
    } finally { child.kill(); await exited; }
  }
  const occupied = await start(t, f);
  for (const extra of [['--online-config', config, '--online-config', config], ['--host', '0.0.0.0'],
    ['--gateway-host', '0.0.0.0'], ['--online-config', config, '--gateway-host', '192.0.2.1'],
    ['--online-config', config, '--gateway-host', '127.0.0.1', '--port', occupied.url.port],
    ['--online-config', join(f.build, canary)]]) {
    const failed = spawn(process.execPath, [...args, ...extra], {windowsHide: true});
    let output = ''; failed.stdout.on('data', data => { output += data; }); failed.stderr.on('data', data => { output += data; });
    assert.equal((await once(failed, 'close'))[0], 1); assert(!output.includes(canary)); assert(!output.includes(f.build));
  }
  fs.writeFileSync(config, JSON.stringify({...online, enabled: false}));
  const disabled = spawn(process.execPath, [...args, '--online-config', config], {windowsHide: true});
  assert.equal((await once(disabled, 'close'))[0], 1);
});
