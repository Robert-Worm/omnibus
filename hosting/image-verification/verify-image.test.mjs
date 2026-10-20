import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from './verify-image.mjs';
import {prepareSyntheticInputs, canary, origin, dataHashes} from './synthetic-inputs.mjs';
import {bytesHash, verifyRuntimePackage} from '../../local-data/runtime-package.mjs';
import {backupRuntime} from '../../local-data/runtime-backup.mjs';
import {receiveLocalBackup} from '../data-transfer/receive-local-backup.mjs';
import {runAcceptance} from '../../scripts/hosting-acceptance.mjs';

// Syntax fixture only. Never passed to a container tool, registry or image build.
const nodeImage = 'node:24.17.0-bookworm-slim@sha256:' + 'a'.repeat(64);
const cli = fileURLToPath(new URL('./verify-image.mjs', import.meta.url));

test('explicit image gate arguments and help cannot install, build or start a listener', () => {
  for (const args of [[], ['--help']]) {
    const result = spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No arguments: help; no install, pull or listener/);
  }
  assert.equal(parseArgs(['--run', '--out', 'unused', '--node-image', nodeImage]).nodeImage, nodeImage);
  for (const args of [[], ['--run'], ['--run', '--node-image', 'node:24', '--out', 'unused'],
    ['--run', '--node-image', 'untrusted.invalid/' + nodeImage, '--out', 'unused'],
    ['--run', '--node-image', nodeImage, '--node-image', nodeImage],
    ['--run', '--node-image', nodeImage, '--out', 'unused', '--privileged']])
    assert.throws(() => parseArgs(args));
});

test('synthetic gate inputs and reused host package checks; no image proof', {timeout: 60000}, async t => {
  const parent = mkdtempSync(join(tmpdir(), 'omnibus-image-gate-'));
  t.after(() => rmSync(parent, {recursive: true, force: true}));
  const out = join(parent, 'run');
  const f = await prepareSyntheticInputs(out, nodeImage);
  const before = readFileSync(f.databasePath);
  assert.equal(bytesHash(before), f.databaseHash);
  assert(!existsSync(join(f.packageRoot, 'catalogue.sqlite')));
  assert(!existsSync(join(f.packageRoot, 'local-build.json')));
  const receipt = verifyRuntimePackage(f.packageRoot);
  assert(receipt.files['scripts/start-runtime-package.mjs']);
  assert.equal(readFileSync(join(f.context, 'runtime/.env'), 'utf8'), canary);
  assert.throws(() => verifyRuntimePackage(join(f.context, 'runtime')), /unexpected file/);
  assert.match(readFileSync(join(f.context, '.dockerignore'), 'utf8'), /^\*\*\n!Dockerfile\n!\.dockerignore\n/);
  await assert.rejects(prepareSyntheticInputs(out, nodeImage), {code: 'EEXIST'});

  await t.test('real packaged CLI refuses absent/mismatched settings and data', async () => {
    const start = join(f.packageRoot, 'scripts/start-runtime-package.mjs');
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(done => reservation.close(done));
    for (const settings of [null, 'absent.json', 'missing-database.json', 'wrong-database.json', 'invalid-database.json',
      'wrong-release.json', 'wrong-publication.json']) {
      const args = settings ? ['--settings', join(f.data, settings), '--public-origin', origin,
        '--listen-host', '127.0.0.1', '--port', String(port)] : [];
      const result = spawnSync(process.execPath, [start, ...args], {encoding: 'utf8', timeout: 5000});
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Runtime start refused/);
      assert.doesNotMatch(result.stdout, /web runtime|preview/);
    }
    assert.deepEqual(readFileSync(f.databasePath), before);
    assert.deepEqual(dataHashes(f.data), f.dataHashes);
  });

  await t.test('received synthetic backup starts the copied package and passes 16 host HTTP checks', async () => {
    const sender = join(parent, 'sender'), received = join(parent, 'received');
    mkdirSync(sender);
    const backup = join(sender, 'closed.sqlite');
    await backupRuntime({from: f.databasePath, to: backup, release: f.release, publication: f.publication});
    const backupHash = bytesHash(readFileSync(backup));
    const packageHash = bytesHash(readFileSync(join(f.packageRoot, 'runtime-package.json')));
    const receipt = await receiveLocalBackup({from: backup, packageRoot: f.packageRoot, out: received,
      backupHash, packageHash, release: f.release, publication: f.publication});
    assert.equal(receipt.status, 'VERIFIED_LOCAL_RECEIPT');
    assert.equal(receipt.newContentApproval, false);
    assert.deepEqual(readdirSync(received), ['catalogue.sqlite']);
    // Test-only settings for a received synthetic candidate; no active pointer is touched.
    const settings = join(received, 'local-build.json');
    writeFileSync(settings, JSON.stringify({database: 'catalogue.sqlite',
      release: f.release, publication: f.publication}), {flag: 'wx', mode: 0o600});
    const receivedBefore = dataHashes(received);
    const {parseRuntimePackageArgs, startRuntimePackage} = await import(
      pathToFileURL(join(f.packageRoot, 'scripts/start-runtime-package.mjs')).href);
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(done => reservation.close(done));
    const options = parseRuntimePackageArgs(['--settings', settings,
      '--public-origin', origin, '--listen-host', '127.0.0.1', '--port', String(port)]);
    const app = await startRuntimePackage({root: f.packageRoot, ...options});
    try {
      const acceptance = await runAcceptance({...f.acceptance, target: app.url});
      assert.equal(acceptance.passed, true, JSON.stringify(acceptance));
      assert.equal(acceptance.checks.length, 16);
      assert.equal(acceptance.remotePinsAttested, false);
    } finally { await app.close(); }
    assert.equal(app.server.listening, false);
    assert.deepEqual(dataHashes(received), receivedBefore);
    assert.equal(bytesHash(readFileSync(join(received, 'catalogue.sqlite'))), backupHash);
    assert.equal(bytesHash(readFileSync(backup)), backupHash);
    assert.equal(bytesHash(readFileSync(join(f.packageRoot, 'runtime-package.json'))), packageHash);
    assert.deepEqual(readFileSync(f.databasePath), before);
    assert.deepEqual(dataHashes(f.data), f.dataHashes);
  });
});
