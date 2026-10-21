import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(specifier==='./content-discovery.mjs'&&context.parentURL.endsWith('/report-browse-groups.mjs'))
   return {url:'data:text/javascript,export const discoveryProcesses=[];',shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {reportBrowserGroups,reportSelection}=await import('./report-browser-model.mjs');
const lines=Array.from({length:139},(_,i)=>({id:'S'+i,title:'Synthetic norm '+i}));
const counts=Object.fromEntries(lines.map(l=>[l.id,{total:2,selected:0}]));
test('opening all 139 norms does not inspect question text or lose selection totals',()=>{
 const points={[Symbol.iterator](){throw Error('Unfiltered browsing must not index points');}};
 const groups=reportBrowserGroups(lines,counts,{},[],points);
 assert.equal(groups.flatMap(g=>g.lines).length,139);
 assert.equal(reportSelection(lines,counts).total,278);
});
test('search finds later child points and keeps whole-group selection scope',()=>{
 const groups=reportBrowserGroups(lines,counts,{query:'unieke passage'},[],[
  {legacy_line_id:'S138',id:'P138',title:'Vraag',text:'Een unieke passage'},
 ]);
 assert.deepEqual(groups[0].lines.map(l=>l.id),['S138']);
 assert.equal(groups[0].allRows.length,139);
});
test('selected-only search includes legacy choices and explicit child selections',()=>{
 const groups=reportBrowserGroups(lines,{...counts,S138:{total:2,selected:1}}, {selectedOnly:true}, ['S137']);
 assert.deepEqual(groups[0].lines.map(l=>l.id),['S137','S138']);
});
