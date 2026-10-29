import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, realpathSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {request} from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {publishRuntime} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {createIndex, insertEntry, sha256} from '../agent-tools/index-store.mjs';
import {packageMcp, parseMcpPackageArgs} from './package-mcp.mjs';

function fixture(directory) {
  mkdirSync(directory);
  const database = join(directory, 'catalogue.sqlite'), repo = new CatalogueRepository(database);
  let release, publication;
  try {
    release = repo.importRelease({manifest: {format: 'omnibus-catalogue-release', schema: 1, baselineVersion: 'synthetic-mcp-package'}, packages: [], documents: []});
    const modules = Object.fromEntries(Object.entries(runtimeContract).map(([id, entry]) => [id,
      entry.kind === 'exports' ? Object.fromEntries(entry.names.map(name => [name, {}])) : entry.property ? {[entry.property]: []} : {}]));
    modules['lib/model-choice-guide.mjs'] = {guides: {}, summaries: {}};
    modules['lib/research-models.mjs'] = {ids: [], presentations: {}};
    repo.db.exec('CREATE TABLE web_resources(release_id TEXT, hash TEXT, payload TEXT)');
    publication = publishRuntime(repo, {format: 'omnibus-runtime-publication', schemaVersion: 1,
      contentGate: 'VERIFIED_APPLICATION_RELEASE', release, contract: runtimeContractHash,
      modules, refs: {}, registrations: {}, routing: {}, summary: {}}, {release, contract: runtimeContractHash});
    createIndex(repo.db, release);
    insertEntry(repo.db, {key: 'R|HOLD', kind: 'report', sourceId: 'R', pointId: 'HOLD', sourceTitle: 'Synthetic report',
      selectionStatus: 'HOLD', draftSelectable: false,
      material: {title: 'Synthetic norm', body: 'Synthetic criterion', sourceText: 'Bron 🧭', sourceHash: 'c'.repeat(64)}});
  } finally { repo.close(); }
  writeFileSync(join(directory, 'omnibus-release.json'), JSON.stringify({schema: 1, contract: runtimeContractHash, release, publication}));
  return {enabled: true, publicOrigin: 'https://mcp.example.invalid', missingOrigin: 'server-client',
    publicRuntime: {release, publication, databaseSha256: sha256(readFileSync(database))}};
}

function launch(out, args) {
  const child = spawn(process.execPath, [join(out, 'start-read-only-http.mjs'), ...args],
    {cwd: out, windowsHide: true, env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''}});
  const closed = once(child, 'close');
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  return {child, closed, output: () => output};
}

// Simulate the TLS edge's original Host over loopback. Native fetch replaces
// Host with the local URL; this adapter keeps real SDK messages intact.
function proxyFetch(url, init) {
  return new Promise((resolve, reject) => {
    const req = request(url, {method: init.method, headers: Object.fromEntries(new Headers(init.headers)), agent: false}, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve(new Response(chunks.length ? Buffer.concat(chunks) : null, {status: res.statusCode, headers: res.headers})));
    });
    req.on('error', reject); req.end(init.body);
  });
}

await test('MCP packaging accepts only an explicit new output directory', () => {
  assert.equal(parseMcpPackageArgs(['--out', 'some-new-folder']), resolve('some-new-folder'));
  for (const args of [[], ['--out'], ['--out', ' '], ['--out', '--database'], ['--out', 'x', '--database', 'private.sqlite']])
    assert.throws(() => parseMcpPackageArgs(args));
});

