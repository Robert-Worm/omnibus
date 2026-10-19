import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertJsonData,instrumentAuthorModule,modelWorkbenchIds,extractRuntimeModules,verifyAuthoringInputs} from './runtime-author-data.mjs';
import {digest} from './identity.mjs';

await test('author inputs must match the exact content release, even when a different commit is clean',t=>{
  const dir=mkdtempSync(join(tmpdir(),'omnibus-author-inventory-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(join(dir,'lib'));
  const id='lib/synthetic.json',text='{"title":"Synthetisch — géén bron"}';
  writeFileSync(join(dir,id),text);
  const inventory=[{path:id,bytes:Buffer.byteLength(text),sha256:digest(text)}];
  verifyAuthoringInputs(dir,inventory,[id]);
  assert.throws(()=>verifyAuthoringInputs(dir,[],[id]),/policy drift/);
  assert.throws(()=>verifyAuthoringInputs(dir,[...inventory,...inventory],[id]),/policy drift/);
  assert.throws(()=>verifyAuthoringInputs(dir,inventory,['lib/../../secret.json']),/identity/);
  writeFileSync(join(dir,id),text+' ');
  assert.throws(()=>verifyAuthoringInputs(dir,inventory,[id]),/differs from the pinned release/);
});

await test('only lossless plain JSON data may cross the publication boundary',()=>{
  assertJsonData({text:'Synthetic norm',source:{offset:5},items:[null,false,1],optional:{}});
  const cyclic={}; cyclic.self=cyclic;
  const sparse=[]; sparse.length=2;
  for (const value of [undefined,()=>{},Symbol('x'),1n,NaN,Infinity,new Date(),new Map(),cyclic,
      {missing:undefined},[undefined],sparse,{get source(){return 'hidden';}},{[Symbol('hidden')]:'x'}])
    assert.throws(()=>assertJsonData(value),/Non-/);
});

await test('seed fields stay seeds, finalized fields include subsequent additions, relative imports remain anchored',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'omnibus-author-fields-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  writeFileSync(join(dir,'dependency.mjs'),'export const word="synthetic";');
  const source='import {word} from "./dependency.mjs"; const seed=[word]; seed.push("later"); const final={first:word}; final.second="later";';
  const code=instrumentAuthorModule('lib/synthetic.mjs',source,join(dir,'source.mjs'),['seed'],['final']);
  const file=join(dir,'evaluated.mjs'); writeFileSync(file,code);
  const result=(await import(pathToFileURL(file).href)).__omnibusRuntimeFields;
  assert.deepEqual(result,{seed:['synthetic'],final:{first:'synthetic',second:'later'}});
  assert.throws(()=>instrumentAuthorModule('lib/example.mjs',source,join(dir,'source.mjs'),['missing']),/policy drift/);
  assert.throws(()=>instrumentAuthorModule('lib/example.mjs','const a=1;function f(){const a=2;}',join(dir,'source.mjs'),['a']),/policy drift/);
});

await test('inline content is selected by syntax, with no content literal in the policy',async()=>{
  const code=instrumentAuthorModule('lib/research-flow.mjs','export function centralSuggestion(){return "Synthetic question";}','/private/flow.mjs',[]);
  assert.equal((await import('data:text/javascript,'+encodeURIComponent(code))).__omnibusRuntimeFields.centralSuggestion,'Synthetic question');
  const questions=instrumentAuthorModule('lib/question-formulations.mjs','function invitations(x){return x;}function question(){return invitations("Synthetic prompt");}','/private/questions.mjs',[]);
  assert.equal((await import('data:text/javascript,'+encodeURIComponent(questions))).__omnibusRuntimeFields.strategicExperience,'Synthetic prompt');
  assert.throws(()=>instrumentAuthorModule('lib/research-flow.mjs','function centralSuggestion(){return compute();}','/private/a.mjs',[]),/policy drift/);
  assert.throws(()=>instrumentAuthorModule('lib/question-formulations.mjs','invitations("one");invitations("two");','/private/a.mjs',[]),/policy drift/);
});

await test('model identities come from the explicit reviewed workbench allowlist',()=>{
  assert.deepEqual(modelWorkbenchIds('function usesQuestionWorkbench(model){return ["ONE","TWO"].includes(model.id);}'),['ONE','TWO']);
  for (const source of ['function usesQuestionWorkbench(){return [];}','function usesQuestionWorkbench(){return ["ONE","ONE"];}','function usesQuestionWorkbench(){return [dynamic];}'])
    assert.throws(()=>modelWorkbenchIds(source),/policy drift/);
});

await test('unexpected projected modules fail before evaluating any source code',async()=>{
  await assert.rejects(extractRuntimeModules({sourceRoot:'/trusted',temporary:'/unused',
    snapshot:{files:[['/trusted/lib/unreviewed.mjs',{}]],special:[]}}),/Unknown projected module/);
});
