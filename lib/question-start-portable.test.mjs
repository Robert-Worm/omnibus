import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';

// Exercise the real start/selection orchestration with independent source
// boundaries. No private data or browser globals are needed.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/question-start.mjs'))return next(specifier,context);
  let source;
  if(specifier==='./research-proposals.mjs')source=
   'function adopt(d,id,mode,...args){const f=globalThis.startFixture;f.adoptions++;if(d.invalid)throw Error("Invalid current evidence");const o=args.at(-1),questionId=o.targetId||"preview";f.options=o;return {draft:{...d,research:{...d.research,questions:[{id:questionId,parent_id:null,text:o.text}]}},questionId};}'+
   'function plan(){const f=globalThis.startFixture;f.planReads++;return f.noPlan?null:{subquestions:f.coverage};}'+
   'export const adoptModelQuestionPlan=adopt,adoptSourceQuestionPlan=adopt,adoptProcessQuestionPlan=adopt,modelQuestionPlan=plan,sourceQuestionPlan=plan,processQuestionPlan=plan;'+
   'export const centralProposals=()=>[];export function subProposals(){const f=globalThis.startFixture;f.subReads++;if(f.forbidSubs)throw Error("Unused subquestion menu");return f.subs;}';
  if(specifier==='./research-plan.mjs')source=
   'export const researchOf=d=>d.research;export function addQuestion(d,parent_id,text){const question={id:"preview",parent_id,text};return {draft:{...d,research:{...d.research,questions:[...d.research.questions,question]}},question};}'+
   'export const editQuestion=(d,id,text)=>({...d,research:{...d.research,questions:d.research.questions.map(q=>q.id===id?{...q,text}:q)}});export const setQuestionDesign=d=>d;';
  if(specifier==='./question-writing.mjs')source='export const mappedQuestionSuggestions=s=>s;';
  if(specifier==='./investigation.mjs')source='export const materialQuestionText=m=>m.question;';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {questionStartChoice,questionStartSelection,questionStartPreview,rankedQuestionStarts}=await import('./question-start.mjs');
const draft=()=>({included:['one','two'],investigation:{goal:{direction:'diagnostic'}},research:{questions:[],links:[]}});
const setup=()=>globalThis.startFixture={adoptions:0,planReads:0,subReads:0,subs:[{key:'sub',text:'Detail?',ids:['one']}],coverage:[{ids:['one','two','outside','one']}]};

await test('individual report questions need substantive approval and form checks; explicit own and prepared mixed text stay available',()=>{
 for(const text of [...SLECHTE_VRAGEN.map(([,text])=>text),'De taakverdeling','Hoe '+ 'eigen '.repeat(35)+'tekst?','Hoe '+ 'eigen '.repeat(45)+'tekst?']){
  setup();const input=draft(),before=structuredClone(input);
  const line={id:'one',report_id:'SYNTHETIC',title:'Synthetic report point',auditQuestion:{text}};
  const context={framework:{lines:[line]}};
  assert.equal(rankedQuestionStarts(input,context).length,0,'Grammar alone cannot approve a current source question');
  line.questionReview=questionReviewFixture({itemId:'one',questions:[{id:'auditQuestion',kind:'toetsvraag',text}]});
  const expected=questionCandidate(text,'toetsvraag')&&questionCandidate(text,'onderzoeksvraag')?1:0;
  assert.equal(rankedQuestionStarts(input,context).length,expected,text);
  assert.equal(rankedQuestionStarts(input,{},[{key:'item:one',text,ids:['one']}]).length,text.trim()?1:0,text);
  assert.deepEqual(input,before);
  if(text.trim()){
   const own={...input,overrides:{one:{auditQuestion:text}}};
   assert.equal(rankedQuestionStarts(own,context)[0].proposal.text,text);
   const saved={framework:{lines:[{...context.framework.lines[0],source_id:'one'}]}};
   const proposal=rankedQuestionStarts(input,saved)[0].proposal;
   assert.equal(proposal.text,text);
   assert.equal(questionStartPreview(input,proposal,saved).draft.research.questions[0].text,text);
  }
 }
});

