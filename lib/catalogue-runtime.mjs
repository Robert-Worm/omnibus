import {insertCatalogueItems} from './ordered-catalogue-array.mjs';
// The offline edition is already complete. The database build registers its
// immutable content resources here before any viewer mounts. Loading content
// never changes a draft, selection, question or saved project.
const resources = new Map();
const listeners = new Set();
let revision = 0;
export const catalogueRevision = () => revision;
export function onCatalogueChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function registerCatalogueResource(key, load, apply, ref = null) {
  if (resources.has(key)) throw Error('Dubbele catalogusbron: ' + key);
  resources.set(key, { load, apply, ref, ready: false, pending: null });
}
// Welke resources bij een sleutelreeks horen verandert alleen als er een resource bijkomt: onthoud het per reeks.
const requestedCache = new Map();
let requestedSize = -1;
const requested = keys => {
  if (requestedSize !== resources.size) { requestedCache.clear(); requestedSize = resources.size; }
  const id = keys.join('\u0000');
  let found = requestedCache.get(id);
  if (!found) {
    found = [...resources].filter(([key]) => keys.some(prefix => key === prefix || key.startsWith(prefix + ':'))).map(([, value]) => value);
    if (requestedCache.size > 500) requestedCache.clear();
    requestedCache.set(id, found);
  }
  return found;
};
export function catalogueReady(keys) { return requested(keys).every(entry => entry.ready); }
// Only committed resources from this build may be offered to its preview worker.
// Failed or merely prefetched groups never become a transfer source.
export function catalogueContentRefs(keys) {
  return requested(keys).filter(entry=>entry.ready&&entry.ref).map(entry=>({...entry.ref}));
}
function load(entry) {
  if (!entry.pending) entry.pending = Promise.resolve().then(entry.load).catch(error => { entry.pending = null; throw error; });
  return entry.pending;
}
let warming = null;
// Intent-only preparation: fetch/validate one prospective viewer at a time.
// Do not publish data, refresh indexes, or change the project before the click.
export function prefetchCatalogue(keys) {
  if(warming)return warming;
  const entries=requested(keys).filter(entry=>!entry.ready);
  if(!entries.length)return Promise.resolve();
  warming=Promise.allSettled(entries.map(load)).then(()=>{}).finally(()=>{warming=null;});
  return warming;
}
/** Haal op zodra de browser niets anders te doen heeft (voor de volgende stap); nooit bij een gebruikershandeling. */
// Beleefd voorladen: alleen als de browser niets te doen heeft en de gebruiker even niet scrolt,
// typt of klikt. Zo valt het ophalen, controleren en ontleden nooit samen met scrollen. Een echte klik (ensureCatalogue)
// wacht hier niet op: die laadt wat nog ontbreekt meteen zelf en deelt wat al onderweg is.
const QUIET_MS = 700;
let lastInput = -Infinity, inputWatched = false;
function watchInput() {
  if (inputWatched || typeof globalThis.addEventListener !== 'function') return;
  inputWatched = true;
  const mark = () => { lastInput = performance.now(); };
  for (const type of ['scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown'])
    globalThis.addEventListener(type, mark, {passive: true, capture: true});
}
function whenQuiet() {
  return new Promise(resolve => {
    const check = deadline => {
      const calm = performance.now() - lastInput >= QUIET_MS;
      if (calm && (!deadline || deadline.didTimeout || deadline.timeRemaining() > 8)) resolve();
      else if (typeof globalThis.requestIdleCallback === 'function') globalThis.requestIdleCallback(check, {timeout: 5000});
      else setTimeout(check, 300);
    };
    if (typeof globalThis.requestIdleCallback === 'function') globalThis.requestIdleCallback(check, {timeout: 5000});
    else setTimeout(check, 300);
  });
}
// Een paar tegelijk, zodat het netwerk doorloopt; elk antwoord wordt pas verwerkt als het rustig is.
const IDLE_LANES = 3;
const idleQueue = [];
let idleLanes = 0;
export function prefetchWhenIdle(keys) {
  if (catalogueReady(keys)) return;
  watchInput();
  for (const entry of requested(keys)) if (!entry.ready && !entry.pending && !idleQueue.includes(entry)) idleQueue.push(entry);
  while (idleLanes < IDLE_LANES && idleLanes < idleQueue.length) {
    idleLanes++;
    void (async () => {
      try {
        while (idleQueue.length) {
          await whenQuiet();
          const entry = idleQueue.shift();
          if (entry && !entry.ready) await load(entry).catch(() => {});
        }
      } finally { idleLanes--; }
    })();
  }
}
export async function ensureCatalogue(keys) {
  const entries = requested(keys).filter(entry => !entry.ready);
  // Validate every response first: a failed group must not leave half a viewer.
  const values = await Promise.all(entries.map(load));
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
  try { for (const {path, value, positions} of edits) {
    if(!Array.isArray(path)||!path.length||!path.every(key=>safeKey(key)||(Number.isSafeInteger(key)&&key>=0)))throw Error('Ongeldig cataloguspad.');
    let parent = target;
    for (const key of path.slice(0, -1)) {
      if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('Ontbrekend cataloguspad.');
      parent = parent[key];
    }
    if(!parent||typeof parent!=='object')throw Error('Ongeldig catalogusdoel.');
    const key = path.at(-1);
    if (positions !== undefined) {
      undo.push(insertCatalogueItems(parent[key],value,positions));
    } else if (Array.isArray(parent[key]) && Array.isArray(value)) {
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
