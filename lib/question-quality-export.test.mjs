import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {SLECHTE_VRAGEN} from './question-quality-fixtures.mjs';
import {questionCandidate} from './question-quality.mjs';
import {workbookPackage} from './excel-package.mjs';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';
import {sourceQuestionPresentation,reportPointInterviewPresentation} from './source-question-presentation.mjs';
import {registerCatalogueResource,ensureCatalogue} from './catalogue-runtime.mjs';
import {directionPlan} from './research-directions.mjs';

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
   './interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[{id:"operational",label:"Operationeel"},{id:"management",label:"Tactisch / Management"},{id:"strategic",label:"Strategisch / Boardroom"}];',
   './report-point-source.mjs':'export const currentReportPointInterview=m=>globalThis.exportPointInterview?.(m);export const validateReportTrace=()=>{throw Error("No source trace in fixture");};',
   './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata={};',
   './process-catalogue.mjs':'export const processes=[],activeProcesses=[];',
   './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";globalThis.exportReviewProposals=cioProposals;',
   './cio-content.mjs':'export const validateCioEditorialTrace=()=>{throw Error("No CIO trace in fixture");};',
   './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[],validateTopicalMaterial=()=>{throw Error("No topical trace in fixture");};',
   './wwke-law-data.mjs':'export const wwkeMetadata={id:"TESTWWKE"},wwkeProposals=[],wwkeSourceId="TESTWWKE",validateWwkeMaterial=()=>{throw Error("No law trace in fixture");};'
  };
  const source=fixtures[specifier];
  return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);
const {auditWorkbookModel}=await import('./excel-model.mjs');
const {emptyDraft,draftValue,exportMarkdown,updateValue}=await import('./framework-model.mjs');
const {NO_APPROVED_QUESTION,emptyInvestigation,addMaterial,addMaterials,investigationFramework}=await import('./investigation.mjs');
const element=text=>({text,basis:'PROPOSED',evidence_ids:[],reason:'Synthetic proposal'});
const framework=question=>({version:'synthetic',content_hash:'a'.repeat(64),title:'Synthetic framework',
 report:{id:'SYNTHETIC',title:'Synthetic report',source_hash:'b'.repeat(64),year:2026},
 evidence:[],patterns:[],gaps:[],limitations:[],lines:[{id:'SYNTHETIC-1',report_id:'SYNTHETIC',title:'Synthetic norm',entity:'Synthetic unit',
 ...Object.fromEntries(['objective','risk','controlObjective','control','criterion','finding','auditQuestion','procedure','owner'].map(key=>[key,element(key==='auditQuestion'?question:key==='criterion'?'Retain evidence':'')])),
 relationships:[],controlStatus:Object.fromEntries(['design','implementation','operation'].map(key=>[key,{value:'NOT_ESTABLISHED',explanation:'Not tested',evidence_ids:[]}]))}]});
const draftFor=f=>({...emptyDraft(f),included:[f.lines[0].id]});
const options=profile=>({profile,fields:['criterion','auditQuestion','interview'],testingAspects:profile==='testing'?['opzet','bestaan']:undefined});
const scalar=v=>v&&typeof v==='object'?v.value??'':v;
const cell=(book,id,lineId='SYNTHETIC-1')=>{
 const sheet=book.sheets.find(s=>s.columnIds?.includes(id)&&s.entries?.some(e=>e.lineId===lineId));
 const entry=sheet.entries.find(e=>e.lineId===lineId);
 return String(scalar(sheet.rows[entry.row-1][sheet.columnIds.indexOf(id)]));
};

