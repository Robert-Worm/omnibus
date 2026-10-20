// Evaluated by Node inside the image; not copied into the runtime package.
import assert from 'node:assert/strict';
import {lstatSync, readdirSync, readFileSync, openSync, closeSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

assert.equal(process.getuid(), 1000);
assert.equal(process.getgid(), 1000);
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'x64');
assert.equal(process.versions.node.split('.')[0], '24');
const {verifyRuntimePackage} = await import(process.cwd() + '/local-data/runtime-package.mjs');
const receipt = verifyRuntimePackage(process.cwd());
function walk(path) {
  const stat = lstatSync(path);
  assert(!stat.isSymbolicLink());
  assert.equal(stat.uid, 0);
  assert.equal(stat.gid, 0);
  assert.equal(stat.mode & 0o222, 0, 'Package must have no write permission');
  if (stat.isDirectory()) for (const name of readdirSync(path)) walk(join(path, name));
}
walk(process.cwd());
const {DatabaseSync} = await import('node:sqlite');
const memory = new DatabaseSync(':memory:');
memory.close();
const mounted = process.argv.includes('--check-mount');
if (mounted) {
  const database = '/var/lib/omnibus/catalogue.sqlite';
  const db = new DatabaseSync(database, {readOnly: true});
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok');
  db.close();
  // Linux kernel refuses a write-mode open: proves mount protection independently of SQLite.
  assert.throws(() => { const fd = openSync(database, 'r+'); closeSync(fd); }, {code: 'EROFS'});
  const mounts = readFileSync('/proc/self/mountinfo', 'utf8').trim().split('\n');
  assert(mounts.some(line => {
    const fields = line.split(' ');
    return fields[4] === '/var/lib/omnibus' && fields[5].split(',').includes('ro');
  }));
}
console.log(JSON.stringify({platform: 'linux/amd64', uid: process.getuid(), gid: process.getgid(),
  node: process.version, sqlite: process.versions.sqlite, mountedReadOnly: mounted,
  packageFiles: Object.keys(receipt.files).length + 1,
  manifestHash: createHash('sha256').update(readFileSync('runtime-package.json')).digest('hex')}));
