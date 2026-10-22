// Tab-local byte snapshots, never persistent browser storage or an HTTP cache.
// The receiver must still validate the exact release/hash before using a value.
// Bounded even for large projects; enough for the measured mixed-source restore
// without retaining the entire collection or adding persistent browser storage.
export const MAX_CONTENT_TRANSFER_BYTES = 24 * 1024 * 1024;
const MAX_ENTRIES = 128, MAX_ITEM_BYTES = 2 * 1024 * 1024;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const contentTransferKey = ref => ref.release + ':' + ref.hash;
const validRef = ref => ref && hash(ref.release) && hash(ref.hash);

export function createContentTransferCache(maxBytes = MAX_CONTENT_TRANSFER_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_CONTENT_TRANSFER_BYTES)
    throw Error('Ongeldige bronoverdrachtgrens.');
  const entries = new Map();
  let retainedBytes = 0;
  function remove(key) {
    const entry = entries.get(key);
    if (entry) {retainedBytes -= entry.bytes.byteLength; entries.delete(key);}
    return entry;
  }
  function remember(ref, bytes) {
    if (!validRef(ref) || !(bytes instanceof Uint8Array) || !bytes.byteLength || bytes.byteLength > MAX_ITEM_BYTES)
      throw Error('Ongeldige bronoverdracht.');
    const key = contentTransferKey(ref);
    remove(key);
    if (bytes.byteLength > maxBytes) return;
    while (entries.size >= MAX_ENTRIES || retainedBytes + bytes.byteLength > maxBytes)
      remove(entries.keys().next().value);
    entries.set(key, {release:ref.release,hash:ref.hash,bytes});
    retainedBytes += bytes.byteLength;
  }
  return {
    remember,
    // Copies are transferred; detaching them must never detach our retained bytes.
    copy(refs, known = new Set()) {
      const result = [], seen = new Set();
      for (const ref of refs) {
        if (!validRef(ref)) throw Error('Ongeldige bronoverdracht.');
        const key = contentTransferKey(ref), entry = entries.get(key);
        if (!entry || known.has(key) || seen.has(key)) continue;
        seen.add(key);
        result.push({release:entry.release,hash:entry.hash,bytes:entry.bytes.slice().buffer});
      }
      return result;
    },
    stage(values) {
      if (!Array.isArray(values) || values.length > MAX_ENTRIES) throw Error('Ongeldige bronoverdracht.');
      let size = 0; const seen = new Set();
      for (const value of values) {
        if (!validRef(value) || !(value.bytes instanceof ArrayBuffer) || !value.bytes.byteLength ||
            value.bytes.byteLength > MAX_ITEM_BYTES || seen.has(contentTransferKey(value)))
          throw Error('Ongeldige bronoverdracht.');
        seen.add(contentTransferKey(value)); size += value.bytes.byteLength;
        if (size > maxBytes) throw Error('Bronoverdracht is te groot.');
      }
      entries.clear(); retainedBytes = 0;
      for (const value of values) remember(value, new Uint8Array(value.bytes));
    },
    take(ref) {return remove(contentTransferKey(ref))?.bytes;},
    stats: () => ({entries:entries.size,retainedBytes}),
  };
}