await test('reviewed direction plans survive project reopening and reach actual Excel and Markdown alongside own questions',()=>{
 for(const direction of ['signaling','diagnostic','design','change','evaluative']){
  const plan=directionPlan(direction,'de afhandeling',{breadth:'deep',lens:'causal'}),f=framework('Hoe verloopt de afhandeling?'),draft=draftFor(f);
  draft.research={questions:[{id:'q-1',parent_id:null,text:plan.text,origin:'suggested'},
   ...plan.subquestions.map((q,i)=>({id:`q-${i+2}`,parent_id:'q-1',text:q.text,origin:'suggested'})),
   {id:'q-5',parent_id:null,text:'Mijn eigen hoofdvraag over de proef',origin:'user'}],
   links:[{question_id:'q-2',line_id:'SYNTHETIC-1'},{question_id:'q-5',line_id:'SYNTHETIC-1'}]};
  const reopened=JSON.parse(JSON.stringify(draft)),before=structuredClone(reopened);
  const markdown=exportMarkdown(f,reopened);
  assert(markdown.includes(plan.text));assert(markdown.includes(plan.subquestions[0].text));
  assert(markdown.includes('Mijn eigen hoofdvraag over de proef'));
  for(const profile of ['testing','interview']){
   const book=auditWorkbookModel(f,reopened,options(profile));
   const values=book.sheets.flatMap(s=>s.rows.flatMap(row=>row.map(scalar))).map(String);
   assert(values.some(value=>value.includes(plan.text)),direction+' '+profile+' central');
   assert(values.some(value=>value.includes(plan.subquestions[0].text)),direction+' '+profile+' subquestion');
   assert(values.some(value=>value.includes('Mijn eigen hoofdvraag over de proef')));
   const files=workbookPackage(book);assert(files['xl/workbook.xml']);
  }
  assert.deepEqual(reopened,before);
 }
});

await test('the fixed bad set cannot bypass source question presentation through workbook profiles',()=>{
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

await test('interview checks raw openings before provenance prefixes and preserves independent source fields',()=>{
 const f=framework('Heeft u een dossier?'),draft=draftFor(f);
 f.lines[0].sourceItems=[{...element('Hoe verloopt de overdracht?'),id:'source-extra',kind:'auditQuestion',parent_id:'control'}];
 f.lines[0].interviewReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'interview',text:'Heeft u een dossier?'},
  {id:'source-extra',kind:'interview',text:'Hoe verloopt de overdracht?'}]});
 const text=cell(auditWorkbookModel(f,draft,options('interview')),'interview');
 assert.ok(!text.includes('Heeft u'));
 assert.ok(text.includes('Hoe verloopt de overdracht?'));
 assert.ok(!text.includes(NO_APPROVED_QUESTION));
});

await test('own questions, intentional blanks and additions survive reopening and all export profiles exactly once',()=>{
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

await test('exact source review controls app fields, Markdown and all workbook profiles independently per field',()=>{
 const text='Hoe wordt een melding afgehandeld?',extra='Wie legt het besluit vast?';
 for(const decision of ['behouden','HOLD','herschrijven','schrappen',null]) {
  const f=framework(text),line=f.lines[0],draft=draftFor(f);
  line.report_id='SYNTHETIC';
  line.sourceItems=[{...element(extra),id:'source-extra',kind:'auditQuestion',parent_id:'control',
   relationship:{basis:'PROPOSED',relation:'Tests',reason:'Synthetic relation',evidence_ids:[]}}];
  line.questionReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'toetsvraag',text},
   {id:'source-extra',kind:'toetsvraag',text:extra}],decisions:{auditQuestion:decision}});
  line.interviewReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'interview',text},
   {id:'source-extra',kind:'interview',text:extra}],decisions:{auditQuestion:decision}});
  const before=structuredClone({f,draft}),approved=decision==='behouden';
  assert.equal(draftValue(line,'auditQuestion',draft),approved?text:'');
  assert.equal(draftValue(line,'source-extra',draft),extra);
  assert.equal(exportMarkdown(f,draft).includes(text),approved);
  for(const profile of ['testing','risk','interview']) {
   const book=auditWorkbookModel(f,draft,options(profile));
   const shown=cell(book,profile==='interview'?'interview':'auditQuestion');
   assert.equal(shown.includes(text),approved,profile+' '+decision);
   assert.ok(shown.includes(extra));
   const sheets=Object.entries(workbookPackage(book)).filter(([name])=>name.startsWith('xl/worksheets/'));
   assert.equal(sheets.some(([,xml])=>xml.includes(text)),approved);
  }
  assert.deepEqual({f,draft},before);
 }
});

