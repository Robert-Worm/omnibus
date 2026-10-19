import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectStatus} from './project-status.mjs';

test('project status has stable immutable snapshots and notifies only on changes',()=>{
  const store=createProjectStatus(),initial=store.getSnapshot();let calls=0;
  const unsubscribe=store.subscribe(()=>calls++);
  assert.equal(store.getSnapshot(),initial);
  assert(Object.isFrozen(initial));
  store.update({savedLocally:false});assert.equal(calls,0);
  store.update({savedLocally:true,problem:false,message:'Saved'});
  assert.equal(calls,1);assert.notEqual(store.getSnapshot(),initial);
  store.update({savedLocally:true,problem:false,message:'Saved'});assert.equal(calls,1);
  unsubscribe();store.setMessage('Closed');assert.equal(calls,1);
});

test('save failure and explicit recovery preserve independent status fields',()=>{
  const store=createProjectStatus();
  store.setSavedLocally(true);store.setProblem(true);store.setMessage('Storage conflict');
  assert.deepEqual(store.getSnapshot(),{savedLocally:true,problem:true,message:'Storage conflict'});
  store.update({problem:false,message:'Recovered'});
  assert.deepEqual(store.getSnapshot(),{savedLocally:true,problem:false,message:'Recovered'});
});

test('editor instances never share storage status or notifications',()=>{
  const first=createProjectStatus(),second=createProjectStatus();let calls=0;
  second.subscribe(()=>calls++);first.setProblem(true);
  assert.equal(second.getSnapshot().problem,false);assert.equal(calls,0);
});
