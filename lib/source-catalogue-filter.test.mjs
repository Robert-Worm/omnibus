import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceFilter} from './source-catalogue-filter.mjs';

function fixture(){
  const sources=[
    {id:'M',kind:'model',title:'Model',usage:'Overdracht',ownField:{keep:true}},
    {id:'B',kind:'law',title:'Beta',edition:'2026'},
    {id:'F',kind:'framework',title:'Kader',usage:'Overdracht',edition:'2026'},
    {id:'A',kind:'law',title:'Alpha',usage:'OVERDRACHT',edition:'2025'},
    {id:'R',kind:'audit',title:'Rapport'},
  ];
  const processes=[{id:'P',title:'Proces',keywords:'',question:'Vraag?',sourceIds:['A','F']}];
  const domains={topic:{title:'Onderwerp',ids:['A','F','M']}};
  return {sources,processes,domains,filter:createSourceFilter(processes,domains)};
}
test('source discovery retains kind and Dutch title order without mutating inputs',()=>{
  const f=fixture(),before=structuredClone(f.sources);
  const result=f.filter(f.sources);
  assert.deepEqual(result.map(s=>s.id),['A','B','F','R','M']);
  assert.equal(result.at(-1),f.sources[0]);
  assert.deepEqual(f.sources,before);
});
test('query matches all terms across existing display fields',()=>{
  const f=fixture();
  assert.deepEqual(f.filter(f.sources,{query:'  oVeRdRaChT  2026 '}).map(s=>s.id),['F']);
  assert.deepEqual(f.filter(f.sources,{query:'b 2026'}).map(s=>s.id),['B']);
  assert.deepEqual(f.filter(f.sources,{query:'missing'}),[]);
});
test('kind, domain, process and open-source filters intersect',()=>{
  const f=fixture();
  assert.deepEqual(f.filter(f.sources,{domain:'topic',processId:'P',selectedOnly:true,openIds:['F','M']}).map(s=>s.id),['F']);
  assert.deepEqual(f.filter(f.sources,{kind:'law',domain:'topic'}).map(s=>s.id),['A']);
  assert.deepEqual(f.filter(f.sources,{selectedOnly:true}),[]);
  assert.deepEqual(f.filter(f.sources,{domain:'absent'}),[]);
  assert.deepEqual(f.filter(f.sources,{processId:'absent'}),f.filter(f.sources));
});
test('filters read current discovery links without a second cache or source selection',()=>{
  const f=fixture();
  f.processes[0].sourceIds.push('M');
  f.domains.topic.ids.splice(0,2);
  const result=f.filter(f.sources,{domain:'topic',processId:'P'});
  assert.deepEqual(result,[f.sources[0]]);
  assert.deepEqual(result[0].ownField,{keep:true});
  assert.equal('selected' in result[0],false);
});
