import assert from 'node:assert/strict';

// Browser proof only. A content-addition pilot may explicitly pin a new catalogue
// identity; every selection, edit, question, link and source snapshot stays exact.
export function assertImportedDraft(actual, expected, nextContentHash) {
  if (nextContentHash === undefined) return assert.deepEqual(actual, expected);
  assert.match(nextContentHash, /^[a-f0-9]{64}$/);
  assert.match(expected.source_hash, /^[a-f0-9]{64}$/);
  assert(expected.baseline_id.endsWith(':' + expected.source_hash));
  const baselinePrefix = expected.baseline_id.slice(0, -expected.source_hash.length);
  assert.deepEqual(actual, {
    ...expected, source_hash: nextContentHash, baseline_id: baselinePrefix + nextContentHash,
  });
}
