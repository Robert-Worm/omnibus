import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {validateModelDirectory,mergeModelDirectory} from './model-directory-core.mjs';
import {registerCatalogueResource,ensureCatalogue,catalogueReady} from './catalogue-runtime.mjs';

const entry=(id,patch={})=>({id,displayOnly:true,title:'Model '+id,summary:'Summary',searchText:'late indicator 🧭',itemCount:200,questionCount:600,selectedCount:0,selected:false,...patch});
const seeds=Array.from({length:50},(_,i)=>entry('model-'+i));
let attempts=0;
globalThis.modelDirectoryTestLoad=()=>++attempts===1?[{...seeds[0],displayOnly:false}]:seeds;
const mocks={
 'model-directory-resource.mjs':'export default async()=>globalThis.modelDirectoryTestLoad();',
 'content-adapters/model-choice-guide.mjs':'export const modelChoiceGuide=m=>({summary:m.usage}),modelChoiceSearchText=m=>m.items.map(i=>i.title).join(" ");',
 'interview-structure.mjs':'export const modelDisplayName=m=>m.officialName||m.title;',
 'catalogue-selection.mjs':'export const modelCatalogueSelection=m=>({total:m.items.reduce((n,i)=>n+i.questions.length,0),selected:m.items.reduce((n,i)=>n+i.questions.filter(q=>q.included).length,0)});',
};
register('data:text/javascript,'+encodeURIComponent(`
 const mocks=${JSON.stringify(mocks)};
 export async function resolve(specifier,context,next){
  const key=Object.keys(mocks).find(key=>specifier.endsWith('/'+key));
  if(context.parentURL.endsWith('/model-directory.mjs')&&key)return {url:'data:text/javascript,'+encodeURIComponent(mocks[key]),shortCircuit:true};
  return next(specifier,context);
 }`),import.meta.url);
const {modelDirectoryKey,modelDirectory,describeModel}=await import('./model-directory.mjs');

await test('a large future directory retains exact identity, search text and counts without full questions',()=>{
 const model={id:'future',title:'Future model',usage:'Scope',selected:true,source:'Private source',
  items:Array.from({length:200},(_,i)=>({title:'Indicator '+i,questions:Array.from({length:3},()=>({question:'Private interview text',included:i===199}))}))};
 const before=JSON.stringify(model),view=describeModel(model);
 assert.equal(view.itemCount,200);assert.equal(view.questionCount,600);assert.equal(view.selectedCount,3);
 assert.match(view.searchText,/Indicator 199/);assert.equal(view.displayOnly,true);
 assert.doesNotMatch(JSON.stringify(view),/Private|questions|items/);assert.equal(JSON.stringify(model),before);
 assert.deepEqual(validateModelDirectory([view]),[view]);
});

await test('saved edits, chosen counts and own models override only their navigation entries',()=>{
 const current=[entry('model-49',{title:'User title',searchText:'user wording',selected:true,selectedCount:7}),entry('own')];
 const before=JSON.stringify({seeds,current}),merged=mergeModelDirectory([...seeds,entry('L01')],current);
 assert.equal(merged.length,51);assert.deepEqual(merged[49],current[0]);assert.deepEqual(merged[50],current[1]);
 assert.equal(JSON.stringify({seeds,current}),before);assert(!merged.some(m=>m.id==='L01'));
});

await test('invalid navigation data retries atomically without loading or saving any model',async()=>{
 let fullLoads=0;registerCatalogueResource('models:test',async()=>{fullLoads++;return {};},()=>{});
 assert.equal(modelDirectoryKey(),'model-directory');
 await assert.rejects(ensureCatalogue([modelDirectoryKey()]),/ongeldig/);
 assert.deepEqual(modelDirectory({models:[]}),[]);assert.equal(catalogueReady([modelDirectoryKey()]),false);
 await ensureCatalogue([modelDirectoryKey()]);assert.equal(attempts,2);
 assert.deepEqual(modelDirectory({models:[]}),seeds);assert.equal(fullLoads,0);assert.equal(catalogueReady(['models']),false);
 await ensureCatalogue(['models']);assert.equal(fullLoads,1);assert.equal(modelDirectoryKey(),'models');
 delete globalThis.modelDirectoryTestLoad;
});

await test('duplicate identities, invalid counts and model-state substitutes cannot become navigation data',()=>{
 for(const value of [null,{},[entry('x'),entry('x')],[entry('x',{displayOnly:false})],
  [entry('x',{questionCount:-1})],[entry('x',{selectedCount:601})],[entry('x',{itemCount:0.5})],
  [entry('x',{searchText:[]})],[entry('../x')]])assert.throws(()=>validateModelDirectory(value),/ongeldig/);
});

await test('navigation is presentation-only; opening and saved models keep the full-data gate',()=>{
 const editor=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
 assert.match(editor,/if\(next==='models'\)keys.push\(modelDirectoryKey\(\)\)/);
 assert.match(editor,/if\(next==='model-workspace'\)keys.push\(\.\.\.modelContentKeys\(projectModelIds\(projectRef.current\)\)\)/);
 assert.match(editor,/function openModel\(id:string,viewer=false\) \{\s*withContent\(modelContentKeys\(\[id\]\),\(\)=>\{\s*prepareModelLibrary\(\[id\]\)/);
 assert.match(editor,/value=\{modelLibrary\} directory=\{modelDirectoryEntries\}/);
 assert.doesNotMatch(editor,/setModelLibrary\(modelDirectory/);
 const viewer=readFileSync(new URL('../app/model-library.tsx',import.meta.url),'utf8');
 assert.match(viewer,/normalizeOpenModelIds\(openModelIds, value.models\)/,'Existing legacy model tabs still resolve against full saved models');
 const restore=readFileSync(new URL('./application-catalogue.mjs',import.meta.url),'utf8');
 assert.match(restore,/needsModels=\(value\?\.modelLibrary\?\.models\?\.length\?\?0\)>0/);
 const adapter=readFileSync(new URL('./content-adapters/model-library.mjs',import.meta.url),'utf8');
 assert.match(adapter,/validateModelLibrary\(value, \{activeIntegrityDimensions\}\)/,'Restore uses the shared full-model validator');
 const validator=readFileSync(new URL('./model-library-validation.mjs',import.meta.url),'utf8');
 assert.match(validator,/!Array\.isArray\(m.items\)/,'Navigation entries lack items and cannot be restored as models');
});
