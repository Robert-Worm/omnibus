import {fittedRowHeight} from './excel-text-height.mjs';
import {readingStyles as rs} from './excel-template-style.mjs';
import {excelColumnName,splitDetailTextSections} from './excel-detail-text.mjs';

// One point selector drives every section. Reserve enough reading space for
// each section's longest selectable value; ordinary Excel formulas cannot
// resize merged rows when a selector changes. Keep physical rows below 409pt.
const shortNote='… Ingekort in deze weergave; de volledige tekst staat in Omnibus bij dit toetspunt.';
/** Kort een tekst in tot hij in de hoogte past: hele regels, met een verwijzing naar de volledige tekst. */
export function shortenToHeight(text,height,width,note=shortNote){
 const lines=String(text??'').split('\n');let kept=[];
 for(const line of lines){const next=[...kept,line];if(fittedRowHeight([...next,'',note].join('\n'),width)>height)break;kept=next;}
 while(kept.length&&!kept.at(-1).trim())kept.pop();
 return [...kept,'',note].join('\n');
}
export function addDetailSections(s,labels,firstColumn,end,pos,set){
 const columns=splitDetailTextSections(s,labels,firstColumn,set),split=labels.some(label=>/\(vervolg \d+\)$/u.test(label));
 let row=8;
 const sections=[],width=s.widths.slice(1,5).reduce((a,b)=>a+b,0);
 labels.forEach((label,i)=>{
  const heading=row++,start=row;
  set(heading,1,label,rs.section);s.heights[heading]=28;s.merges.push(`B${heading}:E${heading}`);
  // Eén toetspunt met een heel lange tekst maakte het vak voor elk toetspunt honderden tot duizenden punten hoog: enorme
  // witte vlakken (panel 19 november 2026). Het vak krijgt de hoogte die drie op de vier toetspunten nodig hebben
  // (minstens 300 punten). Een langere tekst wordt in deze weergave op een regelgrens ingekort, met een verwijzing naar
  // de volledige tekst; een formule naar het referentiekader blijft voor alle andere toetspunten staan.
  const fits=s.detailRecords.map(e=>fittedRowHeight(e.contents[i],width)),sorted=[...fits].sort((a,b)=>a-b);
  const cap=!split?Math.max(300,sorted[Math.floor(.75*(sorted.length-1))]??0):Infinity;
  if(!split)s.detailRecords.forEach((e,k)=>{const cell=s.rows[k+1]?.[columns[i]];if(fits[k]<=cap||!cell)return;
   const where=cell?.formula?`… Ingekort in deze weergave; de volledige tekst staat in ${s.registerName||'het referentiekader'}.`:shortNote;
   const short=shortenToHeight(e.contents[i],cap,width,where);set(k+2,columns[i],short);e.contents[i]=short;fits[k]=fittedRowHeight(short,width);});
  const height=Math.max(24,...fits);
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
