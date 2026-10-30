import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {request} from 'node:http';
import {connect} from 'node:net';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import childProcess from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createIndex, insertEntry, sha256} from './index-store.mjs';
import {openReadOnlyAgentService} from './read-service.mjs';
import {createReadOnlyHttpServer, readOnlyHttpLimits} from './read-only-http.mjs';
import {openIsolatedReadOnlyService, readOnlyWorkLimits} from './read-only-http-service.mjs';
import './read-only-http-online.test.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, 'work/read-only-http');
const release = 'a'.repeat(64), publication = 'b'.repeat(64);
const sourceText = 'Fictieve bron 🧭 '.repeat(30);
const secret = 'PRIVE-INHOUD C:\\private\\onderzoek.json';
const readTools = ['get_workflow_guide', 'list_sources', 'search_building_blocks', 'get_building_block'];
const rpc = (method = 'ping', params, id = 1) => ({jsonrpc: '2.0', id, method, ...(params && {params})});
const call = (name, args = {}) => rpc('tools/call', {name, arguments: args});

async function fixture(t, {limits, override, corrupt = false, populate, concurrentReads} = {}) {
  fs.mkdirSync(scratch, {recursive: true});
  const directory = fs.mkdtempSync(join(scratch, 'fixture-')), build = join(directory, 'build');
  fs.mkdirSync(build);
  const database = join(build, 'catalogue.sqlite'), db = new DatabaseSync(database);
  try {
    createIndex(db, release);
    for (const [pointId, selectionStatus] of [['P1', 'SELECTABLE'], ['P2', 'HOLD'], ['P3', 'CONTEXT_ONLY']]) {
      insertEntry(db, {key: `R1|${pointId}`, kind: 'report', sourceId: 'R1', sourceTitle: 'Fictief rapport', pointId,
        selectionStatus, selectionReason: selectionStatus === 'HOLD' ? 'Bronvraag staat open' : '',
        draftSelectable: selectionStatus === 'SELECTABLE',
        material: {title: `Beveiliging ${pointId}`, body: 'Fictieve norm.', sourceText,
          sourceContext: 'Fictieve context', sourceHash: 'c'.repeat(64), reportTrace: '{"status":"fictief"}'}});
    }
    if (corrupt) db.prepare("UPDATE agent_items SET payload = replace(payload, 'Fictieve norm.', 'Andere inhoud.') WHERE key = 'R1|P1'").run();
    populate?.(db);
  } finally { db.close(); }
  fs.writeFileSync(join(build, 'omnibus-release.json'), JSON.stringify({release, publication}));
  // HTTP must work without workflow.mjs or an output directory.
  const before = sha256(fs.readFileSync(database));
  const service = openReadOnlyAgentService({buildDirectory: build});
  const reader = await openIsolatedReadOnlyService({buildDirectory: build, concurrentReads});
  const server = createReadOnlyHttpServer({service: {...reader, ...override}, limits});
  t.after(async () => {
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections(); await closed;
    await reader.close(); service.close();
    assert.equal(sha256(fs.readFileSync(database)), before, 'synthetische database blijft bytegelijk');
    assert(!fs.existsSync(join(directory, 'output')), 'HTTP maakt geen projectuitvoer');
    const actual = fs.realpathSync(directory), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
    fs.rmSync(actual, {recursive: true});
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port, url = new URL(`http://127.0.0.1:${port}/mcp`);
  return {service, reader, server, port, url, build, directory, database};
}

function post(url, body = rpc(), options = {}) {
  return new Promise((resolve, reject) => {
    const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const headers = {'content-type': 'application/json', accept: 'application/json, text/event-stream', ...options.headers};
    const req = request(url, {agent: false, method: 'POST', ...options,
      headers: Array.isArray(headers.host) ? Object.entries(headers).flatMap(([name, values]) =>
        (Array.isArray(values) ? values : [values]).flatMap(value => [name, String(value)])) : headers}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({status: res.statusCode, headers: res.headers, text, body: text ? JSON.parse(text) : null});
      });
    });
    req.once('error', reject); req.end(bytes);
  });
}
const payload = response => JSON.parse(response.body.result.content[0].text);
const json = value => JSON.parse(JSON.stringify(value));
function safe(response) {
  assert(!response.text.includes(secret));
  assert(!response.text.includes(scratch));
  assert(!response.headers['access-control-allow-origin']);
  assert(Buffer.byteLength(response.text) <= readOnlyHttpLimits.responseBytes);
}

