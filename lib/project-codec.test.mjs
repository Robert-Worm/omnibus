import {test} from 'node:test';
import assert from 'node:assert/strict';
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
