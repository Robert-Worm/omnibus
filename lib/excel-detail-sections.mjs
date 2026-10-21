import {fittedRowHeight} from './excel-text-height.mjs';
import {readingStyles as rs} from './excel-template-style.mjs';
import {excelColumnName,splitDetailTextSections} from './excel-detail-text.mjs';

// One point selector drives every section. Reserve enough reading space for
// each section's longest selectable value; ordinary Excel formulas cannot
// resize merged rows when a selector changes. Keep physical rows below 409pt.
export function addDetailSections(s,labels,firstColumn,end,pos,set){
 const columns=splitDetailTextSections(s,labels,firstColumn,set);
 let row=8;
 const sections=[],width=s.widths.slice(1,5).reduce((a,b)=>a+b,0);
 labels.forEach((label,i)=>{
  const heading=row++,start=row;
  set(heading,1,label,rs.section);s.heights[heading]=28;s.merges.push(`B${heading}:E${heading}`);
  const height=Math.max(24,...s.detailRecords.map(e=>fittedRowHeight(e.contents[i],width)));
  const span=Math.max(1,Math.ceil(height/300)),last=start+span-1;
  for(let r=start;r<=last;r++){for(let c=1;c<=4;c++)set(r,c,'',rs.body);s.heights[r]=height/span;}
  const column=excelColumnName(columns[i]);
  set(start,1,{formula:`IF($B$4="","Geen punten geselecteerd.",INDEX($${column}$2:$${column}$${end},${pos}))`,value:s.detailRecords[0]?.contents[i]??'Geen punten geselecteerd.'},rs.body);
  s.merges.push(`B${start}:E${last}`);sections.push({label,heading:`B${heading}`,text:`B${start}`,last});
  row=last+2;set(last+1,1,'',1);s.heights[last+1]=10;
 });
 s.viewer={input:'B4',sections,labels,last:row-2,maxLength:Math.max(0,...s.detailRecords.flatMap(e=>e.contents.map(x=>x.length)))};
 // Lookup records can extend far below the reading area. They are not blank
 // pages for the reader and must not lengthen scrolling or printouts.
 s.hiddenRows=Array.from({length:Math.max(0,s.rows.length-s.viewer.last-1)},(_,i)=>s.viewer.last+2+i);
 s.printArea=`B2:E${s.viewer.last}`;
}
