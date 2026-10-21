import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {excelTextParts,excelCellTextLimit,excelColumnName} from './excel-detail-text.mjs';
import {sourceBackground,workbookEvidence} from './excel-saved-evidence.mjs';

// Catalogue preparation is separate from these shared workbook renderers.
// Only replace those inputs; exercise real sheets, formulas and OOXML output.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  const parent=context.parentURL||'';let source;
  if(parent.endsWith('/excel-profile-template.mjs'))source={
   './excel-template-design.mjs':\`export const recordsFrom=m=>m.fixtureRecords;
    const sheet=name=>({name,widths:Array(8).fill(20),rows:Array.from({length:11},()=>Array(8).fill('')),heights:{},merges:[],rowStyles:{}});
    export const versionSheet=()=>sheet('01 Versiebeheer'),questionSheet=()=>sheet('02 Onderzoeksvragen');\`,
   './research-plan.mjs':'export const questionNumbers=()=>({});',
   './export-presets.mjs':'export const kapteinSource="Synthetic model source";'
  }[specifier];
  if(parent.endsWith('/excel-export.mjs'))source={
   './excel-model.mjs':\`export const columnName=${excelColumnName.toString()};export const workbookStyles=()=>{throw Error('Use real template styles');};\`,
   './creator-model.mjs':'export const creatorWorkbookModel=()=>{throw Error("Use real template input");};',
   './excel-desktop.mjs':'export const attachDesktopVba=()=>{throw Error("Not used in a macro-free export");};'
  }[specifier];
  if(specifier==='./excel-template-style.mjs')source=\`export const readingStyles={body:0,section:0};
   export const templateDesign=()=>({stylesXml:'<styleSheet/>',previewStyles:Array.from({length:70},()=>({fill:'FFFFFF',color:'000000',size:11})),meta:{fontSize:11}});\`;
  return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);
const {profileTemplateWorkbook}=await import('./excel-profile-template.mjs');
const {workbookPackage}=await import('./excel-export.mjs');
const {templateDetailViewer}=await import('./excel-template-viewer.mjs');
const {templateDesign}=await import('./excel-template-style.mjs');
const longSource=('Fictieve bronpassage met é, e\u0301, 🧭 en <letterlijke tekst>.\n\n').repeat(1800);
const record=(id,context)=>({lineId:id,pointId:id,title:'Synthetic point '+id,point:'Keep evidence',pointText:'Keep evidence',
 parent:'Synthetic norm',element:'Synthetic process',goal:'Traceable decisions',row:5,refs:'',questionIds:[],
 get:id=>({objective:'Traceable decisions',risk:'Lost evidence',controlObjective:'Complete record',control:'Keep a record',procedure:'Inspect it',documentation:'Decision',interview:'How?',criterion:'Keep evidence'}[id]||''),
 line:{materialKind:'criterion'},material:{id,kind:'criterion',body:'Keep evidence',sourceContext:context,sourceTitle:'Synthetic source',lawTrace:'{"fixture":true}'},
 sources:[{title:'Synthetic source',basis:'N',location:'Article 1',url:'https://example.org/source'}]});
const value=cell=>typeof cell==='object'&&cell?cell.value:cell;
const draft={overrides:{},notes:{}};
function checkBook(book){
 for(const sheet of book.sheets)for(const row of sheet.rows)for(const cell of row)
  if(typeof value(cell)==='string')assert(value(cell).length<=excelCellTextLimit,sheet.name+' text/cached formula limit');
 const files=workbookPackage(book);
 assert(files['xl/workbook.xml']);assert(files['customXml/item1.xml']);
 assert(files['customXml/item1.xml'].includes('fixture'));
 return files;
}
function readDetailSource(sheet,recordIndex,label){
 const indexes=sheet.viewer.labels.flatMap((name,i)=>name===label||name.startsWith(label+' (vervolg ')?[i]:[]);
 assert(indexes.length>1,'Source has continuation sections');
 return indexes.map(i=>{
  const section=sheet.viewer.sections[i],row=Number(section.text.slice(1));
  const formula=sheet.rows[row-1][1];
  const name=formula.formula.match(/INDEX\(\$([A-Z]+)\$2:/)[1];
  const column=[...name].reduce((n,c)=>26*n+c.charCodeAt(0)-64,0)-1;
  assert(sheet.hiddenColumns.includes(column));assert(sheet.previewHiddenColumns.includes(column));
  assert.equal(sheet.rows[recordIndex+1][column],sheet.detailRecords[recordIndex].contents[i]);
  assert.equal(formula.value,sheet.detailRecords[0].contents[i]);
  return sheet.detailRecords[recordIndex].contents[i];
 }).join('');
}

test('bounded parts preserve Unicode, whitespace and exact boundary lengths',()=>{
 for(const text of ['', 'x'.repeat(excelCellTextLimit), 'x'.repeat(excelCellTextLimit-1)+'🧭tail',longSource]){
  const parts=excelTextParts(text);assert.equal(parts.join(''),text);
  for(const part of parts){assert(part.length<=excelCellTextLimit);assert(part.isWellFormed());}
 }
 assert.equal(excelColumnName(26),'AA');assert.equal(excelColumnName(52),'BA');
});

test('testing viewer splits long source text losslessly and keeps live point/phase formulas',()=>{
 const records=[record('one','Short context'),record('two',longSource)];
 const main={entries:records,merges:[]};
 const execution={aspects:['opzet','bestaan'],columnIds:['opzetApproach','opzetExpectedEvidence','bestaanApproach','bestaanExpectedEvidence'],
  entries:records.map((r,i)=>({lineId:r.lineId,row:i+5,plans:{opzet:'Inspect design',bestaan:'Inspect instance'}}))};
 const detail=templateDetailViewer(main,execution);
 const sources=r=>[...r.sources.map(x=>[x.title,'Grondslag: '+x.basis,x.location,x.url].join('\n')),sourceBackground(r)].join('\n\n');
 assert.equal(readDetailSource(detail,1,'Bronnen'),sources(records[1]));
 assert.equal(readDetailSource(detail,0,'Bronnen'),sources(records[0]));
 assert.match(detail.rows[1][9].formula,/'03 Referentiekader'!G5/);
 assert.match(detail.rows[1][13].formula,/'04 Uitvoering'!A5/);
 assert.deepEqual(detail.detailRecords.map(r=>r.pointId),['one','two']);
 const evidence=workbookEvidence(records,draft);
 checkBook({...templateDesign(),sheets:[detail],evidence});
 assert.equal(evidence[1].savedMaterial.sourceContext,longSource);
 assert.equal(evidence[1].lawTrace,records[1].material.lawTrace);
 assert(Object.values(detail.heights).every(h=>h<=409));
});

for(const profile of ['risk','interview'])test(`${profile} keeps editable fields live and stores long source context separately`,()=>{
 const records=[record('one','Short context'),record('two',longSource)];
 const book=profileTemplateWorkbook({meta:{},fixtureRecords:records},draft,{profile,basis:'norms'},{});
 const detail=book.sheets.at(-1);
 assert.equal(readDetailSource(detail,1,'Broncontext'),sourceBackground(records[1]));
 assert.equal(readDetailSource(detail,0,'Broncontext'),sourceBackground(records[0]));
 const sourcesIndex=detail.viewer.labels.indexOf('Bronnen');
 const sourcesRow=Number(detail.viewer.sections[sourcesIndex].text.slice(1));
 const lookup=detail.rows[sourcesRow-1][1].formula.match(/INDEX\(\$([A-Z]+)\$2:/)[1];
 const c=[...lookup].reduce((n,c)=>26*n+c.charCodeAt(0)-64,0)-1;
 assert.match(detail.rows[1][c].formula,/INDEX\('/);
 assert.match(detail.rows[1][c].formula,/MATCH\("one"/,'Register sort/edits still resolve by point ID');
 checkBook(book);assert.equal(book.evidence[1].savedMaterial.sourceContext,longSource);
});

test('short sections retain their existing labels and single lookup cells',()=>{
 const detail=templateDetailViewer({entries:[record('one','Short context')],merges:[]});
 assert.deepEqual(detail.viewer.labels,['Toetspunt','Norm','Context','Bronnen']);
 assert.equal(detail.detailRecords[0].contents[3],detail.rows[1][12]);
});

test('oversized literal AND cached formula values fail with the exact sheet and cell, not a note diagnosis',()=>{
 const sheet={name:'Synthetic sheet',widths:[20],rows:[['']],heights:{1:24},rowStyles:{},merges:[]};
 for(const cell of ['x'.repeat(32768),{formula:'"x"',value:'x'.repeat(32768)}]){
  sheet.rows[0][0]=cell;
  assert.throws(()=>workbookPackage({...templateDesign(),sheets:[sheet]}),/Synthetic sheet!A1.*32\.767/);
 }
});
