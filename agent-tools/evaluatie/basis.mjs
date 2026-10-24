// Evaluation identity only: never an approval, publisher or database writer.
import {createHash} from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const hold = reason => {throw Error('HOLD: evaluatiebasis wijkt af (' + reason + '). Beoordeel de wijziging; pas geen antwoorden automatisch aan.');};

/** Bind the complete read projection, including context, source text and absence.
 * Hash rows in key order, not just their stored checksums or the answer fields.
 * The caller holds a read transaction so all checks see the same snapshot.
 */
export function evaluationIdentity(index, pointer, questionBytes, guide) {
  if (!validHash(pointer.release) || !validHash(pointer.publication) || index.release !== pointer.release) hold('pinnen');
  const row = index.db.prepare('SELECT payload FROM runtime_publications WHERE release_id=? AND hash=?')
    .get(pointer.release, pointer.publication);
  if (!row || digest(row.payload) !== pointer.publication) hold('publicatie');
  const publication = JSON.parse(row.payload);
  if (publication.release !== pointer.release || publication.format !== 'omnibus-runtime-publication' ||
      publication.schemaVersion !== 1 || publication.contentGate !== 'VERIFIED_APPLICATION_RELEASE' ||
      !publication.refs || typeof publication.refs !== 'object' || Array.isArray(publication.refs)) hold('publicatievorm');
  // Keep the existing delivery-resource checks; a matching manifest alone is insufficient.
  for (const ref of Object.values(publication.refs)) index.content(ref);
  const hash = createHash('sha256');
  let items = 0;
  for (const item of index.db.prepare('SELECT key,kind,source_id,source_title,title,payload,sha256 FROM agent_items ORDER BY key').iterate()) {
    const actual = digest(item.payload);
    if (actual !== item.sha256) hold('bouwsteen-integriteit');
    hash.update(JSON.stringify([item.key, item.kind, item.source_id, item.source_title, item.title, actual]) + '\n'); items++;
  }
  for (const item of index.db.prepare('SELECT key,text FROM agent_search ORDER BY key,rowid').iterate())
    hash.update(JSON.stringify([item.key, item.text]) + '\n');
  if (!items) hold('lege index');
  return {schema:1, release:pointer.release, publication:pointer.publication, items,
    indexSha256:hash.digest('hex'), questionsSha256:digest(questionBytes.toString('utf8').replace(/\r\n/g,'\n')),
    guideSha256:digest(JSON.stringify(guide))};
}

export function assertEvaluationIdentity(expected, actual) {
  const keys = ['schema','release','publication','items','indexSha256','questionsSha256','guideSha256'];
  if (!expected || keys.some(key => !Object.hasOwn(expected,key)) || expected.schema !== 1 ||
      !Number.isSafeInteger(expected.items) || expected.items < 1 ||
      keys.filter(key => key.endsWith('Sha256') || key === 'release' || key === 'publication').some(key => !validHash(expected[key]))) hold('onvolledige basis');
  for (const key of keys) if (expected[key] !== actual[key]) hold(key);
}
