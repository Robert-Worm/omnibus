// The offline edition is already complete. The database build registers its
// immutable content resources here before any viewer mounts. Loading content
// never changes a draft, selection, question or saved project.
const resources = new Map();
const listeners = new Set();
let revision = 0;
export const catalogueRevision = () => revision;
export function onCatalogueChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function registerCatalogueResource(key, load, apply) {
  if (resources.has(key)) throw Error('Dubbele catalogusbron: ' + key);
  resources.set(key, { load, apply, ready: false, pending: null });
}
const requested = keys => [...resources].filter(([key]) => keys.some(prefix => key === prefix || key.startsWith(prefix + ':'))).map(([, value]) => value);
export function catalogueReady(keys) { return requested(keys).every(entry => entry.ready); }
export async function ensureCatalogue(keys) {
  const entries = requested(keys).filter(entry => !entry.ready);
  // Validate every response first: a failed group must not leave half a viewer.
  const values = await Promise.all(entries.map(entry => {
    if (!entry.pending) entry.pending = Promise.resolve().then(entry.load).catch(error => { entry.pending = null; throw error; });
    return entry.pending;
  }));
  const applied=[];
  try {
    entries.forEach((entry,i)=>{if(!entry.ready)applied.push({entry,undo:entry.apply(values[i])});});
    if(applied.length){revision++;for(const listener of listeners)listener();}
    for(const {entry} of applied){entry.ready=true;entry.pending=null;}
  } catch(error) {
    for(const {undo} of applied.reverse())undo?.();
    // The throwing entry never reaches `applied`. Evict the entire uncommitted
    // group so retry can fetch corrected responses, including untouched chunks.
    // Resources committed by another request remain ready and reusable.
    for(const entry of entries)if(!entry.ready)entry.pending=null;
    revision++;
    for(const listener of listeners){try{listener();}catch{/* Preserve the original projection failure. */}}
    throw error;
  }
}

// Refresh derived indexes in dependency registration order. Arrays/maps exposed
// by existing modules keep their identity, so the established viewers can stay.
export function catalogueDerived(refresh) { refresh(); onCatalogueChange(refresh); }

export function applyCatalogueEdits(target, edits) {
  const undo=[];
  const restore=()=>{for(const revert of undo.reverse())revert();undo.length=0;};
  const safeKey=key=>typeof key==='string'&&!['__proto__','prototype','constructor'].includes(key);
  try { for (const {path, value} of edits) {
    if(!Array.isArray(path)||!path.length||!path.every(key=>safeKey(key)||(Number.isSafeInteger(key)&&key>=0)))throw Error('Ongeldig cataloguspad.');
    let parent = target;
    for (const key of path.slice(0, -1)) {
      if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('Ontbrekend cataloguspad.');
      parent = parent[key];
    }
    if(!parent||typeof parent!=='object')throw Error('Ongeldig catalogusdoel.');
    const key = path.at(-1);
    if (Array.isArray(parent[key]) && Array.isArray(value)) {
      const array=parent[key],length=array.length;undo.push(()=>array.splice(length));array.push(...value);
    } else if (parent[key] && typeof parent[key] === 'object' && !Array.isArray(parent[key])) {
      if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).every(safeKey))throw Error('Ongeldige catalogusindex.');
      const object=parent[key],before=Object.fromEntries(Object.keys(value).map(k=>[k,{exists:Object.hasOwn(object,k),value:object[k]}]));
      undo.push(()=>{for(const [k,v] of Object.entries(before)){if(v.exists)object[k]=v.value;else delete object[k];}});Object.assign(object,value);
    } else {
      const exists=Object.hasOwn(parent,key),before=parent[key];undo.push(()=>{if(exists)parent[key]=before;else delete parent[key];});parent[key]=value;
    }
  }} catch(error) {restore();throw error;}
  return restore;
}