await test('stale and malformed source review never falls back to legacy visibility; explicit own wording survives',()=>{
 const text='Hoe wordt een melding afgehandeld?';
 const changes=[line=>line.auditQuestion.text+=' ',line=>line.report_id='OTHER',line=>line.id='OTHER',
  line=>line.edition='new-edition',line=>line.sourceHash='b'.repeat(64),
  line=>line.questionReview.questions=[],line=>line.questionReview.reviews=[],
  line=>line.questionReview=null,line=>line.questionReview={},line=>line.questionReview=undefined];
 for(const change of changes) {
  const f=framework(text),line=f.lines[0];line.report_id='SYNTHETIC';
  line.questionReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'toetsvraag',text}]});
  change(line);const draft=draftFor(f),before=structuredClone({f,draft});
  assert.equal(draftValue(line,'auditQuestion',draft),'');
  // Even copying a withheld default is an explicit user choice; preserve it.
  for(const own of [line.auditQuestion.text,'Eigen tekst zonder vraagteken 🧭','']) {
   const edited=updateValue(draft,line,'auditQuestion',own),reopened=JSON.parse(JSON.stringify(edited));
   assert.equal(reopened.overrides[line.id].auditQuestion,own);
   assert.equal(draftValue(line,'auditQuestion',reopened),own);
  }
  assert.deepEqual({f,draft},before);
 }
 const owner={reviewStatus:'reviewed',score:10,selection_status:'SELECTABLE'};
 const state=sourceQuestionPresentation(owner,{sourceId:'SYNTHETIC',itemId:'SYNTHETIC-1',
  questionId:'auditQuestion',kind:'toetsvraag',text});
 assert.equal(state.text,text);assert.equal(state.review.status,'unknown');assert.equal(state.review.approved,false);
});

await test('a retained synthetic receipt cannot admit the fixed bad set to interview export',()=>{
 for(const [kind,text] of SLECHTE_VRAGEN) {
  const f=framework(text),line=f.lines[0],draft=draftFor(f);line.report_id='SYNTHETIC';
  line.questionReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'toetsvraag',text}]});
  line.interviewReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'interview',text}]});
  const shown=cell(auditWorkbookModel(f,draft,options('interview')),'interview');
  assert.ok(shown.includes(NO_APPROVED_QUESTION),kind+': '+text);
 }
});

await test('a grammatical source question or an approved audit question is not interview approval',()=>{
 const text='Hoe wordt de beheersing vormgegeven?',f=framework(text),line=f.lines[0],draft=draftFor(f);
 for(const receipt of [undefined,questionReviewFixture({questions:[{id:'auditQuestion',kind:'toetsvraag',text}]})]){
  if(receipt)line.questionReview=receipt;
  assert.equal(draftValue(line,'auditQuestion',draft),text,'The audit field remains a separate purpose');
  const shown=cell(auditWorkbookModel(f,draft,options('interview')),'interview');
  assert(!shown.includes(text));assert(shown.includes(NO_APPROVED_QUESTION));
 }
});