test('SDK HTTP client initializes and exposes exactly four read tools; no sessions or SSE', async t => {
  const {url} = await fixture(t);
  const client = new Client({name: 'synthetic-test', version: '1.0.0'});
  await client.connect(new StreamableHTTPClientTransport(url));
  t.after(() => client.close());
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map(tool => tool.name), readTools);
  for (const tool of tools) assert.equal(tool.annotations.readOnlyHint, true);
  const guide = JSON.parse((await client.callTool({name: 'get_workflow_guide'})).content[0].text);
  assert.equal(guide.release, release); assert.equal(guide.publication, publication);
  assert.match(guide.access, /Opslag, export en lokale bestanden zijn niet beschikbaar/);
  assert.deepEqual(guide.transportLimits, readOnlyHttpLimits);
  const ping = await post(url); assert.equal(ping.status, 200);
  assert.equal(ping.headers['mcp-session-id'], undefined); safe(ping);
  for (const method of ['GET', 'DELETE', 'OPTIONS', 'PUT']) {
    const response = await post(url, '', {method});
    assert.equal(response.status, 405); safe(response);
  }
});

test('sources, HOLD, trace and Unicode pagination preserve the existing read service', async t => {
  const {url, service} = await fixture(t);
  assert.deepEqual(payload(await post(url, call('list_sources'))), json(service.sources()));
  let offset = 0;
  const keys = [];
  while (offset !== null) {
    const page = payload(await post(url, call('search_building_blocks', {limit: 1, offset})));
    keys.push(...page.items.map(item => item.key)); offset = page.nextOffset;
  }
  assert.deepEqual(keys, ['R1|P1', 'R1|P2', 'R1|P3']);
  const overview = payload(await post(url, call('get_building_block', {key: 'R1|P2'})));
  assert.deepEqual(overview, json(service.get({key: 'R1|P2'})));
  assert.equal(overview.selectionStatus, 'HOLD'); assert.equal(overview.draftSelectable, false);
  assert.equal(overview.material.sourceHash, 'c'.repeat(64));
  for (const section of ['sourceText', 'sourceContext', 'trace']) {
    let offset = 0, text = '';
    while (offset !== null) {
      const part = payload(await post(url, call('get_building_block', {key: 'R1|P2', section, offset, limit: 100})));
      text += part.text; offset = part.nextOffset;
    }
    assert.equal(text, service.get({key: 'R1|P2', section}).text);
  }
  for (const args of [{limit: 41}, {offset: -1}, {offset: 100001}, {query: 'x'.repeat(501)}, {extra: secret}]) {
    const response = await post(url, call('search_building_blocks', args));
    assert.equal(response.body.result.isError, true); safe(response);
  }
});

test('unknown writes, files, projects and intakes have no callable route', async t => {
  const {url} = await fixture(t);
  for (const name of ['prepare_research_draft', 'export_research_draft', 'read_file', 'save_project', 'intake', secret]) {
    const response = await post(url, call(name, {path: secret, consent: true}));
    assert.equal(response.body.result.isError, true); safe(response);
  }
  for (const method of ['resources/read', 'resources/list', 'prompts/list', 'tasks/get']) {
    const response = await post(url, rpc(method, {uri: 'file://' + secret}));
    assert.equal(response.body.error.code, -32601); safe(response);
  }
  for (const path of ['/files', '/projects', '/mcp?path=private', '/mcp/../private'])
    assert.equal((await post(new URL(path, url))).status, 404);
});

