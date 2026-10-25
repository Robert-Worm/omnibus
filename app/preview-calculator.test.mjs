import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewCalculator,samePreviewContext} from './preview-calculator.ts';
import {packPreviewContext,unpackPreviewContext} from '../lib/preview-context.mjs';
import {serialize} from 'node:v8';

const context={framework:{lines:[{id:'n1'}]},draft:{title:'Test',included:['n1'],notes:{n1:'Eigen tekst'},
 investigation:{materials:[{sourceContext:'Exacte bron 🧭'}]}},models:[]};
const request=config=>({...context,config});
const result=label=>({preview:{title:label},validation:''});
const tick=()=>new Promise(r=>setImmediate(r));
function harness({fallback=()=>result('fallback'),blocked=false,prepareSources}={}){
 const queue=[],sent=[],changes=[];let created=0,terminated=0,calls=0;
 const worker={postMessage:(message,transfer)=>sent.push(structuredClone(message,{transfer})),terminate:()=>terminated++};
 const client=createPreviewCalculator({schedule:run=>queue.push(run),onChange:state=>changes.push(state),
  createWorker:()=>{created++;if(blocked)throw Error('Unavailable');return worker;},
  fallback:input=>{calls++;return fallback(input);},prepareSources});
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
  assert.deepEqual(h.sent[1].context,context,'a failed context is resent, not silently reused');
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

test('source buffers transfer only with changed context and already transferred identities are not resent',()=>{
 const calls=[],source={release:'a'.repeat(64),hash:'b'.repeat(64),bytes:new ArrayBuffer(3)};
 const h=harness({prepareSources:(_request,known)=>{calls.push([...known]);return known.size?[]:[source];}});
 h.client.request(request({fontSize:10}));h.run();
 assert.equal(source.bytes.byteLength,0);assert.equal(h.sent[0].sources[0].bytes.byteLength,3);
 h.worker.onmessage({data:{id:1,result:result('first')}});
 h.client.request(request({fontSize:12}));h.run();assert.equal(h.sent[1].sources,undefined);assert.equal(calls.length,1);
 h.worker.onmessage({data:{id:2,result:result('settings')}});
 h.client.request({...request({}),draft:{...context.draft,notes:{n1:'Changed'}}});h.run();
 assert.deepEqual(calls[1],[source.release+':'+source.hash]);assert.deepEqual(h.sent[2].sources,[]);
});

const repeatedContext=()=>{
 const materials=[{id:'m1',lawTrace:'Exacte bron 🧭 é界\n'.repeat(15000),question:'How?',revision:3,flag:false,missing:undefined,empty:null}];
 return {...context,framework:{...context.framework,workbenchMaterials:structuredClone(materials)},
  draft:{...context.draft,investigation:{materials}}};
};
test('equal material snapshots cross the worker boundary once and become independent exact records again',()=>{
 const input=repeatedContext(),before=structuredClone(input),packed=packPreviewContext(input);
 assert.equal(packed.sharedMaterials,true);
 assert.equal(packed.context.framework.workbenchMaterials,packed.context.draft.investigation.materials);
 assert.notEqual(input.framework.workbenchMaterials,input.draft.investigation.materials);
 assert(serialize(packed).length<serialize({context:input}).length*.6,'large repeated text is transferred once');
 const received=unpackPreviewContext(structuredClone(packed));
 assert.deepEqual(received,before);assert.deepEqual(input,before);
 received.framework.workbenchMaterials[0].question='Changed worker projection';
 assert.equal(received.draft.investigation.materials[0].question,'How?');
 received.framework.workbenchMaterials.push({id:'new'});assert.equal(received.draft.investigation.materials.length,1);
});

test('changed or unusual snapshots always retain the original full context without reading accessors',()=>{
 for(const edit of [m=>{m[0].question='Different';},m=>{delete m[0].empty;},m=>{m[0].extra='Future field';},
  m=>{m[0].revision='3';},m=>{m[0]={...m[0],nested:{text:'Not scalar'}};},
  m=>{m[0]=Object.fromEntries(Object.entries(m[0]).reverse());},
  m=>{Object.defineProperty(m[0],'question',{enumerable:true,get(){throw Error('Must not read getter');}});},
  m=>{Object.defineProperty(m[0],'hidden',{value:'Not transferable'});},m=>{m[0][Symbol('extra')]='No';},
  m=>{m[0]=Object.assign(Object.create(null),m[0]);},m=>{m.extra='Array field';},m=>{delete m[0];},
  m=>{Object.defineProperty(m,0,{enumerable:true,get(){throw Error('Must not read index getter');}});},
 ]){
  const input=repeatedContext();edit(input.framework.workbenchMaterials);
  assert.equal(packPreviewContext(input).context,input);assert.equal(packPreviewContext(input).sharedMaterials,undefined);
 }
 const input=repeatedContext();input.framework.workbenchMaterials=input.draft.investigation.materials;
 assert.equal(packPreviewContext(input).context,input);assert.equal(packPreviewContext(input).sharedMaterials,undefined);
 const plain=packPreviewContext(context);assert.equal(unpackPreviewContext(plain),context);
});

test('sharing distinguishes signed zero and preserves exact scalar values',()=>{
 const input=repeatedContext();input.framework.workbenchMaterials[0].number=-0;input.draft.investigation.materials[0].number=0;
 assert.equal(packPreviewContext(input).context,input);
 input.draft.investigation.materials[0].number=-0;input.draft.investigation.materials[0].nan=NaN;input.framework.workbenchMaterials[0].nan=NaN;
 const result=unpackPreviewContext(structuredClone(packPreviewContext(input)));
 assert.deepEqual(result,input);assert(Object.is(result.framework.workbenchMaterials[0].number,-0));
 assert.throws(()=>unpackPreviewContext({context:repeatedContext(),sharedMaterials:true}),/Ongeldige onderzoekscontext/);
});

test('transport sharing retains arbitrary own field names and rechecks later edits',()=>{
 const input=repeatedContext();
 for(const material of [input.framework.workbenchMaterials[0],input.draft.investigation.materials[0]])
  for(const key of ['0','__proto__','constructor','toString','laterEvidence'])
   Object.defineProperty(material,key,{value:'Exact '+key+' 🧭',enumerable:true,writable:true});
 assert.equal(packPreviewContext(input).sharedMaterials,true);
 assert.deepEqual(unpackPreviewContext(structuredClone(packPreviewContext(input))),input);
 input.draft.investigation.materials[0].laterEvidence='Revised evidence';
 assert.equal(packPreviewContext(input).context,input);
 assert.equal(packPreviewContext(input).sharedMaterials,undefined);
});

test('preview jobs share only equal snapshots, send changed text and keep fallback independent',async()=>{
 const h=harness(),input={...repeatedContext(),config:{fontSize:10}};h.client.request(input);h.run();
 assert.equal(h.sent[0].sharedMaterials,true);assert.deepEqual(unpackPreviewContext(h.sent[0]),{framework:input.framework,draft:input.draft,models:input.models});
 h.worker.onmessage({data:{id:1,result:result('first')}});
 h.client.request({...input,framework:{...input.framework,workbenchMaterials:[{id:'changed'}]}});h.run();
 assert.equal(h.sent[1].sharedMaterials,undefined);assert.deepEqual(h.sent[1].context.framework.workbenchMaterials,[{id:'changed'}]);
 const fails=harness({fallback:request=>{assert.equal(request,input);assert.notEqual(request.framework.workbenchMaterials,request.draft.investigation.materials);return result('fallback');}});
 fails.client.request(input);fails.run();fails.worker.onerror();await tick();assert.equal(fails.counts().calls,1);
 assert.equal(fails.changes.at(-1).result.preview.title,'fallback');
});
