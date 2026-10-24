import test from 'node:test';
import assert from 'node:assert/strict';
import {searchSchema, itemSchema, prepareSchema, draftSpecSchema, artifactSchema} from './schemas.mjs';
import {fixture} from './test-fixture.mjs';

await test('writes require an explicit acknowledgement; saved pre-consent concepts remain readable', () => {
  const spec = fixture(['synthetic|point']);
  assert(draftSpecSchema.safeParse(spec).success);
  for (const consent of [undefined, false, 'true', 1, null]) {
    assert(!prepareSchema.safeParse({...spec, consent}).success);
    assert(!artifactSchema.safeParse({draftId: '11111111-1111-4111-8111-111111111111', consent}).success);
  }
  assert(prepareSchema.safeParse({...spec, consent: true}).success);
  assert(artifactSchema.safeParse({draftId: '11111111-1111-4111-8111-111111111111', consent: true}).success);
});

await test('field and collection bounds reject malformed, oversized and unknown inputs', () => {
  for (const input of [{query: 'x'.repeat(501)}, {sourceId: 'x'.repeat(201)}, {limit: 41},
    {offset: -1}, {offset: 100001}, {kind: 'sql'}, {query: '', path: '../private'}])
    assert(!searchSchema.safeParse(input).success);
  for (const input of [{key: ''}, {key: 'x'.repeat(301)}, {key: 'a', limit: 12001},
    {key: 'a', offset: 1000001}, {key: 'a', section: 'file'}])
    assert(!itemSchema.safeParse(input).success);
  for (const draftId of ['../private', 'not-a-uuid', '', '1'.repeat(1000)])
    assert(!artifactSchema.safeParse({draftId, consent: true}).success);
  const spec = {...fixture(['synthetic|point']), consent: true};
  const many = n => Array.from({length: n}, (_, i) => ({key: `synthetic|${i}`, reason: 'Fictieve test'}));
  assert(prepareSchema.safeParse({...spec, selections: many(250)}).success);
  for (const change of [{selections: many(251)}, {questions: Array(201).fill(spec.questions[0])},
    {title: 'x'.repeat(501)}, {selections: [spec.selections[0], spec.selections[0]]},
    {export: {...spec.export, profile: 'interview', interview: {levels: []}}},
    {outputPath: '../existing-project.json'}])
    assert(!prepareSchema.safeParse({...spec, ...change}).success);
});

await test('patched validation retains nested defaults and strict optional export settings', () => {
  const spec=fixture(['synthetic|point']);
  spec.export={profile:'testing'};
  const parsed=draftSpecSchema.parse(spec);
  assert.deepEqual(parsed.export,{
    profile:'testing',testingAspects:['opzet','bestaan'],testingTerminology:'obw',
    fontFamily:'Arial',fontSize:11,accent:'blue',colorMode:'sections',notes:true,
    meta:{version:'0.1',author:'',team:'',scope:'',change:'AI-concept — nog te beoordelen'},
    interview:{levels:[],starr:false,triangulation:false},
  });
  assert.deepEqual(prepareSchema.parse({...spec,consent:true}),{...parsed,consent:true});
  assert.deepEqual(spec.export,{profile:'testing'},'Parsing must not alter saved inputs');
  for(const extra of [{meta:{outputPath:'outside'}},{interview:{approve:true}}])
    assert.equal(draftSpecSchema.safeParse({...spec,export:{...spec.export,...extra}}).success,false);
  assert.equal(draftSpecSchema.safeParse({...spec,export:{profile:'interview'}}).success,false,'An audience remains required');
  assert.equal(prepareSchema.safeParse({...spec,consent:true,selections:Array(251).fill({})}).success,false);
});