test('exact Host/Origin and browser context reject rebinding before tool execution', async t => {
  let calls = 0;
  const {url, port} = await fixture(t, {override: {guide: () => { calls++; return {}; }}});
  for (const headers of [
    {host: 'attacker.invalid'}, {host: `127.0.0.1:${port + 1}`}, {host: '127.0.0.1'},
    {host: `localhost.attacker.invalid:${port}`}, {host: `127.0.0.1:${port}`, origin: 'null'},
    {origin: 'https://attacker.invalid'}, {origin: `http://127.0.0.1:${port}/`},
    {origin: `http://localhost:${port}`}, {'sec-fetch-site': 'cross-site'}, {'sec-fetch-site': 'same-site'},
    {host: ['127.0.0.1:' + port, 'attacker.invalid']}, {origin: [`http://127.0.0.1:${port}`, 'null']},
    {host: 'attacker.invalid', 'x-forwarded-host': `127.0.0.1:${port}`, 'x-forwarded-for': '127.0.0.1'},
  ]) {
    const response = await post(url, call('get_workflow_guide'), {headers});
    assert.equal(response.status, 403, JSON.stringify(headers)); safe(response);
  }
  assert.equal(calls, 0);
  assert.equal((await post(url, call('get_workflow_guide'), {headers: {origin: `http://127.0.0.1:${port}`}})).status, 200);
  assert.equal((await post(url, call('get_workflow_guide'), {headers: {host: `localhost:${port}`, origin: `http://localhost:${port}`}})).status, 200);
  assert.equal(calls, 2);
});

test('malformed JSON, UTF-8, batches and notifications cannot bypass the single-request boundary', async t => {
  const {url} = await fixture(t);
  for (const body of ['{"private":"' + secret, 'null', '[]', JSON.stringify([rpc(), rpc()]),
    JSON.stringify({...rpc(), id: 'x'.repeat(129)}), JSON.stringify({...rpc(), extra: secret}),
    JSON.stringify({...rpc(), method: 'tools/call', id: undefined}), Buffer.from([0xff, 0xfe])]) {
    const response = await post(url, body); assert.equal(response.status, 400); safe(response);
  }
  assert.equal((await post(url, {jsonrpc: '2.0', method: 'notifications/initialized'})).status, 202);
  assert.equal((await post(url, rpc('notifications/initialized'))).status, 400);
  assert.equal((await post(url, rpc(), {headers: {'mcp-protocol-version': secret}})).status, 400);
  assert.equal((await post(url, rpc(), {headers: {accept: 'application/json'}})).status, 406);
});

test('declared and streamed body bytes, compression and media types are bounded', async t => {
  const {url} = await fixture(t);
  const bytes = Buffer.alloc(readOnlyHttpLimits.bodyBytes + 1, 32);
  for (const headers of [{'content-length': bytes.length}, {'transfer-encoding': 'chunked'}]) {
    const response = await post(url, bytes, {headers}); assert.equal(response.status, 413); safe(response);
  }
  for (const headers of [{'content-encoding': 'gzip'}, {'content-type': 'text/plain'}])
    assert.equal((await post(url, rpc(), {headers})).status, 415);
  assert.equal((await post(url, rpc())).status, 200, 'gezond verzoek na weigeringen');
});

test('service and SDK failures do not return paths or source/request text', async t => {
  const {url} = await fixture(t, {override: {get: () => { throw Error(secret); }}});
  const response = await post(url, call('get_building_block', {key: 'R1|P1'}));
  assert.equal(response.body.result.isError, true); safe(response);
  const invalid = await post(url, call('get_building_block', {key: 'R1|P1', [secret]: secret}));
  assert.equal(invalid.body.result.isError, true); safe(invalid);
});

test('response cap fails whole without a truncated or escaped source fragment', async t => {
  const {url} = await fixture(t, {limits: {responseBytes: 1024}, override: {get: () => ({text: secret.repeat(100)})}});
  const response = await post(url, call('get_building_block', {key: 'R1|P1'}));
  assert.equal(response.body.result.isError, true); safe(response);
  // Tools/list exceeds this deliberately small wire cap even without a tool.
  const list = await post(url, rpc('tools/list'));
  assert.equal(list.status, 413); assert(Buffer.byteLength(list.text) <= 1024); safe(list);
});

test('changed source payload fails the existing integrity check over HTTP', async t => {
  const {url} = await fixture(t, {corrupt: true});
  const response = await post(url, call('get_building_block', {key: 'R1|P1'}));
  assert.equal(response.body.result.isError, true);
  assert(!response.text.includes('Andere inhoud')); safe(response);
  assert.equal(payload(await post(url, call('get_building_block', {key: 'R1|P2'}))).selectionStatus, 'HOLD');
});

