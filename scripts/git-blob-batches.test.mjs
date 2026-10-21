import test from 'node:test';
import assert from 'node:assert/strict';
import { scanGitBlobs } from './git-blob-batches.mjs';

function fixture(count = 30) {
  const entries = Array.from({ length: count }, (_, i) => [(i + 1).toString(16).padStart(40, '0'),
    { name: `synthetic-${i}.mjs`, bytes: Buffer.from('Synthetic 😀\n' + 'x'.repeat(80)) }]);
  const objects = new Map(entries), calls = [];
  const git = (args, { input }) => {
    const ids = input.trim().split('\n');
    const output = Buffer.concat(ids.flatMap(id => {
      const { bytes } = objects.get(id), header = Buffer.from(`${id} blob ${bytes.length}\n`);
      return args[1] === '--batch-check' ? [header] : [header, bytes, Buffer.from('\n')];
    }));
    calls.push({ mode: args[1], output });
    return output;
  };
  return { ids: new Map(entries.map(([id, item]) => [id, item.name])), objects, calls, git };
}

test('growing history is scanned completely in bounded batches without splitting a file', () => {
  const f = fixture(), seen = [];
  scanGitBlobs(f.ids, f.git, (bytes, label, id) => {
    assert.deepEqual(bytes, f.objects.get(id).bytes);
    assert.equal(label, f.objects.get(id).name); seen.push(id);
  }, 512);
  assert.deepEqual(seen, [...f.ids.keys()]);
  const batches = f.calls.filter(c => c.mode === '--batch');
  assert(batches.length > 1);
  assert(batches.every(c => c.output.length <= 512));
});

test('a rejected blob in a later batch still stops publication', () => {
  const f = fixture(); let checked = 0;
  assert.throws(() => scanGitBlobs(f.ids, f.git, () => {
    if (++checked === 20) throw Error('Synthetic rejected content');
  }, 512), /Synthetic rejected content/);
  assert.equal(checked, 20);
});

test('oversized, missing, reordered and truncated objects never pass silently', () => {
  const f = fixture(2);
  assert.throws(() => scanGitBlobs(f.ids, f.git, () => {}, 50), /exceeds publication scan batch limit/);
  for (const alter of [
    (out, mode) => mode === '--batch-check' ? Buffer.from('') : out,
    (out, mode) => mode === '--batch-check' ? Buffer.from(out.toString().trim().split('\n').reverse().join('\n') + '\n') : out,
    (out, mode) => mode === '--batch' ? out.subarray(0, out.length - 2) : out,
    (out, mode) => mode === '--batch' ? Buffer.concat([out, Buffer.from('extra')]) : out,
  ]) assert.throws(() => scanGitBlobs(f.ids, (args, opts) => alter(f.git(args, opts), args[1]), () => {}), /Git object/);
});
