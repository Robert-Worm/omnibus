import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runtimeFixture } from '../local-data/test-support/runtime-fixture.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { bytesHash, verifyRuntimePackage } from '../local-data/runtime-package.mjs';
import { packageRuntime } from './package-runtime.mjs';

function request(url, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url + path, { agent: false, ...options }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Run explicitly: this verifies the copied package, without changing npm/CI wiring.
test('portable package preserves readiness and capacity from a path with spaces and Unicode',
  { timeout: 120000 }, async t => {
    const setupStarted = performance.now();
    const f = runtimeFixture(t);
    const webRoot = join(f.dir, 'synthetic web é'), out = join(f.dir, 'runtime package é');
    const asset = '/assets/synthetic-12345678.js';
    mkdirSync(join(webRoot, 'assets'), { recursive: true });
    writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>Synthetic portability only</title>');
    // Incompressible bytes hold backpressured responses, as in the resilience tests.
    writeFileSync(join(webRoot, asset), randomBytes(4 * 1024 * 1024).toString('base64'));
    writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({ schema: 1,
      runtimeTarget: 'portable-local', release: f.release, publication: f.publication,
      contract: runtimeContractHash }));
    const before = bytesHash(readFileSync(f.databasePath));
    packageRuntime({ webRoot, databasePath: f.databasePath, out });
    const receipt = verifyRuntimePackage(out);
    assert(receipt.files['local-data/runtime-readiness.mjs']);
    assert(!existsSync(join(out, 'node_modules')));
    assert(Object.keys(receipt.files).every(path => !/\.sqlite|\.test\.|node_modules/.test(path)));
    t.diagnostic(`Synthetic fixture and package: ${(performance.now() - setupStarted).toFixed(1)} ms`);

    await t.test('packaged HTTP, saturation, recovery and graceful shutdown', { timeout: 20000 }, async t => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', `
        import { startRuntimePackage } from './scripts/start-runtime-package.mjs';
        const app = await startRuntimePackage({root:process.cwd(),databasePath:process.argv[1],port:0});
        process.send({url:app.url});
        process.once('message', async message => {
          if (message !== 'close') throw Error('Unexpected test control message');
          await app.close();
          process.disconnect();
        });
      `, f.databasePath], { cwd: out, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
      const clients = [];
      // Registered after the fixture cleanup: the nested test stops all users first.
      t.after(async () => {
        for (const client of clients) client.destroy();
        if (child.exitCode === null && child.signalCode === null) {
          const deadline = setTimeout(() => child.kill('SIGKILL'), 6000);
          try {
            if (child.connected) child.send('close'); else child.kill();
            await exited;
          } finally { clearTimeout(deadline); }
        }
      });
      const url = await new Promise((resolve, reject) => {
        child.once('message', message => resolve(message.url));
        child.once('error', reject);
        child.once('exit', () => reject(Error('Packaged startup failed: ' + stderr)));
      });
      assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
      const ready = await request(url, '/api/v1/ready');
      assert.equal(ready.status, 200);
      assert.equal(ready.headers['cache-control'], 'no-store');
      assert.deepEqual(JSON.parse(ready.body), { status: 'ready', mode: 'local-read-only', schema: 1 });
      assert.equal((await request(url, '/')).status, 200);
      assert.equal((await request(url, '/api/v1/health')).status, 200);
      for (const path of ['/runtime-package.json', '/package.json', '/synthetic.sqlite',
        '/scripts/start-runtime-package.mjs', '/api/v1/releases']) {
        assert.equal((await request(url, path)).status, 404);
      }
      assert.equal((await request(url, '/api/v1/ready', { method: 'POST' })).status, 405);
      assert.equal((await request(url, '/api/v1/ready', { headers: { Host: 'hostile.invalid' } })).status, 403);
      assert.equal((await request(url, '/api/v1/ready', { headers: { Origin: 'https://hostile.invalid' } })).status, 403);
      assert.equal((await request(url, '/api/v1/ready?release=' + f.release)).status, 400);

      const held = await Promise.all(Array.from({ length: 32 }, () => new Promise((resolve, reject) => {
        const req = http.get(url + asset, { agent: false, headers: { 'Accept-Encoding': 'gzip' } }, res => {
          res.pause(); res.on('error', () => {}); resolve(res);
        });
        clients.push(req); req.on('error', reject);
      })));
      assert(held.every(res => res.statusCode === 200 && res.headers['content-encoding'] === 'gzip'));
      for (const path of ['/api/v1/ready', '/api/v1/health', '/', asset]) {
        const busy = await request(url, path);
        assert.equal(busy.status, 503);
        assert.equal(busy.headers['retry-after'], '1');
        assert.equal(busy.headers['cache-control'], 'no-store');
        assert.equal(busy.headers.connection, 'close');
        assert.deepEqual(JSON.parse(busy.body), { error: 'Server busy; retry shortly' });
      }
      for (const client of clients) client.destroy();
      const recoveryDeadline = performance.now() + 2000;
      let recovered;
      do {
        recovered = await request(url, '/api/v1/ready');
        if (recovered.status === 200) break;
        assert.equal(recovered.status, 503);
        assert(performance.now() < recoveryDeadline, 'packaged readiness must recover after disconnect');
        await delay(20);
      } while (recovered.status !== 200);
      assert.deepEqual(JSON.parse(recovered.body), { status: 'ready', mode: 'local-read-only', schema: 1 });
      assert.equal(bytesHash(readFileSync(f.databasePath)), before);
      child.send('close');
      assert.deepEqual(await exited, { code: 0, signal: null });
      assert.equal(bytesHash(readFileSync(f.databasePath)), before);
    });
  });
