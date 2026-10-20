import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeFixture} from '../local-data/test-support/runtime-fixture.mjs';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {readRuntimePublication} from '../local-data/runtime-publication.mjs';
import {prepareWebResources} from '../local-data/web-resources.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {packageRuntime} from './package-runtime.mjs';
import {startRuntimePackage} from './start-runtime-package.mjs';
import {limits, parseArgs, runAcceptance} from './hosting-acceptance.mjs';

const origin = 'https://omnibus.example.invalid';
const canary = 'PRIVATE-CANARY-query-path-token';
const bundleBody = '// synthetic bundle é 😀\n'.repeat(100);
const cli = fileURLToPath(new URL('./hosting-acceptance.mjs', import.meta.url));

function fixture(t) {
  const f = runtimeFixture(t), webRoot = join(f.dir, 'web'), root = join(f.dir, 'package');
  const repository = new CatalogueRepository(f.databasePath);
  let publication, excluded;
  try {
    publication = readRuntimePublication(repository, {...f, contract: runtimeContractHash});
    excluded = prepareWebResources(repository, f.release, {excluded: {text: canary}}).excluded.hash;
  } finally { repository.close(); }
  mkdirSync(join(webRoot, 'assets'), {recursive: true});
  writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>Synthetic é 😀</title>');
  writeFileSync(join(webRoot, 'assets', 'app-12345678.js'), bundleBody);
  writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({schema: 1,
    runtimeTarget: 'portable-local', release: f.release, publication: f.publication,
    contract: runtimeContractHash, refs: publication.refs}));
  packageRuntime({webRoot, databasePath: f.databasePath, out: root});
  const before = readFileSync(f.databasePath);
  f.beforeCleanup.push(() => assert.deepEqual(readFileSync(f.databasePath), before));
  const options = {run: true, target: 'http://127.0.0.1:1', 'public-origin': origin,
    package: root, release: f.release, publication: f.publication,
    'approved-resource': publication.refs.test.hash, 'excluded-resource': excluded};
  return {...f, root, options};
}

async function listen(t, handler) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return 'http://127.0.0.1:' + server.address().port;
}

function cliRun(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args],
      {env: {...process.env, ...env}, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({code, stdout, stderr}));
  });
}
const argsFor = options => Object.entries(options).flatMap(([key, value]) =>
  value === true ? ['--' + key] : ['--' + key, value]);

test('explicit CLI options: no defaults, credentials, arbitrary paths or escape switches', () => {
  const options = {run: true, target: 'http://127.0.0.1:12345', 'public-origin': origin,
    package: 'synthetic', release: 'a'.repeat(64), publication: 'b'.repeat(64),
    'approved-resource': 'c'.repeat(64), 'excluded-resource': 'd'.repeat(64)};
  const args = argsFor(options);
  assert.deepEqual(parseArgs(args), options);
  for (const invalid of [[], args.slice(1), [...args, '--run'], [...args, '--target', origin],
    [...args, '--header', 'Authorization: secret'], [...args, '--cookie', 'secret'],
    [...args, '--insecure'], [...args, '--path', '/private'], [...args, '--timeout', '999999'],
    [...args, '--target=' + origin], ['--help', ...args]]) assert.throws(() => parseArgs(invalid));
});

test('no-argument/help and invalid CLI inputs make no connections and redact values', async t => {
  let calls = 0;
  const target = await listen(t, (_req, res) => { calls++; res.end(canary); });
  const env = {REVIEW_URL: target, PUBLIC_ORIGIN: target, HTTP_PROXY: target, HTTPS_PROXY: target};
  for (const args of [[], ['--help']]) {
    const out = await cliRun(args, env);
    assert.equal(out.code, 0); assert.match(out.stdout, /no connections/); assert.equal(out.stderr, '');
  }
  const out = await cliRun(['--target', target + '/?' + canary], env);
  assert.equal(out.code, 2); assert.doesNotMatch(out.stdout + out.stderr, new RegExp(canary));
  assert.equal(calls, 0);
});

