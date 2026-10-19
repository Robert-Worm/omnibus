import {readingStyles as rs} from './excel-template-style.mjs';
import {testingAspectLabel} from './testing-aspects.mjs';
import {fittedRowHeight} from './excel-text-height.mjs';
import {operationGuidance,unselectedOperationText} from './excel-operation-guidance.mjs';
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const f=(formula,value='')=>({formula,value});
const clean=v=>String(v?.formula?v.value:v??'');
export const readingHeight=(text,width)=>Math.max(30,clean(text).split('\n').reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/Math.max(8,width*.8))),0)*15+12);
export function splitPhasePlan(text){
 const evidence=[];
 const approach=clean(text).replace(/(^|\n\n)Verwacht bewijs(?: \(voorstel\))?:[ \t]*\n?([\s\S]*?)(?=\n\n|$)/g,(_,space,value)=>{evidence.push(value.trim());return space;})
  // Export presentation only: omit the repeated general disclaimer, never
  // the point-specific limitations or the immutable source/snapshot text.
  .replace(/(^|\n\n)Bewijsgrens:[ \t]*([^\n]*)/g,(paragraph,space,boundary)=>{
   const disclaimer='Beoordeling van opzet/bestaan levert geen conclusie over duurzame werking over een periode op.';
   if(!boundary.includes(disclaimer))return paragraph;
   const remaining=boundary.split(disclaimer).map(part=>part.trim()).filter(Boolean).join(' ');
   return remaining?space+'Bewijsgrens: '+remaining:space;
  }).replace(/\n{3,}/g,'\n\n').trim();
 return {approach,evidence:[...new Set(evidence.filter(Boolean))].join('\n\n')};
}
export function executionSheet(model,main,options){
 // Interview material remains in the register and detail viewer, never in
 // compliance execution. This matches the source workbook's eligibility rule.
 const entries=main.entries.filter(e=>e.line?.materialKind!=='model-question');
 const original=model.sheets.find(s=>s.registerKind==='testing'),selected=original?.entries[0]?.aspects||options.testingAspects,aspects=selected?.length?selected:['opzet','bestaan'];
 const widths=[4,15,16,64,...aspects.flatMap(()=>[52,40,42,19]),23,16,24,19,30];
 const s={name:'04 Uitvoering',widths,rows:[],merges:[],heights:{},rowStyles:{},cellStyles:{},validations:[],notes:[],hyperlinks:[],outlineRows:{},conditionalFormats:[],freeze:4,freezeColumns:3,zoom:85,tabColor:'49677D',previewHiddenColumns:[0],templateStyles:true,entries:[],aspects,registerKind:'testing',outlineSummaryBelow:false};
 s.columnIds=['gutter','pointId','questionRefs','criterion',...aspects.flatMap(a=>[a+'Approach',a+'ExpectedEvidence',a+'Record',a+'Verdict']),'tester','testedOn','status','selection','completionCheck'];
 const add=(values=[],height=24)=>{const r=s.rows.push(widths.map((_,c)=>values[c]??''));s.heights[r]=height;s.rowStyles[r]=1;return r;};
 const set=(r,c,value,style)=>{s.rows[r-1][c]=value;(s.cellStyles[r]??={})[c]=style;};
 const merge=(c,r,d,last=r)=>s.merges.push(`${col(c)}${r}:${col(d)}${last}`);
 add([],14);add([],38);set(2,1,f(`"Toetsuitvoering"&IF('01 Versiebeheer'!E4="",""," · "&'01 Versiebeheer'!E4)`,['Toetsuitvoering',model.meta.focus||model.meta.scope].filter(Boolean).join(' · ')),47);merge(1,2,6);
 add([],28);set(3,1,'Norm en toetspunt zijn volledig leesbaar. Vul bevindingen, bewijsreferenties en oordelen in bij de gekozen werkfasen.',48);merge(1,3,6);
 add([],28);set(4,1,f('HYPERLINK("#\'05 Detailviewer\'!B4","Open de detailviewer")','Open de detailviewer'),17);merge(1,4,3);
 const admin=4+4*aspects.length,ref=`'${main.name}'!`,refEnd=Math.max(5,main.rows.length);
 const lookup=(column,r,cache)=>f(`IF($B${r}="","",IF(COUNTIF(${ref}$B$5:$B$${refEnd},$B${r})<>1,"Controleer ID",INDEX(${ref}$${column}$5:$${column}$${refEnd},MATCH($B${r},${ref}$B$5:$B$${refEnd},0))&""))`,cache);
 const groups=[];
 for(const e of entries){let g=groups.at(-1);if(!g||g.element!==e.element||g.parent!==e.parent){g={element:e.element,parent:e.parent,entries:[]};groups.push(g);}g.entries.push(e);}
 // Preserve instructions and overrides; separate explicitly labelled evidence
 // and omit only the generic boundary boilerplate in the export presentation.
 const prepared=new Map(entries.map(e=>{
  const orig=original?.entries.find(v=>v.lineId===e.lineId),get=id=>orig?clean(original.rows[orig.row-1][original.columnIds.indexOf(id)]):'';
  const parts=Object.fromEntries(aspects.map(a=>{
   const current=get(a+'Approach'),m=e.material,phase=m?.[{opzet:'testDesign',bestaan:'testExistence',werking:'testOperation'}[a]];
   const needsOperationHelp=a==='werking'&&current===unselectedOperationText;
   // Explicit authored phase text takes precedence over the old placeholder.
   const text=needsOperationHelp&&phase?phase:(m?.cioTrace||m?.lawTrace||m?.topicalTrace)&&phase&&current===m.documents+'\n\n'+phase?phase:current;
   if(needsOperationHelp&&!phase)return [a,{...operationGuidance(e),original:current,planningHelp:true}];
   return [a,{...splitPhasePlan(text),original:text}];
  }));return [e.lineId,parts];
 }));
 // Widen only when required to keep a complete cell within Excel's row limit.
 for(const e of entries){while(readingHeight(e.pointText,widths[3])>330&&widths[3]<255)widths[3]=Math.min(255,widths[3]+4);
  aspects.forEach((a,i)=>{const p=prepared.get(e.lineId)[a];for(const [offset,key] of [[0,'approach'],[1,'evidence']])while(readingHeight(p[key],widths[4+4*i+offset])>330&&widths[4+4*i+offset]<255)widths[4+4*i+offset]=Math.min(255,widths[4+4*i+offset]+4);});
 }
 const labels=['','Toetspunt-ID','Vragen','Volledig toetspunt',...aspects.flatMap(a=>{const l=testingAspectLabel(a,model.meta.testingTerminology);return [l+' · Instructie',l+' · Verwacht bewijs',l+' · Bevinding / bewijsreferentie',l+' · Oordeel'];}),'Getoetst door','Datum','Status','Selectie','Invulcontrole'];
 let element='';
 for(const [gi,g] of groups.entries()){
  // Outside the outline: separation remains visible when point rows collapse.
  if(gi)add([],10);
  if(g.element!==element){element=g.element;const r=add([],32);set(r,1,'Element / focusgebied · '+element,rs.section);merge(1,r,widths.length-1);}
  const e0=g.entries[0],parentMerge=main.merges.find(m=>m.startsWith('F')&&Number(m.match(/\d+/)[0])<=e0.row&&Number(m.match(/\d+$/)[0])>=e0.row),pr=parentMerge?Number(parentMerge.match(/\d+/)[0]):e0.row;
  const normHeight=Math.max(34,fittedRowHeight('Norm\n'+g.parent,widths[1]+widths[2]+widths[3],{bold:true})),span=Math.max(1,Math.ceil(normHeight/330)),gh=s.rows.length+1;
  for(let k=0;k<span;k++){const r=add([],normHeight/span);for(let c=1;c<widths.length;c++)set(r,c,'',rs.norm);}
  set(gh,1,f(`"Norm"&CHAR(10)&${ref}F${pr}`,'Norm\n'+g.parent),rs.norm);merge(1,gh,3,s.rows.length);merge(4,gh,widths.length-1,s.rows.length);
  const hr=add(labels,56);for(let c=1;c<widths.length;c++)set(hr,c,labels[c],rs.section);
  aspects.forEach((a,i)=>{for(let c=4+4*i;c<8+4*i;c++)set(hr,c,labels[c],rs[a+'Header']);});if(!s.headerRow)s.headerRow=hr;
  for(const e of g.entries){
   const r=s.rows.length+1,parts=prepared.get(e.lineId),plans=Object.fromEntries(aspects.map(a=>[a,[parts[a].approach,parts[a].evidence?'Verwacht bewijs:\n'+parts[a].evidence:''].filter(Boolean).join('\n\n')]));
   const values=['',e.pointId,lookup('C',r,e.refs),lookup('G',r,e.pointText),...aspects.flatMap(a=>[parts[a].approach,parts[a].evidence,'','']),'','','Niet gestart',lookup('K',r,'Meenemen'),''];
   const height=Math.max(36,...values.slice(1,admin).map((v,c)=>fittedRowHeight(v,widths[c+1])));add(values,Math.min(409,height));s.outlineRows[r]=1;
   for(let c=1;c<widths.length;c++)set(r,c,values[c],c===2?rs.question:c>=admin?c===admin+1?rs.date:rs.admin:rs.body);
   s.hyperlinks.push({ref:'B'+r,location:`'${main.name}'!B${e.row}`,tooltip:'Open de bronverantwoording bij dit toetspunt'});
   const missing=[];
   aspects.forEach((a,i)=>{const c=4+4*i,approach=col(c),record=col(c+2),verdict=col(c+3);[a+'Plan',a+'Evidence',a+'Input',a+'Input'].forEach((name,j)=>set(r,c+j,values[c+j],rs[name]));
    missing.push(`AND(ISERROR(SEARCH("NOT_SELECTED",${approach}${r})),OR(${record}${r}="",${verdict}${r}=""))`);
    const list=e.line?.materialKind==='model-question'?'Beantwoord,Deels beantwoord,Niet te bepalen,Niet van toepassing':'Voldoet,Voldoet deels,Voldoet niet,Onvoldoende bewijs,Niet van toepassing';s.validations.push({range:verdict+r,formula:'"'+list+'"'});
   });
   s.validations.push({range:col(admin)+r,formula:'Teamleden'},{range:col(admin+2)+r,formula:'"Niet gestart,In uitvoering,Gereed voor review,Afgerond"'});
   set(r,admin+4,f(`IF(B${r}="","",IF(COUNTIF(${ref}$B$5:$B$${refEnd},B${r})<>1,"Controleer ID",IF(${col(admin+3)}${r}<>"Meenemen","Niet meegenomen",IF(OR(${col(admin+2)}${r}="Gereed voor review",${col(admin+2)}${r}="Afgerond"),IF(OR(${col(admin)}${r}="",${col(admin+1)}${r}="",${missing.join(',')}),"Vul bewijs, oordeel, uitvoerder en datum aan","Compleet voor review"),""))))`),rs.admin);
   s.entries.push({...e,row:r,endRow:r,aspects,plans,phaseParts:parts,normRow:gh});
  }
  s.tables??=[];s.tables.push({name:'Toets_'+(gi+1),ref:`B${hr}:${col(widths.length-1)}${s.rows.length}`,style:'TableStyleLight1'});
  const first=hr+1,last=s.rows.length,selection=col(admin+3),status=col(admin+2);
  set(gh,4,f(`COUNTIF(${selection}${first}:${selection}${last},"Meenemen")&" / ${g.entries.length} meegenomen"&CHAR(10)&COUNTIFS(${selection}${first}:${selection}${last},"Meenemen",${status}${first}:${status}${last},"Afgerond")&" afgerond"`,`${g.entries.length} / ${g.entries.length} meegenomen\n0 afgerond`),rs.norm);
 }
 if(!groups.length){s.headerRow=add(labels,56);for(let c=1;c<widths.length;c++)set(s.headerRow,c,labels[c],rs.section);}
 s.previewHeaderRow=s.headerRow;return s;
}