test('reopening an isolated reader preserves the startup publication pin', async t => {
  const {url, build} = await fixture(t);
  const manifest = join(build, 'omnibus-release.json'), original = fs.readFileSync(manifest);
  try {
    fs.writeFileSync(manifest, JSON.stringify({release, publication: 'd'.repeat(64)}));
    const response = await post(url, call('get_building_block', {key: 'R1|P2'}));
    assert.equal(response.body.result.isError, true); safe(response);
  } finally { fs.writeFileSync(manifest, original); }
  assert.equal(payload(await post(url, call('get_workflow_guide'))).publication, publication);
});

test('rate budget is shared across connections and ignores forwarded identities', async t => {
  const {url} = await fixture(t, {limits: {requestBurst: 2}});
  assert.equal((await post(url)).status, 200); assert.equal((await post(url)).status, 200);
  const response = await post(url, rpc(), {headers: {'x-forwarded-for': '192.0.2.1'}});
  assert.equal(response.status, 429); assert.equal(response.headers['retry-after'], '1'); safe(response);
});

test('a stalled body occupies one request slot and disconnect releases it', async t => {
  const {url, port, server} = await fixture(t, {limits: {concurrentRequests: 1}});
  const stalled = connect(port, '127.0.0.1'); await once(stalled, 'connect');
  t.after(() => stalled.destroy());
  const reached = once(server, 'request');
  stalled.write(`POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{`);
  const [, response] = await reached;
  assert.equal((await post(url)).status, 429);
  const released = once(response, 'close'); stalled.destroy(); await released;
  assert.equal((await post(url)).status, 200);
});

test('absolute lifetime closes incomplete headers despite trickled bytes', async t => {
  const {port} = await fixture(t, {limits: {connectionMs: 150}});
  const socket = connect(port, '127.0.0.1'); socket.on('error', () => {});
  await once(socket, 'connect');
  const closed = new Promise(resolve => socket.once('close', resolve));
  socket.write('POST /mcp HTTP/1.1\r\nX-Slow: ');
  const timer = setInterval(() => socket.write('x'), 15);
  t.after(() => { clearInterval(timer); socket.destroy(); });
  await closed; clearInterval(timer);
});

test('connection and header limits reject excess before reading source data', async t => {
  const {port, server} = await fixture(t, {limits: {connections: 1}});
  const accepted = once(server, 'connection');
  const first = connect(port, '127.0.0.1'); first.on('error', () => {});
  const [peer] = await accepted;
  t.after(() => first.destroy());
  const dropped = once(server, 'drop');
  const second = connect(port, '127.0.0.1'); second.on('error', () => {});
  t.after(() => second.destroy());
  await dropped;
  const closed = once(peer, 'close'); first.destroy(); await closed;
  const headers = connect(port, '127.0.0.1'); headers.on('error', () => {});
  t.after(() => headers.destroy());
  await once(headers, 'connect');
  const refused = new Promise(resolve => headers.once('close', resolve));
  const parserError = once(server, 'clientError');
  headers.write(`POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nX-Large: ${'x'.repeat(readOnlyHttpLimits.headerBytes)}\r\n\r\n`);
  assert.equal((await parserError)[0].code, 'HPE_HEADER_OVERFLOW');
  await refused;
});

test('configuration can tighten limits but cannot remove or enlarge them', () => {
  for (const limits of [{bodyBytes: Infinity}, {connectionMs: 0}, {connections: 17}, {responseBytes: 100}, {unknown: 1}])
    assert.throws(() => createReadOnlyHttpServer({service: {}, limits}), /grens/i);
});

