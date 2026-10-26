// Cache positions only, never text, review results or source approval. Read
// the current row on every lookup, including in-place user edits/replacements.
const indexes = new WeakMap();
function indexMaterials(materials) {
  const positions = new Map();
  for (let i = 0; i < materials.length; i++) {
    const id = materials[i].id;
    if (!positions.has(id)) positions.set(id, i);
  }
  const index = {length:materials.length, positions};
  indexes.set(materials, index);
  return index;
}
export function findMaterial(materials, id) {
  if (!materials) return undefined;
  let index = indexes.get(materials);
  if (!index || index.length !== materials.length) index = indexMaterials(materials);
  let position = index.positions.get(id);
  // A reorder, changed identity or same-length replacement must not reuse an
  // obsolete position. A new array naturally gets its own weakly held index.
  if (position === undefined || materials[position]?.id !== id) {
    index = indexMaterials(materials);
    position = index.positions.get(id);
  }
  return position === undefined ? undefined : materials[position];
}
