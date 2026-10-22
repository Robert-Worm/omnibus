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
  function defer(id, groups) {
    if(!groups.size)return;
    const original=content.modules[id],projected=structuredClone(original);
    for(const [boundary,edits] of groups){
      const key=boundary+':metadata:'+id;
      if(Object.hasOwn(content.refs,key)||resources.has(key))throw Error('Catalogue metadata resource collision.');
      for(const {path,value} of edits){
        const parent=path.slice(0,-1).reduce((parent,key)=>parent[key],projected);
        parent[path.at(-1)]=Array.isArray(value)?[]:{};
      }
      resources.set(key,edits);
      (registrations[id]??=[]).push(key);
    }
    // Restoring sources in a different order must retain values and key order.
    const restored=structuredClone(projected);
    for(const edits of [...groups.values()].reverse())applyCatalogueEdits(restored,edits);
    if(JSON.stringify(restored)!==JSON.stringify(original))throw Error('Catalogue metadata round-trip changed content.');
    modules[id]=projected;
  }
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
    defer(id,new Map([[[...boundaries][0],edits]]));
  }
  for(const id of ['app/reviewed-reports.json','app/report-additions.json']){
    const original=content.modules[id];if(!original)continue;
    const groups=new Map();
    const add=(reportId,path,value)=>{
      if(value===undefined)return;
      if(!value||typeof value!=='object')throw Error('Unexpected report metadata shape: '+id);
      if(!Object.keys(value).length)return;
      if(typeof reportId!=='string'||!reportId||reportId.includes(':')||
          !(content.registrations[id]??[]).some(key=>key.startsWith('report:'+reportId+':')))
        throw Error('Report metadata needs its existing report boundary: '+id);
      const boundary='report:'+reportId;
      if(!groups.has(boundary))groups.set(boundary,[]);
      groups.get(boundary).push({path,value});
    };
    // Keep report IDs/titles, source hashes, directory and question suggestions
    // eager. Review details and admission reasons belong to the chosen report.
    for(const [index,entry] of (original.corpus??[]).entries())
      add(entry.framework.report.id,['corpus',index,'framework','source_review'],entry.framework.source_review);
    for(const [lineId,decision] of Object.entries(original.scopeDecisions??{})){
      if(!Array.isArray(decision))throw Error('Unexpected report admission decision.');
      add(content.routing.reports?.[lineId],['scopeDecisions',lineId],decision);
    }
    defer(id,groups);
  }
  return {modules, resources, registrations};
}
