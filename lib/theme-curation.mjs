import taxonomy from './theme-curation.json' with {type:'json'};

// Navigation overlay only. The original parent memberships and all source IDs
// remain available to existing projects; no norm or point is substituted.
export const themeCurationVersion = taxonomy.version;
export const curatedThemes = taxonomy.themes.map(({lineIds, ...theme}) => ({
  ...theme, keywords: taxonomy.parents.find(parent => parent.id === theme.parentId).title,
}));
const byLine = new Map();
const byParent = new Map(taxonomy.parents.map(parent => [parent.id, new Set()]));
for (const theme of taxonomy.themes) for (const id of theme.lineIds) {
  const entries = byLine.get(id) ?? [];
  entries.push({id:theme.id, parentId:theme.parentId});
  byLine.set(id, entries);
  byParent.get(theme.parentId).add(id);
}
export const childThemeIds = parentId => curatedThemes.filter(theme => theme.parentId === parentId).map(theme => theme.id);
export function curatedMemberships(lineId, originalThemeIds) {
  return (byLine.get(lineId) ?? []).filter(theme => originalThemeIds.includes(theme.parentId)).map(theme => theme.id);
}
export function parentFullyClassified(parentId, lineIds) {
  const known = byParent.get(parentId);
  // New/unclassified members keep the original category discoverable. Never
  // drop new content just because an old curation package has no mapping for it.
  return Boolean(known && lineIds.length && lineIds.every(id => known.has(id)));
}
