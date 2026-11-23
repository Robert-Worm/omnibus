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
   './excel-saved-evidence.mjs':'export const workbookEvidence=()=>{},identifySavedSourceVersions=()=>{},bereidKaderbreed=()=>new Map();',
   './excel-applicability.mjs':'export const appendSavedApplicability=()=>{};',
   './research-goal.mjs':'export const researchGoalText=()=>{};',
   './research-approach.mjs':'export const researchApproachText=()=>{};',
   './topical-content.mjs':'export const topicalSpanLocation=()=>{};export const topicalSpanPage=()=>{};export const topicalPrimarySpans=(d,s)=>s;export const zonderAfbreking=t=>t;'
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

test('de lijst Toetspunten per vraag krijgt naast Artikel / pagina een link naar de bronpassage in Omnibus; de vragentabel blijft gelijk (B-102)',()=>{
 const columns=['pointId','questionRefs','criterion','selection','location','source'];
 const rows=Array.from({length:6},()=>Array(6).fill(''));
 rows[4]=['P1','1','Point title','Meenemen','Article 1',''];rows[5]=['P2','1','Other point','Meenemen','Article 2',''];
 const trace=JSON.stringify({point:{id:'P1',source_links:[{record_id:'r'}]},records:[{id:'r',source_spans:[{quote:'Passage'}]}]});
 const entry=(id,row,material)=>({pointId:id,title:'Title '+id,row,endRow:row,refs:'1',questionIds:['q'],sources:[{url:'https://example.org/publication'}],material});
 const draft={research:{questions:[{id:'q',parent_id:null,text:'How is the process controlled?'}],links:[]}};
 const plain={name:'Register',rows,columnIds:columns,entries:[entry('P1',5),entry('P2',6)]};
 const linked={...plain,entries:[entry('P1',5,{foundationId:'BRON',sourcePointId:'P1',topicalTrace:trace}),entry('P2',6)]};
 const before=questionSheet(plain,draft),sheet=questionSheet(linked,draft),head=sheet.questionViewer.header;
 assert.equal(sheet.rows[head-1][4],'Artikel / pagina');assert.equal(sheet.rows[head-1][5],'Bronpassage in Omnibus');
 assert.equal(sheet.rows[head][5].value,'Open in Omnibus');assert.match(sheet.rows[head][5].formula,/HYPERLINK\(INDEX\(\$O\$5:\$O\$6,/);
 assert.equal(sheet.rows[head+1][5].value,'','een toetspunt zonder link houdt een lege cel');
 assert.match(sheet.rows[4][14],/^https:\/\/omnibus\.rijksmap\.nl\/#toetspunt\/BRON\/P1\/[a-z0-9]+$/);assert.equal(sheet.rows[5][14],'');
 assert(sheet.hiddenColumns.includes(14)&&!sheet.hiddenColumns.includes(5)&&sheet.widths[5]>20);
 // Boven de lijst (kop, centrale vraag, deelvragen) verandert niets; zonder links blijft het blad zoals het was.
 for(let r=0;r<head-3;r++)assert.deepEqual(sheet.rows[r].slice(0,14),before.rows[r].slice(0,14),'rij '+(r+1));
 assert.equal(before.widths[5],4);assert.equal(before.rows[head-1][5]||'','');assert.equal(before.widths.length,14);
});

test('een lange opsomming van vindplaatsen wordt in de vraaglijst ingekort; het referentiekader houdt ze allemaal',()=>{
 // Panel 19 november 2026: één toetspunt met 180 vindplaatsen maakte elke regel van de lijst honderden punten hoog.
 const refs=Array.from({length:180},(_,i)=>'Article '+(i+1)+' · Original publication · PDF page '+(i+1));
 const rows=Array.from({length:6},()=>Array(6).fill(''));
 rows[4]=['P1','1','First point','Meenemen',refs.join('\n'),''];
 rows[5]=['P2','1','Second point','Meenemen','Article 181',''];
 const main={name:'Register',rows,columnIds:['pointId','questionRefs','criterion','selection','location','source'],entries:[
  {pointId:'P1',title:'First point',row:5,endRow:5,refs:'1',questionIds:['q'],sources:[{url:'https://example.org/first'}]},
  {pointId:'P2',title:'Second point',row:6,endRow:6,refs:'1',questionIds:['q'],sources:[{url:'https://example.org/second'}]},
 ]};
 const before=structuredClone(main);
 const sheet=questionSheet(main,{research:{questions:[{id:'q',parent_id:null,text:'How is the process controlled?'}],links:[]}});
 const first=sheet.questionViewer.header+1;
 assert(Object.values(sheet.heights).every(h=>h<=409));
 assert(sheet.heights[first]<100,'een regel van de lijst blijft laag');
 assert.match(sheet.rows[4][12],/^Article 1 · Original publication · PDF page 1; /u);
 assert.match(sheet.rows[4][12],/… meer in Register$/u);
 assert.match(sheet.rows[4][13],/^#'Register'!/u,'ingekorte vindplaatsen linken naar het referentiekader');
 assert.equal(sheet.rows[5][12].value,'Article 181');
 assert.equal(sheet.rows[5][13],'https://example.org/second');
 assert.equal(sheet.rows[first-1][2].value,'P1 · First point');
 assert.equal(sheet.rows[first][2].value,'P2 · Second point');
 assert.deepEqual(main,before,'het referentiekader zelf verandert niet');
});

test('het blad Verantwoording heeft vier vragen, elk met een eis uit de GIAS, en staat alleen in de export als het is gekozen', async () => {
  const {accountabilitySheet,accountabilityQuestions,accountabilitySheetName} = await import('./excel-template-design.mjs');
  assert.equal(accountabilityQuestions.length, 4);
  for (const q of accountabilityQuestions) {
    assert.match(q.question, /\?$/);
    assert.match(q.standard, /^Standaard 13\.[46] /);
    assert.ok(q.requirement.length > 60 && q.hint.length > 20);
  }
  const sheet = accountabilitySheet({});
  assert.equal(sheet.name, accountabilitySheetName);
  const cells = sheet.rows.flat().map(String);
  for (const q of accountabilityQuestions) assert.ok(cells.some(c => c.endsWith(q.question)) && cells.includes(q.hint) && cells.some(c => c.includes(q.requirement)));
  // Invulcellen zijn leeg: de tool vult geen verantwoording in.
  for (const row of sheet.rows.slice(5, 9)) assert.deepEqual(row.slice(3, 6), ['', '', '']);
});
