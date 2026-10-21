import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundProjectSave} from './background-project-save.mjs';

function fixture(writeError,schedule=run=>run()){
 const jobs=[],writes=[],states=[];
 const saver=createBackgroundProjectSave({
  encode:project=>new Promise((resolve,reject)=>jobs.push({project,resolve,reject})),
  write:text=>{if(writeError)throw writeError;writes.push(text);},
  onPending:()=>states.push('pending'),onSaved:()=>states.push('saved'),onError:error=>states.push(error.message),
    schedule,
 });
 return {jobs,writes,states,saver};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('input marks pending immediately and only clones the latest snapshot after yielding',async()=>{
 const scheduled=[];
 const {saver,jobs,writes,states}=fixture(undefined,run=>scheduled.push(run));
 saver.save('edit');saver.save('edit with current view');
 assert.equal(saver.pending,true);assert.equal(jobs.length,0);assert.equal(scheduled.length,1);
 assert.ok(!states.includes('saved'));
 scheduled.shift()();assert.equal(jobs.length,1);assert.equal(jobs[0].project,'edit with current view');
 jobs[0].resolve('bytes');await tick();assert.deepEqual(writes,['bytes']);
});

test('exit, reset and disposal cancel a scheduled encoding before it starts',()=>{
 for(const action of ['cancel','dispose']){
  const scheduled=[];const {saver,jobs}=fixture(undefined,run=>scheduled.push(run));
  saver.save('edit');saver[action]();scheduled.shift()();
  assert.equal(jobs.length,0);assert.equal(saver.pending,false);
 }
});

test('autosave keeps only the latest queued snapshot and never writes stale worker output',async()=>{
 const {saver,jobs,writes,states}=fixture();
 saver.save('first');saver.save('skipped');saver.save('latest');
 assert.equal(jobs.length,1);assert.equal(saver.pending,true);
 jobs[0].resolve('old bytes');await tick();
 assert.deepEqual(writes,[]);assert.equal(jobs.length,2);assert.equal(jobs[1].project,'latest');
 jobs[1].resolve('latest bytes');await tick();
 assert.deepEqual(writes,['latest bytes']);assert.equal(saver.pending,false);assert.equal(states.at(-1),'saved');
});
test('synchronous save, reset or import cancels older outstanding encoding',async()=>{
 const {saver,jobs,writes,states}=fixture();
 saver.save('old');saver.cancel();
 jobs[0].resolve('old bytes');await tick();
 assert.deepEqual(writes,[]);assert.equal(saver.pending,false);assert.ok(!states.includes('saved'));
 saver.save('new');jobs[1].resolve('new bytes');await tick();assert.deepEqual(writes,['new bytes']);
});
test('obsolete failures do not block a newer project; current failures never claim saved',async()=>{
 const {saver,jobs,states}=fixture();saver.save('old');saver.save('new');
 jobs[0].reject(Error('obsolete'));await tick();assert.ok(!states.includes('obsolete'));
 jobs[1].reject(Error('current'));await tick();assert.equal(states.at(-1),'current');assert.equal(saver.pending,false);assert.ok(!states.includes('saved'));
});
test('storage errors and disposal cannot produce a false success',async()=>{
 const {saver,jobs,states}=fixture(Error('quota'));saver.save('work');jobs[0].resolve('bytes');await tick();
 assert.equal(states.at(-1),'quota');assert.ok(!states.includes('saved'));
 saver.save('closed');saver.dispose();jobs[1].resolve('closed bytes');await tick();
 saver.save('ignored');assert.equal(jobs.length,2);assert.ok(!states.includes('saved'));
});
