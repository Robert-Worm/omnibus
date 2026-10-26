import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {request} from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
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

async function start(t, f, online = f.online, limits) {
  const service = await openIsolatedReadOnlyService({buildDirectory: f.build, publicRuntime: online.publicRuntime});
  const server = createReadOnlyHttpServer({service, online, limits});
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

test('configured proxy path preserves SDK protocol, exactly four tools, HOLD, hashes and source sections', async t => {
  const f = fixture(t), {url} = await start(t, f);
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

test('standalone startup is explicit, loopback-only, pinned and safely fails invalid online configuration', async t => {
  const f = fixture(t), config = join(f.build, 'online.json');
  const online = {...f.online, missingOrigin: 'server-client'};
  fs.writeFileSync(config, JSON.stringify(online));
  const args = [join(root, 'agent-tools/start-read-only-http.mjs'), '--build-directory', f.build];
  const child = spawn(process.execPath, [...args, '--online-config', config], {windowsHide: true});
  const exited = once(child, 'exit');
  try {
    const [output] = await once(child.stdout, 'data');
    const address = output.toString().match(/http:\/\/127\.0\.0\.1:\d+\/mcp/);
    assert(address);
    assert.equal(payload(await post(new URL(address[0]), call('list_sources'), {origin: undefined})).release, f.release);
  } finally { child.kill(); await exited; }
  for (const extra of [['--online-config', config, '--online-config', config], ['--host', '0.0.0.0'],
    ['--online-config', join(f.build, canary)]]) {
    const failed = spawn(process.execPath, [...args, ...extra], {windowsHide: true});
    let output = ''; failed.stdout.on('data', data => { output += data; }); failed.stderr.on('data', data => { output += data; });
    assert.equal((await once(failed, 'close'))[0], 1); assert(!output.includes(canary)); assert(!output.includes(f.build));
  }
  fs.writeFileSync(config, JSON.stringify({...online, enabled: false}));
  const disabled = spawn(process.execPath, [...args, '--online-config', config], {windowsHide: true});
  assert.equal((await once(disabled, 'close'))[0], 1);
});