test('HTTP reader requires no workflow and STDIO still exposes its six original tools', async t => {
  const {directory, build, service} = await fixture(t);
  assert.equal(fs.existsSync(join(build, 'workflow.mjs')), false);
  const agentDir = join(directory, 'agent-tools'); fs.mkdirSync(agentDir);
  const buildRoot = join(directory, 'agent-build'); fs.mkdirSync(buildRoot);
  const moved = join(buildRoot, 'synthetic');
  fs.mkdirSync(moved);
  for (const file of ['catalogue.sqlite', 'omnibus-release.json']) fs.copyFileSync(join(build, file), join(moved, file));
  fs.writeFileSync(join(moved, 'workflow.mjs'), 'export function configureCatalogueReader() {}\nexport async function initialize() {}\nexport function options() { return {sectors: []}; }');
  fs.writeFileSync(join(buildRoot, 'current.json'), JSON.stringify({directory: moved}));
  let source = fs.readFileSync(join(root, 'agent-tools/server.mjs'), 'utf8');
  for (const name of ['service', 'schemas']) source = source.replace(`'./${name}.mjs'`, JSON.stringify(pathToFileURL(join(root, `agent-tools/${name}.mjs`)).href));
  fs.writeFileSync(join(agentDir, 'server.mjs'), source);
  const client = new Client({name: 'synthetic-stdio', version: '1.0.0'});
  try {
    await client.connect(new StdioClientTransport({command: process.execPath, args: [join(agentDir, 'server.mjs')], stderr: 'pipe'}));
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), [...readTools, 'prepare_research_draft', 'export_research_draft']);
    const result = await client.callTool({name: 'get_building_block', arguments: {key: 'R1|P2'}});
    assert.deepEqual(JSON.parse(result.content[0].text), json(service.get({key: 'R1|P2'})));
  } finally { await client.close(); }
});

test('standalone start fails safely and rejects a public bind option', async () => {
  for (const args of [[], ['--host', '0.0.0.0'], ['--build-directory', secret],
    ...['0', '5', '1.5', '01', '-1'].map(value => ['--build-directory', secret, '--read-concurrency', value])]) {
    const child = spawn(process.execPath, [join(root, 'agent-tools/start-read-only-http.mjs'), ...args], {windowsHide: true});
    let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    assert.equal((await once(child, 'exit'))[0], 1); assert(!output.includes(secret));
  }
});

test('explicit standalone start uses an available loopback port and only the synthetic index', async t => {
  const {build} = await fixture(t);
  const child = spawn(process.execPath, [join(root, 'agent-tools/start-read-only-http.mjs'), '--build-directory', build], {windowsHide: true});
  const exited = once(child, 'exit');
  try {
    const [output] = await once(child.stdout, 'data');
    const address = output.toString().match(/http:\/\/127\.0\.0\.1:\d+\/mcp/);
    assert(address, 'afzonderlijke start meldt het loopbackadres');
    const response = await post(new URL(address[0]), call('list_sources'));
    assert.equal(payload(response).release, release);
    assert.equal(payload(response).sources[0].id, 'R1');
  } finally { child.kill(); await exited; }
});

// A compact synthetic billion-row collection forces native COUNT/json_each
// work past the real five-second deadline without disk/memory amplification
// or a machine-dependent short timeout. No real catalogue is used.
function slowCollection(db) {
  db.exec(`ALTER TABLE agent_items RENAME TO fixture_items;
    CREATE VIEW agent_items AS WITH RECURSIVE n(v) AS
      (VALUES(1) UNION ALL SELECT v+1 FROM n WHERE v<1000)
    SELECT 'R|'||a.v||'|'||b.v||'|'||c.v AS key, 'report' AS kind,
      'R' AS source_id, 'Synthetic' AS source_title, 'Synthetic' AS title,
      json_object('themes',json_array(json_object('id','T'||a.v||b.v||c.v))) AS payload, '' AS sha256
      FROM n a,n b,n c;`);
}
const slowSearch = {sourceId: 'absent'};
function watchReads(t) {
  const reads = [], fork = childProcess.fork;
  t.mock.method(childProcess, 'fork', (...args) => {
    const child = fork(...args);
    child.on('message', message => {
      if (message.text !== undefined) assert(Buffer.byteLength(message.text) <= readOnlyWorkLimits.responseBytes, 'cap vóór IPC');
    });
    reads.push(child); return child;
  });
  return reads;
}
function reaped(child) {
  assert(child.exitCode !== null || child.signalCode !== null, 'leesproces is beëindigd');
  assert.throws(() => process.kill(child.pid, 0), {code: 'ESRCH'}, 'geen achtergebleven leesproces');
}

