import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {collectionViews,bindCollectionPreference,collectionOrigin} from './source-collections.mjs';
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(specifier==='./theme-curation.json')
   return {url:'data:application/json,'+encodeURIComponent(JSON.stringify({version:'synthetic',themes:[],parents:[]})),shortCircuit:true};
  if(specifier==='./content-discovery.mjs'&&['/report-browse-groups.mjs','/discovery-navigation.mjs'].some(name=>context.parentURL.endsWith(name)))
   return {url:'data:text/javascript,export const discoveryProcesses=[],discoveryThemes=[],discoveryItems=()=>[];',shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {reportBrowserGroups,reportSelection}=await import('./report-browser-model.mjs');
const {groupedDiscovery}=await import('./discovery-navigation.mjs');
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

test('collection scope precedes search, group totals and complete selection outside the mounted rows',()=>{
 const collections={schema:1,origins:[{id:'public-pin',kind:'public'},{id:'own-pin',kind:'own'}],sources:{report:{OWN:'own-pin'},foundation:{},model:{}}};
 const all=Array.from({length:400},(_,i)=>({id:'N'+i,title:'Synthetic norm '+i,report_id:i%2?'OWN':'PUBLIC'}));
 const routing=Object.fromEntries(all.map(l=>[l.id,l.report_id])),counts=Object.fromEntries(all.map(l=>[l.id,{total:2,selected:0}]));
 const theme={id:'shared-theme',lineIds:all.map(l=>l.id),reportIds:['PUBLIC','OWN']};
 for(const [mode,total] of [['public',200],['own',200],['both',400]]){
  const [scoped]=collectionViews([theme],collections,mode,routing),ids=new Set(scoped.lineIds);
  const permitted=all.filter(l=>ids.has(l.id)),last=permitted.at(-1);
  const groups=reportBrowserGroups(permitted,counts,{query:last.title},[],[]);
  assert.deepEqual(groups.flatMap(g=>g.lines).map(l=>l.id),[last.id]);
  assert.equal(groups.flatMap(g=>g.allRows).length,total);
  assert.equal(reportSelection(permitted,counts).total,total*2);
  assert.equal(collectionOrigin(collections,'report',last.report_id).kind,mode==='both'?'own':mode);
 }
 const both=bindCollectionPreference({mode:'both',origins:[]},collections);
 assert.deepEqual(bindCollectionPreference({...both,mode:'public'},collections).origins,both.origins,'hiding a collection does not discard its earlier evidence binding');
 assert.deepEqual(theme.lineIds,all.map(l=>l.id));
});

test('admitted local themes stay discoverable without public reclassification or startup keywords',()=>{
 const own={id:'theme:local-FICTIEF',categoryId:'local-FICTIEF',axis:'themes',title:'Fictieve afhandeling',description:'Fictieve afhandeling',lineIds:['OWN-1'],reportIds:['OWN']};
 const publicTheme={id:'theme:policy',categoryId:'policy',axis:'themes',title:'Beleid',keywords:'beleid',lineIds:['PUBLIC-1'],reportIds:['PUBLIC']};
 const views=[publicTheme,own],before=structuredClone(views);
 assert.deepEqual(groupedDiscovery(views,'themes','ficti').map(g=>[g.id,g.children.map(v=>v.id),g.count]),[['local',[own.id],1]]);
 assert.equal(groupedDiscovery(views,'themes').flatMap(g=>g.children).length,2);
 assert.equal(groupedDiscovery([publicTheme],'themes').some(g=>g.id==='local'),false);
 assert.deepEqual(views,before);
});
