import {digest} from './repository.mjs';
import {contentBatchLimits as batchLimits} from '../lib/content-batch-contract.mjs';

// Delivery projections are separate from signed content releases. They preserve
// JSON field order (some historic project traces compare their literal JSON).
// Preparing a web build adds immutable blobs, never edits an existing release.
export function prepareWebResources(repository, release, resources) {
  if (!repository.hasRelease(release)) throw Error('Unknown content release');
  repository.db.exec(`CREATE TABLE IF NOT EXISTS web_resources(
    release_id TEXT NOT NULL REFERENCES releases(id),
    hash TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)),
    PRIMARY KEY(release_id,hash))`);
  const insert = repository.db.prepare('INSERT OR IGNORE INTO web_resources VALUES(?,?,?)');
  const refs = {};
  repository.db.exec('BEGIN IMMEDIATE');
  try {
    for (const [key, value] of Object.entries(resources)) {
      const payload = JSON.stringify(value), hash = digest(payload);
      insert.run(release, hash, payload);
      refs[key] = {release, hash, bytes: Buffer.byteLength(payload)};
    }
    repository.db.exec('COMMIT');
    return refs;
  } catch (error) { repository.db.exec('ROLLBACK'); throw error; }
}
export function webResource(repository, release, hash) {
  if (!repository.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='web_resources'").get()) return null;
  const row = repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?').get(release, hash);
  return row ? JSON.parse(row.payload) : null;
}

// Scope is checked for EVERY hash by the server before this reader is called.
// Preflight actual database lengths before loading/parsing any payload. No writes.
export function webResourceBatch(repository,release,hashes) {
  if(!repository.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='web_resources'").get())return null;
  const sizes=repository.db.prepare('SELECT length(CAST(payload AS BLOB)) AS bytes FROM web_resources WHERE release_id=? AND hash=?');
  let bytes=batchLimits.overhead;
  for(const hash of hashes){
    const row=sizes.get(release,hash);if(!row)return null;
    bytes+=row.bytes;if(bytes>batchLimits.bytes)throw Error('Invalid content batch size');
  }
  const select=repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=? AND length(CAST(payload AS BLOB))<=?');
  let remaining=batchLimits.bytes-batchLimits.overhead;
  return {release,items:hashes.map(hash=>{
    const row=select.get(release,hash,remaining);
    if(!row)throw Error('Invalid changed content batch');
    remaining-=Buffer.byteLength(row.payload);
    return {hash,value:JSON.parse(row.payload)};
  })};
}

// Call only with an integrity-checked runtime publication. A release can also
// contain private packages, unselected documents and other publications' blobs.
// Only refs and explicit databaseSource links in this publication grant reads.
export function publicationReadScope(repository, publication) {
  const resources = new Set(Object.values(publication.refs).map(ref => ref.hash));
  const documents = new Map();
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const fail = () => { throw Error('Invalid publication source reference'); };
  function source(ref) {
    if (!ref || ref.schema !== 1 || ref.release !== publication.release ||
        !hash(ref.version) || !hash(ref.indexHash)) fail();
    if (documents.has(ref.version)) {
      if (documents.get(ref.version) !== ref.indexHash) fail();
      return;
    }
    const index = repository.documentIndex(publication.release, ref.version);
    if (!index || digest(JSON.stringify(index)) !== ref.indexHash) fail();
    documents.set(ref.version, ref.indexHash);
  }
  // Iterative traversal avoids a call-stack dependency on nested published data.
  function scan(value) {
    const pending = [value];
    while (pending.length) {
      const item = pending.pop();
      if (!item || typeof item !== 'object') continue;
      for (const [key, child] of Object.entries(item)) {
        if (key === 'databaseSource') source(child);
        else if (child && typeof child === 'object') pending.push(child);
      }
    }
  }
  scan(publication.modules);
  for (const resource of resources) scan(webResource(repository, publication.release, resource));
  return {
    release: publication.release,
    allows(pathname) {
      let match;
      if ((match = pathname.match(/^\/api\/v1\/content\/([a-f0-9]{64})$/)))
        return resources.has(match[1]);
      if ((match = pathname.match(/^\/api\/v1\/documents\/([a-f0-9]{64})\/(?:index|pages\/\d+)$/)))
        return documents.has(match[1]);
      return false;
    },
  };
}
