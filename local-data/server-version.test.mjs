import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import { runtimeFixture } from './test-support/runtime-fixture.mjs';
import { CatalogueRepository, digest } from './repository.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { serveCatalogue } from './server.mjs';
import { checkWebVersion, expectedWebVersion, compareWebVersion } from '../scripts/check-web-version.mjs';

function fixture(t) {
  const f = runtimeFixture(t), webRoot = join(f.dir, 'web');
  mkdirSync(join(webRoot, 'assets'), { recursive: true });
  writeFileSync(join(webRoot, 'database.html'), '<!doctype html><script src="/assets/test-12345678.js"></script>');
  writeFileSync(join(webRoot, 'assets/test-12345678.js'), '/* synthetic */');
  const manifest = { schema: 1, release: f.release, publication: f.publication, contract: runtimeContractHash,
    codeRevision: 'a'.repeat(40), privatePath: 'must-not-be-public', secret: 'must-not-be-public' };
  writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify(manifest));
  const repository = new CatalogueRepository(f.databasePath, { readOnly: true });
  f.beforeCleanup.push(() => repository.close());
  return { ...f, webRoot, manifest, async start(extra = {}) {
    const app = await serveCatalogue(repository, { webRoot, ...extra });
    f.beforeCleanup.push(() => app.close());
    return app;
  } };
}

test('version identifies served bytes and pinned data without exposing paths, sources or extra metadata', async t => {
  const f = fixture(t), before = digest(readFileSync(f.databasePath)), app = await f.start();
  const response = await fetch(app.url + '/api/v1/version');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const actual = await response.json(), expected = expectedWebVersion(f.webRoot);
  assert.deepEqual(actual, expected);
  assert.deepEqual(Object.keys(actual), ['schema', 'code', 'data']);
  assert.deepEqual(Object.keys(actual.code), ['revision', 'webSha256']);
  assert.deepEqual(Object.keys(actual.data), ['release', 'publication']);
  assert(!JSON.stringify(actual).includes('must-not-be-public'));
  assert.deepEqual(await checkWebVersion({ url: app.url, webRoot: f.webRoot }), {
    status: 'MATCH', webMatches: true, dataMatches: true, revisionMatches: true,
  });
  // Another build must not pass just because /health is 200 or its commit is equal.
  writeFileSync(join(f.webRoot, 'assets/test-12345678.js'), '/* different synthetic build */');
  const other = expectedWebVersion(f.webRoot);
  assert.equal(compareWebVersion(other, actual).status, 'MISMATCH');
  assert.equal(compareWebVersion(other, actual).webMatches, false);
  assert.equal(compareWebVersion(expected, { ...actual, data: { ...actual.data, publication: 'f'.repeat(64) } }).dataMatches, false);
  assert.equal(digest(readFileSync(f.databasePath)), before);
});

test('version remains behind host, origin, method and query guards, including public mode', async t => {
  const f = fixture(t), publicOrigin = 'https://omnibus.example.invalid', app = await f.start({ publicOrigin });
  const headers = { Host: 'omnibus.example.invalid' };
  const request = (path, options = {}) => new Promise((resolve, reject) => {
    const req = http.request(app.url, { path, ...options }, response => {
      response.resume(); response.once('end', () => resolve(response)); response.once('error', reject);
    });
    req.once('error', reject); req.end();
  });
  const response = await request('/api/v1/version', { headers });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], publicOrigin);
  for (const { suffix, options, status } of [
    { suffix: '', options: {}, status: 403 },
    { suffix: '', options: { headers: { ...headers, Origin: 'https://other.invalid' } }, status: 403 },
    { suffix: '', options: { headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } }, status: 403 },
    { suffix: '', options: { headers, method: 'POST' }, status: 405 },
    { suffix: '?release=other', options: { headers }, status: 400 },
    { suffix: '?', options: { headers }, status: 400 },
  ]) assert.equal((await request('/api/v1/version' + suffix, options)).statusCode, status);
  assert.equal((await request('/omnibus-release.json', { headers })).statusCode, 404);
});

test('old builds report an unknown revision, not a fake commit; malformed metadata cannot start', async t => {
  const f = fixture(t);
  delete f.manifest.codeRevision;
  writeFileSync(join(f.webRoot, 'omnibus-release.json'), JSON.stringify(f.manifest));
  const app = await f.start();
  assert.equal((await (await fetch(app.url + '/api/v1/version')).json()).code.revision, null);
  writeFileSync(join(f.webRoot, 'omnibus-release.json'), JSON.stringify({ ...f.manifest, codeRevision: 'unsafe metadata' }));
  await assert.rejects(f.start(), /Runtime readiness startup refused/);
  const standalone = await serveCatalogue({});
  t.after(() => standalone.close());
  assert.equal((await fetch(standalone.url + '/api/v1/version')).status, 404);
});

test('health and malformed responses are never accepted as a version', () => {
  const expected = { code: { revision: null, webSha256: 'a'.repeat(64) }, data: { release: 'b'.repeat(64), publication: 'c'.repeat(64) } };
  for (const actual of [{ status: 'ok' }, null, { ...expected, schema: 1, code: { ...expected.code, revision: 'main' } }])
    assert.throws(() => compareWebVersion(expected, actual), /No valid web version/);
});
