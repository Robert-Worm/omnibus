import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CatalogueRepository } from './repository.mjs';
import { backupRelease, restoreRelease, parseTransferArgs } from './transfer.mjs';

function fixture(t) {
  const folder = mkdtempSync(join(tmpdir(), 'omnibus-transfer-test-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const from = join(folder, 'source.sqlite'), backup = join(folder, 'source backup.json'), to = join(folder, 'restored.sqlite');
  const data = { manifest: { format: 'test', schema: 1 }, packages: [
    { id: 'LAW', kind: 'law', title: 'Voorbeeld', records: [
      { id: 'P1', kind: 'point', status: 'HOLD', data: { text: 'Eigen norm', source_links: [{ start: 1, end: 2 }], questions: ['Q1'] } },
    ] },
  ], documents: [{ id: 'D1', pages: [{ page: 1, text: 'A😀' }, { page: 2, text: 'é B' }] }],
  artifacts: [{ name: 'review', data: { human_validation: false } }] };
  const repository = new CatalogueRepository(from);
  let release, snapshot;
  try {
    release = repository.importRelease(data); snapshot = repository.exportRelease(release);
    repository.importRelease({ ...data, manifest: { ...data.manifest, variant: 2 } });
  } finally { repository.close(); }
  return { folder, from, backup, to, release, snapshot };
}

test('explicit release backup and restore preserve every record, Unicode page, link and HOLD without changing the source', t => {
  const f = fixture(t), original = readFileSync(f.from);
  const saved = backupRelease({ from: f.from, to: f.backup, release: f.release });
  assert.equal(saved.status, 'VERIFIED_BACKUP'); assert.equal(saved.newContentApproval, false);
  assert.deepEqual(JSON.parse(readFileSync(f.backup, 'utf8')), f.snapshot);
  const restored = restoreRelease({ from: f.backup, to: f.to, release: f.release });
  assert.equal(restored.status, 'VERIFIED_RESTORE'); assert.equal(restored.webResourcesRebuildRequired, true);
  const database = new CatalogueRepository(f.to, { readOnly: true });
  try {
    assert.equal(database.releases().length, 1, 'Never silently copy another release');
    assert.deepEqual(database.exportRelease(f.release), f.snapshot);
    const doc = database.documents(f.release)[0];
    assert.equal(database.page(doc.version, 2).start, 2); assert.equal(database.page(doc.version, 2).end, 5);
    assert.equal(database.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='web_resources'").get().n, 0);
  } finally { database.close(); }
  assert.deepEqual(readFileSync(f.from), original);
  assert(!readdirSync(f.folder).some(name => name.startsWith('.omnibus-transfer-')));
});

test('backup and restore refuse existing destinations including the source itself', t => {
  const f = fixture(t), original = readFileSync(f.from);
  writeFileSync(f.backup, 'Existing work');
  assert.throws(() => backupRelease({ from: f.from, to: f.backup, release: f.release }), /already exists/);
  assert.throws(() => backupRelease({ from: f.from, to: f.from, release: f.release }), /already exists/);
  assert.throws(() => restoreRelease({ from: f.backup, to: f.from, release: f.release }), /already exists/);
  assert.equal(readFileSync(f.backup, 'utf8'), 'Existing work'); assert.deepEqual(readFileSync(f.from), original);
});

test('changed records, pages, review status and manifest never publish a restored database', t => {
  const f = fixture(t);
  for (const change of [
    data => { data.packages[0].records[0].data.text = 'Different meaning'; },
    data => { data.documents[0].pages[0].text = 'Changed page'; },
    data => { data.artifacts[0].data.human_validation = true; },
    data => { data.manifest.variant = 'tampered'; },
  ]) {
    const altered = structuredClone(f.snapshot); change(altered); writeFileSync(f.backup, JSON.stringify(altered));
    assert.throws(() => restoreRelease({ from: f.backup, to: f.to, release: f.release }), /match the requested release/);
    assert(!existsSync(f.to)); assert(!readdirSync(f.folder).some(name => name.startsWith('.omnibus-transfer-')));
  }
});

test('missing, unknown or malformed releases and invalid JSON do not create output', t => {
  const f = fixture(t);
  assert.throws(() => backupRelease({ from: f.from, to: f.backup, release: '0'.repeat(64) }), /does not exist/);
  assert.throws(() => backupRelease({ from: f.from, to: f.backup }), /explicit/);
  assert(!existsSync(f.backup)); writeFileSync(f.backup, 'not JSON');
  assert.throws(() => restoreRelease({ from: f.backup, to: f.to, release: f.release }), SyntaxError);
  assert(!existsSync(f.to));
});

test('CLI requires exact options, no implicit latest release and no overwrite option', () => {
  const flags = ['--from', 'source file', '--to', 'new file', '--release', 'a'.repeat(64)];
  assert.deepEqual(parseTransferArgs(['restore', ...flags]), { action: 'restore', options: { from: 'source file', to: 'new file', release: 'a'.repeat(64) } });
  for (const args of [[], ['unknown', ...flags], ['backup', ...flags, '--force'], ['backup', ...flags.slice(0, 4)],
    ['backup', '--from', 'a', '--from', 'b', '--release', 'a'.repeat(64)], ['backup', ...flags.slice(0, 5), 'latest']])
    assert.throws(() => parseTransferArgs(args));
});

test('real command-line backup and restore work with file paths containing spaces', t => {
  const f = fixture(t), script = fileURLToPath(new URL('./transfer.mjs', import.meta.url));
  const run = (action, from, to) => JSON.parse(execFileSync(process.execPath,
    [script, action, '--from', from, '--to', to, '--release', f.release], { encoding: 'utf8', windowsHide: true }));
  assert.equal(run('backup', f.from, f.backup).status, 'VERIFIED_BACKUP');
  assert.equal(run('restore', f.backup, f.to).status, 'VERIFIED_RESTORE');
});
