import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// Real selection/admission algorithms, with only catalogue data and unrelated
// question generators replaced by small fictional fixtures.
const reportLine={id:'R1',report_id:'R',title:'Synthetic norm'};
register('data:text/javascript,'+encodeURIComponent(`
 const base=${JSON.stringify(new URL('./',import.meta.url).href)};
 const line=${JSON.stringify(reportLine)};
 export async function resolve(specifier,context,next){
  let source;
  if(context.parentURL?.endsWith('/product-scope.mjs')){
   if(specifier.endsWith('.json'))return {url:'data:application/json,%7B%7D',shortCircuit:true};
   if(specifier==='./reviewed-reports.mjs')source='export const reviewedScopeSnapshots='+JSON.stringify({R1:{line:JSON.stringify(line),sourceHash:'source'}})+',reviewedScopeDecisions={R1:["retain","Reviewed"]};';
   if(specifier==='./investigation.mjs')source='export const materialLine=m=>({...m});';
   if(specifier==='./report-quality-revisions.mjs')source='export const revisedReportLine=l=>l;';
  }
  if(context.parentURL?.includes('/content-adapters/')){
   if(specifier==='omnibus-data:lib/model-library.mjs')source='export default {models:[],preInterviewReview:[],prePracticalCevQuestions:[],previousActiveQuestions:[],activeIntegrityDimensions:[]};';
   if(specifier==='omnibus-data:lib/theme-workspaces.mjs')source='export default {presets:[]};';
   const fixtures={
    '@/lib/export-presets.mjs':'export const softControlExample=[];',
    '@/lib/kaptein-questions.mjs':'export const kapteinQuestions=[];',
    '@/lib/interview-structure.mjs':'export const structureModel=m=>m,assembleInterview=m=>m;',
    '@/lib/model-context.mjs':'export const contextualQuestion=q=>q,contextualModelQuestion=m=>m.question;',
    '@/lib/interview-practice-review.mjs':'export const practiceQuestionRevision="synthetic";',
    '@/lib/research-flow.mjs':'export const subSuggestions=()=>[];',
    '@/lib/research-plan.mjs':'export const researchOf=d=>d.research;',
    '@/lib/reviewed-reports.mjs':'export const reviewedResearchPresets=[];'
   };
   source=fixtures[specifier]??source;
   if(specifier==='@/lib/theme-workspaces.mjs')return {url:base+'content-adapters/theme-workspaces.mjs',shortCircuit:true};
   if(!source&&specifier.startsWith('@/lib/'))return next(base+specifier.slice(6),context);
  }
  if(context.parentURL?.endsWith('/report-choices.mjs')&&specifier==='./catalogue-summary.mjs')source='export const reportSummaries={};';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {cleanScopeDraft,admittedLines}=await import('./product-scope.mjs');
const {scopedExportSelection}=await import('./content-adapters/model-library.mjs');
const {themeCatalogue}=await import('./content-adapters/theme-workspaces.mjs');
const {themeLines}=await import('./report-choices.mjs');
const own={id:'W1',source_id:'own',title:'Own text',evidence:'Exact quotation 🧭'};
const framework=()=>({productScope:'internal-it-1',report:{id:'R',source_hash:'source'},
 lines:[reportLine,{id:'held'},own,{id:'preview',displayOnly:true}],workbenchMaterials:[own],
 themes:[{id:'report',lineIds:['R1','held']},{id:'mixed',lineIds:['W1','R1']}]});
function oldClean(f,d){
 if(!f.productScope)return {draft:d,removed:[]};
 const allowed=new Set(admittedLines(f).map(l=>l.id)),removed=d.included.filter(id=>!allowed.has(id));
 if(!removed.length&&!d.research?.links.some(l=>!allowed.has(l.line_id)))return {draft:d,removed};
 return {removed,draft:{...d,included:d.included.filter(id=>allowed.has(id)),...(d.research?{
  research:{...d.research,links:d.research.links.filter(l=>allowed.has(l.line_id))}}:{})}};
}
function oldSelection(f,d){
 d=oldClean(f,d).draft;
 const questions=new Set((d.research?.questions??[]).map(q=>q.id));
 const linked=new Set((d.research?.links??[]).filter(l=>questions.has(l.question_id)).map(l=>l.line_id));
 const included=[...new Set(d.included.filter(id=>linked.has(id)))];
 const themes=themeCatalogue(f).filter(t=>t.lineIds.some(id=>included.includes(id)));
 return {themes:themes.map(t=>({...t,lineIds:themeLines(f,t,[]).map(l=>l.id).filter(id=>included.includes(id))})),
  themeIds:themes.map(t=>t.id),excludedNorms:[...new Set(d.included.filter(id=>!linked.has(id)))],included};
}

test('targeted cleanup matches the full scan for selections and links, including HOLD and missing IDs',()=>{
 const f=framework(),before=structuredClone(f);
 for(const included of [[],['R1'],['W1','R1','W1'],['held','preview','unknown','R1']])
  for(const linked of [[],['W1','held','unknown'],['R1','preview']]){
   const draft={included,research:{questions:[{id:'q'}],links:linked.map(line_id=>({line_id,question_id:'q'}))}};
   assert.deepEqual(cleanScopeDraft(f,draft),oldClean(f,draft));
   assert.deepEqual(scopedExportSelection(f,draft),oldSelection(f,draft));
  }
 assert.deepEqual(f,before);
});

test('unused catalogue rows are not inspected; referenced rows retain the same source checks',()=>{
 const f=framework(),unrelated={id:'unused',get displayOnly(){throw Error('Unexpected admission work');}};
 f.lines.push(unrelated);
 const draft={included:['R1'],research:{links:[{line_id:'W1'}]}};
 assert.equal(cleanScopeDraft(f,draft).draft,draft);
 assert.throws(()=>cleanScopeDraft(f,{included:['unused']}),/Unexpected admission/);
 assert.throws(()=>cleanScopeDraft(f,{included:[],research:{links:[{line_id:'unused'}]}}),/Unexpected admission/);
});

test('source edits, missing ownership and changed report hashes are never hidden by reuse',()=>{
 for(const mutate of [f=>{f.lines[0]={...f.lines[0],title:'Changed source'};},
  f=>{f.report.source_hash='changed';},f=>{f.workbenchMaterials=[];},
  f=>{f.lines[2]={...own,evidence:'Changed quote'};}]){
  const f=framework(),d={included:['R1','W1'],research:{links:[{line_id:'R1'},{line_id:'W1'}]}};
  assert.deepEqual(cleanScopeDraft(f,d).removed,[]);mutate(f);
  assert.deepEqual(cleanScopeDraft(f,d),oldClean(f,d));
  assert.equal(cleanScopeDraft(f,d).removed.length,1);
 }
});

test('workbench-only exports do not inspect report themes that contain none of their selections',()=>{
 const f=framework();f.themes=[{id:'unrelated',lineIds:['R1']}];
 f.lines.push({id:'unused',get displayOnly(){throw Error('Unrelated theme admission');}});
 const d={included:['W1'],research:{questions:[{id:'q'}],links:[{line_id:'W1',question_id:'q'}]}};
 assert.deepEqual(scopedExportSelection(f,d),{themes:[],themeIds:[],excludedNorms:[],included:['W1']});
});

test('selection retains theme order, report membership, duplicate handling and the historical fallback',()=>{
 for(const f of [framework(),{...framework(),themes:[]},{...framework(),themes:undefined},
  {...framework(),productScope:undefined}]){
  const d={included:['W1','R1','W1','held'],research:{questions:[{id:'q'}],links:[
   {question_id:'q',line_id:'W1'},{question_id:'missing',line_id:'R1'}]}};
  assert.deepEqual(scopedExportSelection(f,d),oldSelection(f,d));
 }
});