test('a lower read limit refuses overlapping work without a queue and recovers after cancellation', async t => {
  for (const concurrentReads of [0, 5, 1.5, '1', null, NaN])
    await assert.rejects(openIsolatedReadOnlyService({buildDirectory: secret, concurrentReads}), /Ongeldige leesgrens/);
  const {reader} = await fixture(t, {populate: slowCollection, concurrentReads: 1});
  const reads = watchReads(t), abort = new AbortController();
  const pending = assert.rejects(reader.search(slowSearch, {signal: abort.signal}), /Leesverzoek niet uitgevoerd/);
  await assert.rejects(reader.guide(), /Leesverzoek niet uitgevoerd/);
  assert.equal(reads.length, 1, 'the refused read does not start another process');
  abort.abort();
  await assert.rejects(reader.guide(), /Leesverzoek niet uitgevoerd/);
  await pending; reaped(reads[0]);
  assert.equal((await reader.guide()).release, release);
});

test('read processes preserve explicit jitless mode without copying unrelated startup flags', async t => {
  const previous = process.execArgv;
  process.execArgv = ['--jitless', '--inspect=0', '--import=untrusted-loader'];
  t.after(() => { process.execArgv = previous; });
  const fork = childProcess.fork;
  const observed = t.mock.method(childProcess, 'fork', (...args) => {
    assert.deepEqual(args[2].execArgv, [`--max-old-space-size=${readOnlyWorkLimits.oldSpaceMiB}`, '--jitless']);
    assert.equal(args[2].env.NODE_OPTIONS, '');
    return fork(...args);
  });
  const {reader} = await fixture(t, {concurrentReads: 1});
  assert.equal((await reader.guide()).release, release);
  assert.equal(observed.mock.callCount(), 2);
});

test('native collection work hits service and HTTP deadlines while HTTP stays responsive', {timeout: 20000}, async t => {
  const {reader, url} = await fixture(t, {populate: slowCollection});
  const reads = watchReads(t);
  let settled = false;
  const blocked = reader.search(slowSearch).finally(() => { settled = true; });
  const failed = assert.rejects(blocked, /Leesverzoek niet uitgevoerd/);
  const pulse = await post(url);
  assert.equal(pulse.status, 200);
  await delay(1000);
  assert.equal(settled, false, 'HTTP antwoordt terwijl SQLite nog rekent');
  await failed;
  assert.equal(reads.length, 1); reaped(reads[0]);
  const response = await post(url, call('get_workflow_guide'));
  assert.equal(payload(response).release, release); safe(response);
  reaped(reads[1]);
  const timedOut = await post(url, call('search_building_blocks', slowSearch)).catch(error => ({socketError: error.code}));
  if (timedOut.socketError) assert.equal(timedOut.socketError, 'ECONNRESET');
  else { assert.equal(timedOut.body.result.isError, true); safe(timedOut); }
  if (reads[2].exitCode === null && reads[2].signalCode === null) await once(reads[2], 'close');
  reaped(reads[2]);
  assert.equal(payload(await post(url, call('get_workflow_guide'))).release, release);
});

test('no reader queue, aborted work holds capacity until exit, and close reaps every reader', {timeout: 20000}, async t => {
  const {reader} = await fixture(t, {populate: slowCollection});
  const reads = watchReads(t), abort = new AbortController();
  const pending = Array.from({length: readOnlyWorkLimits.concurrentReads}, () =>
    assert.rejects(reader.search(slowSearch, {signal: abort.signal}), /Leesverzoek niet uitgevoerd/));
  assert.equal(reads.length, readOnlyWorkLimits.concurrentReads);
  await assert.rejects(reader.guide(), /Leesverzoek niet uitgevoerd/);
  assert.equal(reads.length, readOnlyWorkLimits.concurrentReads, 'weigeren spawnt en wacht niet');
  abort.abort();
  await assert.rejects(reader.guide(), /Leesverzoek niet uitgevoerd/);
  await Promise.all(pending);
  reads.forEach(reaped);
  assert.equal((await reader.guide()).release, release);
  const closing = assert.rejects(reader.search(slowSearch), /Leesverzoek niet uitgevoerd/);
  await reader.close(); await closing;
  reads.forEach(reaped);
  await assert.rejects(reader.guide(), /Leesverzoek niet uitgevoerd/);
});

