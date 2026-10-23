// Delivery positions belong to the original verified array, not the order in
// which viewers happen to request its parts. Keep the public array identity.
const positions = new WeakMap();
export function insertCatalogueItems(array, values, indexes) {
  if (!Array.isArray(array) || !Array.isArray(values) || !Array.isArray(indexes) || indexes.length !== values.length)
    throw Error('Invalid ordered catalogue array.');
  const current = positions.get(array) ?? Array.from(array, (_, i) => i);
  if (current.length !== array.length || indexes.some((n, i) => !Number.isSafeInteger(n) || n < 0 || (i > 0 && n <= indexes[i - 1]) || current.includes(n)))
    throw Error('Invalid or overlapping catalogue positions.');
  const inserted = [];
  for (let i = 0; i < indexes.length; i++) {
    const n = indexes[i];
    let lo = 0, hi = current.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (current[mid] < n) lo = mid + 1; else hi = mid; }
    current.splice(lo, 0, n); array.splice(lo, 0, values[i]); inserted.push(lo);
  }
  positions.set(array, current);
  return () => { for (const index of inserted.reverse()) { current.splice(index, 1); array.splice(index, 1); } };
}
