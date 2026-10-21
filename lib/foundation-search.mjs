import resources from './foundation-search-resources.mjs';
import {registerCatalogueResource} from './catalogue-runtime.mjs';
import {preparedFoundationItems,sourceScopeProvisions} from './foundation-workspace.mjs';

const projected = Object.keys(resources).length > 0;
export const foundationSearchItems = projected ? [] : preparedFoundationItems;
const loaded = new Map();
const refresh = () => foundationSearchItems.splice(0,foundationSearchItems.length,
  ...[...loaded.values()].flat().sort((a,b)=>a.searchOrder-b.searchOrder));
for (const [id,load] of Object.entries(resources)) {
  registerCatalogueResource('foundation-search:' + id, load, value => {
    if (!Array.isArray(value) || value.some(item => item.sourceId !== id))
      throw Error('De zoekindex hoort niet bij deze bron.');
    loaded.set(id,value);refresh();
    return () => {loaded.delete(id);refresh();};
  });
}
export const foundationSearchKeys = ids => ids.map(id => (projected ? 'foundation-search:' : 'foundation:') + id);
export function foundationSearchScope(id) {
  if (!projected) return sourceScopeProvisions(id);
  const titles = foundationSearchItems.filter(item => item.sourceId === id && item.auditRole === 'scope').map(item => item.title);
  return {count:titles.length,titles};
}
