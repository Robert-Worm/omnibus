/** Navigation-only records: never model state, questions or export input.
 * @typedef {{id:string, displayOnly:true, title:string, summary:string, searchText:string,
 * itemCount:number, questionCount:number, selectedCount:number, selected:boolean}} ModelDirectoryEntry
 */

/** @param {unknown} value @returns {ModelDirectoryEntry[]} */
export function validateModelDirectory(value) {
  if (!Array.isArray(value) || value.some(m => !m || m.displayOnly !== true ||
      !['id','title','summary','searchText'].every(key => typeof m[key] === 'string') ||
      !/^[A-Za-z0-9_-]+$/.test(m.id) || typeof m.selected !== 'boolean' ||
      !['itemCount','questionCount','selectedCount'].every(key => Number.isSafeInteger(m[key]) && m[key] >= 0) ||
      m.selectedCount > m.questionCount) || new Set(value.map(m => m.id)).size !== value.length)
    throw Error('Het modellenoverzicht is ongeldig.');
  return value;
}

/** Saved/user-edited models override published navigation text and counts.
 * Neither input is mutated or returned as editable model state.
 * @param {ModelDirectoryEntry[]} published @param {ModelDirectoryEntry[]} current */
export function mergeModelDirectory(published, current) {
  const entries = new Map(published.map(entry => [entry.id,entry]));
  for (const entry of current) entries.set(entry.id,entry);
  return [...entries.values()].filter(entry => entry.id !== 'L01');
}
