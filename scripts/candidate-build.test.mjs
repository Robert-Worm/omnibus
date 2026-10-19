import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWebBuildArgs } from './build-database-web.mjs';
import { parseDatabaseBuildArgs } from './database-build-options.mjs';
import { parsePreviewArgs, startDatabasePreview } from './serve-database-web.mjs';
import { runtimeFixture } from '../local-data/test-support/runtime-fixture.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';

test('guarded candidate options require isolated output and explicit unique additions', t => {
  const dir = folder(t), settings = join(dir, 'before.json');
  writeFileSync(settings, JSON.stringify({database:'catalogue.sqlite',release,publication}));
  const extra=['--compare-with',settings,'--expect-addition','report:NEW','--expect-addition','framework:FRAME'];
  const expected={...parseDatabaseBuildArgs(inputs),out:join(dir,'candidate'),comparison:{before:{database:join(dir,'catalogue.sqlite'),release,publication},expectedAdditions:['report:NEW','framework:FRAME']}};
  assert.deepEqual(parseWebBuildArgs([...inputs,'--out',join(dir,'candidate'),...extra]),expected);
  assert.deepEqual(parseWebBuildArgs([...extra,'--out',join(dir,'candidate'),...inputs]),expected);
  for(const invalid of [
    [...inputs,...extra],
    [...inputs,'--out',join(dir,'candidate'),'--compare-with',settings],
    [...inputs,'--out',join(dir,'candidate'),'--expect-addition','report:NEW'],
    [...inputs,'--out',join(dir,'candidate'),...extra,'--compare-with',settings],
    [...inputs,'--out',join(dir,'candidate'),...extra,'--expect-addition','report:NEW'],
    [...inputs,'--out',join(dir,'candidate'),...extra,'--expect-addition','report:*'],
  ]) assert.throws(()=>parseWebBuildArgs(invalid),/Usage:/);
  assert.equal(existsSync(join(dir,'candidate')),false);
});

test('guarded build stops before output creation for wrong expectations and invalid publications', t => {
  const fixture=runtimeFixture(t), settings=join(fixture.dir,'local-build.json');
  writeFileSync(settings,JSON.stringify({database:fixture.databasePath,release:fixture.release,publication:fixture.publication}));
  const bytes=readFileSync(fixture.databasePath);
  const out=join(fixture.dir,'not-created');
  for(const buildCli of [cli,fileURLToPath(new URL('./build-runtime.mjs',import.meta.url))]) {
    const result=spawnSync(process.execPath,[buildCli,'--settings',settings,'--out',out,'--compare-with',settings,'--expect-addition','report:NEW'],{encoding:'utf8',timeout:15000});
    assert.ifError(result.error);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Candidate addition check: HOLD/);
    assert.match(result.stderr,/EXPECTED_PACKAGE_NOT_ADDED/);
    assert.doesNotMatch(result.stdout,/vite|building|transforming/i);
    assert.equal(existsSync(out),false);
  }
  const wrong=join(fixture.dir,'wrong.json');
  writeFileSync(wrong,JSON.stringify({database:fixture.databasePath,release:fixture.release,publication:'f'.repeat(64)}));
  const result=spawnSync(process.execPath,[cli,'--settings',settings,'--out',out,'--compare-with',wrong,'--expect-addition','report:NEW'],{encoding:'utf8',timeout:15000});
  assert.notEqual(result.status,0);
  assert.equal(existsSync(out),false);
  assert.deepEqual(readFileSync(fixture.databasePath),bytes);
});

