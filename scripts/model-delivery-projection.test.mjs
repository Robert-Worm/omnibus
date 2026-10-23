import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {projectModelDelivery} from './model-delivery-projection.mjs';
import {applyCatalogueEdits,registerCatalogueResource,ensureCatalogue,catalogueReady} from '../lib/catalogue-runtime.mjs';

const library='lib/model-library.mjs',shared='lib/interview-practice-previous.json';
const seeds=Array.from({length:14},(_,i)=>({id:'future-'+i,items:Array.from({length:200},(_,n)=>({id:'item-'+n,question:'Exact 🧭 question '+n}))}));
const content={modules:{[library]:{models:[],history:[]},[shared]:{values:[]}},registrations:{[library]:['models:library:0'],[shared]:['models:previous:0']},
 refs:{'models:library:0':{hash:'library'},'models:previous:0':{hash:'previous'}}};
const values={library:[{path:['models'],value:seeds},{path:['history'],value:[{id:'original',text:'Exact prior wording'}]}],previous:[{path:['values'],value:[{id:'future-0'}]}]};
const projection=()=>projectModelDelivery(content,ref=>structuredClone(values[ref.hash]));
const plan=projection();
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(specifier,context,next){
 if(context.parentURL.endsWith('/model-loading.mjs')&&specifier.endsWith('/model-resource-routing.mjs'))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify('export default '+JSON.stringify(plan.ids))}),shortCircuit:true};
 return next(specifier,context);
}`),import.meta.url);
const {modelContentKeys,projectModelIds}=await import('../lib/model-loading.mjs');

await test('partitioning a future large model library is lossless and does not edit its publication',()=>{
 const before=JSON.stringify({content,values}),parts=projection(),restored=structuredClone(content.modules[library]);
 assert.deepEqual(parts.ids,seeds.map(s=>s.id));
 for(const entry of parts.registrations[library])applyCatalogueEdits(restored,entry.edits);
 const full=structuredClone(content.modules[library]);applyCatalogueEdits(full,values.library);
 assert.deepEqual(restored,full);assert.equal(JSON.stringify({content,values}),before);
 assert.equal(parts.registrations[library].filter(p=>p.key.startsWith('models:item:')).length,14);
 for(const entry of parts.registrations[library].slice(1)){assert.equal(entry.edits[0].value.length,1);assert.equal(entry.edits[0].value[0].items.length,200);}
 assert.deepEqual(parts.registrations[shared],[{key:'models:shared:models:previous:0',ref:content.refs['models:previous:0']}]);
});

await test('one model loads only its template and shared dependencies; failed opens retry atomically',async()=>{
 const target=structuredClone(content.modules[library]),loads=[],other=structuredClone(content.modules[shared]);let fail=true;
 for(const [id,entries] of Object.entries(plan.registrations))for(const entry of entries)registerCatalogueResource(entry.key,async()=>{
  loads.push(entry.key);if(entry.key==='models:item:future-13'&&fail)throw Error('Temporary asset failure');return entry.edits??values[entry.ref.hash];
 },edits=>applyCatalogueEdits(id===library?target:other,edits),entry.ref??null);
 await assert.rejects(ensureCatalogue(modelContentKeys(['future-13'])),/Temporary/);
 assert.deepEqual(target,content.modules[library]);assert.deepEqual(other,content.modules[shared]);
 fail=false;await ensureCatalogue(modelContentKeys(['future-13','future-13']));
 assert.deepEqual(target.models,[seeds[13]]);assert.equal(catalogueReady(modelContentKeys(['future-0'])),false);
 assert(!loads.some(key=>key==='models:item:future-0'));assert.equal(loads.filter(k=>k.includes(':shared:')).length,2);
 await ensureCatalogue(modelContentKeys(['future-13']));assert.equal(target.models.length,1);
 await ensureCatalogue(modelContentKeys(['future-0']));assert.deepEqual(target.models,[seeds[13],seeds[0]]);
 await ensureCatalogue(['models']);assert.equal(target.models.length,14);assert.equal(new Set(target.models.map(m=>m.id)).size,14);
});

await test('saved, open, legacy and custom model identities route without expanding to unrelated models',()=>{
 const ids=projectModelIds({modelLibrary:{models:[{id:'future-2'},{id:'own'}]},view:{page:'model-workspace',activeModel:'future-3',openModelIds:['future-2','future-3']},
  draft:{investigation:{materials:[{kind:'model-question',originKey:'future-4:question:operational'},{kind:'report-point',originKey:'future-5:q'}]}}});
 assert.deepEqual(ids,['future-2','own','future-3','future-4']);
 assert.deepEqual(modelContentKeys(ids),['models:shared','models:item:future-2','models:item:future-3','models:item:future-4']);
 assert.deepEqual(modelContentKeys(['own']),['models:shared']);
 assert.deepEqual(projectModelIds({investigation:{materials:[{kind:'model-question',originKey:'future-4:q'}]}}),['future-4']);
});

await test('unknown layouts and duplicate/invalid model identities fail rather than drop data',()=>{
 assert.equal(projectModelDelivery({modules:{},registrations:{}},()=>assert.fail()),null);
 for(const edit of [s=>s[0].value.push(s[0].value[0]),s=>s[0].value[0].id='bad:path',s=>s[0].path=['models',0]]){
  const invalid=structuredClone(values.library);edit(invalid);assert.throws(()=>projectModelDelivery(content,()=>invalid));
 }
 const eager=structuredClone(content);eager.modules[library].models.push(seeds[0]);assert.throws(()=>projectModelDelivery(eager,()=>values.library),/boundary/);
});
