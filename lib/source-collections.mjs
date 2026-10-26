// Collection provenance is delivery metadata, never an edit to source evidence.
// A local composition keeps the original public catalogue pin and a separate
// admission identity for each own package. No URL or arbitrary database input.
export function sourceCollections(runtime) {
  if (runtime.collections) return runtime.collections;
  const ref = runtime.ref;
  if(!ref)return {schema:1,origins:[],sources:{report:{},foundation:{},model:{}}};
  return {schema:1, origins:[{id:`public:${ref.release}:${ref.hash}`, kind:'public',
    release:ref.release, catalogue:ref.hash}], sources:{report:{},foundation:{},model:{}}};
}
export function collectionOrigin(collections, kind, id) {
  const sources=collections.sources[kind]??{},key=Object.hasOwn(sources,id)?sources[id]:undefined;
  return key ? collections.origins.find(origin=>origin.id===key) : collections.origins.find(origin=>origin.kind==='public');
}
export function collectionAllows(collections, mode, kind, id) {
  const origin=collectionOrigin(collections,kind,id);
  return Boolean(origin && (mode==='both'||origin.kind===mode));
}
export function collectionViews(views, collections, mode, reports) {
  return views.map(view=>({...view,
    lineIds:view.lineIds.filter(id=>reports[id]&&collectionAllows(collections,mode,'report',reports[id])),
    reportIds:view.reportIds.filter(id=>collectionAllows(collections,mode,'report',id)),
  })).filter(view=>view.lineIds.length>0);
}
export function validateCollectionPreference(value) {
  if (!value || !['public','own','both'].includes(value.mode) || !Array.isArray(value.origins) ||
    value.origins.length>10000 || value.origins.some(id=>typeof id!=='string'||!id.length||id.length>300) ||
    new Set(value.origins).size!==value.origins.length) throw Error('Ongeldige collectiekeuze in het project.');
  return {mode:value.mode,origins:[...value.origins]};
}
export function bindCollectionPreference(value, collections) {
  const preference=validateCollectionPreference(value);
  // Retain earlier bindings when browsing changes: selected research may still
  // cite a collection that is now hidden. Never silently rebind its evidence.
  return {...preference,origins:[...new Set([...preference.origins,...collections.origins
    .filter(origin=>preference.mode==='both'||origin.kind===preference.mode).map(origin=>origin.id)])]};
}
export function assertProjectCollections(value, collections) {
  if(value?.format!=='rijksmap-project'||value.version===1)return;
  const preference=validateCollectionPreference(value.collections);
  if(preference.origins.some(id=>!collections.origins.some(origin=>origin.id===id)))
    throw Error('Een vastgelegde collectie of bronversie is niet beschikbaar. Open dit project met de oorspronkelijke publicatie. Eigen onderzoekstekst en bronbewijs blijven in het oorspronkelijke project bewaard; er wordt geen andere bron gebruikt.');
}
