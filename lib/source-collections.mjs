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
const boundCatalogues=new WeakMap();
const missingCollection=()=>Error('Een vastgelegde collectie of bronversie is niet beschikbaar. Open dit project met de oorspronkelijke publicatie. Eigen onderzoekstekst en bronbewijs blijven in het oorspronkelijke project bewaard; er wordt geen andere bron gebruikt.');
export function validateCollectionPreference(value, requireBindings=false) {
  if (!value || !['public','own','both'].includes(value.mode) || !Array.isArray(value.origins) ||
    value.origins.length>10000 || value.origins.some(id=>typeof id!=='string'||!id.length||id.length>300) ||
    new Set(value.origins).size!==value.origins.length) throw Error('Ongeldige collectiekeuze in het project.');
  const bindings=value.bindings??[];
  if((requireBindings&&!Array.isArray(value.bindings))||!Array.isArray(bindings)||bindings.length>10000||bindings.some(b=>
    !b||!['report','foundation','model'].includes(b.kind)||typeof b.id!=='string'||!b.id.length||b.id.length>300||
    !['public','own'].includes(b.collection)||!value.origins.includes(b.origin))||
    new Set(bindings.map(b=>b.kind+':'+b.id)).size!==bindings.length)throw Error('Ongeldige bronbinding in het project.');
  return {mode:value.mode,origins:[...value.origins],bindings:bindings.map(({kind,id,collection,origin})=>({kind,id,collection,origin}))};
}
export function bindCollectionPreference(value, collections) {
  const preference=validateCollectionPreference(value);
  // Transient catalogue context, never serialized. Browsing does not mean use.
  // makeProject binds retained source material, independently of the filter.
  boundCatalogues.set(preference,collections);
  return preference;
}
export function projectCollectionPreference(value, draft, models) {
  const preference=validateCollectionPreference(value),collections=boundCatalogues.get(value);
  if(!collections)return preference;
  const existing=new Map(preference.bindings.map(binding=>[binding.kind+':'+binding.id,binding]));
  const used=new Map(),add=(kind,id)=>{if(typeof id==='string'&&id)used.set(kind+':'+id,{kind,id});};
  const lines=new Set([...(draft?.included??[]),...Object.keys(draft?.overrides??{}),...Object.keys(draft?.notes??{}),
    ...Object.keys(draft?.branchItems??{}),...Object.keys(draft?.excludedFields??{}),...(draft?.research?.links??[]).map(l=>l.line_id)]);
  for(const material of draft?.investigation?.materials??[]){
    add('foundation',material.foundationId);
    if(material.originalLineId)lines.add(material.originalLineId);
    if(material.reportTrace){try{const trace=JSON.parse(material.reportTrace);add('report',trace.report_id??trace.sourceId);}catch{/* Source validators reject malformed evidence. */}}
  }
  for(const id of lines)add('report',collections.reports?.[id]);
  for(const model of models?.models??[])if(collectionOrigin(collections,'model',model.id)?.kind==='own'||existing.has('model:'+model.id))add('model',model.id);
  const bindings=[...used].map(([key,source])=>{
    const previous=existing.get(key),origin=collectionOrigin(collections,source.kind,source.id);
    if(previous){if(previous.collection==='own'&&(origin?.kind!=='own'||origin.id!==previous.origin))throw missingCollection();return previous;}
    if(!origin)throw missingCollection();
    return {...source,collection:origin.kind,origin:origin.id};
  });
  return {mode:preference.mode,origins:[...new Set(bindings.map(b=>b.origin))],bindings};
}
export function assertProjectCollections(value, collections) {
  if(value?.format!=='rijksmap-project'||value.version===1)return;
  const preference=validateCollectionPreference(value.collections,true);
  // Public publication pins are historical metadata. Supported successor
  // releases still have to pass the existing baseline and snapshot validators.
  for(const binding of preference.bindings){
    const current=collectionOrigin(collections,binding.kind,binding.id);
    if(binding.collection==='own'&&(current?.kind!=='own'||current.id!==binding.origin))throw missingCollection();
  }
}
