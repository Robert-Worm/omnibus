// The attached TBB workbook is the layout contract. Source preparation is reused,
// but none of the old register/viewer layout is used for the testing workbook.
import template from './excel-template-assets.json' with {type:'json'};
import {questionNumbers} from './research-plan.mjs';
import {wwkeLabels} from './wwke-law-data.mjs';
import {templateDesign,readingStyles as rs} from './excel-template-style.mjs';
import {templateDetailViewer,detailSheetName} from './excel-template-viewer.mjs';
import {fitExportTypography} from './export-design.mjs';
import {executionSheet} from './excel-template-execution.mjs';
import {sourcePassageUrl,compactSourceText,sourcePageGroups} from './excel-source-links.mjs';
import {workbookEvidence,identifySavedSourceVersions} from './excel-saved-evidence.mjs';
import {appendSavedApplicability} from './excel-applicability.mjs';
import {researchGoalText} from './research-goal.mjs';
import {researchApproachText} from './research-approach.mjs';
import {topicalSpanLocation} from './topical-content.mjs';
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const formula=(formula,value='')=>({formula,value});
const scalar=v=>v&&typeof v==='object'&&'formula' in v?v.value:v;
const sheet=(name,widths)=>({name,widths,rows:[],merges:[],heights:{},rowStyles:{},cellStyles:{},validations:[],notes:[],hyperlinks:[],outlineRows:{},conditionalFormats:[],freeze:4,freezeColumns:0,zoom:85,tabColor:'49677D',headerRow:4,previewHiddenColumns:[0],templateStyles:true});
function row(s,values=[],style=1,height=24){const r=s.rows.push(s.widths.map((_,i)=>values[i]??''));s.rowStyles[r]=style;s.heights[r]=height;return r;}
function set(s,r,c,value,style){while(s.rows.length<r)row(s);s.rows[r-1][c]=value;if(style!=null)(s.cellStyles[r]??={})[c]=style;}
function merge(s,c1,r1,c2,r2=r1){if(c1!==c2||r1!==r2)s.merges.push(`${col(c1)}${r1}:${col(c2)}${r2}`);}
function textHeight(text,width){return Math.max(30,String(scalar(text)??'').split('\n').reduce((a,t)=>a+Math.max(1,Math.ceil(t.length/Math.max(8,width*.8))),0)*15+10);}
function title(s,text,first=1,last=s.widths.length-1){row(s,[],1,14);row(s,[],1,38);set(s,2,first,text,47);merge(s,first,2,last);row(s,[],1,28);}
function header(s,labels,r=4){while(s.rows.length<r)row(s);s.rows[r-1]=s.widths.map((_,i)=>labels[i]||'');s.heights[r]=44;for(let i=1;i<labels.length;i++)set(s,r,i,labels[i],i===1?3:i===labels.length-1?5:4);}
function note(s,ref,text){if(!text)return;const prior=s.notes.find(n=>n.ref===ref);if(prior)prior.text+='\n\n'+text;else s.notes.push({ref,text});}
const clean=v=>String(scalar(v)??'');
const unique=xs=>[...new Set(xs.filter(Boolean))];
export const templateRegisterHeaders=['','Toetspunt-ID','Vragen','Element','Beheersdoelstelling','Norm','Toetspunt','Onderliggende bron','Grondslag','Paginareferentie /\nankerpunt op website','Selectie'];
const mainWidths=[4,13.5,12.5,23.75,33.125,29.375,55.625,33.125,11.875,40,16.875];
const normRefs=s=>`'${s.name}'!`;
export function templateQuestionMatches(refs,key,includeChildren=false){return clean(refs).split(';').map(s=>s.replace(/\s/g,'')).some(s=>s===key||(includeChildren&&s.startsWith(key+'.')));}
function sourceRows(m,e,get,line){
 if(m?.topicalTrace){
  const trace=JSON.parse(m.topicalTrace);
  return trace.point.source_links.map(link=>{
   const r=trace.records.find(r=>r.id===link.record_id);
   return {title:m.sourceTitle,overviewTitle:m.sourceTitle,basis:link.contribution==='PRIMARY'?'N':'A',
    location:[r.locator,...unique(r.source_spans.map(s=>topicalSpanLocation(trace.documents,s)))].join(' · '),
    url:m.sourceUrl,quote:[...r.source_spans.map(s=>topicalSpanLocation(trace.documents,s)+'\n'+s.quote),link.supported_clause,link.explanation].join('\n\n')};
  });
 }
 if(m?.reportTrace){
  const trace=JSON.parse(m.reportTrace);
  return trace.relations.filter(r=>r.role==='MOTIVATES_PROPOSAL').map(r=>({
   title:m.sourceTitle,overviewTitle:m.sourceTitle,basis:'A',location:'PDF p. '+r.page+(r.page_end>r.page?'–'+r.page_end:''),
   url:m.sourceUrl?m.sourceUrl.split('#')[0]+'#page='+r.page:'',format:'pdf',overviewPages:[r.page],
   quote:r.quote+'\n\n'+(r.reason||'')+'\nHistorische onderbouwing van een onderzoeksvoorstel; geen wettelijke grondslag.',
  }));
 }
 if(m?.lawTrace){
  const trace=JSON.parse(m.lawTrace);
  return trace.point.source_links.map(link=>{
   const r=trace.records.find(r=>r.id===link.record_id),spans=link.visible_spans||[];
   const anchor=link.xml_anchor||r.xml_anchor||'',article=anchor.match(/\/Artikel(\d+[a-z]?)(?:\/|$)/i);
   return {title:[m.sourceTitle,wwkeLabels[link.contribution]||link.contribution,r.id].join('\n'),basis:link.basis_code,
    overviewTitle:m.sourceTitle,overviewArticle:article?'Artikel '+article[1]:anchor.includes('/Bijlage')?'Bijlage':r.locator,overviewPages:unique(spans.map(s=>s.page)),
    location:[r.locator,...unique(spans.map(s=>s.page)).map(p=>'p. '+p),link.xml_anchor||r.xml_anchor].filter(Boolean).join(' · '),url:m.sourceUrl,xmlAnchor:anchor,
    quote:[...spans.map(s=>`Publicatie p. ${s.page} [${s.start}–${s.end}]\n${s.quote}`),...(r.xml_evidence?['Consolidatie XML\n'+r.xml_evidence.quote]:[]),
     'Bijdrage: '+link.supported_clause,'Herleiding: '+link.explanation,'Grondslag '+link.basis_code+': '+link.basis_reason,'Bewerking: '+link.derivation+'\n'+(link.derivation_reason||''),'Interpretatiegrens: '+(link.interpretation_boundary||link.unresolved_interpretation||'')].join('\n\n')};
  });
 }
 let trace;try{trace=JSON.parse(m?.cioTrace||'null');}catch{}
 const records=unique(trace?.point?.source_links?.filter(l=>l.contribution==='PRIMARY').map(l=>l.record_id)||[]).map(id=>trace.records?.find(r=>r.id===id)).filter(Boolean);
 if(records.length)return records.map(r=>({title:m.sourceTitle||get('source'),basis:r.source_status==='DIRECT_SOURCE'?'W':'A',location:[r.locator,...unique((r.source_spans||[]).map(s=>s.page)).map(p=>'p. '+p)].filter(Boolean).join(' · '),url:m.sourceUrl||e.sourceUrl||'',quote:(r.source_spans||[]).map(s=>s.quote).join('\n\n')}));
 return [{title:m?.sourceTitle||get('source')||'Eigen uitwerking',basis:line?.report_id||m?.kind==='model-question'?'A':'○',location:get('location')||m?.sourceLocator||'',url:m?.sourceUrl||e.sourceUrl||'',quote:m?.sourceText||''}];
}
export function recordsFrom(model,draft,framework){
 const main=model.sheets.find(s=>s.columnIds&&s.registerKind!=='testing');
 if(!main)return [];
 return identifySavedSourceVersions(main.entries.map(e=>{
  const values=main.rows[e.row-1],get=id=>clean(values[main.columnIds.indexOf(id)]),m=draft.investigation?.materials?.find(m=>m.id===e.lineId),line=framework.lines.find(l=>l.id===e.lineId);
  return {...e,get,material:m,line,title:get('title'),refs:get('questionRefs'),element:get('category')||m?.topic||line?.entity||'Overige bouwstenen',goal:get('controlObjective'),parent:m?.parentCriterion||get('criterion'),point:get('criterion'),sources:sourceRows(m,e,get,line)};
 }));
}
export function versionSheet(model,records=[],draft){
 const s=sheet('01 Versiebeheer',[4,11.125,14.75,22.625,48.75,4,28.75]);s.freeze=0;s.headerRow=5;
 s.exportedAtCell={row:6,column:2};
 const focus=String(model.meta.focus||'').trim(),scope=String(model.meta.scope||'');
 title(s,'Versiebeheer');set(s,3,1,model.title,48);merge(s,1,3,6);
 row(s,[],1,30);set(s,4,1,'Scope · onderzoeksobject',49);merge(s,1,4,3);set(s,4,4,focus?model.meta.focus:scope,50);merge(s,4,4,6);
 header(s,['','Versie','Datum','Gewijzigd door','Wijziging','','Teamleden'],5);set(s,5,5,'',1);set(s,5,6,'Teamleden',2);
 const members=unique([model.meta.author,...String(model.meta.team||'').split(/\r?\n/)].map(x=>x?.trim()));
 for(let i=0;i<10;i++){
  const r=row(s,['',i?'':model.meta.version,i?'':new Date(model.meta.exportedAt),i?'':model.meta.author,i?'':model.meta.change,'',members[i]||''],1,i===0?48:30);
  s.cellStyles[r]={1:7,2:9,3:8,4:8,6:i<5?13:1};
 }
 set(s,11,6,'Vul de namen hierboven in; kies ze bij Gewijzigd door en Getoetst door.',14);s.heights[11]=56;
 row(s,[],1,14);row(s,['','Gebruik één kopie per onderzoeksobject. De scope wijzigt alleen de titel, niet de ingevulde bevindingen.'],48,40);merge(s,1,17,6);
 s.validations.push({range:'D6:D15',formula:'Teamleden'});s.tables=[{name:'Versies',ref:'B5:E15',hideFilters:true,style:'TableStyleLight1'}];
 // Keep optional research context once, outside the version table. No table,
 // question count, source anchor or viewer address moves when it is supplied.
 const context=[['Onderzoeksafbakening',focus&&scope.trim()&&scope.trim()!==focus?scope:''],['Onderzoeksdoelstelling',researchGoalText(draft?.investigation?.goal)],['Onderzoeksaanpak',researchApproachText(draft?.investigation?.researchApproach)]].filter(([,text])=>text);
 if(context.length){
  row(s,[],1,12);
  for(const [label,text] of context){const value=label+': '+text,r=row(s,['',value],48,textHeight(value,s.widths.slice(1).reduce((a,b)=>a+b,0)));merge(s,1,r,6);}
 }
 s.previewHiddenColumns=[0,5];appendSavedApplicability(s,model.applicability,records);return s;
}
function registerSheet(records){
 const displayGoal=p=>p.goal.replace(/^\s*Voorstel\s*:\s*/i,'');
 const s=sheet('03 Referentiekader',[...mainWidths]);s.columnIds=['gutter','pointId','questionRefs','category','controlObjective','parentCriterion','criterion','source','basis','location','selection'];s.freezeColumns=2;s.entries=[];
 s.widths[5]=42;
 for(const c of [3,4,5])for(let i=0;i<records.length;){
  const key=p=>[p.element,...(c>=4?[p.goal]:[]),...(c>=5?[p.parent]:[])].join('\u0000');let j=i;while(j+1<records.length&&key(records[j+1])===key(records[i]))j++;
  const count=j-i+1,value=c===4?displayGoal(records[i]):records[i][{3:'element',5:'parent'}[c]];
  while(textHeight(value,s.widths[c])>330*count&&s.widths[c]<255)s.widths[c]=Math.min(255,s.widths[c]+4);i=j+1;
 }
 for(const p of records)while(textHeight([p.title,p.point].join(':\n'),s.widths[6])>330&&s.widths[6]<255)s.widths[6]=Math.min(255,s.widths[6]+4);
 const sourceText=compactSourceText;
 for(const p of records)for(const [c,key] of [[7,'title'],[8,'basis'],[9,'location']])while(textHeight(sourceText(p,key),s.widths[c])>330&&s.widths[c]<255)s.widths[c]=Math.min(255,s.widths[c]+4);
 title(s,'Referentiekader');set(s,3,1,'Grondslag per bron:  W · Wettelijk   N · Verplichte norm   A · Afgeleide toetsuitwerking   ○ · Te bevestigen',56);merge(s,1,3,10);
 header(s,templateRegisterHeaders);
 for(const p of records){
  const start=s.rows.length+1;
  const point=[p.title,p.point].filter(Boolean).join(':\n');
  // One logical point block. Only the page-link column is subdivided when
  // different source pages need their own clickable destination.
  const values=['',p.pointId,p.refs,p.element,displayGoal(p),p.parent,point,sourceText(p,'title'),sourceText(p,'basis'),sourceText(p,'location'),'Meenemen'];
  const required=Math.max(...[1,2,6,7,8,9,10].map(c=>textHeight(values[c],s.widths[c])));
  const pages=sourcePageGroups(p),links=pages.length?pages:[{label:values[9],target:''}];
  const linkHeights=links.map(g=>textHeight(g.label,s.widths[9])),extra=Math.max(0,required-linkHeights.reduce((a,b)=>a+b,0))/links.length;
  for(const [i,link] of links.entries()){
   const r=row(s,i?[]:values,1,Math.min(409,linkHeights[i]+extra));
   s.cellStyles[r]={1:rs.linked,2:rs.question,3:rs.norm,4:rs.norm,5:rs.norm,6:rs.body,7:rs.linked,8:rs.body,9:rs.linked,10:rs.admin};
   set(s,r,9,link.label);
   if(link.target)s.hyperlinks.push({ref:'J'+r,target:link.target,tooltip:'Open deze bronpagina / het eerste genoemde artikel'});
  }
  const end=s.rows.length;
  for(const c of [1,2,6,7,8,10])merge(s,c,start,c,end);
  const urls=unique(p.sources.map(x=>x.url).filter(x=>/^https?:\/\//i.test(x)));
  if(urls.length===1)s.hyperlinks.push({ref:'H'+start,target:urls[0],tooltip:'Open de oorspronkelijke bron'});
  s.entries.push({...p,row:start,endRow:end,pointText:point});
  s.validations.push({range:`K${start}`,formula:'"Meenemen,Niet meenemen"'});
  if(!values[8].includes('\n'))s.validations.push({range:`I${start}`,formula:'"W,N,A,○"'});
  const detail=unique(['objective','risk','control','auditQuestion','interview','documentation','procedure','comments'].map(id=>p.get(id)?`${({objective:'Doel',risk:'Risico',control:'Beheersmaatregel',auditQuestion:'Toetsvraag',interview:'Interview',documentation:'Documentatie',procedure:'Toetswijze',comments:'Auditnotitie'})[id]}\n${p.get(id)}`:'')).join('\n\n');
  note(s,'G'+start,detail);
 }
 // Hierarchy is merged only within adjacent identical parent groups.
 for(const c of [3,4,5]){
  for(let i=0;i<s.entries.length;){let j=i;const key=p=>[p.element,...(c>=4?[p.goal]:[]),...(c>=5?[p.parent]:[])].join('\u0000');while(j+1<s.entries.length&&key(s.entries[j+1])===key(s.entries[i]))j++;
   const first=s.entries[i].row,last=s.entries[j].endRow;for(let r=first+1;r<=last;r++)set(s,r,c,'');merge(s,c,first,c,last);
   const needed=textHeight(s.rows[first-1][c],s.widths[c]);const actual=Array.from({length:last-first+1},(_,k)=>s.heights[first+k]).reduce((a,b)=>a+b,0);if(needed>actual)for(let r=first;r<=last;r++)s.heights[r]=Math.min(409,s.heights[r]+(needed-actual)/(last-first+1));
   i=j+1;
  }
 }
 if(!records.length)row(s,[],1,44);
 s.conditionalFormats.push({range:`K5:K${s.rows.length}`,rules:[{formula:'K5="Niet meenemen"',dxfId:30}]},{range:`I5:I${s.rows.length}`,rules:[['W',33],['N',32],['A',31],['○',30]].map(([v,id])=>({formula:`I5="${v}"`,dxfId:id}))});
 return s;
}
export function questionSheet(main,draft,viewerName=detailSheetName,unit='Toetspunten'){
 const s=sheet('02 Onderzoeksvragen',[4,4,43.125,55.625,38,4,16,16,16,40,25,16,45,45]);s.hiddenColumns=[6,7,8,9,10,11,12,13];s.previewHiddenColumns=[0,1,5];s.questionEntries=[];
 title(s,'Onderzoeksvragen',2,4);header(s,['','','Centrale vraag','Deelvraag','Toetspunten']);set(s,4,1,'',1);set(s,4,2,'Centrale vraag',3);
 const viewerLabel=unit==='Interviewvragen'?'Eén interviewvraag bekijken':'Eén norm / toetspunt bekijken';
 set(s,4,4,unit,5);
 set(s,3,2,formula(`HYPERLINK("#'${viewerName}'!B4","${viewerLabel}")`,viewerLabel),17);merge(s,2,3,4);
 const numbers=questionNumbers(draft),qs=draft.research?.questions||[],roots=qs.filter(q=>!q.parent_id),ref=normRefs(main),end=Math.max(5,main.rows.length);
 const entries=main.entries;const selections=[];
 const count=(key)=>`SUMPRODUCT(--ISNUMBER(SEARCH(";${key};",";"&SUBSTITUTE(SUBSTITUTE(${ref}$C$5:$C$${end}," ",""),CHAR(10),"")&";")),--(${ref}$K$5:$K$${end}="Meenemen"),--(${ref}$B$5:$B$${end}<>""))`;
 for(const root of roots){
  const key=numbers[root.id],children=qs.filter(q=>q.parent_id===root.id),direct=entries.some(e=>e.questionIds?.includes(root.id)),items=[...(direct||!children.length?[root]:[]),...children],first=s.rows.length+1;
  selections.push({label:key+' · inclusief deelvragen',key,all:true});
  if(direct)selections.push({label:key+' · rechtstreeks gekoppeld',key,all:false});
  for(const q of items){const id=numbers[q.id],text=q===root?'Rechtstreeks gekoppeld':id+' - '+(q.text||'Vraag nog te formuleren');const matches=entries.filter(e=>e.questionIds?.includes(q.id));
   const r=row(s,['','','',text,formula(count(id),matches.length)],1,Math.min(409,Math.max(44,textHeight(text,55))));s.cellStyles[r]={2:51,3:q===root?24:16,4:q===root?30:29};s.questionEntries.push({row:r,questionId:q.id,pointIds:matches.map(e=>e.pointId)});
   if(q!==root)selections.push({label:id+' · Deelvraag',key:id,all:false});
  }
  set(s,first,2,key+' - '+(root.text||'Vraag nog te formuleren'),51);merge(s,2,first,2,s.rows.length);
  const needed=textHeight(s.rows[first-1][2],43),actual=Array.from({length:s.rows.length-first+1},(_,i)=>s.heights[first+i]).reduce((a,b)=>a+b,0);
  if(needed>actual)for(let r=first;r<=s.rows.length;r++)s.heights[r]=Math.min(409,s.heights[r]+(needed-actual)/(s.rows.length-first+1));
 }
 const unlinked=entries.filter(e=>!e.refs);if(unlinked.length){const r=row(s,['','','Nog te koppelen','',formula(`COUNTIFS(${ref}$B$5:$B$${end},"<>",${ref}$C$5:$C$${end},"",${ref}$K$5:$K$${end},"Meenemen")`,unlinked.length)],1,40);s.cellStyles[r]={2:51,4:29};}
 if(!roots.length)row(s,['','','Centrale vraag nog te formuleren'],1,44);
 row(s,[],1,12);const h=row(s,[],1,30);set(s,h,2,'Toetspunten per vraag',53);merge(s,2,h,4);
 const input=row(s,['','','Kies een vraag',selections[0]?.label||''],1,36);s.cellStyles[input]={2:32,3:33};s.questionViewer={input,header:input+2};
 row(s,[],1,12);const vh=row(s,['','','Meegenomen toetspunten · ID en naam','','Artikel / pagina'],54,32);merge(s,2,vh,3);set(s,vh,0,'',1);set(s,vh,1,'',1);
 const choiceEnd=Math.max(5,4+selections.length);s.validations.push({range:'D'+input,formula:`$J$5:$J$${choiceEnd}`});
 const selector=`$D$${input}`,key=`IFERROR(INDEX($K$5:$K$${choiceEnd},MATCH(${selector},$J$5:$J$${choiceEnd},0)),"")`,children=`IFERROR(INDEX($L$5:$L$${choiceEnd},MATCH(${selector},$J$5:$J$${choiceEnd},0)),0)`;
 for(let i=0;i<Math.max(1,entries.length);i++){
  const e=entries[i],r=i+5,origin=e?.row||5,raw=`SUBSTITUTE(SUBSTITUTE(${ref}C${origin}," ",""),CHAR(10),"")`,exact=`ISNUMBER(SEARCH(";"&${key}&";",";"&${raw}&";"))`,child=`AND(${children}=1,ISNUMBER(SEARCH(";"&${key}&".",";"&${raw}&";")))`,match=e&&selections[0]?templateQuestionMatches(e.refs,selections[0].key,true):false;
  set(s,r,6,formula(`IF(OR(${selector}="",${ref}B${origin}="",${ref}K${origin}<>"Meenemen"),0,IF(OR(${exact},${child}),1,0))`,match?1:0));
  set(s,r,7,formula(`IF(G${r}=1,SUM($G$5:G${r}),0)`,match?entries.slice(0,i+1).filter(e=>templateQuestionMatches(e.refs,selections[0].key,true)).length:0));
  set(s,r,8,origin);set(s,r,9,'');
 }
 for(let i=0;i<selections.length;i++){const r=i+5;set(s,r,9,selections[i].label);set(s,r,10,selections[i].key);set(s,r,11,selections[i].all?1:0);}
 const helperEnd=Math.max(5,4+entries.length),matches=selections.length?entries.filter(e=>templateQuestionMatches(e.refs,selections[0].key,true)):[];
 // Viewer rows are after the visible question table, not after hidden helpers.
 for(let i=0;i<Math.max(entries.length,1);i++){
  const r=vh+1+i;const pos=`INDEX($I$5:$I$${helperEnd},MATCH(${i+1},$H$5:$H$${helperEnd},0))`;
  set(s,r,2,formula(`IF(${i+1}>SUM($G$5:$G$${helperEnd}),"",HYPERLINK("#'${main.name}'!B"&${pos},INDEX(${ref}$B$1:$B$${end},${pos})&" · "&LEFT(INDEX(${ref}$G$1:$G$${end},${pos}),IFERROR(FIND(CHAR(10),INDEX(${ref}$G$1:$G$${end},${pos}))-2,150))))`,matches[i]?matches[i].pointId+' · '+matches[i].title:''),rs.linked);set(s,r,3,'',rs.linked);merge(s,2,r,3);s.heights[r]=Math.max(30,...entries.map(e=>textHeight(e.pointId+' · '+e.title,98)));
 }
 set(s,input,4,formula(`SUM($G$5:$G$${helperEnd})`,matches.length),29);
 // Shared question view reads each profile's actual ID, links, text and selection columns.
 const mapping={B:col(main.columnIds.indexOf('pointId')),C:col(main.columnIds.indexOf('questionRefs')),G:col(main.columnIds.indexOf(main.questionTitleColumn||'criterion')),K:col(main.columnIds.indexOf('selection'))};
 for(const values of s.rows)for(const value of values)if(value?.formula){
  value.formula=value.formula.replace(/'([^']+)'!(\$?)([BCGK])(\$?\d+)(?::(\$?)([BCGK])(\$?\d+))?/g,(all,name,a,c,r,b,d,t)=>name===main.name?`'${name}'!${a}${mapping[c]}${r}${d?':'+b+mapping[d]+t:''}`:all);
 }
 // Excel has one hyperlink destination per cell: open the first listed source
 // at its verified article/page anchor, retaining every reference in the label.
 const sourceCol=col(main.columnIds.indexOf('location')>=0?main.columnIds.indexOf('location'):main.columnIds.indexOf('source'));
 const sourceIndex=main.columnIds.indexOf('location')>=0?main.columnIds.indexOf('location'):main.columnIds.indexOf('source');
 const sourceCache=e=>Array.from({length:e.endRow-e.row+1},(_,k)=>clean(main.rows[e.row+k-1][sourceIndex])||clean(main.rows[e.row+k-1][main.columnIds.indexOf('source')])).join('\n');
 for(const [i,e] of entries.entries()){
  const sourceText=sourceCache(e);
  const fallbackCol=col(main.columnIds.indexOf('source'));
  const terms=Array.from({length:e.endRow-e.row+1},(_,k)=>`IF(${ref}${sourceCol}${e.row+k}="",${ref}${fallbackCol}${e.row+k},${ref}${sourceCol}${e.row+k})&""`);
  set(s,i+5,12,formula(terms.join('&CHAR(10)&'),sourceText));
  const target=sourcePassageUrl(e.sources[0]);
  set(s,i+5,13,target||`#'${main.name}'!${sourceCol}${e.row}`);
 }
 const sourceHeight=Math.max(30,...entries.map(e=>textHeight(sourceCache(e),38)));
 for(let i=0;i<Math.max(entries.length,1);i++){
  const r=vh+1+i,match=`MATCH(${i+1},$H$5:$H$${helperEnd},0)`;
  set(s,r,4,formula(`IF(${i+1}>SUM($G$5:$G$${helperEnd}),"",HYPERLINK(INDEX($N$5:$N$${helperEnd},${match}),INDEX($M$5:$M$${helperEnd},${match})))`,matches[i]?sourceCache(matches[i]):''),rs.linked);
  s.heights[r]=Math.max(s.heights[r],sourceHeight);
 }
 if(unit!=='Toetspunten')for(const values of s.rows)for(let c=0;c<values.length;c++)if(typeof values[c]==='string')values[c]=values[c].replace('Toetspunten per vraag',unit+' per onderzoeksvraag').replace('Meegenomen toetspunten','Meegenomen '+unit.toLowerCase());
 return s;
}
export function templateWorkbook(model,draft,options,framework){
 const records=recordsFrom(model,draft,framework),main=registerSheet(records),execution=records.length&&records.every(e=>e.line?.materialKind==='model-question')?null:executionSheet(model,main,options),log=versionSheet(model,records,draft);
 // Preserve exact evidence in an embedded OOXML part, not dozens of comments
 // across the user's reading area. Sources and their links stay visible.
 const evidence=workbookEvidence(records,draft);
 const detail=templateDetailViewer(main,execution),questions=questionSheet(main,draft,detail.name),design=templateDesign(model.meta);
 const result=fitExportTypography({...model,meta:{...model.meta,exportLayout:'tbb-template-v2'},sheets:[log,questions,main,...(execution?[execution]:[]),detail],...design,evidence,definedNames:[{name:'Teamleden',formula:"'01 Versiebeheer'!$G$6:$G$10"}],templateSourceSha256:template.sourceSha256});
 for(const s of result.sheets)s.tabColor=design.previewStyles[3].fill;
 return result;
}