await test('individual source starts require exact retained review when a capsule exists and retain explicit own choices',()=>{
 const text='Hoe wordt een melding afgehandeld?';
 for(const decision of ['behouden','HOLD','herschrijven','schrappen',null]) {
  setup();const input=draft(),line={id:'one',report_id:'SYNTHETIC',title:'Synthetic report point',auditQuestion:{text}};
  line.questionReview=questionReviewFixture({itemId:'one',questions:[{id:'auditQuestion',kind:'toetsvraag',text}],decisions:{auditQuestion:decision}});
  const context={framework:{lines:[line]}},before=structuredClone({input,context});
  assert.equal(rankedQuestionStarts(input,context).length,decision==='behouden'?1:0);
  for(const own of [text,'Eigen sturende tekst zonder vraagteken']) {
   const saved={...input,overrides:{one:{auditQuestion:own}}};
   const choice=rankedQuestionStarts(saved,context)[0].proposal;
   assert.equal(choice.text,own);assert.equal(questionStartPreview(saved,choice,context).draft.research.questions[0].text,own);
  }
  assert.equal(rankedQuestionStarts({...input,overrides:{one:{auditQuestion:''}}},context).length,0);
  assert.deepEqual({input,context},before);
  line.auditQuestion.text+=' ';
  assert.equal(rankedQuestionStarts(input,context).length,0,'Changed source text needs its own review');
  line.auditQuestion.text='';
  assert.equal(rankedQuestionStarts({...input,overrides:{one:{auditQuestion:'Mijn eigen vraag?'}}},context)[0].proposal.text,'Mijn eigen vraag?',
   'Removing a source question must not hide an explicit own question');
 }
});

await test('ranking saved questions indexes current materials once and sees subsequent edits',()=>{
 setup();let reads=0;
 const materials=Array.from({length:1000},(_,i)=>({get id(){reads++;return 'WB-'+i;},question:'Eigen vraag '+i+'?'}));
 const input={...draft(),included:materials.map(m=>m.id),investigation:{materials}};
 const context={framework:{lines:input.included.map(id=>({id,source_id:'synthetic',title:id,auditQuestion:{text:'Bronvraag?'}}))}};
 reads=0;
 const results=rankedQuestionStarts(input,context,[]);
 assert.equal(results.length,1000);
 assert.ok(reads<5000,'Ranking must not rescan all material IDs per row: '+reads);
 materials[999]={id:'WB-999',question:'Bijgewerkte eigen vraag?'};
 assert.equal(rankedQuestionStarts(input,context,[]).find(r=>r.proposal.key==='item:WB-999').proposal.text,'Bijgewerkte eigen vraag?');
});

await test('opening source, model and process choices retains validation without an unused coverage scan',()=>{
 for(const proposal of [{key:'source:F'},{key:'model:M',modelId:'M'},{key:'process:P'}]){
  const calls=setup(),input=draft(),before=structuredClone(input),choice={...proposal,text:'Question?',topic:'Topic'};
  const context={targetId:'saved-root',subquestionDetail:'broad'};
  const selection=questionStartSelection(input,choice,context);
  assert.equal(calls.adoptions,1);assert.equal(calls.planReads,0);
  assert.equal(selection.questionId,'saved-root');assert.deepEqual(selection.defaultKeys,[]);assert.deepEqual(selection.directIds,[]);
  assert.equal(calls.options.subquestionDetail,'broad');assert.deepEqual(calls.options.design,{direction:'diagnostic',topic:'Topic'});
  assert.equal(Object.hasOwn(selection,'matchedIds'),false);
  const {matchedIds,...preview}=questionStartPreview(input,choice,context);
  assert.deepEqual(preview,selection);assert.deepEqual(matchedIds,['one','two']);assert.equal(calls.planReads,1);
  assert.deepEqual(input,before);
  assert.throws(()=>questionStartSelection({...input,invalid:true},choice,context),/Invalid current evidence/);
 }
});

await test('individual and theme choices retain direct selected IDs only when no subquestions apply',()=>{
 const calls=setup(),input=draft(),item={key:'item:one',text:'Item?',ids:['one','outside']};
 assert.deepEqual(questionStartSelection(input,item).directIds,['one']);
 const theme={...item,key:'theme:T'};
 assert.deepEqual(questionStartSelection(input,theme).directIds,[]);
 calls.subs=[];assert.deepEqual(questionStartSelection(input,theme).directIds,['one']);
 assert.deepEqual(questionStartPreview(input,theme).matchedIds,['one']);
 assert.equal(calls.planReads,0);
});

