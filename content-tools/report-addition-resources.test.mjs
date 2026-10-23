import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionReportAdditionDetails,reportAdditionDetailPaths} from './report-addition-resources.mjs';
function fixture(ids=['A','B']) {
  const data={corpus:ids.map(id=>({framework:{report:{id}}})),catalogue:{}};
  for(const path of reportAdditionDetailPaths){
    const parent=path.length===2?data.catalogue:data;
    parent[path.at(-1)]=ids.map(id=>path[0]==='interview_questions'
      ?{id:id+'-question',point_ids:[id+'-point']}
      :{id:id+(path.at(-1)==='points'?'-point':'-detail'),report_id:id});
  }
  return data;
}
test('each report can load all its own details without loading its neighbour',()=>{
  const data=fixture(), before=JSON.stringify(data), parts=partitionReportAdditionDetails(data);
  for(const id of ['A','B']){
    const own=parts.filter(part=>part.reportId===id);
    assert.equal(own.length,reportAdditionDetailPaths.length);
    for(const part of own)assert(part.values.every(value=>value.id.startsWith(id+'-')));
  }
  assert.equal(JSON.stringify(data),before);
});
test('one report preserves values and ordering; an empty addition remains empty',()=>{
  const data=fixture(['A']);
  for(const part of partitionReportAdditionDetails(data))assert.deepEqual(part.values,
    part.path.reduce((value,key)=>value[key],data));
  assert.deepEqual(partitionReportAdditionDetails(fixture([])),[]);
});

test('a later 200-norm report inherits per-report loading without truncating details or links',()=>{
  const existing=fixture(),before=structuredClone(existing);
  const future=fixture(['FUTURE']);
  for(const path of reportAdditionDetailPaths){
    const parent=path.length===2?future.catalogue:future;
    parent[path.at(-1)]=Array.from({length:200},(_,i)=>path[0]==='interview_questions'
      ?{id:'FUTURE-question-'+i,point_ids:['FUTURE-point-'+i]}
      :{id:'FUTURE-'+path.at(-1)+'-'+i,report_id:'FUTURE'});
  }
  // Use the same stable IDs as the links, including the last offscreen norm.
  future.catalogue.points.forEach((p,i)=>{p.id='FUTURE-point-'+i;});
  existing.corpus.push(...future.corpus);
  for(const path of reportAdditionDetailPaths)
    path.reduce((value,key)=>value[key],existing).push(...path.reduce((value,key)=>value[key],future));
  const parts=partitionReportAdditionDetails(existing);
  assert.deepEqual(parts.filter(p=>p.reportId!=='FUTURE'),partitionReportAdditionDetails(before));
  assert.equal(parts.filter(p=>p.reportId==='FUTURE').length,reportAdditionDetailPaths.length);
  for(const part of parts.filter(p=>p.reportId==='FUTURE')){
    assert.equal(part.values.length,200);
    assert.deepEqual(part.values,part.path.reduce((value,key)=>value[key],future));
  }
  assert.equal(parts.find(p=>p.reportId==='FUTURE'&&p.path[0]==='interview_questions').values.at(-1).point_ids[0],'FUTURE-point-199');
});
test('unowned or conflicting rows fail closed rather than being dropped',()=>{
  for(const change of [
    data=>{data.catalogue.sources[0].report_id='unknown';},
    data=>{data.catalogue.points.push({...data.catalogue.points[0]});},
    data=>{data.interview_questions[0].point_ids=['missing'];},
    data=>{data.interview_questions[0].point_ids=['A-point','B-point'];},
    data=>{data.interview_questions[0].report_id='B';},
    data=>{data.visual_sources={};},
    data=>{data.corpus.push(data.corpus[0]);},
  ]){const data=fixture();change(data);assert.throws(()=>partitionReportAdditionDetails(data));}
});
