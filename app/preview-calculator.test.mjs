import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewCalculator,samePreviewContext} from './preview-calculator.ts';

const context={framework:{lines:[{id:'n1'}]},draft:{title:'Test',included:['n1'],notes:{n1:'Eigen tekst'},
 investigation:{materials:[{sourceContext:'Exacte bron 🧭'}]}},models:[]};
const request=config=>({...context,config});
const result=label=>({preview:{title:label},validation:''});
const tick=()=>new Promise(r=>setImmediate(r));
function harness({fallback=()=>result('fallback'),blocked=false}={}){
 const queue=[],sent=[],changes=[];let created=0,terminated=0,calls=0;
 const worker={postMessage:message=>sent.push(structuredClone(message)),terminate:()=>terminated++};
 const client=createPreviewCalculator({schedule:run=>queue.push(run),onChange:state=>changes.push(state),
  createWorker:()=>{created++;if(blocked)throw Error('Unavailable');return worker;},
  fallback:input=>{calls++;return fallback(input);}});
 return {client,worker,sent,changes,run:()=>queue.shift()?.(),counts:()=>({created,terminated,calls})};
}

test('controls yield before calculation and rapid edits queue only the latest settings',()=>{
 const h=harness(),first=request({fontSize:10}),middle=request({fontSize:11}),last=request({fontSize:12});
 h.client.request(first);assert.equal(h.counts().created,0);assert.equal(h.changes.at(-1).busy,true);
 h.run();assert.deepEqual(h.sent[0].context,context);
 h.client.request(middle);h.client.request(last);assert.equal(h.sent.length,1);
 const old=h.worker.onmessage;old({data:{id:h.sent[0].id,result:result('old')}});
 assert.equal(h.changes.at(-1).result,null);assert.equal(h.changes.at(-1).busy,true);
 h.run();assert.equal(h.sent.length,2);assert.equal(h.sent[1].context,undefined);assert.equal(h.sent[1].config.fontSize,12);
 old({data:{id:h.sent[0].id,result:result('late old')}});
 h.worker.onmessage({data:{id:h.sent[1].id,result:result('current')}});
 assert.equal(h.changes.at(-1).request,last);assert.equal(h.changes.at(-1).result.preview.title,'current');
 assert.equal(h.changes.at(-1).busy,false);assert.equal(h.worker.onmessage,null);
});

test('settings do not resend source snapshots; every other changed draft field invalidates context',()=>{
 const same={...context,draft:{...context.draft,exportSettings:{accent:'green'}}};
 assert(samePreviewContext(context,same));
 for(const changed of [{...context,framework:{...context.framework}},{...context,models:[]},
  {...context,draft:{...context.draft,notes:{}}},{...context,draft:{...context.draft,extra:'new future field'}}])
  assert.equal(samePreviewContext(context,changed),false);
 const h=harness();h.client.request(request({}));h.run();h.worker.onmessage({data:{id:1,result:result('first')}});
 h.client.request({...request({}),draft:{...context.draft,notes:{n1:'Nieuwe tekst'}}});h.run();
 assert.equal(h.sent[1].context.draft.notes.n1,'Nieuwe tekst');
});

test('pausing hidden screens cancels queued edits and reopening can request the same input',()=>{
 const h=harness(),first=request({}),last=request({fontSize:12});
 h.client.request(first);h.run();h.client.request(last);h.client.pause();
 h.worker.onmessage({data:{id:1,result:result('hidden old')}});h.run();assert.equal(h.sent.length,1);
 h.client.request(last);h.run();assert.equal(h.sent.length,2);
 h.worker.onmessage({data:{id:h.sent[1].id,result:result('reopened')}});
 assert.equal(h.changes.at(-1).result.preview.title,'reopened');
});

test('source failures remain visible and retry the same request without suppressing validation',()=>{
 const h=harness(),input=request({});h.client.request(input);h.run();
 h.worker.onmessage({data:{id:1,error:'Bronversie ontbreekt'}});
 assert.equal(h.changes.at(-1).failed,true);assert.equal(h.changes.at(-1).result.preview,null);
 h.client.request(input,true);h.run();assert.equal(h.sent.length,2);
 h.worker.onmessage({data:{id:2,result:{preview:null,validation:'Kies toetsfasen'}}});
 assert.equal(h.changes.at(-1).failed,false);assert.equal(h.changes.at(-1).result.validation,'Kies toetsfasen');
 assert.equal(h.counts().calls,0);
});

test('unavailable workers use the original calculation and late failures cannot publish stale results',async()=>{
 const h=harness(),input=request({});h.client.request(input);h.run();
 const late=h.worker.onmessage,fail=h.worker.onerror;fail();fail();late({data:{id:1,result:result('late')}});await tick();
 assert.equal(h.counts().calls,1);assert.equal(h.changes.at(-1).result.preview.title,'fallback');
 const blocked=harness({blocked:true});blocked.client.request(input);blocked.run();await tick();
 assert.equal(blocked.changes.at(-1).result.preview.title,'fallback');
 const removed=harness();removed.client.request(input);removed.client.dispose();removed.run();
 assert.equal(removed.counts().created,0);removed.client.request(request({}));assert.equal(removed.changes.length,1);
});
