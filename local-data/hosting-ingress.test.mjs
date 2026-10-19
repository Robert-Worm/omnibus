import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeFixture} from './test-support/runtime-fixture.mjs';
import {CatalogueRepository, digest} from './repository.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {serveCatalogue} from './server.mjs';

// Test-only ingress, never a start command or an alternate application backend.
// All sockets go to loopback; .invalid names below are header values, never DNS.
const ingressPort = 4393, runtimePort = 4394;
const localHost = `127.0.0.1:${runtimePort}`;
const publicHost = 'omnibus.example.invalid', publicOrigin = `https://${publicHost}`;
const scratch = fileURLToPath(new URL('../work/hosting-policy/', import.meta.url));
const canary = 'SYNTHETIC-PRIVATE-REQUEST-CANARY';

function fixture(t) {
  mkdirSync(join(scratch, 'fixtures'), {recursive:true});
  // Reuse the existing full synthetic publication fixture, inside this worktree.
  // Changes are synchronous and process-local; no user/global environment edits.
  const saved = Object.fromEntries(['TEMP', 'TMP', 'TMPDIR'].map(key => [key, process.env[key]]));
  let f;
  try {
    for (const key of Object.keys(saved)) process.env[key] = join(scratch, 'fixtures');
    f = runtimeFixture(t);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  assert(!relative(resolve(scratch), resolve(f.dir)).startsWith('..'));
  const webRoot = join(f.dir, 'web');
  mkdirSync(join(webRoot, 'assets'), {recursive:true});
  writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>Synthetic ingress rehearsal</title>');
  writeFileSync(join(webRoot, 'assets', 'synthetic.js'), '/* synthetic asset */');
  writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({schema:1,
    release:f.release, publication:f.publication, contract:runtimeContractHash}));
  const repository = new CatalogueRepository(f.databasePath, {readOnly:true});
  f.beforeCleanup.push(() => {if (repository.db.isOpen) repository.close();});
  return {...f, repository, webRoot};
}

function request(port, {path='/api/v1/ready', method='GET', headers={Host:localHost}}={}) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'127.0.0.1', port, path, method, headers,
      setHost:false, agent:false}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({status:res.statusCode, headers:res.headers,
        body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.setTimeout(5000, () => req.destroy(Error('Synthetic request timeout')));
    req.on('error', reject);req.end();
  });
}

async function ingress(t, state) {
  const server = http.createServer({maxHeaderSize:8192}, (req, res) => {
    // Preserve raw Host/Origin/forwarded headers, including duplicates. Do not
    // rewrite them to satisfy the local runtime. The target is a fixed socket.
    const upstream = http.request({hostname:'127.0.0.1', port:runtimePort,
      path:req.url, method:req.method, headers:req.rawHeaders, setHost:false, agent:false}, reply => {
      const headers = {...reply.headers};
      // Pure response-header experiment. It does not implement public admission.
      if (state.candidateCors) headers['access-control-allow-origin'] = publicOrigin;
      // One documented provider rule is simulated; this is not Sevalla traffic.
      if (state.providerFallback && !headers['access-control-allow-origin'])
        headers['access-control-allow-origin'] = '*';
      res.writeHead(reply.statusCode, headers);
      reply.on('error', () => res.destroy());reply.pipe(res);
    });
    upstream.setTimeout(5000, () => upstream.destroy(Error('Synthetic upstream timeout')));
    upstream.on('error', () => {
      if (res.headersSent) res.destroy(); else {res.writeHead(502);res.end();}
    });
    res.on('close', () => upstream.destroy());
    upstream.flushHeaders();req.pipe(upstream);
  });
  server.maxHeadersCount = 0;
  await new Promise((resolve, reject) => {
    server.once('error', reject);server.listen(ingressPort, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());server.closeAllConnections();
  }));
  assert.equal(server.address().address, '127.0.0.1');
}

