import {createHash} from 'node:crypto';
import {closeSync, existsSync, fstatSync, lstatSync, openSync, readSync} from 'node:fs';
import {digest} from '../content-tools/identity.mjs';
import {readRuntimePublication, validateRuntimeModules} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {publicRuntimePins} from './read-only-http-config.mjs';

const fail = () => { throw Error('Openbare leespublicatie geweigerd.'); };
const sameFile = (a, b) => ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every(key => a[key] === b[key]);
const sealed = path => {
  for (const suffix of ['-wal', '-journal'])
    if (existsSync(path + suffix) && lstatSync(path + suffix).size !== 0) fail();
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return stat;
};

// Called INSIDE the killable reader, before opening SQLite. The separately
// approved file pin also covers the derived FTS index and lookup columns, which
// the release/publication pins alone do not cover. No whole-file allocation.
// Deployment must mount this reviewed build read-only; this is not a boundary
// against a privileged local process racing filesystem writes.
export function verifyPublicReadFile(path, manifest, expected) {
  const pins = publicRuntimePins(expected);
  if (manifest.release !== pins.release || manifest.publication !== pins.publication ||
      manifest.contract !== runtimeContractHash || manifest.schema !== 1) fail();
  const before = sealed(path), fd = openSync(path, 'r');
  try {
    if (!sameFile(before, fstatSync(fd))) fail();
    const hash = createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
    let count;
    while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count));
    if (hash.digest('hex') !== pins.databaseSha256 || !sameFile(before, fstatSync(fd))) fail();
  } finally { closeSync(fd); }
  const unchanged = () => { if (!sameFile(before, sealed(path))) fail(); };
  unchanged();
  return unchanged;
}

export function verifyPublicReadPublication(index, pins) {
  const db = index.db;
  // A local-owner admission is deliberately insufficient, even when its
  // runtime publication carries VERIFIED_APPLICATION_RELEASE and valid hashes.
  const row = db.prepare('SELECT manifest FROM releases WHERE id=? AND length(CAST(manifest AS BLOB))<=1048576').get(pins.release);
  if (!row) fail();
  const manifest = JSON.parse(row.manifest);
  if (digest(manifest) !== pins.release || manifest.format !== 'omnibus-catalogue-release' || manifest.schema !== 1 ||
      (manifest.scope !== undefined && manifest.scope !== 'public') ||
      (manifest.contentGate !== undefined && manifest.contentGate !== 'VERIFIED_APPLICATION_RELEASE')) fail();
  const publication = readRuntimePublication({db, hasRelease: value => value === pins.release},
    {...pins, contract: runtimeContractHash});
  validateRuntimeModules(publication, runtimeContract);
}
