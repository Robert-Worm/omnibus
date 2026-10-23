import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectEncoder} from './project-encoder.ts';
import {packProjectSave,unpackProjectSave} from '../lib/project-save-transfer.mjs';
import {serializeProject,parseProjectText} from '../lib/project-codec.mjs';

const fixture=()=>({format:'rijksmap-project',version:1,view:{page:'topics'},draft:{included:['n1'],
 investigation:{materials:[{id:'n1',sourceContext:'Exacte bron 🧭',lawTrace:'{"passages":["bron"]}'},
  {id:'n2',cioTrace:'{"quote":"exact"}',sourceContext:'Herkomst'}]},
 research:{questions:[{id:'q1',text:'Hoe?'}],links:[{line_id:'n1',question_id:'q1'}]},notes:{n1:'Eigen tekst'}}});
function harness({blocked=false}={}){
 const sent=[];let terminated=0,fallbacks=0,previous=[];
 const worker={postMessage:message=>sent.push(structuredClone(message)),terminate:()=>terminated++};
 const encoder=createProjectEncoder({createWorker:()=>{if(blocked)throw Error('Unavailable');return worker;},
  fallback:project=>{fallbacks++;return serializeProject(project);}});
 const reply=()=>{
  const message=sent.at(-1),project=unpackProjectSave(message,previous),text=serializeProject(project);
  previous=project.draft?.investigation?.materials??[];worker.onmessage({data:{id:message.id,text}});
 };
 return {encoder,worker,sent,reply,counts:()=>({terminated,fallbacks})};
}

test('navigation transfers unchanged evidence once while writing complete identical project bytes',async()=>{
 const h=harness(),project=fixture(),first=h.encoder.encode(project);h.reply();
 assert.equal(await first,serializeProject(project));assert.equal(h.sent[0].materialReferences,undefined);
 const next={...project,view:{page:'framework'},draft:{...project.draft,notes:{n1:'Nieuwe eigen tekst'}}};
 const second=h.encoder.encode(next);
 assert.deepEqual(h.sent[1].materialReferences,[0,1]);assert.deepEqual(h.sent[1].project.draft.investigation.materials,[null,null]);
 h.reply();assert.equal(await second,serializeProject(next));assert.deepEqual(parseProjectText(await second),next);
 assert.equal(h.worker.onmessage,null);assert.equal(h.worker.onerror,null);
 assert.equal(project.draft.notes.n1,'Eigen tekst');assert.equal(project.draft.investigation.materials[0].sourceContext,'Exacte bron 🧭');
});

test('scalar values and complete shape are checked even after in-place changes, deletion or reordering',()=>{
 const project=fixture(),first=packProjectSave(project),previous=structuredClone(project.draft.investigation.materials);
 for(const edit of [p=>p.draft.investigation.materials[0].sourceContext='Changed',
  p=>delete p.draft.investigation.materials[0].sourceContext,
  p=>p.draft.investigation.materials[0].futureField='New',
  p=>p.draft.investigation.materials.reverse(),
  p=>p.draft.investigation.materials.splice(0,1),
  p=>p.draft.investigation.materials.push({id:'n3',sourceContext:'New source'}),
  p=>p.draft.investigation.materials[0].nested={text:'Nested field'}]){
  const changed=structuredClone(project);edit(changed);const packed=packProjectSave(changed,first.snapshots);
  assert.deepEqual(unpackProjectSave(structuredClone(packed.message),previous),changed);
 }
 project.draft.investigation.materials[0].sourceContext='In-place edit';
 assert.equal(packProjectSave(project,first.snapshots).message.project.draft.investigation.materials[0].sourceContext,'In-place edit');
 for(const unusual of [Object.defineProperty({id:'x'},'value',{enumerable:true,get(){return 'Getter';}}),{id:'x',[Symbol('private')]:true},{id:'x',nested:{a:1}}]){
  const p={draft:{investigation:{materials:[unusual]}}},packed=packProjectSave(p);
  assert.equal(packed.snapshots[0],null);assert.equal(packProjectSave(p,packed.snapshots).message.materialReferences,undefined);
 }
 const sparseRows=Array(2);sparseRows[1]=project.draft.investigation.materials[0];
 const sparse={draft:{investigation:{materials:sparseRows}}};
 assert.equal(packProjectSave(sparse).message.project,sparse);
});

test('missing, repeated, conflicting or reordered references cannot silently replace source data',()=>{
 const project=fixture(),packed=packProjectSave(project,packProjectSave(project).snapshots);
 assert.throws(()=>unpackProjectSave(packed.message),/bron/);
 for(const refs of [[1,0],[0,0],[-1],[2],[0.5],['0']])assert.throws(()=>unpackProjectSave({...packed.message,materialReferences:refs},project.draft.investigation.materials),/bron/);
 assert.throws(()=>unpackProjectSave({project,materialReferences:[0]},project.draft.investigation.materials),/bron/);
 assert.equal(unpackProjectSave({project}),project);
 const restored=unpackProjectSave(packed.message,project.draft.investigation.materials);
 restored.draft.investigation.materials[0].sourceContext='Worker edit';
 assert.equal(project.draft.investigation.materials[0].sourceContext,'Exacte bron 🧭');
});

test('worker replies are bound to their job; rejected encoding resends complete evidence',async()=>{
 const h=harness(),project=fixture(),first=h.encoder.encode(project),oldReply=h.worker.onmessage;
 await assert.rejects(h.encoder.encode(project),/al een project/);
 h.reply();await first;
 const next=h.encoder.encode({...project,view:{page:'export'}});
 oldReply({data:{id:h.sent[0].id,text:'stale'}});
 h.worker.onmessage({data:{id:h.sent[1].id,error:'Project te groot'}});
 await assert.rejects(next,/te groot/);assert.equal(h.counts().fallbacks,0);
 const retry=h.encoder.encode(project);assert.equal(h.sent[2].materialReferences,undefined);h.reply();
 assert.deepEqual(parseProjectText(await retry),project);
});

test('worker failure preserves the full current project and ignores late events; disposal rejects work',async()=>{
 const h=harness(),project=fixture(),first=h.encoder.encode(project);h.reply();await first;
 const changed={...project,view:{page:'export'}},next=h.encoder.encode(changed);
 const late=h.worker.onmessage,failed=h.worker.onerror;
 failed();failed();late({data:{id:h.sent[1].id,text:'stale'}});
 assert.equal(await next,serializeProject(changed));assert.equal(h.counts().fallbacks,1);
 assert.equal(await h.encoder.encode(project),serializeProject(project));assert.equal(h.counts().fallbacks,2);
 const blocked=harness({blocked:true});assert.equal(await blocked.encoder.encode(project),serializeProject(project));
 const invalid=fixture();invalid.draft.investigation.materials[0].lawTrace='invalid';
 await assert.rejects(blocked.encoder.encode(invalid),/JSON/);
 const disposed=harness(),pending=disposed.encoder.encode(project);disposed.encoder.dispose();
 await assert.rejects(pending,/afgesloten/);await assert.rejects(disposed.encoder.encode(project),/afgesloten/);
});
