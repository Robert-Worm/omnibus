/** Scan every complete blob while bounding each Git subprocess response. */
export function scanGitBlobs(ids, git, checkText, maxBatchBytes = 8 * 1024 * 1024) {
  if (!ids.size) return;
  const input = [...ids.keys()].join('\n') + '\n';
  const metadata = git(['cat-file', '--batch-check'], { input }).toString().trim().split('\n');
  if (metadata.length !== ids.size) throw Error('Incomplete Git object inventory');
  let batch = [], bytes = 0;
  function scan() {
    if (!batch.length) return;
    const payload = git(['cat-file', '--batch'], { input: batch.map(b => b.id).join('\n') + '\n' });
    let offset = 0;
    for (const { id, label, size } of batch) {
      const end = payload.indexOf(10, offset);
      if (end === -1 || payload.subarray(offset, end).toString() !== `${id} blob ${size}`)
        throw Error('Invalid Git object');
      const next = end + 1 + size;
      if (next >= payload.length || payload[next] !== 10) throw Error('Incomplete Git object');
      checkText(payload.subarray(end + 1, next), label, id);
      offset = next + 1;
    }
    if (offset !== payload.length) throw Error('Unexpected Git object bytes');
    batch = []; bytes = 0;
  }
  let index = 0;
  for (const [id, label] of ids) {
    const line = metadata[index++], match = line.match(/^([a-f0-9]+) blob (\d+)$/);
    if (!match || match[1] !== id) throw Error('Invalid Git object metadata');
    const size = Number(match[2]), total = Buffer.byteLength(line) + 1 + size + 1;
    // Fail without dumping subprocess contents if a single source is oversized.
    if (!Number.isSafeInteger(size) || total > maxBatchBytes)
      throw Error('Git object exceeds publication scan batch limit: ' + label);
    if (bytes + total > maxBatchBytes) scan();
    batch.push({ id, label, size }); bytes += total;
  }
  scan();
}
