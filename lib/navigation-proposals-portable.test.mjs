import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';

// Synthetic catalogue fixtures exercise the adapter without private source data.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  const adapter=context.parentURL?.endsWith('/content-adapters/theme-workspaces.mjs');
  const choices=context.parentURL?.endsWith('/report-choices.mjs');
  const ranking=context.parentURL?.endsWith('/question-start.mjs');
  let source;
  if(adapter&&specifier.startsWith('omnibus-data:'))source='export default {presets:[{key:"p",themeId:"T",text:"Test question?",ids:["keep","hold"],groups:[]}]}';
  if(adapter&&specifier.endsWith('/reviewed-reports.mjs'))source='export const reviewedResearchPresets=[]';
  if(adapter&&specifier.endsWith('/research-flow.mjs'))source='export const subSuggestions=()=>[]';
  if((adapter||choices)&&specifier.endsWith('/product-scope.mjs'))source='export const admittedLines=f=>f.lines.filter(l=>l.status==="retain")';
  if(choices&&specifier.endsWith('/catalogue-summary.mjs'))source='export const reportSummaries={}';
  if((adapter||ranking)&&specifier.endsWith('/research-plan.mjs'))source='export const researchOf=d=>d.research;export const addQuestion=()=>{},editQuestion=()=>{},setQuestionDesign=()=>{}';
  if(ranking&&specifier.endsWith('/research-proposals.mjs'))source='export const centralProposals=()=>{throw Error("Unneeded preview")};export const adoptModelQuestionPlan=()=>{},adoptSourceQuestionPlan=()=>{},adoptProcessQuestionPlan=()=>{},subProposals=()=>{},modelQuestionPlan=()=>{},sourceQuestionPlan=()=>{},processQuestionPlan=()=>{}';
  if(ranking&&specifier.endsWith('/question-writing.mjs'))source='export const mappedQuestionSuggestions=()=>{}';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {centralSuggestions}=await import('./content-adapters/theme-workspaces.mjs');
const {browseThemeLines,themeLines}=await import('./report-choices.mjs');
const {rankedQuestionStarts}=await import('./question-start.mjs');

test('scoped proposals retain admission, selected-only filtering, order and adopted wording',()=>{
 const framework={productScope:'synthetic',lines:[{id:'keep',status:'retain'},{id:'hold',status:'hold'},
  {id:'unrelated',get status(){throw Error('Unrelated source inspected');}}]};
 const draft={included:[],research:{questions:[{parent_id:null,text:' Test   question? '}],links:[]}};
 assert.deepEqual(centralSuggestions(draft,['T'],framework).map(p=>({ids:p.ids,adopted:p.adopted})),[{ids:['keep'],adopted:true}]);
 assert.deepEqual(centralSuggestions({...draft,included:['hold']},['T'],framework),[]);
 assert.deepEqual(centralSuggestions(draft,['another'],framework),[]);
 framework.lines[0].status='hold';
 assert.deepEqual(centralSuggestions(draft,['T'],framework),[],'Changed source eligibility is rechecked, never globally cached');
});

test('indexed browsing preserves union order and overlapping per-theme report exclusions',()=>{
 const framework={report:{id:'R'},lines:[{id:'A',status:'retain'},{id:'B',report_id:'S',status:'retain'},{id:'C',status:'hold'}]};
 const themes=[{id:'one',lineIds:['A','B','C']},{id:'two',lineIds:['A']}];
 for(const excluded of [[],['one::R'],['one::R','two::R'],['one::S']]){
  const ids=new Set(themes.flatMap(t=>themeLines(framework,t,excluded).map(l=>l.id)));
  assert.deepEqual(browseThemeLines(framework,themes,excluded),framework.lines.filter(l=>ids.has(l.id)));
 }
 assert.deepEqual(browseThemeLines(framework,[]),[]);
});

test('an empty selection cannot produce matched ranked starts and needs no previews',()=>{
 assert.deepEqual(rankedQuestionStarts({included:[],research:{questions:[],links:[]}}),[]);
});

test('a composer can reuse its exact central proposals without computing them twice',()=>{
 const draft={included:['keep'],research:{questions:[],links:[]}};
 assert.deepEqual(rankedQuestionStarts(draft,{},[]),[]);
 assert.throws(()=>rankedQuestionStarts(draft,{}),/Unneeded preview/,'Other callers still compute fresh proposals');
});

test('saved question screens do not build hidden composers; memo inputs include changed research and catalogues',()=>{
 const builder=readFileSync(new URL('../app/research-builder.tsx',import.meta.url),'utf8');
 assert.match(builder,/const composerVisible = !roots.length \|\| choosing/);
 assert.match(builder,/composerVisible \? centralProposals/);
 assert.match(builder,/composerVisible \? rankedQuestionStarts/);
 assert.match(builder,/\[composerVisible,draft,themeIds,framework,models,direction,centralTarget,proposals\]/);
 assert.match(builder,/\[draft,themeIds,framework,models,direction,suggestFor,editing\]/);
 const editor=readFileSync(new URL('../app/framework-editor.tsx',import.meta.url),'utf8');
 assert.match(editor,/const questionThemes = useMemo/);
 assert.match(editor,/\[workspace.openIds,catalogueSnapshot\]/);
 assert.match(editor,/themeIds=\{questionThemes\}/);
});

test('question lists and bulk destinations share a fresh link summary within each builder render',()=>{
 const builder=readFileSync(new URL('../app/research-builder.tsx',import.meta.url),'utf8');
 assert.match(builder,/const questionLinks = questionLinkSummary\(draft\)/);
 assert.match(builder,/const \{direct, total\} = questionLinks\.get\(q\.id\)/);
 assert.match(builder,/attached=\{questionLinks\.get\(bulkDestination\)\?\.direct \?\? \[\]\}/);
 assert.doesNotMatch(builder,/questionLineIds\(/);
});

test('composer previews depend on their inputs, not checkbox, focus or save-status renders',()=>{
 const builder=readFileSync(new URL('../app/research-builder.tsx',import.meta.url),'utf8');
 assert.match(builder,/const proposalContext = useMemo\(.*\[themeIds,framework,models,direction\]\)/);
 assert.match(builder,/const composerContext=useMemo\(.*\[proposalContext,sourceDetail\]\)/);
 assert.match(builder,/const selectedDesign = useMemo\(.*\[modelPlan,direction,designTopic\]\)/);
 const prepare=builder.slice(builder.indexOf('const prepareCentral = useCallback'),builder.indexOf('const canSwitchDetail='));
 assert.match(prepare,/\[draft,centralTarget,chosenProposalKey,selectedModelId,firstChoice,firstOrigin,modelPlan,modelMode,\s*proposalContext,selectedDesign,sourcePlan,selectedSourceId,sourceDetail,processPlan,selectedProcessId,ownCentral,activeProposal\]/);
 assert.match(prepare,/useMemo\(\(\)=>canPreview\?prepareCentral\(\):null,\[canPreview,prepareCentral\]\)/);
 assert.match(builder,/questionMenuChoices\(centralPreview.draft,centralPreview.questionId,composerContext\) : \[\],\[centralPreview,chosenProposalKey,composerContext\]/);
 // An accepted edit is built afresh; a display memo is never a validation token.
 const accept=builder.slice(builder.indexOf('function acceptCentral()'),builder.indexOf('function end()'));
 assert.match(accept,/const result = prepareCentral\(\)/);
 assert.match(accept,/applyQuestionMenu\(next,savedId,allSelectableSubs,chosenSubKeys/);
});