test('preflight refuses unapproved targets, pins, resource choices and changed package before HTTP', async t => {
  const f = fixture(t);
  let calls = 0;
  const target = await listen(t, (_req, res) => { calls++; res.end(canary); });
  const options = {...f.options, target};
  const bad = [
    {run: false}, {target: origin}, {target: 'http://example.invalid', 'allow-external': true},
    {target: 'https://other.invalid', 'allow-external': true},
    {target: 'http://localhost:' + new URL(target).port}, {target: target + '/'},
    {target: target + '/?' + canary}, {target: target + '/#' + canary},
    {target: target.replace('://', '://user:secret@')},
    {'public-origin': origin + '/'}, {release: '0'.repeat(64)}, {publication: '0'.repeat(64)},
    {'approved-resource': f.options['excluded-resource']}, {'excluded-resource': f.options['approved-resource']},
  ];
  for (const change of bad) await assert.rejects(runAcceptance({...options, ...change}),
    {message: 'Hosting acceptance input or package refused; use --help.'});
  writeFileSync(join(f.root, 'database-build', 'assets', 'app-12345678.js'), canary);
  await assert.rejects(runAcceptance(options), /input or package refused/);
  assert.equal(calls, 0);
});

test('CLI checks real pinned runtime package: 16 bounded GETs, unchanged database, no content output', async t => {
  const f = fixture(t);
  const reservation = http.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const app = await startRuntimePackage({root: f.root, databasePath: f.databasePath,
    release: f.release, publication: f.publication, publicOrigin: origin, listenHost: '127.0.0.1', port});
  f.beforeCleanup.push(() => app.close());
  const requests = [];
  app.server.on('request', req => requests.push({method: req.method, headers: req.headers, path: req.url}));
  const out = await cliRun(argsFor({...f.options, target: app.url}));
  assert.equal(out.code, 0, out.stderr + out.stdout);
  const result = JSON.parse(out.stdout);
  assert.equal(result.passed, true); assert.equal(result.localPackagePinsVerified, true);
  assert.equal(result.remotePinsAttested, false); assert.equal(result.transport, 'loopback');
  assert.equal(result.checks.length, 16); assert.equal(result.notRun, 0);
  assert.equal(requests.length, 16);
  for (const req of requests) {
    assert.equal(req.method, 'GET'); assert.equal(req.headers.host, new URL(origin).host);
    assert.equal(req.headers['accept-encoding'], req.path.startsWith('/assets/') ? 'gzip' : 'identity');
    for (const key of ['authorization', 'cookie', 'proxy-authorization', 'content-length', 'origin'])
      assert.equal(req.headers[key], undefined);
  }
  for (const check of result.checks) {
    assert(check.passed); assert(check.bodyBytes > 0 && check.bodyBytes <= limits.bodyBytes);
    assert(check.decodedBodyBytes > 0 && check.decodedBodyBytes <= limits.bodyBytes);
    assert(check.headersMs >= 0 && check.totalMs >= check.headersMs);
  }
  assert.equal(result.checks[3].decodedBodyBytes, Buffer.byteLength(bundleBody));
  assert(result.checks[3].bodyBytes < result.checks[3].decodedBodyBytes);
  for (const secret of [canary, f.root, f.release, f.publication, f.options['approved-resource'],
    'Synthetic', '?release=', '/local-data/', 'sha256', origin, app.url])
    assert(!out.stdout.includes(secret), 'report contains only fixed labels and numeric observations');
  t.diagnostic('Synthetic loopback HTTP sample (not browser performance): ' + JSON.stringify(
    result.checks.slice(0, 5).map(({check, bodyBytes, headersMs, totalMs}) => ({check, bodyBytes, headersMs, totalMs}))));
});

