import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelChoicePresentation, createQuestionWorkbenchPresentation, modelAttribution} from './model-presentation.mjs';

const model = {id:'synthetic', title:'Model', officialName:'Official model', author:'Author',
  usage:'Usage', limitation:'Boundary', kind:'kaptein',
  items:[{title:'Dimension', indicators:[{title:'Indicator'}]}]};

test('reviewed choice guidance takes priority without changing input or selection data', () => {
  const data = {guides:{synthetic:{use:'Reviewed use', concepts:'Concepts', boundary:'Reviewed boundary'}}, summaries:{synthetic:'Summary'}};
  const original = structuredClone(data), input = {...model, selected:true, questions:['Own question']};
  const before = structuredClone(input), api = createModelChoicePresentation(data);
  assert.deepEqual(api.modelChoiceGuide(input), {...data.guides.synthetic, summary:'Summary'});
  assert.deepEqual(data, original);
  assert.deepEqual(input, before);
  for (const term of ['official model','dimension','indicator','summary','reviewed use','kaptein'])
    assert(api.modelChoiceSearchText(input).includes(term), term);
});

test('choice fallbacks and attribution retain existing display wording', () => {
  const api = createModelChoicePresentation({guides:{}, summaries:{}});
  assert.deepEqual(api.modelChoiceGuide(model), {use:'Usage', concepts:'Dimension', boundary:'Boundary', summary:'Usage'});
  assert.deepEqual(api.modelChoiceGuide({id:'new',title:'New'}), {
    use:'Bekijk de bron en bepaal of dit model bij je vraagstuk past.', concepts:'', boundary:'',
    summary:'Bekijk de bron en bepaal of dit model bij je vraagstuk past.',
  });
  assert.equal(modelAttribution({author:' Author; eigen uitwerking',source:'Other'}), 'Author');
  assert.equal(modelAttribution({source:'Source'}), 'Source');
  assert.equal(modelAttribution({}), 'Bronvermelding niet beschikbaar');
});

test('question workbench membership, titles and fallback are preserved', () => {
  const p = {structure:'Structure', placeholder:'Placeholder', hint:'Hint'};
  const data = {ids:['synthetic','CEV-AI'], presentations:{synthetic:p,'CEV-AI':p}};
  const before = structuredClone(data), api = createQuestionWorkbenchPresentation(data);
  assert.equal(api.usesQuestionWorkbench(model), true);
  for (const input of [null,undefined,{id:'absent'}]) assert.equal(api.usesQuestionWorkbench(input), false);
  assert.deepEqual(api.questionWorkbenchPresentation(model), {title:'Model',...p});
  assert.equal(api.questionWorkbenchPresentation({...model,id:'CEV-AI'}).title, 'Official model');
  assert.deepEqual(api.questionWorkbenchPresentation({...model,id:'other'}), {
    title:'Official model',structure:'Author · 1 onderdelen',placeholder:'Bijvoorbeeld: het vastleggen van besluiten',hint:'',
  });
  assert.deepEqual(data,before);
});

test('invalid presentation data is rejected with no source payload in the error', () => {
  for (const data of [null,[],{}, {guides:[],summaries:{}},
    {guides:{x:{use:'private value',concepts:3,boundary:''}},summaries:{}},
    {guides:{},summaries:{x:4}}])
    assert.throws(() => createModelChoicePresentation(data), {message:'Invalid model choice presentation data.'});
  for (const data of [null,{}, {ids:[1],presentations:{}}, {ids:[],presentations:[]},
    {ids:[],presentations:{x:{structure:'private value',placeholder:'',hint:null}}},
    {ids:[],presentations:{x:{structure:'',placeholder:'',hint:'',title:3}}}])
    assert.throws(() => createQuestionWorkbenchPresentation(data), {message:'Invalid model workbench presentation data.'});
});

test('object prototype names are not mistaken for catalogue entries', () => {
  const choice = createModelChoicePresentation({guides:{},summaries:{}});
  const workbench = createQuestionWorkbenchPresentation({ids:[],presentations:{}});
  for (const id of ['constructor','toString','__proto__']) {
    assert.equal(choice.modelChoiceGuide({...model,id}).summary,'Usage');
    assert.equal(workbench.questionWorkbenchPresentation({...model,id}).title,'Official model');
  }
});
