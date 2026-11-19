// Bij "Nieuw project": de opgeslagen stand van overzichten opschonen, zonder inhoud te laden.
// Wat bij het vorige project hoorde (zoekterm, filters, gekozen onderwerp, alleen de selectie tonen) gaat weg; voorkeuren
// voor de weergave (tegels of lijst, sortering, kolommen, ingeklapte groepen) blijven.
const browseKeys = ['filters', 'query', 'topic', 'selectedOnly'];
export function clearProjectBrowsePreferences(storage) {
  const keys=[],views=[];
  for(let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if(key==='rijksmap-view-theme-catalogue' || key==='rijksmap-view-report-catalogue' || key?.startsWith('rijksmap-view-matrix-'))keys.push(key);
    else if(key?.startsWith('rijksmap-view-'))views.push(key);
  }
  for(const key of keys)storage.removeItem(key);
  for(const key of views) {
    let value;
    try { value=JSON.parse(storage.getItem(key)??''); } catch { continue; }
    if(!value || typeof value!=='object' || Array.isArray(value) || !browseKeys.some(name=>Object.hasOwn(value,name)))continue;
    if(Object.hasOwn(value,'filters'))value.filters={};
    if(typeof value.query==='string')value.query='';
    if(typeof value.topic==='string')value.topic='';
    if(typeof value.selectedOnly==='boolean')value.selectedOnly=false;
    storage.setItem(key,JSON.stringify(value));
  }
}
