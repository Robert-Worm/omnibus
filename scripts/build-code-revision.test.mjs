import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCodeRevision } from './build-code-revision.mjs';

test('explicit build metadata accepts only a full commit hash', () => {
  assert.equal(buildCodeRevision('unused', 'a'.repeat(40)), 'a'.repeat(40));
  for (const value of ['main', 'abc123', 'C:/private/path', 'secret\nvalue', false, 42])
    assert.throws(() => buildCodeRevision('unused', value), /Invalid explicit code revision/);
});

test('the container forwards host revision only into the validated build, with explicit override first', () => {
  const docker=readFileSync(new URL('../hosting/container/Dockerfile',import.meta.url),'utf8');
  const [,buildStage,runtimeStage]=docker.split(/\r?\nFROM /);
  assert.match(buildStage,/ARG OMNIBUS_CODE_REVISION\r?\n/);
  assert.match(buildStage,/ARG SLIPLANE_COMMIT_HASH\r?\n/);
  assert.match(buildStage,/OMNIBUS_CODE_REVISION="\$\{OMNIBUS_CODE_REVISION:-\$SLIPLANE_COMMIT_HASH\}" npm run build:runtime/);
  assert(!runtimeStage.includes('SLIPLANE_COMMIT_HASH')&&!runtimeStage.includes('OMNIBUS_CODE_REVISION'));
  assert(readFileSync(new URL('../scripts/build-database-web.mjs',import.meta.url),'utf8')
    .includes('buildCodeRevision(cwd, process.env.OMNIBUS_CODE_REVISION)'));
});

test('clean checkout resolves locally; dirty, nested and gitless builds never claim its commit', t => {
  const root = mkdtempSync(join(tmpdir(), 'omnibus-code-revision-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(buildCodeRevision(root), null);
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '--quiet']);
  writeFileSync(join(root, 'code.mjs'), 'export const synthetic = true;\n');
  git(['add', 'code.mjs']);
  git(['-c', 'user.name=Synthetic test', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic fixture']);
  assert.equal(buildCodeRevision(root), git(['rev-parse', 'HEAD']));
  mkdirSync(join(root, 'nested'));
  assert.equal(buildCodeRevision(join(root, 'nested')), null);
  writeFileSync(join(root, 'new.mjs'), 'new source');
  assert.equal(buildCodeRevision(root), null);
  rmSync(join(root, 'new.mjs'));
  writeFileSync(join(root, 'code.mjs'), 'export const synthetic = false;\n');
  assert.equal(buildCodeRevision(root), null);
});