test('external opt-in uses matching origin and verified TLS; fake transport makes no external connection', async t => {
  const f = fixture(t), calls = [];
  t.mock.method(https, 'request', options => {calls.push(options); throw Error(canary);});
  await assert.rejects(runAcceptance({...f.options, target: origin}));
  assert.equal(calls.length, 0);
  const result = await runAcceptance({...f.options, target: origin, 'allow-external': true});
  assert.equal(calls.length, 1); assert.equal(calls[0].rejectUnauthorized, true);
  assert.equal(calls[0].hostname, 'omnibus.example.invalid'); assert.equal(calls[0].agent, false);
  assert.equal(calls[0].method, 'GET'); assert.equal(calls[0].auth, undefined);
  assert.equal(result.checks[0].failure, 'transport-or-limit'); assert(!JSON.stringify(result).includes(canary));
});

const probeHeaders = {
  'Access-Control-Allow-Origin': origin, 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8', Vary: 'Accept-Encoding',
};
const healthBody = JSON.stringify({status: 'ok', mode: 'public-read-only', schema: 1});

test('unsafe headers, wrong probe modes and readiness failures stop immediately with redacted output', async t => {
  const f = fixture(t);
  const cases = [
    {name: 'wildcard CORS', headers: {'Access-Control-Allow-Origin': '*'}, failure: 'headers'},
    {name: 'missing CSP', omit: 'Content-Security-Policy', failure: 'headers'},
    {name: 'credentials', headers: {'Access-Control-Allow-Credentials': 'true'}, failure: 'headers'},
    {name: 'cookie', headers: {'Set-Cookie': canary}, failure: 'headers'},
    {name: 'cacheable probe', headers: {'Cache-Control': 'public, max-age=99'}, failure: 'headers'},
    {name: 'encoded body', headers: {'Content-Encoding': 'gzip'}, failure: 'headers'},
    {name: 'local mode', body: healthBody.replace('public-', 'local-'), failure: 'body-digest'},
    {name: 'extra private body', body: healthBody + canary, failure: 'body-digest'},
    {name: 'not ready', status: 503, failure: 'status'},
    {name: 'throttled', status: 429, failure: 'status'},
  ];
  for (const example of cases) await t.test(example.name, async t => {
    let calls = 0;
    const target = await listen(t, (_req, res) => {
      calls++;
      const headers = {...probeHeaders, ...example.headers}; delete headers[example.omit];
      res.writeHead(example.status || 200, headers); res.end(example.body || healthBody);
    });
    const result = await runAcceptance({...f.options, target});
    assert.equal(result.passed, false); assert.equal(result.checks[0].failure, example.failure);
    assert.equal(calls, 1); assert.equal(result.notRun, 15);
    assert(!JSON.stringify(result).includes(canary));
  });
});

test('redirects never follow even to another loopback server; CLI returns failed-check exit', async t => {
  const f = fixture(t);
  let followed = 0, calls = 0;
  const destination = await listen(t, (_req, res) => { followed++; res.end(canary); });
  const target = await listen(t, (_req, res) => {
    calls++; res.writeHead(302, {Location: destination + '/?' + canary}); res.end(canary);
  });
  const out = await cliRun(argsFor({...f.options, target}));
  assert.equal(out.code, 1); assert.equal(calls, 1); assert.equal(followed, 0);
  assert.equal(JSON.parse(out.stdout).checks[0].failure, 'status');
  assert(!out.stdout.includes(canary)); assert(!out.stdout.includes(destination));
});

