import assert from 'node:assert/strict';
import {workbookPackage} from './excel-export.mjs';

// Public worksheet contract, not a removed viewer property like lookupChoices.
export function exportedRegister(book,profile){
 const names={testing:'03 Referentiekader',risk:'03 Risico-controlmatrix',interview:'03 Interviewleidraad'};
 assert(Object.hasOwn(names,profile),'Unknown export profile');
 const sheets=book.sheets.filter(s=>s.name===names[profile]);
 assert.equal(sheets.length,1,`${profile}: exactly one main register`);
 const sheet=sheets[0];
 assert(Array.isArray(sheet.entries),`${profile}: missing entries`);
 assert(Array.isArray(sheet.columnIds),`${profile}: missing column identities`);
 assert.equal(new Set(sheet.entries.map(e=>e.lineId)).size,sheet.entries.length,`${profile}: duplicate selected point`);
 for(const entry of sheet.entries){
  assert(Number.isInteger(entry.row)&&entry.row>0,`${profile}: invalid first row`);
  assert(Number.isInteger(entry.endRow)&&entry.endRow>=entry.row&&entry.endRow<=sheet.rows.length,`${profile}: invalid row range`);
 }
 return sheet;
}

export const exportedCellText=value=>String(value&&typeof value==='object'?value.value??'':value??'');
const decodeXml=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[key]);

// Legacy report selections retain their immutable framework identities. The
// testing layout keeps the interview prompt in the point's cell note; the risk
// and interview layouts show it in their detail cells. Check the actual package
// and point association, not JSON-escaped text or a retired worksheet name.
export function reportSelectionExport(book,framework,draft,profile){
 const register=exportedRegister(book,profile),selected=framework.lines.filter(l=>draft.included.includes(l.id));
 const expected=selected.map(l=>l.id).sort(),files=workbookPackage(book);
 assert.deepEqual(register.entries.map(e=>e.lineId).sort(),expected,'Exactly the selected report points');
 const evidenceXml=files['customXml/item1.xml'];assert(evidenceXml,'Report evidence payload');
 const evidence=JSON.parse(decodeXml(evidenceXml.match(/<evidence[^>]*>([\s\S]*)<\/evidence>/)[1]));
 assert.deepEqual(evidence.map(e=>e.lineId).sort(),expected,'Exactly the selected report source records');
 const viewers=book.sheets.filter(s=>Array.isArray(s.detailRecords));assert.equal(viewers.length,1);
 const viewer=viewers[0],sourceIndex=viewer.viewer.labels.indexOf('Bronnen');assert(sourceIndex>=0);
 assert.deepEqual(viewer.detailRecords.map(r=>r.pointId).sort(),register.entries.map(e=>e.pointId).sort());
 const comments=decodeXml(files[`xl/comments${book.sheets.indexOf(register)+1}.xml`]||'');
 const records=new Map();
 for(const line of selected){
  const entry=register.entries.find(e=>e.lineId===line.id),saved=evidence.find(e=>e.lineId===line.id);
  const detail=viewer.detailRecords.find(r=>r.pointId===entry.pointId);assert(detail,line.id+' detail identity');
  const own=draft.overrides[line.id]||{},expectedField=key=>Object.hasOwn(own,key)?own[key]:line[key]?.text||'';
  assert.equal(entry.point,expectedField('criterion'),line.id+' full effective norm');
  assert.equal(saved.pointId,entry.pointId);assert.deepEqual(saved.sources,entry.sources);
  assert.deepEqual(saved.overrides,own);assert.equal(saved.note,draft.notes[line.id]||'');
  for(const text of detail.contents)assert(viewer.rows.some(row=>row.some(cell=>exportedCellText(cell)===text)),line.id+' detail reaches cells');
  if(line.exportContext)assert(detail.contents[sourceIndex].includes(line.exportContext),line.id+' local source qualification');
  assert(detail.contents[sourceIndex].includes(line.report_id),line.id+' report identity');
  const question=expectedField('auditQuestion');
  if(question){
   if(profile==='testing'){
    const ref='G'+entry.row,note=register.notes.find(n=>n.ref===ref);assert(note?.text.includes(question),line.id+' question in its point note');
    const serialized=[...comments.matchAll(/<comment ref="([^"]+)"[^>]*>([\s\S]*?)<\/comment>/g)].find(m=>m[1]===ref);
    assert(serialized?.[2].includes(question),line.id+' question in the serialized point note');
   }else assert(detail.contents.some(text=>text.includes(question)),line.id+' readable interview question');
  }
  records.set(line.id,{entry,saved,detail});
 }
 const text=book.sheets.flatMap(s=>[...s.rows.flat().map(exportedCellText),...(s.notes||[]).map(n=>n.text)]).join('\n');
 return {register,viewer,records,text,files};
}