await test('separately reviewed interview wording leaves the audit source and own edits intact',()=>{
 const audit='Hoe is de overdracht van verantwoordelijkheden ingericht?',interview='Kunt u beschrijven hoe u uw laatste overdracht voorbereidde?';
 const f=framework(audit),line=f.lines[0],draft=draftFor(f);
 line.interviewReview=questionReviewFixture({questions:[{id:'auditQuestion',kind:'interview',text:interview}]});
 const before=structuredClone({f,draft});
 assert(cell(auditWorkbookModel(f,draft,options('interview')),'interview').includes(interview));
 assert.equal(draftValue(line,'auditQuestion',draft),audit);
 assert.equal(cell(auditWorkbookModel(f,draft,options('testing')),'auditQuestion'),audit);
 const originals=structuredClone(line.interviewReview);
 for(const malformed of [null,{},undefined,{...originals,questions:{find:'invalid'}},{...originals,itemId:'OTHER'},
   {...originals,reviews:[]},{...originals,questions:[{...originals.questions[0],text:interview+' Gewijzigd?'}]}]){
  line.interviewReview=malformed;
  assert(cell(auditWorkbookModel(f,draft,options('interview')),'interview').includes(NO_APPROVED_QUESTION));
 }
 line.interviewReview=originals;
 for(const own of ['Eigen interviewtekst zonder vraagteken','']){
  const custom=updateValue(draft,line,'auditQuestion',own);
  assert.equal(cell(auditWorkbookModel(f,custom,options('interview')),'interview'),own?'Eigen formulering: '+own:'');
 }
 assert.deepEqual({f,draft},before);
});

await test('current foundation defaults need interview review even when saved unchanged',async()=>{
 const source={sourceId:'REVIEWTEST',originKey:'REVIEWTEST:unreviewed',edition:'synthetic-1',kind:'criterion',
  title:'Synthetic source norm',body:'Keep the decision',question:'Hoe wordt de beheersing vormgegeven?',procedure:'',
  sourceTitle:'Synthetic source',sourceUrl:'',location:'1',rationale:''};
 const originals=globalThis.exportReviewProposals;originals.push(source);
 // Trigger the same derived lookup update as a lazy source load.
 registerCatalogueResource('unreviewed-interview',async()=>null,()=>{});await ensureCatalogue(['unreviewed-interview']);
 try{
  const base=framework('Unused?'),draft=addMaterial({...emptyDraft(base),investigation:emptyInvestigation()},source);
  const f=investigationFramework(base,draft),id=draft.included[0],before=structuredClone(draft);
  assert(cell(auditWorkbookModel(f,draft,options('interview')),'interview',id).includes(NO_APPROVED_QUESTION));
  const rewritten='Kunt u beschrijven hoe u het laatste besluit vastlegde?';
  source.interviewReview=questionReviewFixture({sourceId:source.sourceId,itemId:source.originKey,questions:[{id:'question',kind:'interview',text:rewritten}]});
  assert(cell(auditWorkbookModel(f,draft,options('interview')),'interview',id).includes(rewritten));
  const levels={...options('interview'),researchInterview:{levels:['management']}};
  assert(cell(auditWorkbookModel(f,draft,levels),'interview',id).includes(NO_APPROVED_QUESTION),'An absent level cannot silently borrow the general question');
  source.interviewReview=questionReviewFixture({sourceId:source.sourceId,itemId:source.originKey,
    questions:[{id:'questionManagement',kind:'interview',text:rewritten}]});
  assert(cell(auditWorkbookModel(f,draft,levels),'interview',id).includes(rewritten),'A reviewed level is offered without rewriting the saved default');
  assert.deepEqual(draft,before);
 }finally{originals.splice(originals.indexOf(source),1);
  registerCatalogueResource('unreviewed-interview-cleanup',async()=>null,()=>{});await ensureCatalogue(['unreviewed-interview-cleanup']);}
});

