import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';
import {workbookPackage} from './excel-package.mjs';

// Real field selection, investigation, workbook rendering and writer. Only
// unavailable catalogue inputs are synthetic; no database or project is opened.
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(specifier.endsWith('.json'))return {url:'data:application/json,'+encodeURIComponent(JSON.stringify(
   specifier.endsWith('/report-additions.json')?{control_objectives:[],organizational_goals:[]}:{})),shortCircuit:true};
  const fixtures={
   './reviewed-reports.mjs':'export const reviewedScopeSnapshots={},reviewedScopeDecisions={},reviewedReportIds=[];',
   './report-quality-revisions.mjs':'export const revisedReportLine=l=>l,reportQualityPhaseText=()=>"";',
   './control-objectives.mjs':'export const controlObjectiveFor=l=>l.controlObjective;',
   './theme-workspaces.mjs':'export const themeCatalogue=f=>[{id:"synthetic",title:"Synthetic theme",lineIds:f.lines.map(l=>l.id)}];',
   './norm-navigation.mjs':'export const normId=id=>id,subjectIds=()=>[],subjects=[];',
   './interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[{id:"operational",label:"Operationeel"}];',
   './report-point-source.mjs':'export const validateReportTrace=()=>{throw Error("No source trace in fixture");};',
   './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata={};',
   './process-catalogue.mjs':'export const processes=[],activeProcesses=[];',
   './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
   './cio-content.mjs':'export const validateCioEditorialTrace=()=>{throw Error("No CIO trace in fixture");};',
   './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[],validateTopicalMaterial=()=>{throw Error("No topical trace in fixture");};',
   './wwke-law-data.mjs':'export const wwkeMetadata={id:"TESTWWKE"},wwkeProposals=[],wwkeSourceId="TESTWWKE",validateWwkeMaterial=()=>{throw Error("No law trace in fixture");};'
  };
  const source=fixtures[specifier];
  return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);
const {auditWorkbookModel}=await import('./excel-model.mjs');
const {emptyDraft,draftValue,exportMarkdown}=await import('./framework-model.mjs');
const {NO_APPROVED_QUESTION}=await import('./investigation.mjs');
const element=text=>({text,basis:'PROPOSED',evidence_ids:[],reason:'Synthetic proposal'});
const framework=question=>({version:'synthetic',content_hash:'a'.repeat(64),title:'Synthetic framework',
 report:{id:'SYNTHETIC',title:'Synthetic report',source_hash:'b'.repeat(64),year:2026},
 evidence:[],patterns:[],gaps:[],limitations:[],lines:[{id:'SYNTHETIC-1',title:'Synthetic norm',entity:'Synthetic unit',
 ...Object.fromEntries(['objective','risk','controlObjective','control','criterion','finding','auditQuestion','procedure','owner'].map(key=>[key,element(key==='auditQuestion'?question:key==='criterion'?'Retain evidence':'')])),
 relationships:[],controlStatus:Object.fromEntries(['design','implementation','operation'].map(key=>[key,{value:'NOT_ESTABLISHED',explanation:'Not tested',evidence_ids:[]}]))}]});
const draftFor=f=>({...emptyDraft(f),included:[f.lines[0].id]});
const options=profile=>({profile,fields:['criterion','auditQuestion','interview'],testingAspects:profile==='testing'?['opzet','bestaan']:undefined});
const scalar=v=>v&&typeof v==='object'?v.value??'':v;
const cell=(book,id)=>{
 const sheet=book.sheets.find(s=>s.columnIds?.includes(id)&&s.entries?.some(e=>e.lineId==='SYNTHETIC-1'));
 const entry=sheet.entries.find(e=>e.lineId==='SYNTHETIC-1');
 return String(scalar(sheet.rows[entry.row-1][sheet.columnIds.indexOf(id)]));
};

test('the fixed bad set cannot bypass source question presentation through workbook profiles',()=>{
 for(const [kind,text] of SLECHTE_VRAGEN){
  const f=framework(text),draft=draftFor(f),before=structuredClone({f,draft});
  assert.equal(draftValue(f.lines[0],'auditQuestion',draft),questionCandidate(text,'toetsvraag'));
  for(const profile of ['testing','risk','interview']){
   const book=auditWorkbookModel(f,draft,options(profile));
   if(!questionCandidate(text,'toetsvraag'))assert.equal(cell(book,'auditQuestion'),'');
   if(profile==='interview')assert.ok(cell(book,'interview').includes(NO_APPROVED_QUESTION),kind+': '+text);
   const files=workbookPackage(book);
   assert.ok(files['xl/workbook.xml']);
   if(text && !questionCandidate(text,'toetsvraag'))
    assert.ok(!Object.entries(files).filter(([name])=>name.startsWith('xl/worksheets/')).some(([,xml])=>xml.includes(text)),text);
  }
  assert.deepEqual({f,draft},before);
 }
});

test('interview checks raw openings before provenance prefixes and preserves independent source fields',()=>{
 const f=framework('Heeft u een dossier?'),draft=draftFor(f);
 f.lines[0].sourceItems=[{...element('Hoe verloopt de overdracht?'),id:'source-extra',kind:'auditQuestion',parent_id:'control'}];
 const text=cell(auditWorkbookModel(f,draft,options('interview')),'interview');
 assert.ok(!text.includes('Heeft u'));
 assert.ok(text.includes('Hoe verloopt de overdracht?'));
 assert.ok(!text.includes(NO_APPROVED_QUESTION));
});

test('own questions, intentional blanks and additions survive reopening and all export profiles exactly once',()=>{
 for(const own of ['Mijn eigen sturende vraag: hoe goed werkt het?','']){
  const f=framework('Beoordeel het dossier.'),draft=draftFor(f);
  draft.overrides['SYNTHETIC-1']={auditQuestion:own};
  draft.branchItems['SYNTHETIC-1']=[{id:'extra-1',kind:'auditQuestion',parent_id:'control',text:'Eigen toevoeging 🧭'}];
  draft.research={questions:[{id:'q-1',parent_id:null,text:'Mijn eigen onderzoekstekst',origin:'user'}],links:[{question_id:'q-1',line_id:'SYNTHETIC-1'}]};
  const reopened=JSON.parse(JSON.stringify(draft)),before=structuredClone(reopened);
  for(const profile of ['testing','risk','interview']){
   const book=auditWorkbookModel(f,reopened,options(profile));
   const text=cell(book,profile==='interview'?'interview':'auditQuestion');
   if(own)assert.ok(text.includes(own));
   else assert.ok(!text.includes(NO_APPROVED_QUESTION));
   assert.equal(text.split('Eigen toevoeging 🧭').length-1,1);
  }
  const markdown=exportMarkdown(f,reopened);
  assert.ok(markdown.includes('Mijn eigen onderzoekstekst'));
  assert.ok(markdown.includes('Eigen toevoeging 🧭'));
  assert.deepEqual(reopened,before);
 }
});