await test('opening exact plan choices defers their discarded menu, not validation or editable preparation',()=>{
 for(const proposal of [{key:'source:F'},{key:'model:M',modelId:'M'},{key:'process:P'}]){
  const input=draft(),before=structuredClone(input),choice={...proposal,text:'Chosen question?',topic:'Topic'};
  const context={targetId:'saved-root',subquestionDetail:'broad'};
  setup();const {subs,...expected}=questionStartSelection(input,choice,context);assert.ok(subs.length);
  const calls=setup();calls.forbidSubs=true;
  assert.deepEqual(questionStartChoice(input,choice,context),expected);
  assert.equal(calls.adoptions,1);assert.equal(calls.subReads,0);assert.equal(calls.planReads,0);
  assert.deepEqual(calls.options.design,{direction:'diagnostic',topic:'Topic'});
  assert.equal(calls.options.targetId,'saved-root');assert.equal(calls.options.subquestionDetail,'broad');
  assert.throws(()=>questionStartChoice({...input,invalid:true},choice,context),/Invalid current evidence/);
  assert.deepEqual(input,before);
 }
});

await test('opening direct-ID and theme choices retains the original subquestion fallback',()=>{
 for(const key of ['source:F','theme:T','item:one'])for(const hasSubs of [true,false]){
  const calls=setup();if(!hasSubs)calls.subs=[];
  const input=draft(),choice={key,text:'Question?',ids:['one','outside']};
  assert.deepEqual(questionStartChoice(input,choice),questionStartSelection(input,choice));
 }
});

await test('ranking exact plans keeps full validated coverage without constructing unused menus',()=>{
 for(const proposal of [{key:'source:F'},{key:'model:M',modelId:'M'},{key:'process:P'}]){
  const input=draft(),before=structuredClone(input),choice={...proposal,text:'Question?',topic:'Topic'};
  setup();const expected=questionStartPreview(input,choice).matchedIds.length;
  const calls=setup();calls.forbidSubs=true;
  const ranked=rankedQuestionStarts(input,{targetId:'saved-root',subquestionDetail:'broad'},[choice]);
  assert.equal(ranked.length,1);assert.equal(ranked[0].matched,expected);
  assert.equal(Object.hasOwn(ranked[0],'subCount'),false);
  assert.equal(calls.adoptions,1);assert.equal(calls.planReads,1);assert.equal(calls.subReads,0);
  assert.equal(calls.options.targetId,'saved-root');assert.equal(calls.options.subquestionDetail,'broad');
  assert.deepEqual(calls.options.design,{direction:'diagnostic',topic:'Topic'});
  assert.deepEqual(input,before);
  assert.throws(()=>rankedQuestionStarts({...input,invalid:true},{},[choice]),/Invalid current evidence/);
  assert.equal(rankedQuestionStarts({...input,included:['two']},{},[choice])[0].matched,1,'Coverage uses the current selection');
 }
});

await test('ranking retains full-preview fallbacks for direct IDs and unavailable plans',()=>{
 const input=draft();
 for(const proposal of [{key:'source:F'},{key:'theme:T'},{key:'item:one'}]){
  const calls=setup();calls.coverage=[];calls.subs=[];
  const choice={...proposal,text:'Question?',ids:['one','outside']};
  const ranked=rankedQuestionStarts(input,{},[choice]);
  assert.equal(ranked[0].matched,1);assert.equal(calls.subReads,proposal.key.startsWith('item:')?0:1);
 }
 const calls=setup();calls.noPlan=true;
 assert.equal(rankedQuestionStarts(input,{},[{key:'source:F',text:'Question?'}])[0].matched,1);
 assert.equal(calls.subReads,1);
});

await test('ranking preserves stable order, duplicate filtering and accepted roots at the question limit',()=>{
 const calls=setup();calls.forbidSubs=true;
 const input=draft(),choices=[{key:'process:P',text:'Process?'},{key:'source:F',text:'Source?'}];
 assert.deepEqual(rankedQuestionStarts(input,{},[...choices,choices[0]]).map(r=>r.proposal.key),['process:P','source:F']);
 input.research.questions=Array.from({length:200},(_,i)=>({id:'q'+i,text:'Saved '+i,parent_id:null,planKey:i===0?'source:F':null}));
 const before=calls.adoptions;
 assert.deepEqual(rankedQuestionStarts(input,{},choices),[]);assert.equal(calls.adoptions,before);
 const ranked=rankedQuestionStarts(input,{includeAccepted:true},choices);
 assert.equal(ranked.length,1);assert.equal(ranked[0].resumeId,'q0');assert.equal(calls.options.targetId,'q0');
});