await test('isolated MCP package includes dependencies and child worker, preserves read boundaries and fails closed', {timeout: 60000}, async t => {
  const scratch = mkdtempSync(join(tmpdir(), 'omnibus-mcp-package-')), out = join(scratch, 'runtime');
  t.after(() => {
    const actual = realpathSync(scratch), rel = relative(realpathSync(tmpdir()), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel)); rmSync(actual, {recursive: true});
  });
  await packageMcp(out);
  const receipt = JSON.parse(readFileSync(join(out, 'mcp-package.json')));
  assert.equal(receipt.kind, 'omnibus-mcp-code-only');
  assert(!existsSync(join(out, 'node_modules')));
  assert.deepEqual(readdirSync(out).sort(), [...Object.keys(receipt.files), 'mcp-package.json'].sort());
  for (const [file, expected] of Object.entries(receipt.files)) {
    assert(/^(?:[\w-]+\.mjs|package\.json|LICENSE|NOTICE|THIRD-PARTY-NOTICES\.txt)$/.test(file));
    const bytes = readFileSync(join(out, file)); assert.equal(bytes.length, expected.bytes); assert.equal(sha256(bytes), expected.sha256);
    assert(!bytes.includes(Buffer.from(scratch)), 'no local build paths');
  }
  const notices = readFileSync(join(out, 'THIRD-PARTY-NOTICES.txt'), 'utf8');
  assert(receipt.dependencies.some(p => p.name === '@modelcontextprotocol/sdk'));
  assert(receipt.dependencies.every(p => notices.includes(p.name + '@' + p.version)));
  assert(!receipt.dependencies.some(p => /react|vite|tailwind/.test(p.name)));
  await assert.rejects(packageMcp(out), /EEXIST/);
  const data = join(scratch, 'data'), online = fixture(data), config = join(scratch, 'online.json');
  writeFileSync(config, JSON.stringify(online));
  const args = ['--build-directory', data, '--online-config', config, '--gateway-host', '127.0.0.1'];
  const run = launch(out, args);
  const client = new Client({name: 'synthetic-package-acceptance', version: '1.0.0'});
  try {
    const address = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Packaged reader did not start: ' + run.output())), 15000);
      const check = () => { const match = run.output().match(/http:\/\/127\.0\.0\.1:\d+\/mcp/); if (match) {clearTimeout(timer); resolve(match[0]);} };
      run.child.stdout.on('data', check);
      run.child.once('close', () => {clearTimeout(timer); reject(Error('Packaged reader stopped: ' + run.output()));});
      check();
    });
    const host = new URL(online.publicOrigin).host;
    const health = await proxyFetch(new URL('/health', address), {method: 'GET', headers: {Host: new URL(address).host}});
    assert.equal(health.status, 200);
    assert.equal(await health.text(), '{"status":"ok"}');
    await client.connect(new StreamableHTTPClientTransport(new URL(address), {
      requestInit: {headers: {Host: host, Origin: online.publicOrigin}}, fetch: proxyFetch}));
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name),
      ['get_workflow_guide', 'list_sources', 'search_building_blocks', 'get_building_block']);
    const call = async (name, args = {}) => {
      const result = await client.callTool({name, arguments: args}); assert(!result.isError); return JSON.parse(result.content[0].text);
    };
    const guide = await call('get_workflow_guide'); assert.equal(guide.release, online.publicRuntime.release);
    assert.equal(guide.publication, online.publicRuntime.publication);
    assert.equal((await call('list_sources')).sources[0].holdItems, 1);
    assert.equal((await call('search_building_blocks', {query: 'synthetic'})).items[0].selectionStatus, 'HOLD');
    const block = await call('get_building_block', {key: 'R|HOLD', section: 'sourceText'});
    assert.equal(block.text, 'Bron 🧭'); assert.equal(block.draftSelectable, false);
    assert.equal((await client.callTool({name: 'prepare_research_draft', arguments: {}})).isError, true);
    assert.equal((await client.callTool({name: 'export_research_draft', arguments: {}})).isError, true);
    for (const headers of [{Host: 'wrong.example.invalid'}, {Host: host, Origin: 'https://wrong.example.invalid'}]) {
      const denied = await proxyFetch(address, {method: 'POST', headers: {...headers, 'content-type': 'application/json'}, body: '{}'});
      assert.equal(denied.status, 403);
    }
    assert(!existsSync(join(out, 'agent-output')));
  } finally { await client.close(); run.child.kill(); await run.closed; }
  assert.equal(sha256(readFileSync(join(data, 'catalogue.sqlite'))), online.publicRuntime.databaseSha256);
  for (const bad of [[], ['--build-directory', data, '--gateway-host', '0.0.0.0']]) {
    const failed = launch(out, bad); assert.equal((await failed.closed)[0], 1); assert(!failed.output().includes(scratch));
  }
  writeFileSync(config, JSON.stringify({...online, publicRuntime: {...online.publicRuntime, databaseSha256: 'f'.repeat(64)}}));
  const changed = launch(out, args); assert.equal((await changed.closed)[0], 1); assert(!changed.output().includes(scratch));
});
