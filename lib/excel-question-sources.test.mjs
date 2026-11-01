import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
// Exercise the real question sheet; unrelated workbook/catalogue inputs are absent.
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/excel-template-design.mjs'))return next(specifier,context);
  const sources={
   './research-plan.mjs':'export const questionNumbers=()=>({q:"1"});',
   './wwke-law-data.mjs':'export const wwkeLabels={};',
   './excel-template-style.mjs':'export const readingStyles={linked:0};export const templateDesign=()=>{};',
   './excel-template-viewer.mjs':'export const detailSheetName="Detail",templateDetailViewer=()=>{};',
   './export-design.mjs':'export const fitExportTypography=x=>x;',
   './excel-template-execution.mjs':'export const executionSheet=()=>{};',
   './excel-saved-evidence.mjs':'export const workbookEvidence=()=>{},identifySavedSourceVersions=()=>{};',
   './excel-applicability.mjs':'export const appendSavedApplicability=()=>{};',
   './research-goal.mjs':'export const researchGoalText=()=>{};',
   './research-approach.mjs':'export const researchApproachText=()=>{};',
   './topical-content.mjs':'export const topicalSpanLocation=()=>{};'
  };
  if(specifier==='./excel-template-assets.json')return {url:'data:application/json,{}',shortCircuit:true};
  return sources[specifier]?{url:'data:text/javascript,'+encodeURIComponent(sources[specifier]),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);
const {questionSheet}=await import('./excel-template-design.mjs');

test('question source labels fit many references without dropping them or changing the register',()=>{
 const refs=Array.from({length:40},(_,i)=>'Article '+(i+1)+' · Original publication · PDF page '+(i+1));
 const columns=['pointId','questionRefs','criterion','selection','location','source'];
 const rows=Array.from({length:6},()=>Array(6).fill(''));
 rows[4]=['P1','1','Point title','Meenemen',refs.slice(0,20).join('\n'),''];
 rows[5]=['','','','','',refs.slice(20).join('\n')];
 const main={name:'Register',rows,columnIds:columns,entries:[{pointId:'P1',title:'Point title',row:5,endRow:6,refs:'1',questionIds:['q'],sources:[{url:'https://example.org/publication'}]}]};
 const before=structuredClone(main);
 const sheet=questionSheet(main,{research:{questions:[{id:'q',parent_id:null,text:'How is the process controlled?'}],links:[]}});
 const helper=sheet.rows[4][12];assert.equal(helper.value,refs.join('; '));
 assert.match(helper.formula,/^SUBSTITUTE\(/);assert(helper.formula.endsWith('CHAR(10),"; ")'));
 assert(helper.formula.includes('&CHAR(10)&'),'Continuation rows remain represented');
 assert(helper.formula.includes('F6'),'Empty location falls back to source');
 assert(Object.values(sheet.heights).every(h=>h<=409));
 assert.deepEqual(main,before);
 assert.equal(sheet.rows[sheet.questionViewer.header][4].value,refs.join('; '));
});