test('synthetic loopback ingress: current guarantees and explicit future gaps', {timeout:60000}, async t => {
  const f = fixture(t), before = digest(readFileSync(f.databasePath));
  const app = await serveCatalogue(f.repository, {port:runtimePort, webRoot:f.webRoot});
  f.beforeCleanup.push(() => app.close());
  assert.equal(app.server.address().address, '127.0.0.1');
  const state = {providerFallback:false, candidateCors:false};
  await ingress(t, state);
  const observations = [];
  f.beforeCleanup.push(() => writeFileSync(join(scratch, 'rehearsal-results.json'), JSON.stringify({
    scope:'LOCAL SYNTHETIC ONLY; green tests are not hosted acceptance',
    node:process.version, ports:[ingressPort, runtimePort], observations,
    databaseUnchanged:before === digest(readFileSync(f.databasePath)),
  }, null, 2)));
  // This listener only observes synthetic traffic; it never edits IncomingMessage.
  let received;
  app.server.prependListener('request', req => {received = [...req.rawHeaders];});
  const observe = async (id, options, currentStatus, futureStatus) => {
    const result = await request(ingressPort, options);
    observations.push({id, currentStatus:result.status, expectedCurrent:currentStatus,
      futureStatus, gap:futureStatus !== undefined && currentStatus !== futureStatus});
    assert.equal(result.status, currentStatus, id);
    return result;
  };

  await t.test('Host/Origin transport preserves public incompatibilities and hostile rejection', async () => {
    await observe('local-control', {}, 200);
    assert.equal((await request(runtimePort, {headers:{}})).status, 400,
      'missing Host is also rejected by the runtime HTTP parser, not only the test ingress');
    for (const [id, headers, current, future] of [
      ['public-host', {Host:publicHost}, 403, 200],
      ['public-same-origin', {Host:publicHost, Origin:publicOrigin}, 403, 200],
      ['public-origin-on-local-host', {Host:localHost, Origin:publicOrigin}, 403, 403],
      ['unknown-host', {Host:'hostile.invalid'}, 403, 403],
      ['host-suffix', {Host:publicHost+'.hostile.invalid'}, 403, 403],
      ['missing-host', {}, 400, 400],
      ['foreign-origin', {Host:localHost, Origin:'https://hostile.invalid'}, 403, 403],
      ['null-origin', {Host:localHost, Origin:'null'}, 403, 403],
      ['wrong-origin-scheme', {Host:localHost, Origin:`https://${localHost}`}, 403, 403],
      ['origin-suffix', {Host:localHost, Origin:`http://${localHost}.hostile.invalid`}, 403, 403],
      ['cross-site', {Host:localHost, 'Sec-Fetch-Site':'cross-site'}, 403, 403],
    ]) {
      await observe(id, {headers}, current, future);
      for (const name of ['Host', 'Origin']) {
        if (headers[name] === undefined) continue;
        const index = received.findIndex((v, i) => i % 2 === 0 && v.toLowerCase() === name.toLowerCase());
        assert.equal(received[index+1], headers[name], name);
      }
    }
    await observe('duplicate-host-local-first', {headers:['Host',localHost,'Host','hostile.invalid']}, 200, 400);
    assert.deepEqual(received.filter((_, i) => i < 4), ['Host',localHost,'Host','hostile.invalid']);
    await observe('duplicate-host-hostile-first', {headers:['Host','hostile.invalid','Host',localHost]}, 403, 400);
    await observe('duplicate-origin', {headers:['Host',localHost,'Origin',`http://${localHost}`,
      'Origin','https://hostile.invalid']}, 403, 400);
    for (const path of [`http://${publicHost}/api/v1/ready`, `//${publicHost}/api/v1/ready`])
      await observe('non-origin-form', {path}, 400);
  });

  await t.test('forwarded identity cannot authorize a request or replace the local request ID', async () => {
    const forged = {Forwarded:`for=192.0.2.44;host=${localHost};proto=http`,
      'X-Forwarded-Host':localHost, 'X-Forwarded-Proto':'https', 'X-Forwarded-For':'192.0.2.44, 198.51.100.8',
      'X-Forwarded-Port':'443', 'CF-Connecting-IP':'192.0.2.44', 'X-Real-IP':'192.0.2.44',
      'X-Original-URI':'/api/v1/health', 'X-Request-ID':canary};
    await observe('forged-proxy-cannot-rescue-host', {headers:{Host:'hostile.invalid', ...forged}}, 403);
    await observe('forged-proxy-cannot-rescue-origin', {headers:{Host:localHost,
      Origin:'https://hostile.invalid', ...forged}}, 403);
    const result = await observe('forwarded-headers-are-not-identity', {headers:{Host:localHost, ...forged}}, 200);
    assert.match(result.headers['x-request-id'], /^[a-f0-9-]{36}$/);
    assert.notEqual(result.headers['x-request-id'], canary);
    assert(!JSON.stringify(result).includes(canary));
    for (const [name, value] of Object.entries(forged)) {
      const index = received.findIndex((v, i) => i % 2 === 0 && v.toLowerCase() === name.toLowerCase());
      assert.equal(received[index+1], value, name);
    }
  });

  await t.test('probe Host mismatch is explicit; headers and user-agent grant no probe bypass', async () => {
    // localhost is documented as the probe URL, not a verified wire Host value.
    const probe = {Host:`localhost:${runtimePort}`, 'User-Agent':'synthetic-probe',
      'X-Forwarded-Host':localHost};
    await observe('localhost-probe-hypothesis', {headers:probe}, 403, 200);
    for (const path of ['/', '/assets/synthetic.js', '/api/v1/releases'])
      await observe('probe-authority-cannot-read-content', {path, headers:probe}, 403);
    for (const [id, options, status] of [
      ['probe-post', {method:'POST'}, 405],
      ['probe-head', {method:'HEAD'}, 405],
      ['probe-body', {headers:{Host:localHost, 'Content-Length':'1'}}, 400],
      ['probe-pin-query', {path:'/api/v1/ready?release='+f.release}, 400],
    ]) await observe(id, options, status);
    await observe('health-query-explicitly-rejected', {path:'/api/v1/health?probe=1'}, 400, 400);
    const ready = await observe('local-probe-ready', {}, 200);
    assert.equal(ready.headers['cache-control'], 'no-store');
    assert.deepEqual(JSON.parse(ready.body), {status:'ready', mode:'local-read-only', schema:1});
    assert(!ready.body.includes(f.release));
  });

  await t.test('publication scope survives the extra hop; fixture bytes stay unchanged', async () => {
    const hash = digest(JSON.stringify({label:'Synthetic test only'}));
    const path = `/api/v1/content/${hash}?release=${f.release}`;
    const content = await observe('pinned-resource', {path}, 200);
    assert.deepEqual(JSON.parse(content.body), {label:'Synthetic test only'});
    for (const path of ['/api/v1/releases', '/api/v1/catalogue?release='+f.release,
      '/api/v1/packages/'+'a'.repeat(64)+'/records', '/.env', '/catalogue.sqlite', '/admin',
      '/api/v1/content/'+'b'.repeat(64)+'?release='+f.release])
      await observe('unpublished-route', {path}, 404);
    assert.equal(digest(readFileSync(f.databasePath)), before);
  });

  await t.test('simulated provider fallback adds wildcard even to a denied Origin', async () => {
    const direct = await request(runtimePort);
    assert.equal(direct.headers['access-control-allow-origin'], undefined);
    state.providerFallback = true;
    const allowed = await observe('simulated-wildcard-local-control', {}, 200);
    assert.equal(allowed.headers['access-control-allow-origin'], '*');
    const denied = await observe('simulated-wildcard-on-rejection', {headers:{Host:localHost,
      Origin:'https://hostile.invalid'}}, 403);
    assert.equal(denied.headers['access-control-allow-origin'], '*');
    assert.deepEqual(JSON.parse(denied.body), {error:'Origin not allowed'});
    // A header simulation is not a browser CORS test and does not bypass the 403.
  });

  await t.test('candidate fixed CORS suppresses simulated fallback on 200/304/400/403/404/405', async () => {
    state.candidateCors = true;
    const asset = await request(ingressPort, {path:'/assets/synthetic.js'});
    for (const [id, options, status] of [
      ['candidate-static', {path:'/'}, 200],
      ['candidate-ready', {}, 200],
      ['candidate-304', {path:'/assets/synthetic.js', headers:{Host:localHost, 'If-None-Match':asset.headers.etag}}, 304],
      ['candidate-400', {path:'/api/v1/ready?x=1'}, 400],
      ['candidate-403', {headers:{Host:localHost, Origin:'https://hostile.invalid'}}, 403],
      ['candidate-404', {path:'/admin'}, 404],
      ['candidate-preflight', {method:'OPTIONS', headers:{Host:localHost, Origin:`http://${localHost}`,
        'Access-Control-Request-Method':'POST'}}, 405],
    ]) {
      const result = await observe(id, options, status);
      assert.equal(result.headers['access-control-allow-origin'], publicOrigin);
      assert.equal(result.headers['access-control-allow-credentials'], undefined);
      assert.equal(result.headers['access-control-allow-methods'], undefined);
      assert.equal(result.headers.vary, 'Accept-Encoding');
      assert.equal(result.headers['cross-origin-resource-policy'], 'same-origin');
    }
    assert.equal((await request(runtimePort)).headers['access-control-allow-origin'], undefined,
      'candidate response experiment must not modify production behavior');
  });

  await t.test('failed readiness and diagnostic redaction survive simulated ingress', async st => {
    const logs = [];st.mock.method(console, 'error', line => logs.push(line));
    f.repository.close();
    const failed = await observe('candidate-503', {}, 503);
    assert.deepEqual(JSON.parse(failed.body), {status:'not-ready', mode:'local-read-only', schema:1});
    assert.equal(failed.headers['retry-after'], '1');assert.equal(failed.headers['cache-control'], 'no-store');
    const hash = digest(JSON.stringify({label:'Synthetic test only'}));
    const error = await observe('candidate-500', {path:`/api/v1/content/${hash}?release=${f.release}&q=${canary}`,
      headers:{Host:localHost, 'X-Request-ID':canary, Authorization:canary, Cookie:canary}}, 500);
    const health = await observe('liveness-after-database-close', {path:'/api/v1/health'}, 200);
    for (const result of [failed, error, health]) {
      assert.equal(result.headers['access-control-allow-origin'], publicOrigin);
      assert.equal(result.headers['access-control-allow-credentials'], undefined);
      assert.equal(result.headers['cache-control'], 'no-store');
      for (const secret of [canary, f.databasePath, f.publication]) assert(!JSON.stringify(result).includes(secret));
    }
    assert.equal(logs.length, 1, 'probes do not create application access logs');
    const entry = JSON.parse(logs[0]);
    assert.deepEqual(Object.keys(entry).sort(), ['event','requestId','status','time']);
    assert.equal(entry.requestId, error.headers['x-request-id']);assert.equal(entry.status, 500);
    assert(!logs[0].includes(canary));
    assert.equal(digest(readFileSync(f.databasePath)), before);
  });
});
