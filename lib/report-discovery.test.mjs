import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDiscoveryProcesses} from './report-discovery.mjs';
const processes=[{id:'PR12',title:'Synthetic governance'},{id:'PR11',title:'Synthetic information'}];

test('multiple reports contribute to one navigation process without lost members',()=>{
  const mappings=[
    {process_id:'PR12',line_ids:['A-N1','A-N2'],reason:'First reviewed rationale'},
    {process_id:'PR11',line_ids:['B-N1'],reason:'Information rationale'},
    {process_id:'PR12',line_ids:['B-N2','A-N2'],reason:'Second reviewed rationale'},
  ];
  const before=structuredClone(mappings);
  const result=reportDiscoveryProcesses(mappings,processes);
  assert.equal(result.length,2);
  assert.deepEqual(result[0],{id:'report-PR12',title:'Synthetic governance',themeIds:['governance','information'],
    lineIds:['A-N1','A-N2','B-N2'],foundationIds:[],reason:'First reviewed rationale\n\nSecond reviewed rationale'});
  assert.deepEqual(result[1].lineIds,['B-N1']);
  assert.deepEqual(mappings,before);
});

test('single-report process keeps its established shape and unsupported mappings fail',()=>{
  assert.deepEqual(reportDiscoveryProcesses([{process_id:'PR11',line_ids:['A-N1'],reason:'Reviewed'}],processes),
    [{id:'report-PR11',title:'Synthetic information',themeIds:['digital','information'],lineIds:['A-N1'],foundationIds:[],reason:'Reviewed'}]);
  assert.deepEqual(reportDiscoveryProcesses([],processes),[]);
  assert.throws(()=>reportDiscoveryProcesses([{process_id:'MISSING',line_ids:[]}],processes),/Onbekende/);
  for(const line_ids of [undefined,'A-N1',[null],['']])
    assert.throws(()=>reportDiscoveryProcesses([{process_id:'PR12',line_ids}],processes),/Ongeldige/);
});