function sampleResponses(f) {
  const staticCsp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  return [
    {body: healthBody},
    {body: JSON.stringify({status: 'ready', mode: 'public-read-only', schema: 1})},
    {body: readFileSync(join(f.root, 'database-build', 'database.html')),
      headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': staticCsp}},
    {body: gzipSync(bundleBody), headers: {'Content-Type': 'text/javascript; charset=utf-8', 'Content-Encoding': 'gzip',
      'Cache-Control': 'private, max-age=86400', 'Content-Security-Policy': staticCsp}},
    {body: JSON.stringify({label: 'Synthetic test only'})},
    {body: JSON.stringify({error: 'Not found'}), status: 404},
    {body: JSON.stringify({error: 'Not found'}), status: 404},
  ];
}

test('readiness, sampled bytes and denied bodies are checked beyond health', async t => {
  const f = fixture(t), responses = sampleResponses(f);
  for (const [index, failure, status] of [
    [1, 'status', 503], [1, 'body-digest'], [2, 'body-digest'], [3, 'body-digest'],
    [4, 'body-digest'], [6, 'status', 200], [6, 'body-digest'],
  ]) await t.test(`response ${index + 1}: ${failure}${status || ''}`, async t => {
    let calls = 0;
    const target = await listen(t, (_req, res) => {
      const current = calls++, value = responses[current];
      assert(value, 'stop at the injected failure');
      res.writeHead(current === index && status ? status : (value.status || 200),
        {...probeHeaders, ...value.headers});
      res.end(current === index ? (current === 3 ? gzipSync(canary) : canary) : value.body);
    });
    const result = await runAcceptance({...f.options, target});
    assert.equal(result.passed, false); assert.equal(calls, index + 1);
    assert.equal(result.checks.at(-1).failure, failure);
    assert.equal(result.notRun, limits.requests - calls); assert(!JSON.stringify(result).includes(canary));
  });
});

test('bundle compression is required, byte-exact and bounded on both sides without retries', async t => {
  const f = fixture(t), responses = sampleResponses(f);
  const cases = [
    {name: 'uncompressed bundle', encoding: undefined, body: bundleBody, failure: 'headers'},
    {name: 'unexpected encoding', encoding: 'br', body: canary, failure: 'headers'},
    {name: 'invalid gzip', body: canary, failure: 'transport-or-limit'},
    {name: 'truncated gzip', body: gzipSync(bundleBody).subarray(0, -5), failure: 'transport-or-limit'},
    {name: 'unfinished gzip deadline', body: gzipSync(bundleBody).subarray(0, 10),
      holdOpen: true, failure: 'transport-or-limit'},
    {name: 'different decoded bytes', body: gzipSync(canary), failure: 'body-digest'},
    {name: 'expanded body limit', body: gzipSync(Buffer.alloc(limits.bodyBytes + 1, 65)), failure: 'transport-or-limit'},
    {name: 'wire limit before header rejection', encoding: undefined,
      body: Buffer.alloc(limits.bodyBytes + 1, 65), failure: 'transport-or-limit'},
  ];
  for (const example of cases) await t.test(example.name, async t => {
    let calls = 0;
    const target = await listen(t, (_req, res) => {
      const current = calls++, value = responses[current];
      assert(current <= 3, 'stop at bundle failure');
      const headers = {...probeHeaders, ...value.headers};
      if (current === 3 && Object.hasOwn(example, 'encoding')) {
        delete headers['Content-Encoding'];
        if (example.encoding) headers['Content-Encoding'] = example.encoding;
      }
      res.writeHead(value.status || 200, headers);
      if (current === 3 && example.holdOpen) { res.write(example.body); return; }
      res.end(current === 3 ? example.body : value.body);
    });
    const result = await runAcceptance({...f.options, target});
    assert.equal(result.passed, false);
    assert.equal(calls, 4); assert.equal(result.notRun, 12);
    assert.equal(result.checks.at(-1).failure, example.failure);
    assert(!JSON.stringify(result).includes(canary));
  });
});

test('oversized response, headers, aborted socket and trickling body are bounded without retries', async t => {
  const f = fixture(t);
  const cases = [
    ['body', (_req, res) => res.end(Buffer.alloc(limits.bodyBytes + 1, 65))],
    ['headers', (_req, res) => {res.setHeader('X-Large', 'a'.repeat(limits.headerBytes)); res.end();}],
    ['socket', (req) => req.socket.destroy()],
    ['deadline', (_req, res) => {
      res.writeHead(200, probeHeaders); res.write('{');
      const timer = setInterval(() => res.write(' '), 50);
      res.once('close', () => clearInterval(timer));
    }],
  ];
  for (const [name, handler] of cases) await t.test(name, async t => {
    let calls = 0;
    const target = await listen(t, (req, res) => {calls++; handler(req, res);});
    const result = await runAcceptance({...f.options, target});
    assert.equal(result.passed, false); assert.equal(result.notRun, 15);
    assert.equal(result.checks[0].failure, 'transport-or-limit'); assert.equal(calls, 1);
  });
});
