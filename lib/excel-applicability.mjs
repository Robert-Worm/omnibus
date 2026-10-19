import {applicabilityLabels} from './applicability.mjs';
import {fittedRowHeight} from './excel-text-height.mjs';
import {readingStyles} from './excel-template-style.mjs';

function readableChunks(text,width){
 if(fittedRowHeight(text,width)<=280)return [text];
 const characters=Array.from(text),chunks=[];
 for(let start=0;start<characters.length;){
  let low=1,high=characters.length-start;
  while(low<high){
   const size=Math.ceil((low+high)/2);
   if(fittedRowHeight(characters.slice(start,start+size).join(''),width)<=280)low=size;
   else high=size-1;
  }
  let end=start+low;
  // Prefer a nearby word boundary, but never split a Unicode codepoint.
  if(end<characters.length)for(let cut=end;cut>Math.max(start,end-60);cut--)if(/\s/.test(characters[cut-1])){end=cut;break;}
  chunks.push(characters.slice(start,end).join(''));start=end;
 }
 return chunks;
}

// Scope decisions are saved research data, not a request to select more norms.
// Resolve labels only from the exported snapshots; never fetch a newer edition
// or reconstruct unanswered decisions from the current catalogue.
export function appendSavedApplicability(sheet,assessments,records){
 if(!assessments?.length)return;
 const exported=new Map(records.filter(r=>r.material?.originKey).map(r=>[r.material.originKey,r]));
 const add=(values,height,style=1)=>{
  const row=sheet.rows.push(sheet.widths.map((_,i)=>values[i]??''));
  sheet.heights[row]=height;sheet.rowStyles[row]=style;return row;
 };
 const span=(row,first,last,style)=>{
  for(let c=first;c<=last;c++)(sheet.cellStyles[row]??={})[c]=style;
  if(first!==last)sheet.merges.push(`${String.fromCharCode(65+first)}${row}:${String.fromCharCode(65+last)}${row}`);
 };
 add([],14);
 span(add(['','Vastgelegde toepasselijkheid'],28),1,6,49);
 span(add(['','Opgeslagen keuzes, inclusief punten buiten deze export.'],26),1,6,48);
 // Preserve the existing F gutter and all version/team fields above this area.
 const groups=[[1,2],[3,4],[6,6]],widths=groups.map(([first,last])=>sheet.widths.slice(first,last+1).reduce((a,b)=>a+b,0));
 const header=add(['','Toetspunt / keuze','','Motivering','','','Dossierverwijzing'],32);
 for(const [first,last] of groups)span(header,first,last,readingStyles.section);
 sheet.applicabilityEntries=[];
 for(const assessment of assessments){
  const record=exported.get(assessment.originKey);
  const label=[record?.pointId||assessment.originKey,applicabilityLabels[assessment.status],record?'In deze export':'Buiten deze export'].join('\n');
  // Exact continuation slices keep long decisions readable without oversized
  // cells. The embedded register also preserves the original fields verbatim.
  const chunks=[label,assessment.reason,assessment.evidence].map((text,i)=>readableChunks(text,widths[i]));
  const row=sheet.rows.length+1;
  for(let part=0;part<Math.max(...chunks.map(c=>c.length));part++){
   const text=chunks.map(c=>c[part]??''),height=Math.max(28,...text.map((value,i)=>fittedRowHeight(value,widths[i])));
   const r=add(['',text[0],'',text[1],'','',text[2]],height);
   for(const [first,last] of groups)span(r,first,last,readingStyles.sourceBody);
  }
  sheet.applicabilityEntries.push({...assessment,pointId:record?.pointId||'',exported:Boolean(record),row,endRow:sheet.rows.length});
 }
}