await test('selected report points require their own interview decisions, including after reopening',()=>{
 const point={id:'SYNTHETIC-1/TP01',report_id:'SYNTHETIC'},
   questions=[{id:'IQ01',text:'Hoe organiseert u het overleg?',point_ids:[point.id]},
     {id:'IQ02',text:'Hoe worden acties vastgelegd?',point_ids:[point.id]}],
   catalogue={points:[point],reports:[{id:'SYNTHETIC',source_hash:'a'.repeat(64),year:2026}],interview_questions:questions};
 globalThis.exportPointInterview=m=>reportPointInterviewPresentation(catalogue,m);
 try{
  const f=framework('Parent question?'),material={kind:'criterion',originKey:'report-point:'+point.id,sourcePointId:point.id,
    originalLineId:'SYNTHETIC-1',sourceHash:'a'.repeat(64),edition:'2026',title:'Overleg',body:'Leg besluiten vast.',
    question:questions.map(q=>q.text).join('\n\n'),procedure:'Bekijk een vastgesteld verslag.',sourceTitle:'Synthetic',sourceUrl:'',location:'1',rationale:''};
  const draft=addMaterial({...emptyDraft(f),investigation:emptyInvestigation()},material),id=draft.included[0];
  const restored=JSON.parse(JSON.stringify(draft));
  const output=d=>cell(auditWorkbookModel(investigationFramework(f,d),d,options('interview')),'interview',id);
  assert(output(restored).includes(NO_APPROVED_QUESTION));
  const rewrite='Kunt u beschrijven hoe u het laatste overleg voorbereidde?';
  point.interviewReview=questionReviewFixture({sourceId:'SYNTHETIC',itemId:point.id,sourceEdition:'2026',
    questions:[{id:'IQ01',kind:'interview',text:rewrite},{id:'IQ02',kind:'interview',text:questions[1].text}],decisions:{IQ02:'HOLD'}});
  assert(output(restored).includes(rewrite));assert(!output(restored).includes(questions[1].text));
  point.interviewReview.itemId='SYNTHETIC-1'; // Parent approval is not point approval.
  assert(output(restored).includes(NO_APPROVED_QUESTION));
  const edited=structuredClone(restored);edited.investigation.materials[0].question='Welke afspraak maakte u zelf?';
  assert(output(edited).includes(edited.investigation.materials[0].question));
  for(const own of ['Eigen tekst', ''])assert.equal(output({...restored,overrides:{...restored.overrides,[id]:{auditQuestion:own}}}),own);
  assert.deepEqual(restored,draft);assert.equal(material.question,questions.map(q=>q.text).join('\n\n'));
 }finally{delete globalThis.exportPointInterview;}
});

await test('each interview level keeps its own review decision without fallback to another level',async()=>{
 const source={sourceId:'REVIEWTEST',originKey:'REVIEWTEST:levels',edition:'synthetic-1',kind:'criterion',
  title:'Overdracht',body:'Leg de overdracht vast.',question:'Hoe verloopt de overdracht?',
  questionOperational:'Kunt u uw laatste overdracht beschrijven?',
  questionManagement:'Hoe bespreekt u de overdrachten met uw team?',questionStrategic:'Hoe volgt u de overdrachtsrisico’s?',
  procedure:'',sourceTitle:'Synthetic',sourceUrl:'',location:'1',rationale:''};
 source.interviewReview=questionReviewFixture({sourceId:source.sourceId,itemId:source.originKey,
  questions:['question','questionOperational','questionManagement','questionStrategic'].map(id=>({id,kind:'interview',text:source[id]})),
  decisions:{questionManagement:'HOLD',questionStrategic:'schrappen'}});
 const originals=globalThis.exportReviewProposals;originals.push(source);
 registerCatalogueResource('interview-levels',async()=>null,()=>{});await ensureCatalogue(['interview-levels']);
 try{
  const f=framework('Unused?'),draft=addMaterial({...emptyDraft(f),investigation:emptyInvestigation()},source),id=draft.included[0];
  const opts={...options('interview'),researchInterview:{levels:['operational','management','strategic']}};
  const output=cell(auditWorkbookModel(investigationFramework(f,draft),draft,opts),'interview',id);
  assert(output.includes(source.questionOperational));assert.equal(output.split(NO_APPROVED_QUESTION).length-1,2);
  assert(!output.includes(source.questionManagement));assert(!output.includes(source.questionStrategic));assert(!output.includes(source.question));
 }finally{originals.splice(originals.indexOf(source),1);
  registerCatalogueResource('interview-levels-cleanup',async()=>null,()=>{});await ensureCatalogue(['interview-levels-cleanup']);}
});

