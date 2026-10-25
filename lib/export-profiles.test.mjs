import test from 'node:test';
import assert from 'node:assert/strict';
import {exportPresets,presetOptions} from './export-profiles.mjs';
import {register} from 'node:module';

// Isolate catalogue inputs and the downstream template renderer. Exercise the
// real legacy worksheet builder and the creator's choice of that builder.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  const parent=context.parentURL||'';let source;
  if(parent.endsWith('/excel-model.mjs'))source={
   './report-quality-revisions.mjs':'export const reportQualityPhaseText=()=>undefined;',
   './framework-model.mjs':\`export function validateDraft(d){if(d.invalid)throw Error('Invalid saved evidence');return d;}
    export const draftValue=(l,k,d)=>d.overrides[l.id]?.[k]??l[k]?.text??'',isEdited=()=>false;\`,
   './framework-source-items.mjs':'export const sourceFields=(l,k)=>l[k]?[{id:k,...l[k]}]:[];',
   './research-plan.mjs':'export const fieldIncluded=()=>true,researchOf=d=>d.research,questionNumbers=()=>({q:"1"});',
   './theme-workspaces.mjs':'export const themeCatalogue=f=>f.themes;',
   './norm-navigation.mjs':'export const normId=id=>id,subjectIds=()=>[],subjects=[];',
   './corpus-model.mjs':'export const reportForLine=f=>f.report,reportForEvidence=f=>f.report;',
   './report-export-context.mjs':'export const reportExportContext=()=>"";',
   './investigation.mjs':'export const materialInterview=()=>"How is this checked?";',
   './question-quality.mjs':'export const questionCandidate=s=>s;',
   './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata={};',
   './applicability.mjs':'export const applicabilityGroups=d=>{if(d.badApplicability)throw Error("Invalid applicability");return []},applicabilityLabels={};',
   './reviewed-reports.mjs':'export const reviewedReportIds=[];',
   './cio-export-location.mjs':'export const cioPointExportLocation=()=>"";',
   './product-scope.mjs':'export const assertScopeExport=(f,d)=>{if(d.held)throw Error("Held source");};'
  }[specifier];
  if(parent.endsWith('/creator-model.mjs'))source={
   './export-presets.mjs':${JSON.stringify(`export {presetOptions} from '${new URL('./export-profiles.mjs',import.meta.url).href}';export const kapteinSource='Synthetic';`)},
   './excel-profile-template.mjs':'export const profileTemplateWorkbook=m=>m;',
   './excel-template-design.mjs':'export const templateWorkbook=m=>m;',
   './applicability.mjs':'export const validateApplicability=()=>[];'
  }[specifier]??source;
  if((parent.endsWith('/excel-model.mjs')||parent.endsWith('/creator-model.mjs'))&&specifier==='./excel-workbook-design.mjs')
   source='export const refineWorkbook=m=>m,refineModelInterview=m=>m,includeResearchGoal=m=>m;';
  return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);

test('the three existing workforms retain required fields, titles and ordering',()=>{
  assert.deepEqual(exportPresets.map(p=>[p.id,p.required,p.sheet]),[
    ['testing','criterion','Referentiekader'],['risk','risk','Risico-controlmatrix'],['interview','interview','Interviewleidraad'],
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

test('compact creator skips only the replaced source appendix; legacy output and validation remain',async()=>{
 const {auditWorkbookModel}=await import('./excel-model.mjs');
 const {creatorWorkbookModel}=await import('./creator-model.mjs');
 const material={id:'n',kind:'criterion',title:'Synthetic norm',body:'Keep a record',sourceMethodology:'Synthetic methodology',
  sourceContext:'Exact source context 🧭',sourceText:'Exact source text',cioTrace:'{"futureField":"preserved"}',
  unknownEvidence:{value:'kept'},testDesign:'Inspect design',testExistence:'Inspect instance'};
 const framework={report:{id:'synthetic',title:'Synthetic source',url:'https://example.invalid/source',location:'Page 1'},evidence:[],
  lines:[{id:'n',source_id:'synthetic',title:material.title,criterion:{text:material.body},auditQuestion:{text:'How?'},procedure:{text:'Inspect'}}],themes:[]};
 const draft={title:'Synthetic study',included:['n'],overrides:{},notes:{},branchItems:{},investigation:{materials:[material]},
  research:{questions:[{id:'q',text:'How?',parent_id:null}],links:[{question_id:'q',line_id:'n'}]}};
 const before=structuredClone({framework,draft});
 for(const profile of ['testing','risk','interview']){
  const options=presetOptions(profile,{exportedAt:'2026-01-02T00:00:00.000Z',testingAspects:['opzet','bestaan']});
  const legacy=auditWorkbookModel(framework,draft,options),compact=auditWorkbookModel(framework,draft,options,{sourceAppendix:false});
  assert.deepEqual(legacy,auditWorkbookModel(framework,draft,options,{sourceAppendix:true}));
  assert.deepEqual(compact.sheets.slice(1),legacy.sheets.slice(1),'Register, questions and execution are identical');
  assert.deepEqual(compact.meta,legacy.meta);assert.deepEqual(compact.selection,legacy.selection);
  assert(JSON.stringify(legacy.sheets[0]).includes('futureField'));
  assert(!JSON.stringify(compact.sheets[0]).includes('futureField'));
  assert(!JSON.stringify(creatorWorkbookModel(framework,draft,options).sheets[0]).includes('futureField'));
  for(const {change,error} of [{change:{invalid:true},error:/Invalid saved evidence/},{change:{held:true},error:/Held source/},{change:{badApplicability:true},error:/Invalid applicability/}])
   for(const sourceAppendix of [false,true])assert.throws(()=>auditWorkbookModel(framework,{...draft,...change},options,{sourceAppendix}),error);
  for(const sourceAppendix of [false,true])assert.throws(()=>auditWorkbookModel(framework,draft,{...options,team:'1\n2\n3\n4\n5\n6'},{sourceAppendix}),/maximaal vijf/);
 }
 assert.deepEqual({framework,draft},before,'Saved evidence, including unknown fields, is never changed');
});