const release = 'a'.repeat(64), publication = 'b'.repeat(64);
const inputs = ['--database', 'private.sqlite', '--release', release, '--publication', publication];
const cli = fileURLToPath(new URL('./build-database-web.mjs', import.meta.url));
function folder(t) {
  const dir = mkdtempSync(join(tmpdir(), 'omnibus-candidate-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('candidate build output is explicit, order independent and separate from database settings', t => {
  const dir = folder(t), settings = join(dir, 'local-build.json');
  writeFileSync(settings, JSON.stringify({ database: 'catalogue.sqlite', release, publication }));
  for (const args of [inputs, ['--settings', settings]]) {
    const expected = parseDatabaseBuildArgs(args);
    assert.deepEqual(parseWebBuildArgs(args), expected);
    for (let i = 0; i <= args.length; i += 2) {
      const explicit = [...args.slice(0, i), '--out', 'work/new candidate', ...args.slice(i)];
      const before = [...explicit];
      assert.deepEqual(parseWebBuildArgs(explicit), { ...expected, out: resolve('work/new candidate') });
      assert.deepEqual(explicit, before);
    }
  }
  // Preflight and agent build still accept only pinned database inputs.
  assert.throws(() => parseDatabaseBuildArgs([...inputs, '--out', 'work/new']), /Usage/);
});

test('candidate options reject overrides, duplicates and invalid paths before creating output', t => {
  const out = join(folder(t), 'new');
  for (const args of [
    ['--out', out], [...inputs, '--out'], [...inputs, '--out', ' '],
    [...inputs, '--out', 'bad\0path'], [...inputs, '--out', out, '--out', out],
    [...inputs, '--out', out, '--force'], [...inputs, '--out', out, '--settings', 'missing'],
  ]) assert.throws(() => parseWebBuildArgs(args), /Usage/);
  assert.equal(existsSync(out), false);
});

test('candidate CLI never empties existing files, folders or directory links', t => {
  const dir = folder(t), existing = join(dir, 'existing'), linked = join(dir, 'linked');
  mkdirSync(existing);
  const marker = join(existing, 'keep.txt');
  writeFileSync(marker, 'Original build must survive');
  symlinkSync(existing, linked, process.platform === 'win32' ? 'junction' : 'dir');
  for (const out of [existing, linked, marker]) {
    const result = spawnSync(process.execPath, [cli, ...inputs, '--out', out], { encoding: 'utf8', timeout: 15000 });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EEXIST/);
    assert.equal(result.stdout, '');
    assert.equal(readFileSync(marker, 'utf8'), 'Original build must survive');
  }
});

test('candidate preview resolves the chosen folder while retaining pin and loopback boundaries', t => {
  const dir = folder(t), settings = join(dir, 'local-build.json');
  writeFileSync(settings, JSON.stringify({ database: 'catalogue.sqlite', release, publication }));
  const webRoot = resolve('work/new candidate');
  for (const args of [
    ['--settings', settings, '--web-root', 'work/new candidate', '--port', '4336'],
    ['--web-root', 'work/new candidate', '--port', '4336', '--settings', settings],
  ]) assert.deepEqual(parsePreviewArgs(args), { databasePath: join(dir, 'catalogue.sqlite'), release, publication, port: 4336, webRoot });
  assert.deepEqual(parsePreviewArgs(['--database', 'local.sqlite', '--web-root', 'work/new candidate']),
    { databasePath: resolve('local.sqlite'), port: 4319, webRoot });
  for (const args of [
    ['--settings', settings, '--web-root', ' '],
    ['--settings', settings, '--web-root', 'bad\0path'],
    ['--settings', settings, '--web-root', 'work/new', '--web-root', 'work/other'],
    ['--settings', settings, '--web-root', 'work/new', '--host', '0.0.0.0'],
    ['--settings', settings, '--web-root', 'work/new', '--database', 'other.sqlite'],
  ]) assert.throws(() => parsePreviewArgs(args), /Usage/);
});

test('candidate and current previews serve separate builds without switching either database', async t => {
  const fixture = runtimeFixture(t);
  const before = readFileSync(fixture.databasePath);
  const settings = join(fixture.dir, 'local-build.json');
  writeFileSync(settings, JSON.stringify({ database: fixture.databasePath, release: fixture.release, publication: fixture.publication }));
  const apps = [];
  for (const name of ['current', 'candidate']) {
    const webRoot = join(fixture.dir, name);
    mkdirSync(join(webRoot, 'assets'), { recursive: true });
    writeFileSync(join(webRoot, 'database.html'), '<!doctype html><title>' + name + '</title>');
    writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({ schema: 1, contract: runtimeContractHash,
      release: fixture.release, publication: fixture.publication }));
    const options = parsePreviewArgs(['--settings', settings, '--web-root', webRoot]);
    const app = await startDatabasePreview({ ...options, port: 0 });
    fixture.beforeCleanup.push(() => app.close());
    apps.push({ ...app, name });
  }
  for (const app of apps) {
    assert.match(await (await fetch(app.url)).text(), new RegExp('<title>' + app.name + '</title>'));
    assert.equal((await fetch(app.url + '/api/v1/catalogue', { method: 'POST' })).status, 405);
    assert.equal((await fetch(app.url + '/api/v1/health', { headers: { Origin: 'https://example.invalid' } })).status, 403);
  }
  await assert.rejects(startDatabasePreview({ databasePath: fixture.databasePath, port: 0,
    webRoot: join(fixture.dir, 'candidate'), release: 'f'.repeat(64), publication: fixture.publication }), /does not match/);
  assert.deepEqual(readFileSync(fixture.databasePath), before);
});
