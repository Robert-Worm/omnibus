// Index only for one synchronous bulk operation, after catalogue hydration.
// No persistent cache: later publications, corrections and retries are read
// afresh. Preserve Array.find's first-match semantics and record identity.
export function reportPointLookup(catalogue, indexed = false) {
  return Object.fromEntries(['points','blocks','reports','sources'].map(key=>{
    if(!indexed)return [key,id=>catalogue[key].find(value=>value.id===id)];
    const values=new Map();
    for(const value of catalogue[key])if(!values.has(value.id))values.set(value.id,value);
    return [key,id=>values.get(id)];
  }));
}
