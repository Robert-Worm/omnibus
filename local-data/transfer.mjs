import assert from 'node:assert/strict';
import { closeSync, fsyncSync, linkSync, lstatSync, mkdtempSync, openSync,
  readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogueRepository, digest } from './repository.mjs';

const MAX_BACKUP_BYTES = 512 * 1024 * 1024;
const usage = 'Usage: node local-data/transfer.mjs <backup|restore> --from <file> --to <new-file> --release <64-character hash>';

function releaseId(release) {
  if (typeof release !== 'string' || !/^[a-f0-9]{64}$/.test(release))
    throw new Error('Choose an explicit valid release hash; automatic latest is not supported');
  return release;
}

function requireNewFile(path) {
  try { lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error('Destination already exists; choose a new file');
}

// Publish only a completely written and verified file. A hard link on the same
// filesystem is atomic and refuses an existing destination, including a race.
// No rename-overwrite or copy fallback: unsupported filesystems fail safely.
function publishVerifiedFile(destination, writeAndVerify) {
  const target = resolve(destination);
  requireNewFile(target);
  const parent = dirname(target), folder = mkdtempSync(join(parent, '.omnibus-transfer-'));
  const staging = join(folder, 'payload');
  try {
    const result = writeAndVerify(staging);
    const descriptor = openSync(staging, 'r+');
    try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
    linkSync(staging, target);
    return { ...result, path: target };
  } finally {
    // Only files inside this newly created private staging directory are removed.
    // Never recursively delete a supplied directory or an existing destination.
    for (const name of readdirSync(folder)) unlinkSync(join(folder, name));
    rmdirSync(folder);
  }
}

function verifySnapshot(repository, snapshot, release) {
  assert.equal(repository.importRelease(snapshot), release, 'Backup contents do not match the requested release');
  assert.deepEqual(repository.exportRelease(release), snapshot, 'Restored content differs from the backup');
  assert(repository.integrity().every(row => row.integrity_check === 'ok'), 'Database integrity check failed');
}

function summary(snapshot, release) {
  return { release, packages: snapshot.packages.length,
    records: snapshot.packages.reduce((n, item) => n + item.records.length, 0),
    documents: snapshot.documents.length,
    pages: snapshot.documents.reduce((n, item) => n + item.pages.length, 0),
    newContentApproval: false };
}

export function backupRelease({ from, to, release }) {
  releaseId(release);
  requireNewFile(resolve(to));
  const repository = new CatalogueRepository(resolve(from), { readOnly: true });
  let snapshot;
  try { snapshot = repository.exportRelease(release); } finally { repository.close(); }
  if (!snapshot) throw new Error('Requested release does not exist in the source database');
  const verifier = new CatalogueRepository(':memory:');
  try { verifySnapshot(verifier, snapshot, release); } finally { verifier.close(); }
  const bytes = Buffer.from(JSON.stringify(snapshot));
  if (bytes.length > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the current 512 MiB transfer limit');
  return publishVerifiedFile(to, file => {
    writeFileSync(file, bytes, { flag: 'wx' });
    assert(readFileSync(file).equals(bytes), 'Backup write did not preserve bytes');
    return { status: 'VERIFIED_BACKUP', ...summary(snapshot, release), bytes: bytes.length };
  });
}

export function restoreRelease({ from, to, release }) {
  releaseId(release);
  requireNewFile(resolve(to));
  const source = resolve(from), info = lstatSync(source);
  if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_BACKUP_BYTES)
    throw new Error('Backup must be a regular file of at most 512 MiB');
  const bytes = readFileSync(source);
  if (bytes.length > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the current 512 MiB transfer limit');
  const snapshot = JSON.parse(bytes.toString('utf8'));
  assert(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'Invalid backup');
  assert.equal(digest(snapshot.manifest), release, 'Backup manifest does not match the requested release');
  return publishVerifiedFile(to, file => {
    const repository = new CatalogueRepository(file);
    try { verifySnapshot(repository, snapshot, release); } finally { repository.close(); }
    // Reopen the closed file exactly as the read-only application will do.
    const reopened = new CatalogueRepository(file, { readOnly: true });
    try { assert.deepEqual(reopened.exportRelease(release), snapshot); } finally { reopened.close(); }
    return { status: 'VERIFIED_RESTORE', ...summary(snapshot, release), webResourcesRebuildRequired: true };
  });
}

export function parseTransferArgs(args) {
  const [action, ...flags] = args;
  if (!['backup', 'restore'].includes(action) || flags.length !== 6) throw new Error(usage);
  const options = {};
  for (let index = 0; index < flags.length; index += 2) {
    const key = flags[index], value = flags[index + 1];
    if (!['--from', '--to', '--release'].includes(key) || Object.hasOwn(options, key.slice(2)) ||
        typeof value !== 'string' || !value.trim() || value.startsWith('--')) throw new Error(usage);
    options[key.slice(2)] = value;
  }
  releaseId(options.release);
  return { action, options };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { action, options } = parseTransferArgs(process.argv.slice(2));
  console.log(JSON.stringify(action === 'backup' ? backupRelease(options) : restoreRelease(options)));
}
