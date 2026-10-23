import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';

// Exercise the real queries at their validation and catalogue boundaries,
// using fictitious evidence rather than a private publication.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/cio-selection-notices.mjs'))return next(specifier,context);
  let source;
  if(specifier==='./investigation.mjs')source='export function validateInvestigation(input){globalThis.noticeValidations++;if(input.invalid)throw Error("Invalid evidence");return structuredClone(input);}';
  if(specifier==='./foundations/cio-stelsel.mjs')source='export const cioLegacyOriginKeys=["old-group","both"];export const cioReplacements=[{oldOriginKey:"old-point",replacementId:"new-point",replacementTitle:"New point"},{oldOriginKey:"both",replacementId:"new-group",replacementTitle:"New group"}];globalThis.noticeCatalogue={cioLegacyOriginKeys,cioReplacements};';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {cioSelectionNotices,legacyCioMaterials,supersededCioMaterials}=await import('./cio-selection-notices.mjs');
const draft=()=>({included:['g','p','b','other'],investigation:{materials:[
 {id:'g',originKey:'old-group',title:'Saved group',evidence:{quote:'Original group'}},
 {id:'not-selected',originKey:'old-point',title:'Not selected'},
 {id:'p',originKey:'old-point',title:'My edited title',evidence:{quote:'Original point'}},
 {id:'b',originKey:'both',title:'Both notices'},
 {id:'other',originKey:'current',title:'Current source'},
 ]},research:{questions:[{id:'q',text:'My question'}],links:[{question_id:'q',line_id:'p'}]}});

test('both notices use one validation and preserve selected order, overlaps and original evidence',()=>{
 const input=draft(),before=structuredClone(input);globalThis.noticeValidations=0;
 const result=cioSelectionNotices(input);
 assert.equal(globalThis.noticeValidations,1);
 assert.deepEqual(result.legacy.map(m=>m.id),['g','b']);
 assert.deepEqual(result.superseded.map(m=>m.id),['p','b']);
 assert.deepEqual(result.superseded[0],{...input.investigation.materials[2],oldOriginKey:'old-point',replacementId:'new-point',replacementTitle:'New point'});
 assert.deepEqual(input,before);
 assert.deepEqual(legacyCioMaterials(input),result.legacy);
 assert.deepEqual(supersededCioMaterials(input),result.superseded);
 assert.equal(globalThis.noticeValidations,3,'Individual entry points still validate their own calls');
});

test('changed selection, saved text and catalogue replacements are never hidden by a cache',()=>{
 const input=draft();globalThis.noticeValidations=0;
 cioSelectionNotices(input);
 input.included=['p'];input.investigation.materials[2].title='Changed again';
 const result=cioSelectionNotices(input);
 assert.deepEqual(result.legacy,[]);assert.equal(result.superseded.length,1);
 assert.equal(result.superseded[0].title,'Changed again');assert.equal(globalThis.noticeValidations,2);
 const replacement=globalThis.noticeCatalogue.cioReplacements[0],previous=replacement.replacementId;
 try{
  replacement.replacementId='revised-point';
  assert.equal(cioSelectionNotices(input).superseded[0].replacementId,'revised-point');
 }finally{replacement.replacementId=previous;}
 input.included=[];assert.deepEqual(cioSelectionNotices(input),{legacy:[],superseded:[]});
 input.investigation.invalid=true;assert.throws(()=>cioSelectionNotices(input),/Invalid evidence/,'Empty selections still validate the snapshot');
});

test('the shared notice uses the combined query and retains source, selection and catalogue invalidation',()=>{
 const source=readFileSync(new URL('../app/legacy-cio-notice.tsx',import.meta.url),'utf8');
 assert.match(source,/cioSelectionNotices\(selection\)/);
 assert.match(source,/from '@\/lib\/foundation-workspace\.mjs'/,'Keep the existing workspace chunk boundary');
 assert.doesNotMatch(source,/legacyCioMaterials\(|supersededCioMaterials\(/);
 assert.match(source,/\[investigation,selectionKey,revision\]/);
});
