import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {serializeProject,parseProjectText,expandProject} from './project-codec.mjs';
test('alle projecten worden gecomprimeerd; oude JSON en WWKE blijven verliesvrij leesbaar',()=>{
 const old={format:'rijksmap-project',version:1,draft:{title:'één',investigation:{materials:[{cioTrace:'oude bron'}]}}};
 assert.equal(JSON.parse(serializeProject(old)).format,'rijksmap-project-compressed');
 assert.deepEqual(parseProjectText(JSON.stringify(old)),old);
 assert.deepEqual(parseProjectText(serializeProject(old)),old);
 const rich=structuredClone(old);rich.draft.investigation.materials.push({lawTrace:JSON.stringify({text:'Brontekst 🧭 '+ 'gelijke context '.repeat(10000)})});
 const compact=serializeProject(rich);assert(compact.length<JSON.stringify(rich).length/10);assert.deepEqual(parseProjectText(compact),rich);
 assert.deepEqual(parseProjectText(serializeProject(rich,true)),rich);
 const envelope=JSON.parse(compact);assert.throws(()=>expandProject({...envelope,expandedBytes:64000001}));assert.throws(()=>expandProject({...envelope,expandedBytes:10}));assert.throws(()=>expandProject({...envelope,data:envelope.data.slice(0,-8)}));assert.throws(()=>expandProject({...envelope,encoding:'other'}));
});
test('lege, model-, rapport- en CIO-projecten bewaren alle velden zonder wijziging',()=>{
 for(const materials of [[],[{cioTrace:'Bron 🧭 '.repeat(1000)}],[{reportTrace:'Letterlijke passage',notes:'Eigen notitie'}]]){
  const project={format:'rijksmap-project',version:1,draft:{investigation:{materials},research:{questions:[{id:'q',text:'Waarom?'}],links:[{questionId:'q',materialId:'x'}]}},modelLibrary:{models:[{selected:true,title:'Eigen model'}]},view:{page:'framework'}};
  const before=JSON.stringify(project);
  for(const pretty of [false,true])assert.deepEqual(parseProjectText(serializeProject(project,pretty)),project);
  assert.equal(JSON.stringify(project),before);
 }
});

test('blocked checksum accepts independently encoded projects at block boundaries and rejects damaged trailers',()=>{
 const base={format:'rijksmap-project',version:1,text:'Bron 🧭 é界\n\\'},baseBytes=Buffer.byteLength(JSON.stringify(base));
 for(const size of [baseBytes,5551,5552,5553,11103,11104,11105,1000000]){
  const project={...base,text:base.text+'x'.repeat(size-baseBytes)},source=Buffer.from(JSON.stringify(project));
  assert.equal(source.length,size);
  // Native zlib provides an independent encoder/checksum implementation.
  const encoded=deflateSync(source),envelope={format:'rijksmap-project-compressed',version:1,encoding:'zlib-base64',expandedBytes:size,data:encoded.toString('base64')};
  assert.deepEqual(expandProject(envelope),project);
  assert.deepEqual(expandProject({...envelope,data:'\n'+envelope.data+'\n'}),project);
  for(let i=1;i<=4;i++){
   const damaged=Buffer.from(encoded);damaged[damaged.length-i]^=1;
   assert.throws(()=>expandProject({...envelope,data:damaged.toString('base64')}),/beschadigd of onvolledig/);
   assert.throws(()=>expandProject({...envelope,data:encoded.subarray(0,-i).toString('base64')}),/beschadigd of onvolledig/);
  }
  assert.throws(()=>expandProject({...envelope,expandedBytes:size-1}),/beschadigd of onvolledig/);
  assert.throws(()=>expandProject({...envelope,expandedBytes:size+1}),/beschadigd of onvolledig/);
 }
});