// The current template intentionally removes repeated "Voorstel:" prefixes.
// Preserve the authored approach and its provenance without mistaking a past
// finding for a newly completed test. This helper is for untouched legacy rows.
export function untouchedReportExport(book,framework,draft,profile){
 const result=reportSelectionExport(book,framework,draft,profile),{register,viewer,records,files}=result;
 for(const line of framework.lines.filter(l=>draft.included.includes(l.id))){
  assert(!Object.hasOwn(draft.overrides[line.id]||{},'procedure'),'Use an untouched report procedure');
  assert.equal(line.procedure.basis,'PROPOSED');
  const {entry,detail,saved}=records.get(line.id);
  const sources=detail.contents[viewer.viewer.labels.indexOf('Bronnen')];
  assert(sources.includes('Herkomst velden: Auditvoorstel'),line.id+' proposal status remains readable');
  assert(saved.sources.some(s=>s.title.includes('Herkomst velden: Auditvoorstel')),line.id+' embedded proposal status');
  if(profile==='testing')continue;
  const approach=detail.contents[viewer.viewer.labels.indexOf('Toetsaanpak')];
  assert(approach?.includes('Toetsaanpak\n'+line.procedure.text),line.id+' complete authored approach in its own detail block');
  assert(!approach.includes('Voorstel: '+line.procedure.text),line.id+' no repeated proposal prefix');
  const xml=decodeXml(files[`xl/worksheets/sheet${book.sheets.indexOf(viewer)+1}.xml`]);
  assert(xml.includes(approach),line.id+' complete approach in serialized detail cells');
  if(profile==='risk'){
   const column=register.columnIds.indexOf('procedure');assert(column>=0,'Risk matrix approach column');
   assert.equal(exportedCellText(register.rows[entry.row-1][column]),line.procedure.text,line.id+' unprefixed matrix approach');
  }
 }
 if(profile==='testing'){
  const execution=book.sheets.filter(s=>s.name==='04 Uitvoering');assert.equal(execution.length,1);
  const sheet=execution[0];assert.deepEqual(sheet.aspects,['opzet','bestaan']);
  assert.deepEqual(sheet.entries.map(e=>e.lineId).sort(),register.entries.map(e=>e.lineId).sort());
  const empty=['opzetApproach','opzetExpectedEvidence','opzetRecord','opzetVerdict',
   'bestaanApproach','bestaanExpectedEvidence','bestaanRecord','bestaanVerdict','tester','testedOn'];
  for(const key of [...empty,'status']){
   const column=sheet.columnIds.indexOf(key);assert(column>=0,'Required execution column: '+key);
   for(const entry of sheet.entries)for(let row=entry.row;row<=entry.endRow;row++)
    assert.equal(exportedCellText(sheet.rows[row-1][column]),key==='status'?'Niet gestart':'',entry.lineId+' untouched '+key);
  }
 }
 return result;
}

// Material-only project exports: check the serialized workbook evidence and
// resolve each detail block by its point ID, never by a non-unique title.
export function savedMaterialExport(book,draft,profile){
 const register=exportedRegister(book,profile),selected=draft.investigation.materials.filter(m=>draft.included.includes(m.id));
 const xml=workbookPackage(book)['customXml/item1.xml'];assert(xml,'Missing embedded saved evidence');
 const match=xml.match(/<evidence[^>]*>([\s\S]*)<\/evidence>/);assert(match,'Missing evidence payload');
 const evidence=JSON.parse(decodeXml(match[1]));
 const ids=rows=>rows.map(r=>r.lineId).sort((a,b)=>a.localeCompare(b));
 const expected=selected.map(m=>m.id).sort((a,b)=>a.localeCompare(b));
 assert.deepEqual(ids(evidence),expected,'Exactly the selected saved materials must be embedded');
 assert.deepEqual(ids(register.entries),expected,'Exactly the selected saved materials must be readable');
 const viewers=book.sheets.filter(s=>Array.isArray(s.detailRecords));assert.equal(viewers.length,1,'One shared detail viewer');
 const viewer=viewers[0],sourceIndex=viewer.viewer.labels.indexOf('Bronnen');assert(sourceIndex>=0,'Source section remains available');
 assert.deepEqual(viewer.detailRecords.map(r=>r.pointId).sort((a,b)=>a.localeCompare(b)),register.entries.map(e=>e.pointId).sort((a,b)=>a.localeCompare(b)));
 const records=new Map();
 for(const material of selected){
  const saved=evidence.find(e=>e.lineId===material.id),restored={...saved.savedMaterial};
  for(const key of ['cioTrace','lawTrace','reportTrace'])if(saved[key]!=null)restored[key]=saved[key];
  assert.deepEqual(restored,material,material.id+' exact saved source fields');
  assert.deepEqual(saved.overrides,draft.overrides[material.id]||{},material.id+' own edits');
  assert.equal(saved.note,draft.notes[material.id]||'',material.id+' own note');
  const entry=register.entries.find(e=>e.lineId===material.id),detail=viewer.detailRecords.find(r=>r.pointId===entry.pointId);
  assert.equal(saved.pointId,entry.pointId,material.id+' evidence-to-register identity');
  assert.equal(detail.contents.length,viewer.viewer.labels.length,material.id+' complete detail sections');
  for(const content of detail.contents)assert(viewer.rows.some(row=>row.some(cell=>exportedCellText(cell)===content)),material.id+' detail text must reach worksheet cells');
  records.set(material.id,{entry,detail,saved,sources:detail.contents[sourceIndex],text:detail.contents.join('\n')});
 }
 return {register,viewer,records};
}
