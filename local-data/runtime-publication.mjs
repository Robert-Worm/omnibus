import {digest} from './repository.mjs';
import {createModelChoicePresentation,createQuestionWorkbenchPresentation} from '../lib/model-presentation.mjs';
import {isAdmittedFoundation,validateFlatFoundationChain} from '../lib/admitted-foundation.mjs';

const FORMAT = 'omnibus-runtime-publication';
const MAX_BYTES = 64 * 1024 * 1024;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error('Invalid runtime publication: ' + message); };

/** A publication contains data only. Its hash is supplied explicitly by the operator. */
export function validateRuntimePublication(value, {release, contract}) {
  if (!hash(release) || !hash(contract)) fail('explicit release and code contract required');
  if (!object(value) || value.format !== FORMAT || value.schemaVersion !== 1 ||
      value.release !== release || value.contract !== contract ||
      value.contentGate !== 'VERIFIED_APPLICATION_RELEASE') fail('identity or content gate mismatch');
  if (!object(value.modules) || !object(value.refs) || !object(value.registrations) ||
      !object(value.routing) || !object(value.summary)) fail('missing data sections');
  for (const id of Object.keys(value.modules)) {
    if (!/^(?:app|lib)\/[a-zA-Z0-9_/-]+\.(?:json|mjs)$/.test(id) || id.includes('//')) fail('module identity');
  }
  for (const [key, ref] of Object.entries(value.refs)) {
    if (!key || !object(ref) || ref.release !== release || !hash(ref.hash) ||
        !Number.isSafeInteger(ref.bytes) || ref.bytes <= 0 || ref.bytes > 2 * 1024 * 1024) fail('resource reference');
  }
  for (const [id, keys] of Object.entries(value.registrations)) {
    if (!Object.hasOwn(value.modules, id) || !Array.isArray(keys) ||
        keys.some(key => typeof key !== 'string' || !Object.hasOwn(value.refs, key)) ||
        new Set(keys).size !== keys.length) fail('resource registration');
  }
  return value;
}

/** The publisher and consumers share the same module boundary. */
export function validateRuntimeModules(value, contract) {
  if (JSON.stringify(Object.keys(value.modules).sort()) !== JSON.stringify(Object.keys(contract).sort()))
    fail('module contract does not match this application');
  if (value.undefinedPaths?.length) fail('unsupported non-JSON runtime values');
  for (const [id, entry] of Object.entries(contract)) {
    const data = value.modules[id];
    // The same checked boundary is used by the model UI. Fail before serving a
    // publication with malformed guidance, not when a user opens the viewer.
    if (id === 'lib/model-choice-guide.mjs') createModelChoicePresentation(data);
    if (id === 'lib/research-models.mjs') createQuestionWorkbenchPresentation(data);
    if (entry.kind === 'exports' && (!object(data) ||
        JSON.stringify(Object.keys(data).sort()) !== JSON.stringify([...entry.names].sort((a,b)=>a<b?-1:a>b?1:0)) ||
        value.registrations[id]?.length)) fail('export contract: ' + id);
    if (entry.kind === 'json' && entry.property && (!object(data) || !Object.hasOwn(data, entry.property)))
      fail('default export: ' + id);
  }
}

function verifyResources(repository, value) {
  const select = repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  for (const ref of Object.values(value.refs)) {
    const row = select.get(value.release, ref.hash);
    if (!row || digest(row.payload) !== ref.hash || Buffer.byteLength(row.payload) !== ref.bytes)
      fail('missing or changed delivery resource');
  }
}

// Check only new publications. Existing immutable releases remain readable.
function verifyFoundationChains(repository, value) {
  const id='lib/foundations/registry.mjs', registry=value.modules[id];
  if(!registry)return;
  const admitted=new Set(Object.entries(registry.importedFoundationMetadata||{})
    .filter(([,metadata])=>isAdmittedFoundation(metadata)).map(([sourceId])=>sourceId));
  if(!admitted.size)return;
  const check=items=>validateFlatFoundationChain(items.filter(item=>admitted.has(item.sourceId)));
  check(registry.importedFoundationItems||[]);
  const select=repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  for(const key of value.registrations[id]||[]) {
    const ref=value.refs[key],entries=JSON.parse(select.get(value.release,ref.hash).payload);
    for(const entry of entries)if(entry.path?.length===1&&entry.path[0]==='importedFoundationItems')check(entry.value);
  }
}

/** Admin/import operation, never called by the web build or HTTP request handler. */
export function publishRuntime(repository, value, expected) {
  validateRuntimePublication(value, expected);
  const row = repository.db.prepare('SELECT manifest FROM releases WHERE id=?').get(value.release);
  if (!row) fail('unknown release');
  const manifest = JSON.parse(row.manifest);
  if (digest(manifest) !== value.release) fail('changed source release manifest');
  // The caller's publication claim cannot override the source release's HOLD.
  // This applies to new writes only; existing immutable publications stay readable.
  if (manifest.format === 'omnibus-local-review-database' || manifest.contentGate === 'INTEGRATION_REVIEW_REQUIRED')
    fail('INTEGRATION_REVIEW_REQUIRED: a local review database cannot become a runtime publication. ' +
      'Intake, model shape and review structure are not content approval. ' +
      'A recorded local-owner admission is not runtime projection or application integration. ' +
      'Keep the runtime HOLD until the complete publication route is available and checked.');
  const payload = JSON.stringify(value);
  if (Buffer.byteLength(payload) > MAX_BYTES) fail('size limit');
  verifyResources(repository, value);
  verifyFoundationChains(repository, value);
  repository.db.exec(`CREATE TABLE IF NOT EXISTS runtime_publications(
    release_id TEXT NOT NULL REFERENCES releases(id), hash TEXT NOT NULL,
    payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(release_id,hash))`);
  const id = digest(payload);
  repository.db.prepare('INSERT OR IGNORE INTO runtime_publications VALUES(?,?,?)')
    .run(value.release, id, payload);
  return id;
}

/** Opens only an explicitly pinned, integrity-checked data publication. No writes. */
export function readRuntimePublication(repository, {release, publication, contract}) {
  if (!hash(publication) || !hash(release)) fail('explicit publication and release required');
  if (!repository.hasRelease(release)) fail('unknown release');
  if (!repository.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runtime_publications'").get())
    fail('prepare this database with the content publisher first');
  const row = repository.db.prepare(`SELECT payload FROM runtime_publications
    WHERE release_id=? AND hash=? AND length(CAST(payload AS BLOB))<=?`).get(release, publication, MAX_BYTES);
  if (!row || digest(row.payload) !== publication) fail('missing or changed publication');
  const value = validateRuntimePublication(JSON.parse(row.payload), {release, contract});
  verifyResources(repository, value);
  return value;
}
