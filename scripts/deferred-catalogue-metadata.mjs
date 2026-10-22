import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';

// Browser delivery only: move reviewed background metadata into build assets at
// the source's existing admission boundary. Never publish or mutate a database.
// Keep source identities, navigation and selection fields in the initial module.
const foundationPaths = {
  'lib/cio-content.mjs': [
    ['catalogue','source_dispositions'], ['catalogue','issues'],
    ['original','source_dispositions'], ['original','issues'],
    ['bank','page_coverage'], ['bank','limitations'], ['issues','issues'],
  ],
  'lib/wwke-content.mjs': [['source_dispositions']],
  'lib/wwke-reviewed/source-bank.json': [['page_coverage'], ['issues'], ['limitations']],
};

export function deferredCatalogueMetadata(content) {
  const modules = {...content.modules}, resources = new Map(), registrations = {};
  for (const [id, paths] of Object.entries(foundationPaths)) {
    const original = content.modules[id];
    const edits = paths.flatMap(path => {
      const value = path.reduce((parent, key) => parent?.[key], original);
      if (value === undefined) return [];
      if (!Array.isArray(value)) throw Error('Unexpected catalogue metadata shape: ' + id);
      return value.length ? [{path, value}] : [];
    });
    if (!edits.length) continue;
    const boundaries = new Set((content.registrations[id] ?? [])
      .map(key => key.match(/^(foundation:[^:]+):/)?.[1]).filter(Boolean));
    if (boundaries.size !== 1) throw Error('Catalogue metadata needs one existing foundation boundary: ' + id);
    const key = [...boundaries][0] + ':metadata:' + id;
    if (Object.hasOwn(content.refs, key)) throw Error('Catalogue metadata resource collision.');
    const projected = structuredClone(original);
    for (const {path} of edits) {
      const parent = path.slice(0,-1).reduce((parent,key) => parent[key], projected);
      parent[path.at(-1)] = [];
    }
    // Catch changes in values, field order or assumptions before emitting assets.
    const restored = structuredClone(projected);
    applyCatalogueEdits(restored, edits);
    if (JSON.stringify(restored) !== JSON.stringify(original)) throw Error('Catalogue metadata round-trip changed content.');
    modules[id] = projected;
    resources.set(key, edits);
    registrations[id] = [key];
  }
  return {modules, resources, registrations};
}