await test('optional source hash and inherited editions survive selection, reopening and export without approving historical text',async()=>{
 const text='Hoe wordt een melding afgehandeld?', originals=globalThis.exportReviewProposals;
 for(const [i,metadata] of [{edition:'synthetic-1'},{source:{edition:'synthetic-1'}},{}].entries()) {
  const source={sourceId:'REVIEWTEST',originKey:'REVIEWTEST:metadata-'+i,kind:'criterion',title:'Synthetic norm',
   body:'Keep the decision',question:text,procedure:'',sourceTitle:'Synthetic source',sourceUrl:'',location:'1',rationale:'',...metadata};
  source.questionReview=questionReviewFixture({sourceId:source.sourceId,itemId:source.originKey,
   questions:[{id:'question',kind:'interview',text}]});
  registerCatalogueResource('metadata-'+i,async()=>source,value=>{originals.push(value);});
  await ensureCatalogue(['metadata-'+i]);
  try {
   const base=framework('Unused question?');
   // Ordinary foundation selection supplies the edition from the parent source.
   const selected=addMaterial({...emptyDraft(base),investigation:emptyInvestigation()},{...source,edition:'synthetic-1'});
   const restored=JSON.parse(JSON.stringify(selected)),id=restored.included[0];
   assert.equal(restored.investigation.materials[0].sourceHash,'');
   const f=investigationFramework(base,restored),line=f.lines.find(l=>l.id===id);
   const outputs=d=>[draftValue(line,'auditQuestion',d),exportMarkdown(f,d),
    ...['testing','risk','interview'].map(profile=>cell(auditWorkbookModel(f,d,options(profile)),profile==='interview'?'interview':'auditQuestion',id))];
   assert.ok(outputs(restored).every(value=>value.includes(text)),'Current approved default remains visible without optional row hash');
   source.questionReview.reviews[0].decision='HOLD';
   assert.ok(outputs(restored).every(value=>!value.includes(text)),'Current HOLD still applies');
   for(const adopt of [addMaterial,(d,m)=>addMaterials(d,[m])]) {
    const fresh=adopt({...emptyDraft(base),investigation:emptyInvestigation()},{...source,edition:''});
    assert.equal(fresh.investigation.materials[0].edition,'synthetic-1','New adoption pins missing edition from the authoritative source');
    assert.ok(outputs(fresh).every(value=>!value.includes(text)),'A newly selected HOLD cannot become historical through blank metadata');
   }
   const historical=structuredClone(restored);historical.investigation.materials[0].edition='synthetic-0';
   assert.ok(outputs(historical).every(value=>value.includes(text)),'Historical edition stays literal, including inherited/capsule edition');
   historical.investigation.materials[0].edition='';
   const reselected=addMaterial(historical,source);
   assert.equal(reselected.investigation.materials[0].edition,'','Existing unknown snapshots are never rebound on re-selection');
   assert.ok(outputs(reselected).every(value=>value.includes(text)));
   assert.equal(source.questionReview.reviews[0].decision,'HOLD','Saved history cannot approve the source');
  } finally {
   registerCatalogueResource('metadata-cleanup-'+i,async()=>null,()=>{originals.splice(originals.indexOf(source),1);});
   await ensureCatalogue(['metadata-cleanup-'+i]);
  }
 }
});

