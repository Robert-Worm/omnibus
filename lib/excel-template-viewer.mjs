import {addDetailSections} from './excel-detail-sections.mjs';
import {sourceBackground} from './excel-saved-evidence.mjs';
const f=(formula,value='')=>({formula,value});
const col=n=>String.fromCharCode(65+n);
export const detailSheetName='05 Detailviewer';
export function templateDetailViewer(main,execution) {
 const aspects=execution?.aspects||[],hasInterviews=main.entries.some(e=>e.line?.materialKind==='model-question');
 const labels=['Toetspunt','Norm','Context','Bronnen',...aspects.map(a=>({opzet:'Opzet',bestaan:'Bestaan',werking:'Werking'})[a]),...(hasInterviews?['Interview en verificatie']:[])];
 const s={name:detailSheetName,widths:[4,25,30,30,25,4,...Array(10).fill(25),4,24,12],rows:[],heights:{},rowStyles:{},cellStyles:{},merges:[],validations:[],notes:[],hyperlinks:[],outlineRows:{},freeze:4,headerRow:4,zoom:85,templateStyles:true,tabColor:'49677D',hiddenColumns:[6,7,8,9,10,11,12,13,14,15,16,17,18],previewHiddenColumns:[0,5,6,7,8,9,10,11,12,13,14,15,16,17,18]};
 const set=(r,c,v,style=16)=>{while(s.rows.length<r){s.rows.push(s.widths.map(()=>''));s.rowStyles[s.rows.length]=1;s.heights[s.rows.length]=24;}(s.cellStyles[r]??={})[c]=style;s.rows[r-1][c]=v;};
 const merged=(r,v,style)=>{set(r,1,v,style);s.merges.push(`B${r}:E${r}`);};
 if(!execution)s.name='04 Detailviewer';
 merged(2,'Norm en toetspunt bekijken',47);s.heights[2]=36;
 merged(3,'Kies een toetspunt. Alle bijbehorende informatie staat hieronder.',48);
 merged(4,main.entries[0]?main.entries[0].pointId+' · '+main.entries[0].title:'',33);s.heights[4]=44;
 s.heights[5]=10;
 set(6,1,f('HYPERLINK("#\'02 Onderzoeksvragen\'!C2","Per vraag bekijken")','Per vraag bekijken'),17);s.merges.push('B6:C6');
 const end=Math.max(2,main.entries.length+1),pos=`MATCH($B$4,$G$2:$G$${end},0)`;
 set(6,3,f(`IF($B$4="","",HYPERLINK("#'03 Referentiekader'!G"&INDEX($H$2:$H$${end},${pos}),"Naar referentiekader"))`,main.entries.length?'Naar referentiekader':''),17);s.merges.push('D6:E6');
 if(execution){
  set(7,1,f(`IF($B$4="","",IF(INDEX($I$2:$I$${end},${pos})="","",HYPERLINK("#'04 Uitvoering'!B"&INDEX($I$2:$I$${end},${pos}),"Bevindingen en oordeel invullen")))`,execution.entries.some(e=>e.lineId===main.entries[0]?.lineId)?'Bevindingen en oordeel invullen':''),17);s.merges.push('B7:E7');
 }
 s.detailRecords=[];
 for(const [i,e] of main.entries.entries()){
  const r=i+2,ex=execution?.entries.find(x=>x.lineId===e.lineId),point=e.pointText;
  const context=['Doel','Risico','Beheersdoelstelling','Beheersmaatregel'].map((label,j)=>label+'\n'+(j===2?e.goal:e.get(['objective','risk','','control'][j]))).join('\n\n');
  const sources=[...e.sources.map(x=>[x.title,'Grondslag: '+x.basis,x.location,x.url].filter(Boolean).join('\n')),sourceBackground(e)].filter(Boolean).join('\n\n');
  const interview=e.line?.materialKind==='model-question'?[...new Set(['auditQuestion','interview','procedure','documentation'].map(id=>e.get(id)).filter(Boolean))].join('\n\n'):'';
  const contents=[point,e.parent,context,sources,...aspects.map(a=>ex?.plans[a]||''),...(hasInterviews?[interview]:[])];
  s.detailRecords.push({pointId:e.pointId,contents});
  const choice=e.pointId+' · '+e.title;
  set(r,6,choice);set(r,7,e.row);set(r,8,ex?.row||'');
  contents.forEach((text,j)=>set(r,9+j,text));
  const parentMerge=main.merges.find(m=>m.startsWith('F')&&Number(m.match(/\d+/)[0])<=e.row&&Number(m.match(/\d+$/)[0])>=e.row),parentRow=parentMerge?Number(parentMerge.match(/\d+/)[0]):e.row;
  set(r,9,f(`'03 Referentiekader'!G${e.row}`,contents[0]));
  set(r,10,f(`'03 Referentiekader'!F${parentRow}`,contents[1]));
  if(ex)aspects.forEach((a,i)=>{const approach=col(execution.columnIds.indexOf(a+'Approach')),evidence=col(execution.columnIds.indexOf(a+'ExpectedEvidence'));set(r,13+i,f(`'04 Uitvoering'!${approach}${ex.row}&IF('04 Uitvoering'!${evidence}${ex.row}="","",CHAR(10)&CHAR(10)&"Verwacht bewijs:"&CHAR(10)&'04 Uitvoering'!${evidence}${ex.row})`,contents[4+i]));});
 }
 s.validations.push({range:'B4',formula:`$G$2:$G${end}`});
 addDetailSections(s,labels,9,end,pos,set);return s;
}
