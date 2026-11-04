import test from 'node:test';
import assert from 'node:assert/strict';
import {topicalNavigation,remapTopicalGroup} from './topical-navigation-groups.mjs';

function bundle(id,definitions){
 return {id,catalogue:{criteria:definitions.map(([chapter,sourceControlId],i)=>({id:'norm-'+i,chapter,sourceControlId})),
  points:definitions.map(([chapter,,articles=[]],i)=>({id:'point-'+i,criterion_id:'norm-'+i,chapter,
   selection_status:i===0?'HOLD':'SELECTABLE',source_links:articles.map(n=>({contribution:'PRIMARY',record_id:`RTS1774-NL-A${n}-L1`}))}))}};
}
test('NOREA groups its controls by subject and preserves every norm, point and HOLD',()=>{
 const source=bundle('NOREA-DORA-3-2',[['Third','2.1'],['First','1.1'],['Second','1.2'],['Unknown','29.1']]);
 const before=structuredClone(source),nav=topicalNavigation(source);
 assert.deepEqual(nav.groups.map(g=>g.title),['1. Bestuur en strategie','2. ICT-risicobeheerraamwerk','Unknown']);
 assert.equal(nav.criteria.get('norm-1').id,nav.criteria.get('norm-2').id);
 assert.equal(nav.criteria.size,4);assert.deepEqual(source,before);
});
test('DORA joins related articles without mixing the simplified framework or dropping unknown chapters',()=>{
 const source=bundle('DORA-2022-2554',[[5],[6],[16],[24],[25],[99]].map(([n])=>[`Artikel ${n} · Original norm`]));
 const nav=topicalNavigation(source),group=i=>nav.criteria.get('norm-'+i).id;
 assert.equal(nav.groups.length,4);assert.equal(group(0),group(1));assert.equal(group(3),group(4));
 assert.notEqual(group(1),group(2));assert.equal(group(5),'Artikel 99 · Original norm');
});
test('RTS uses all primary source links and keeps ordinary, simplified and ambiguous provisions separate',()=>{
 const source=bundle('DORA-2024-1774',[
  ['Crypto A',null,[6]],['Crypto B',null,[6,7]],['Incidents A',null,[22,23]],['Incidents B',null,[23]],
  ['Simplified access',null,[33]],['Ordinary access',null,[20,21]],['Ambiguous',null,[7,22]],['Missing',null,[]],
 ]);
 source.catalogue.points[0].source_links.push({contribution:'SUPPORTING',record_id:'RTS1774-NL-A33-L1'});
 const before=structuredClone(source),nav=topicalNavigation(source),group=i=>nav.criteria.get('norm-'+i);
 assert.equal(group(0).id,group(1).id);assert.equal(group(2).id,group(3).id);
 assert.match(group(4).title,/^Vereenvoudigd/);assert.match(group(5).title,/^Gewoon/);
 assert.equal(group(6).id,'Ambiguous');assert.equal(group(7).id,'Missing');
 assert.equal(nav.criteria.size,8);assert.deepEqual(source,before);
});
test('other frameworks retain their existing chapters',()=>{
 const nav=topicalNavigation(bundle('OTHER',[['Existing A','1.1'],['Existing B','1.2']]));
 assert.deepEqual(nav.groups,[{id:'Existing A',title:'Existing A'},{id:'Existing B',title:'Existing B'}]);
});
test('saved chapter filters migrate only when their new group is unambiguous',()=>{
 const rows=[{groupId:'one',navigationSubjects:['Old A']},{groupId:'one',navigationSubjects:['Old B']},
  {groupId:'two',navigationSubjects:['Ambiguous']},{groupId:'one',navigationSubjects:['Ambiguous']}];
 const groups=[{id:'one'},{id:'two'}];
 assert.equal(remapTopicalGroup('Old A',rows,groups),'one');
 for(const value of ['','one','missing','Ambiguous'])assert.equal(remapTopicalGroup(value,rows,groups),value);
});