test('disconnect during a tool call releases the SDK slot and kills its reader repeatedly', {timeout: 20000}, async t => {
  const {url, server} = await fixture(t, {populate: slowCollection, limits: {concurrentRequests: 1}});
  const reads = watchReads(t);
  for (let attempt = 0; attempt < 3; attempt++) {
    const reached = once(server, 'request');
    const req = request(url, {method: 'POST', headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream'}});
    req.on('error', () => {});
    req.end(JSON.stringify(call('search_building_blocks', slowSearch)));
    const [, response] = await reached;
    // Let admission reach the real child; this wait is not a timing assertion.
    while (reads.length <= attempt) await delay(10);
    const exited = once(reads[attempt], 'close'), closed = once(response, 'close');
    req.destroy(); await closed; await exited;
    reaped(reads[attempt]);
    assert.equal((await post(url)).status, 200, 'SDK-verzoekslot is opnieuw beschikbaar');
  }
});

test('large JSON fails wholly before IPC; sizeable Unicode sections and HOLD stay exact', {timeout: 20000}, async t => {
  const {url} = await fixture(t, {populate: db => {
    for (const [key, material] of [
      ['large-overview', {title: 'Synthetic', body: secret.repeat(30000)}],
      ['large-section', {title: 'Synthetic', sourceText: '🧭x'.repeat(1024 * 1024)}],
    ]) insertEntry(db, {key, kind: 'report', sourceId: 'L', sourceTitle: 'Synthetic', material});
  }});
  const reads = watchReads(t);
  const response = await post(url, call('get_building_block', {key: 'large-overview'}));
  assert.equal(response.body.result.isError, true); safe(response);
  reaped(reads.at(-1));
  const part = payload(await post(url, call('get_building_block', {key: 'large-section', section: 'sourceText', limit: 100})));
  assert.equal(part.text, '🧭x'.repeat(50));
  assert.equal(part.totalCharacters, 2 * 1024 * 1024); assert.equal(part.nextOffset, 100);
  const hold = payload(await post(url, call('get_building_block', {key: 'R1|P2'})));
  assert.equal(hold.selectionStatus, 'HOLD'); assert.equal(hold.material.sourceHash, 'c'.repeat(64));
  reads.forEach(reaped);
});

test('abruptly losing the HTTP parent does not leave a native reader process alive', {timeout: 20000}, async t => {
  const {build, directory} = await fixture(t, {populate: slowCollection});
  const harness = join(directory, 'parent.mjs');
  fs.writeFileSync(harness, `import cp from 'node:child_process';
    import {openIsolatedReadOnlyService} from ${JSON.stringify(pathToFileURL(join(root, 'agent-tools/read-only-http-service.mjs')).href)};
    const reader = await openIsolatedReadOnlyService({buildDirectory: ${JSON.stringify(build)}});
    const fork = cp.fork;
    cp.fork = (...args) => { const child = fork(...args); console.log(child.pid); return child; };
    await reader.search({sourceId: 'absent'}).catch(() => {});
    await reader.close();`);
  const parent = spawn(process.execPath, [harness], {windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']});
  const parentExited = once(parent, 'close');
  let pid;
  const alive = () => {
    try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  };
  try {
    pid = Number((await once(parent.stdout, 'data'))[0].toString().trim());
    assert(Number.isSafeInteger(pid) && pid > 0);
    await delay(1000);
    assert(alive(), 'leesproces is actief vóór het wegvallen van de ouder');
    parent.kill('SIGKILL'); await parentExited;
    const end = Date.now() + 10000;
    while (alive() && Date.now() < end) await delay(50);
    assert.equal(alive(), false, 'eigen watchdog/disconnect beëindigt ook native werk zonder ouder');
  } finally {
    parent.kill('SIGKILL'); await parentExited;
    if (pid && alive()) process.kill(pid, 'SIGKILL');
  }
});
