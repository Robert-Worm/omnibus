import test from 'node:test';
import assert from 'node:assert/strict';
import {searchSchema, itemSchema, prepareSchema, draftSpecSchema, artifactSchema} from './schemas.mjs';
import {fixture} from './test-fixture.mjs';
import {SLECHTE_VRAGEN} from '../lib/question-quality-fixtures.mjs';
import {questionCandidate, voorcontrole} from '../lib/question-quality.mjs';

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

await test('new AI research and interview questions reuse the shared candidate rules and explain rejection', () => {
  const spec = {...fixture(['synthetic|point']), consent: true};
  const cases = [...SLECHTE_VRAGEN,
    ['onderzoeksvraag', 'Hoe verloopt de overdracht', ['geen-vraagteken']],
    ['onderzoeksvraag', 'Hoe verloopt de overdracht en wie beslist?', ['samengesteld']],
    ['interview', 'Hoe gebruikt u hulpmiddelen, zoals een checklist?', ['voorbeeldantwoord']],
  ];
  for (const [kind, text, rules] of cases) {
    // Follow-up examples exercise the interview input, not a research question.
    const field = ['interview', 'doorvraag'].includes(kind) ? 'interviewQuestions' : 'questions';
    const input = structuredClone(spec);
    if (field === 'interviewQuestions') input[field] = [{selection: 'synthetic|point', level: 'operational', text}];
    else input.questions[1].text = text; // A child must pass the same gate as a central question.
    const before = structuredClone(input), result = prepareSchema.safeParse(input);
    assert.equal(questionCandidate(text, field === 'questions' ? 'onderzoeksvraag' : 'interview'), '');
    assert.equal(result.success, false, text);
    const issues = result.error.issues.filter(issue => issue.path.join('.') === `${field}.${field === 'questions' ? 1 : 0}.text`);
    assert(issues.length, 'The rejected question has an exact field path');
    if (text) {
      for (const rule of rules) assert(issues.some(issue => issue.message.includes(rule)), rule);
      const check = voorcontrole(text, field === 'questions' ? 'onderzoeksvraag' : 'interview');
      assert(issues.some(issue => issue.message.includes(check.uitkomst)));
    }
    assert.deepEqual(input, before, 'No automatic rewriting or removal');
  }
});

await test('passing proposals keep texts, keys and links; only their form has been checked', () => {
  const spec = {...fixture(['synthetic|point']), consent: true,
    interviewQuestions: ['operational', 'management', 'strategic'].map(level => ({
      selection: 'synthetic|point', level, text: 'Kunt u beschrijven hoe de overdracht verloopt?',
    }))};
  const before = structuredClone(spec), parsed = prepareSchema.parse(spec);
  assert.deepEqual(parsed.questions, spec.questions);
  assert.deepEqual(parsed.interviewQuestions, spec.interviewQuestions);
  assert.deepEqual(spec, before);
  // The existing research rule allows a closed question; do not silently replace
  // it with the stricter interview rule or infer substantive approval.
  spec.questions[0].text = 'Is de overdracht vastgelegd?';
  assert(prepareSchema.safeParse(spec).success);
  spec.interviewQuestions[2].text = spec.questions[0].text;
  assert(!prepareSchema.safeParse(spec).success);
});

await test('saved questions remain readable even when a new proposal with the same wording is refused', () => {
  const spec = fixture(['synthetic|point']);
  spec.questions[0].text = 'Mijn eigen onderzoekstekst zonder vraagteken';
  spec.interviewQuestions = [{selection: 'synthetic|point', level: 'management', text: 'Hoe goed werkt dit?'}];
  const before = structuredClone(spec), saved = draftSpecSchema.parse(spec);
  assert.deepEqual(saved.questions, spec.questions);
  assert.deepEqual(saved.interviewQuestions, spec.interviewQuestions);
  assert(!prepareSchema.safeParse({...spec, consent: true}).success);
  assert.deepEqual(spec, before);
});