await test('material question lookup stays linear and observes replacement, reordering, deletion and edits',()=>{
 let reads=0;
 const materials=Array.from({length:1000},(_,i)=>({get id(){reads++;return 'WB-'+(i+1);},question:'Eigen vraag '+i}));
 const f=framework('unused'),draft={...emptyDraft(f),investigation:{materials}};
 const line=id=>({...f.lines[0],id,source_id:'synthetic'});
 for(let i=0;i<1000;i++)assert.equal(draftValue(line('WB-'+(i+1)),'auditQuestion',draft),'Eigen vraag '+i);
 assert.ok(reads<5000,'1000 lookups must not rescan the full material list: '+reads);
 materials[800]={id:'WB-801',question:'Vervangen tekst'};
 assert.equal(draftValue(line('WB-801'),'auditQuestion',draft),'Vervangen tekst');
 materials.reverse();
 assert.equal(draftValue(line('WB-801'),'auditQuestion',draft),'Vervangen tekst');
 materials[199].question='Bewerkt in dezelfde rij';
 assert.equal(draftValue(line('WB-801'),'auditQuestion',draft),'Bewerkt in dezelfde rij');
 materials[199]={id:'WB-1001',question:'Nieuwe identiteit'};
 assert.equal(draftValue(line('WB-1001'),'auditQuestion',draft),'Nieuwe identiteit');
 materials.splice(199,1);
 assert.equal(draftValue(line('WB-1001'),'auditQuestion',draft),'unused');
 draft.investigation.materials=[{id:'WB-1',question:'Heropend project'}];
 assert.equal(draftValue(line('WB-1'),'auditQuestion',draft),'Heropend project');
});

await test('selected and reopened source defaults use the same review in ordinary audit fields and interview export',async()=>{
 const text='Hoe wordt een melding afgehandeld?';
 const source={sourceId:'REVIEWTEST',originKey:'REVIEWTEST:export',edition:'synthetic-1',kind:'criterion',
  title:'Synthetic source norm',body:'Keep the decision',question:text,procedure:'',
  sourceTitle:'Synthetic source',sourceUrl:'',location:'1',rationale:''};
 source.questionReview=questionReviewFixture({sourceId:source.sourceId,itemId:source.originKey,
  questions:[{id:'question',kind:'interview',text}],decisions:{question:'HOLD'}});
 const originals=globalThis.exportReviewProposals;
 registerCatalogueResource('export-receipt',async()=>source,value=>{originals.push(value);return ()=>originals.splice(originals.indexOf(value),1);});
 await ensureCatalogue(['export-receipt']);
 try {
  const base=framework('Unused source question?');
  const selected=addMaterial({...emptyDraft(base),investigation:emptyInvestigation()},source);
  selected.notes[selected.included[0]]='Own note';
  const restored=JSON.parse(JSON.stringify(selected)),id=restored.included[0],before=structuredClone(restored);
  const f=investigationFramework(base,restored),line=f.lines.find(l=>l.id===id);
  assert.equal(line.auditQuestion.text,text,'The evidence projection retains the original source wording');
  assert.equal(draftValue(line,'auditQuestion',restored),'');
  assert.ok(!exportMarkdown(f,restored).includes(text));
  for(const profile of ['testing','risk','interview']) {
   const book=auditWorkbookModel(f,restored,options(profile)),shown=cell(book,profile==='interview'?'interview':'auditQuestion',id);
   assert.ok(!shown.includes(text));
   if(profile==='interview')assert.ok(shown.includes(NO_APPROVED_QUESTION));
   for(const own of [text,'Eigen tekst zonder vraagteken','']) {
    const custom=updateValue(restored,line,'auditQuestion',own);
    assert.equal(custom.overrides[id].auditQuestion,own,'An explicit choice equal to withheld source wording stays an override');
    const output=cell(auditWorkbookModel(f,custom,options(profile)),profile==='interview'?'interview':'auditQuestion',id);
    assert.equal(output,own);
   }
  }
  assert.deepEqual(restored,before);
 } finally {
  registerCatalogueResource('export-receipt-cleanup',async()=>null,()=>{originals.splice(originals.indexOf(source),1);});
  await ensureCatalogue(['export-receipt-cleanup']);
 }
});
