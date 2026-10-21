import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createCatalogueSearch} from './catalogue-search.mjs';
import {projectFoundationSearch} from './foundation-search-projection.mjs';
import {registerCatalogueResource,ensureCatalogue,catalogueReady} from './catalogue-runtime.mjs';

const sources=[{id:'A',title:'Privacywet',usage:'Gegevens beveiligen'},{id:'B',title:'Besturingskader',edition:'2026'}];
const items=[{id:'B-1',originKey:'b1',sourceId:'B',title:'Samenwerking',auditNorm:'Maak afspraken',body:'Andere context',
  groupTitle:'Besturing',groupDescription:'Interdepartementale afspraken',sourceContext:'Uitzondering netwerk',
  rationale:'Risico toegang',topic:'Beheer',location:'Artikel 2',sourceControlId:'CTRL-1',previousIds:['OLD-1'],
  designTest:'Do not copy',lawTrace:'Do not copy',evidence:{quote:'Do not copy'}},
 {id:'A-1',originKey:'a1',sourceId:'A',title:'Toegangsrechten',body:'Regel de toegang',effectiveStatus:'future'},
 {id:'A-scope',originKey:'a-scope',sourceId:'A',title:'Alleen publieke instanties',body:'Bepaal de toepasselijkheid',auditRole:'scope'}];

await test('light search preserves exact, contextual, typo, scope and filtered matches without evidence/tests',()=>{
 const before=JSON.stringify(items);
 const projected=projectFoundationSearch(items,sources);
 const full=createCatalogueSearch(items,sources);
 const light=createCatalogueSearch(Object.values(projected).flat().sort((a,b)=>a.searchOrder-b.searchOrder),sources);
 const comparable=result=>({...result,criteria:result.criteria.map(row=>({id:row.item.id,source:row.source,
   direct:row.direct,text:row.text,matchInCriterion:row.matchInCriterion,score:row.score}))});
 for(const query of ['','Privacywet','toegang','toegangsrecthen','netwerk','OLD-1','CTRL-1','artikel 2','publieke','be'])
  for(const ids of [['A','B'],['A'],['B'],[]])assert.deepEqual(comparable(light(query,ids)),comparable(full(query,ids)));
 assert.equal(JSON.stringify(items),before);
 assert.doesNotMatch(JSON.stringify(projected),/Do not copy|lawTrace|designTest|evidence/);
 for(const item of items){const copy=projected[item.sourceId].find(row=>row.id===item.id);
  for(const field of ['title','auditNorm','body','auditRole','effectiveStatus'])assert.deepEqual(copy[field],item[field]);}
 assert.throws(()=>projectFoundationSearch([...items,items[0]],sources),/identity/);
 assert.throws(()=>projectFoundationSearch([{...items[0],sourceId:'unknown'}],sources),/identity/);
});

register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(context.parentURL?.endsWith('/foundation-search.mjs')){
   const source=specifier.endsWith('/foundation-search-resources.mjs')?
    'export default {A:async()=>[{id:"A-scope",originKey:"a",sourceId:"A",title:"Only test scope",auditRole:"scope",searchOrder:1}],B:async()=>[{id:"B-1",originKey:"b",sourceId:"B",searchOrder:0}]}':
    specifier.endsWith('/foundation-workspace.mjs')?'export const preparedFoundationItems=[];export const sourceScopeProvisions=()=>{throw Error("Full catalogue should stay unloaded")};':null;
   if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  }
  return next(specifier,context);
 }
`),import.meta.url);
const {foundationSearchItems,foundationSearchKeys,foundationSearchScope}=await import('./foundation-search.mjs');
await test('search loads only display indexes; opening/selecting still requires the full source',async()=>{
 let loads=0;
 registerCatalogueResource('foundation:A',async()=>{loads++;return {};},()=>{});
 await ensureCatalogue(foundationSearchKeys(['A']));
 assert.equal(loads,0);assert.equal(catalogueReady(['foundation:A']),false);
 assert.deepEqual(foundationSearchScope('A'),{count:1,titles:['Only test scope']});
 await ensureCatalogue(foundationSearchKeys(['B']));
 assert.deepEqual(foundationSearchItems.map(row=>row.id),['B-1','A-scope']);
 await ensureCatalogue(['foundation:A']);assert.equal(loads,1);
});
