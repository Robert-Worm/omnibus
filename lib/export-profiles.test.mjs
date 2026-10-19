import test from 'node:test';
import assert from 'node:assert/strict';
import {exportPresets,presetOptions} from './export-profiles.mjs';

test('the three existing workforms retain required fields, titles and ordering',()=>{
  assert.deepEqual(exportPresets.map(p=>[p.id,p.required,p.sheet]),[
    ['testing','criterion','Toetskader'],['risk','risk','Risico-controlmatrix'],['interview','interview','Interviewleidraad'],
  ]);
  for(const preset of exportPresets){
    const result=presetOptions(preset.id);
    assert.equal(result.fields,preset.fields);
    assert.deepEqual(result.fieldOrder,preset.fields);
    assert.equal(result.requiredField,preset.required);
    assert.equal(result.registerTitle,preset.sheet);
  }
});
test('chosen fields retain order and identity without losing required export fields',()=>{
  const before=structuredClone(exportPresets);
  const fields=['comments','custom','comments'];
  const options={fields,profile:'ignored',requiredField:'ignored',registerTitle:'ignored',fieldOrder:['ignored'],meta:{author:'Synthetic'}};
  const result=presetOptions('risk',options);
  assert.equal(result.fields,fields);
  assert.equal(result.meta,options.meta);
  assert.equal(result.profile,'risk');
  assert.equal(result.requiredField,'risk');
  assert.equal(result.registerTitle,'Risico-controlmatrix');
  assert.deepEqual(result.fieldOrder,[...exportPresets[1].fields,'comments','custom']);
  assert.deepEqual(exportPresets,before);
  assert.deepEqual(fields,['comments','custom','comments']);
  assert.equal(options.profile,'ignored');
});
test('empty and absent field choices retain existing semantics; unsupported profiles fail',()=>{
  assert.equal(presetOptions().profile,'testing');
  assert.equal(presetOptions('interview',{fields:null}).fields,exportPresets[2].fields);
  assert.deepEqual(presetOptions('testing',{fields:[]}).fields,[]);
  assert.deepEqual(presetOptions('testing',{fields:[]}).fieldOrder,exportPresets[0].fields);
  for(const id of ['','unknown','Testing'])assert.throws(()=>presetOptions(id),/ondersteund exporttype/);
});
