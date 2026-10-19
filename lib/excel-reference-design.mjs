// Export-only layout. Saved points, legal source snapshots and user edits remain intact.
import {questionNumbers} from './research-plan.mjs';
import {researchGoalText} from './research-goal.mjs';
import {researchApproachText} from './research-approach.mjs';
import {fitLongCriterionColumn,fitLongInterviewColumn,styleProfileRegister} from './excel-workbook-design.mjs';
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const f=(formula,value='')=>({formula,value});
const value=v=>v&&typeof v==='object'&&'formula' in v?v.value:v;
const base=(name,widths)=>({name,widths,rows:[],merges:[],heights:{},rowStyles:{},cellStyles:{},validations:[],notes:[],hyperlinks:[],freeze:5,zoom:85});
function add(s,values,style=0,height=30){const r=s.rows.push(s.widths.map((_,c)=>values[c]??''));s.rowStyles[r]=style;s.heights[r]=height;return r;}
function height(values,widths){return Math.min(409,Math.max(44,...values.map((v,c)=>String(value(v)??'').split('\n').reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/Math.max(8,(widths[c]-4)*.86))),0)*16+16)));}
function start(s,title,context,headers){add(s,[],0,12);add(s,[title],2,32);add(s,[context],3,44);add(s,[],0,28);add(s,headers,1,44);s.merges.push(`A2:${col(Math.min(5,s.widths.length-1))}2`,`A3:${col(Math.min(6,s.widths.length-1))}3`);}
function groups(s,definitions){s.merges=s.merges.filter(m=>!/^\D+4:/.test(m));s.rows[3]=s.widths.map(()=>'');s.cellStyles[4]={};s.cellStyles[5]={};for(const [label,from,to,style] of definitions){s.rows[3][from]=label;if(to>from)s.merges.push(`${col(from)}4:${col(to)}4`);for(let c=from;c<=to;c++){s.cellStyles[4][c]=style;s.cellStyles[5][c]=style+1;}}}
const normalized=range=>`SUBSTITUTE(SUBSTITUTE(${range}," ",""),CHAR(10),"")`;
// Delimiters prevent 1.1 matching 1.10. Boolean OR counts a point once even
// when the same ID or several children occur in its semicolon-separated list.
export function questionMatchFormula(ref,key,root=false){const text=`";"&${normalized(ref)}&";"`;const exact=`ISNUMBER(SEARCH(";"&${key}&";",${text}))`;return root?`((${exact}+ISNUMBER(SEARCH(";"&${key}&".",${text})))>0)`:exact;}
export function questionPointCountFormula(key,root=false){
 const count=pattern=>`COUNTIFS(Toetspunten[Vraagkoppeling],${pattern},Toetspunten[ID],"<>",Toetspunten[Selectie],"Meenemen")`;
 const exact=`"*;"&${key}&";*"`,children=`"*;"&${key}&".*"`;
 return root?`${count(exact)}+${count(children)}-COUNTIFS(Toetspunten[Vraagkoppeling],${exact},Toetspunten[Vraagkoppeling],${children},Toetspunten[ID],"<>",Toetspunten[Selectie],"Meenemen")`:count(exact);
}
export function linkedToQuestion(refs,key,root=false){return String(refs??'').split(';').map(v=>v.replace(/\s/g,'')).some(v=>v===key||(root&&v.startsWith(key+'.')));}
function lookup(header,id,cache=''){return f(`IF(${id}="","",IF(COUNTIFS(Toetspunten[ID],${id})<>1,"Controleer ID",INDEX(Toetspunten[${header}],MATCH(${id},Toetspunten[ID],0))&""))`,cache);}
function basis(material,line){if(material?.topicalTrace)return 'N · Professioneel auditkader';if(material?.lawTrace)return [...new Set(JSON.parse(material.lawTrace).point.source_links.map(l=>l.basis_code))].join(' / ')+' · per bronrelatie; zie bronverantwoording';if(material?.cioTrace)return 'W · Wettelijke regeling';if(material?.kind==='model-question')return 'M · Onderzoeksmodel';if(line?.report_id)return 'A · Afgeleid uit rapport';if(!material?.sourceUrl&&!line?.source_id)return 'E · Eigen uitwerking';return '? · Te bevestigen';}
function remapSheet(s,ids,headers,defaults={}){
 const tableEnd=Number(s.tables[0].ref.match(/\d+$/)[0]);
 const oldIds=s.columnIds,oldRows=s.rows,oldWidths=s.widths,oldStyles=s.cellStyles,indices=ids.map(id=>oldIds.indexOf(id));
 const mapCell=ref=>{const c=ref.match(/^[A-Z]+/)[0].split('').reduce((n,v)=>n*26+v.charCodeAt(0)-64,0)-1;const target=ids.indexOf(oldIds[c]);return target<0?null:col(target)+ref.match(/\d+$/)[0];};
 s.widths=ids.map((id,i)=>defaults[id]?.width??oldWidths[indices[i]]??32);s.columnIds=ids;
 s.rows=oldRows.map((row,r)=>ids.map((id,c)=>r===4?headers[c]:indices[c]>=0?row[indices[c]]??'':defaults[id]?.get?.(r+1)??''));
 s.rows[1]=s.widths.map(()=> '');s.rows[1][0]=s.name.replace(/^\d+ /,'');
 s.rows[2]=s.widths.map(()=> '');
 s.merges=['A2:F2','A3:H3'];s.cellStyles={};s.notes=(s.notes||[]).flatMap(n=>{const ref=mapCell(n.ref);return ref?[{...n,ref}]:[];});
 for(const [r,styles] of Object.entries(oldStyles||{}))if(Number(r)>=6)s.cellStyles[r]=Object.fromEntries(Object.entries(styles).flatMap(([c,style])=>{const target=ids.indexOf(oldIds[Number(c)]);return target>=0?[[target,style]]:[];}));
 s.notes=s.notes.filter(n=>n.ref!==`${col(ids.indexOf('questionRefs'))}5`);
 s.notes.push({ref:`${col(ids.indexOf('questionRefs'))}5`,text:'Koppel de vraag-ID’s uit Onderzoeksvragen, gescheiden door puntkomma’s, bijvoorbeeld 1.1; 1.2. Spaties zijn toegestaan. Een punt telt per vraag eenmaal; hoofdvragen tellen ook de gekoppelde deelvragen mee.'});
 s.hyperlinks=(s.hyperlinks||[]).flatMap(n=>{const ref=mapCell(n.ref);return ref?[{...n,ref}]:[];});
 s.validations=(s.validations||[]).flatMap(v=>{const refs=v.range.split(':').map(mapCell);return refs.every(Boolean)?[{...v,range:refs.join(':')}]:[];});
 for(const e of s.entries)s.heights[e.row]=height(s.rows[e.row-1],s.widths);
 s.tables=[{name:'Toetspunten',ref:`A5:${col(ids.length-1)}${tableEnd}`}];
 s.lookupChoices={idHeader:'ID',titleHeader:headers[1],titleColumn:'B',titleIndex:1};
}
function appendSourceContext(main,sources){
 if(!sources)return;
 const heading=add(main,[],0,18);void heading;
 const title=add(main,['Bronverantwoording'],1,30);main.merges.push(`A${title}:F${title}`);main.sourceContextRow=title;
 const offset=main.rows.length-3;
 for(let r=4;r<=sources.rows.length;r++){
   const at=add(main,sources.rows[r-1],sources.rowStyles[r]??0,sources.heights[r]??30);
   main.cellStyles[at]=sources.cellStyles[r]||{};
 }
 for(const m of sources.merges.filter(m=>Number(m.match(/\d+/)[0])>=4))main.merges.push(m.replace(/\d+/g,n=>Number(n)+offset));
 for(const key of ['cioTraceEntries','applicabilityEntries'])if(sources[key])main[key]=sources[key].map(e=>({...e,row:e.row+offset,endRow:e.endRow+offset}));
}
function sourceRegister(sources,main,draft){
 const s=base(sources?.name||'05 Bronverantwoording',[23,38,25,42,90,48]);
 start(s,'Bronverantwoording','Bronrelaties zoals vastgelegd bij export. Nieuwe onderzoekskeuzes bewerk je in het register. Een wettelijke bron maakt de audituitwerking zelf nog geen wettelijke norm.',['Toetspunt-ID','Onderliggende bron','Grondslag','Artikel / pagina','Vastgelegde bronpassage','Bronlink']);
 s.entries=[];
 for(const e of main.entries){
  const m=draft.investigation?.materials.find(m=>m.id===e.lineId),r=main.rows[e.row-1];let trace;try{trace=JSON.parse(m?.cioTrace||'null');}catch{trace=null;}
  const primary=trace?.point?.source_links?.filter(l=>l.contribution==='PRIMARY')||[];
  const records=[...new Set(primary.map(l=>l.record_id))].map(id=>trace.records?.find(r=>r.id===id)).filter(Boolean);
  const at=id=>r[main.columnIds.indexOf(id)]||'';
  for(const record of records.length?records:[null]){
   const spans=record?.source_spans||[],pages=[...new Set(spans.map(s=>s.page))];
   const vals=[e.pointId,m?.sourceTitle||at('source'),at('basis'),record?record.locator+' · p. '+pages.join(', '):at('location'),record?spans.map(s=>s.quote).join('\n\n'):m?.sourceText||'',m?.sourceUrl||e.sourceUrl||''];
   const rr=add(s,vals,s.entries.length%2?17:0,height(vals,s.widths));s.entries.push({...e,row:rr,endRow:rr});
   if(/^https?:\/\//.test(vals[5]))s.hyperlinks.push({ref:'F'+rr,target:vals[5],tooltip:'Open de vastgelegde bron'});
  }
 }
 for(let i=0;i<3;i++)add(s,[],0,36);
 s.tables=[{name:'Bronrelaties',ref:`A5:F${s.rows.length}`}];
 if(sources)appendSourceContext(s,sources);
 return s;
}
function questionsSheet(model,main,draft){
 const numbers=questionNumbers(draft),qs=(draft.research?.questions||[]).filter(q=>numbers[q.id]);
 const ordered=qs.filter(q=>q.parent_id===null).flatMap(q=>[q,...qs.filter(c=>c.parent_id===q.id)]);
 const s=base('02 Onderzoeksvragen',[12,43,53,21,17]);s.questionEntries=[];s.freeze=5;
 start(s,'Onderzoeksvragen','Koppel vraag-ID’s in kolom C van het register, bijvoorbeeld 1.1; 1.2. Hoofdvragen tellen inclusief hun deelvragen, zonder dubbeltelling.',['Vraag-ID','Centrale vraag','Deelvraag','Niveau','Toetspunten']);
 const goal=[researchGoalText(draft.investigation?.goal),researchApproachText(draft.investigation?.researchApproach)].filter(Boolean).join('\n');
 if(goal){s.rows[3][0]=goal;s.merges.push('A4:E4');s.heights[4]=Math.min(409,32+Math.ceil(goal.length/130)*16);}
 const refs=main.columnIds.indexOf('questionRefs'),selection=main.columnIds.indexOf('selection');
 for(const q of ordered){const root=q.parent_id===null,key=numbers[q.id],matches=main.entries.filter(e=>linkedToQuestion(main.rows[e.row-1][refs],key,root));
  const vals=[key,root?q.text:'',root?'':q.text,root?'Hoofdvraag + deelvragen':'Deelvraag',f(questionPointCountFormula(`A${s.rows.length+1}`,root),matches.length)];
  const r=add(s,vals,root?4:0,height(vals,s.widths));s.cellStyles[r]={0:22,4:18};s.questionEntries.push({row:r,questionId:q.id,pointIds:matches.map(e=>e.pointId)});
 }
 if(!ordered.length)add(s,['','Centrale vraag nog te formuleren'],0,40);
 const unlinked=main.entries.filter(e=>!e.questionIds?.length).length;
 add(s,['','Nog te koppelen','','',f('COUNTIFS(Toetspunten[ID],"<>",Toetspunten[Vraagkoppeling],";;",Toetspunten[Selectie],"Meenemen")',unlinked)],5,32);
 add(s,[],0,16);
 let r=add(s,['Viewer per toetspunt'],1,30);s.merges.push(`A${r}:E${r}`);const heading=r;
 const first=main.rows[5]||[],input=add(s,['Toetspunt',first[0]?first[0]+' · '+first[1]:''],19,48);s.merges.push(`B${input}:E${input}`);s.cellStyles[input]={1:5};s.validations.push({range:`B${input}`,formula:'ToetspuntKeuzes'});s.inspector={heading,input};
 const id=`LEFT($B$${input},FIND(" · ",$B$${input}&" · ")-1)`;
 for(const key of [...new Set([main.columnIds[1],'category','objective','risk','controlObjective','control','parentCriterion','criterion','interview','variable','level','probes','starr','documents','documentation','source','basis','location','questionRefs','selection','comments','notes'])]){
  const c=main.columnIds.indexOf(key);if(c<0)continue;
  const label=main.rows[4][c],length=Math.max(0,...main.entries.map(e=>String(value(main.rows[e.row-1][c])||'').length)),parts=Math.max(1,Math.ceil(length/1600));
  for(let part=0;part<parts;part++){
   const retrieved=lookup(label,id,value(first[c]));
   const shown=parts===1?retrieved:f(`MID(${retrieved.formula},${part*1600+1},1600)`,String(retrieved.value||'').slice(part*1600,(part+1)*1600));
   const max=Math.max(50,...main.entries.map(e=>height([String(value(main.rows[e.row-1][c])||'').slice(part*1600,(part+1)*1600)],[90])));
   r=add(s,[label+(part?' (vervolg)':''),'',shown],19,max);s.merges.push(`A${r}:B${r}`,`C${r}:E${r}`);
  }
 }
 r=add(s,['Bewerken',f(`IF(COUNTIFS(Toetspunten[ID],${id})=1,HYPERLINK("#'${main.name}'!A"&(MATCH(${id},Toetspunten[ID],0)+5),"Open dit punt in het register"),"Kies een uniek ID")`,'Open dit punt in het register')],19,32);s.merges.push(`B${r}:E${r}`);
 add(s,[],0,16);r=add(s,['Viewer per onderzoeksvraag'],1,30);s.merges.push(`A${r}:E${r}`);
 const selector=add(s,['Vraag-ID',ordered.length?numbers[ordered[0].id]:'','',f('SUM(Toetspunten[ViewerMatch])',main.entries.filter(e=>ordered.length&&linkedToQuestion(main.rows[e.row-1][refs],numbers[ordered[0].id],true)).length),'toetspunten'],19,32);
 s.cellStyles[selector]={1:21};s.validations.push({range:`B${selector}`,formula:'OnderzoeksvraagIDs'});s.questionViewer={input:selector};
 model.definedNames.push({name:'OnderzoeksvraagIDs',formula:`'${s.name}'!$A$6:$A$${Math.max(6,5+ordered.length)}`},{name:'ViewerVraag',formula:`'${s.name}'!$B$${selector}`});
 // Matching lives in two native table columns: new rows inherit the calculation.
 const mc=main.widths.length,rank=mc+1,normalizedCol=mc+2;
 main.hiddenColumns=[...(main.hiddenColumns||[]),mc,rank,normalizedCol];main.widths.push(14,14,20);main.columnIds.push('viewerMatch','viewerRank','normalizedQuestions');
 const match=(id,ref,sel)=>`IF(OR(${id}="",ViewerVraag="",${sel}<>"Meenemen"),0,IF(ISNUMBER(SEARCH(".",ViewerVraag)),IF(${questionMatchFormula(ref,'ViewerVraag')},1,0),IF(${questionMatchFormula(ref,'ViewerVraag',true)},1,0)))`;
 const end=Number(main.tables[0].ref.match(/\d+$/)[0]);
 for(let r=6;r<=end;r++)main.cellStyles[r]={...main.cellStyles[r],[refs]:21};
 main.rows=main.rows.map((row,i)=>[...row,i===4?'ViewerMatch':i>=5&&i<end?f(match(`A${i+1}`,`${col(refs)}${i+1}`,`${col(selection)}${i+1}`),row[0]&&ordered.length&&linkedToQuestion(row[refs],numbers[ordered[0].id],true)?1:0):'',i===4?'ViewerVolgnummer':i>=5&&i<end?f(`IF(${col(mc)}${i+1}=1,SUM(${col(mc)}$6:${col(mc)}${i+1}),0)`,0):'',i===4?'Vraagkoppeling':i>=5&&i<end?f(`";"&${normalized(`${col(refs)}${i+1}`)}&";"`,';'+String(row[refs]||'').replace(/\s/g,'')+';'):'']);
 let running=0;for(let i=5;i<end;i++)if(main.rows[i][mc].value)main.rows[i][rank].value=++running;
 Object.assign(main.tables[0],{ref:`A5:${col(normalizedCol)}${end}`,calculatedColumns:{...main.tables[0].calculatedColumns,[mc]:match('[[#This Row],[ID]]','[[#This Row],[Vragen]]','[[#This Row],[Selectie]]'),[rank]:'IF([[#This Row],[ViewerMatch]]=1,SUM(INDEX(Toetspunten[ViewerMatch],1):[[#This Row],[ViewerMatch]]),0)',[normalizedCol]:`";"&${normalized('[[#This Row],[Vragen]]')}&";"`}});
 const capacity=Math.max(1000,main.entries.length+100);
 r=add(s,[`Alleen meegenomen punten. Hoofdvragen omvatten ook deelvragen. De viewer biedt ruimte voor ${capacity} punten; het register blijft volledig filterbaar.`],3,36);s.merges.push(`A${r}:E${r}`);
 r=add(s,['ID','Onderwerp','Toetspunt / onderzoeksfocus','Vragen','Register'],1,36);s.questionViewer.header=r;
 const matches=main.entries.filter(e=>ordered.length&&linkedToQuestion(main.rows[e.row-1][refs],numbers[ordered[0].id],true));
 const body=main.columnIds.indexOf(main.columnIds.includes('criterion')?'criterion':'interview'),title=main.rows[4][1],bodyHeader=main.rows[4][body];
 const viewerHeight=Math.max(64,...main.entries.map(e=>height([main.rows[e.row-1][body]],[53])));
 for(let n=1;n<=capacity;n++){
  const data=matches[n-1]?main.rows[matches[n-1].row-1]:[],rr=s.rows.length+1;
  const pick=header=>`IF(${n}>SUM(Toetspunten[ViewerMatch]),"",INDEX(Toetspunten[${header}],MATCH(${n},Toetspunten[ViewerVolgnummer],0))&"")`;
  add(s,[f(pick('ID'),data[0]||''),f(pick(title),data[1]||''),f(pick(bodyHeader),data[body]||''),f(pick('Vragen'),data[refs]||''),f(`IF(A${rr}="","",HYPERLINK("#'${main.name}'!A"&(MATCH(A${rr},Toetspunten[ID],0)+5),"Open punt"))`,data[0]?'Open punt':'')],n%2?0:17,viewerHeight);
 }
 return s;
}
function improveExecution(ex,main){
 if(!ex)return;
 // Keep phase plans and input validation, replace duplicate title with live question links.
 ex.rows[4][1]='Vragen';ex.columnIds[1]='questionRefs';ex.widths[1]=18;
 const pointHeader=main.rows[4][main.columnIds.indexOf('criterion')];
 ex.rows[4][2]=pointHeader;
 for(let r=6;r<=ex.rows.length;r++)ex.rows[r-1][1]=lookup('Vragen',`A${r}`,main.rows.find(v=>v[0]===ex.rows[r-1][0])?.[2]||'');
 ex.tables[0].calculatedColumns[1]=lookup('Vragen','[[#This Row],[ID]]').formula;
 // Header changed from the old Norm / criterium to the actual selected point.
 for(const row of ex.rows)for(const v of row)if(v?.formula)v.formula=v.formula.replaceAll('Toetspunten[Norm / criterium]',`Toetspunten[${pointHeader}]`).replaceAll('Toetspunten[Criterium / onderzoeksfocus]',`Toetspunten[${pointHeader}]`).replaceAll('Toetspunten[Criterium / auditdekkingspunt]',`Toetspunten[${pointHeader}]`);
 ex.tables[0].calculatedColumns[2]=lookup(pointHeader,'[[#This Row],[ID]]').formula;
 const c=ex.widths.length;ex.widths.push(40,25);ex.columnIds.push('comments','completionCheck');
 for(let i=0;i<ex.rows.length;i++)ex.rows[i].push(i===4?'Opmerkingen':'',i===4?'Invulcontrole':'');
 const aspects=ex.entries[0]?.aspects||[];
 for(let r=6;r<=ex.rows.length;r++){
  const tester=col(ex.columnIds.indexOf('tester')),date=col(ex.columnIds.indexOf('testedOn')),status=col(ex.columnIds.indexOf('status')),selection=col(ex.columnIds.indexOf('selection'));
  const missing=[`${tester}${r}=""`,`${date}${r}=""`,...aspects.map((_,i)=>`AND(ISERROR(SEARCH("NOT_SELECTED",${col(3+i*3)}${r})),OR(${col(4+i*3)}${r}="",${col(5+i*3)}${r}=""))`)];
  ex.rows[r-1][c+1]=f(`IF(A${r}="","",IF(COUNTIFS(Toetspunten[ID],A${r})<>1,"Controleer ID",IF(${selection}${r}<>"Meenemen","Niet meegenomen",IF(OR(${status}${r}="Gereed voor review",${status}${r}="Afgerond"),IF(OR(${missing.join(',')}),"Vul bewijs, oordeel, uitvoerder en datum aan","Compleet voor review"),""))))`);
  ex.cellStyles[r]={...ex.cellStyles[r],[c]:5};
 }
 ex.tables[0].ref=`A5:${col(c+1)}${ex.rows.length}`;
 ex.tables[0].calculatedColumns[c+1]=ex.rows[5][c+1].formula.replace(/\b([A-Z]+)6\b/g,(_,letters)=>{const i=letters.split('').reduce((n,l)=>n*26+l.charCodeAt(0)-64,0)-1;return `[[#This Row],[${ex.rows[4][i]}]]`;});
 groups(ex,[['Toetspunt',0,2,7],...aspects.map((a,i)=>[ex.rows[3][3+i*3]||a,3+i*3,5+i*3,{opzet:9,bestaan:11,werking:13}[a]]),['Administratie',3+aspects.length*3,c+1,15]]);
}
export function redesignExportWorkbook(model,draft,options,framework){
 const profile=options.profile||'testing',main=model.sheets.find(s=>s.columnIds&&s.registerKind!=='testing');if(!main)return model;
 // Standalone model interviews use the same three-tab arrangement.
 if(options.basis&&options.basis!=='norms'){
  main.name='03 Interviewleidraad';
  if(!main.columnIds.includes('criterion')){
   const q=main.columnIds.indexOf('question');if(q>=0)main.columnIds[q]='criterion';
  }
  const refs=main.widths.length;main.widths.push(18);main.columnIds.push('questionRefs');main.rows=main.rows.map((r,i)=>[...r,i===4?'Vragen':'']);
  main.rows[4][0]='ID';main.tables[0].name='Toetspunten';main.tables[0].ref=`A5:${col(refs)}${Number(main.tables[0].ref.match(/\d+$/)[0])}`;
  main.lookupChoices={idHeader:'ID',titleHeader:main.rows[4][1],titleColumn:'B',titleIndex:1};
  model.definedNames.push({name:'ToetspuntIDs',formula:'Toetspunten[ID]'},{name:'ToetspuntKeuzes',formula:'Toetspunten[Keuzenaam]'});
  for(const row of main.rows)for(const v of row)if(v?.formula)v.formula=v.formula.replaceAll('Interviewvragen[','Toetspunten[');
  // Match chosen model templates to already-linked materials where present.
  const nums=questionNumbers(draft);for(const e of main.entries){const item=options.modelItems?.find(i=>i.id===main.rows[e.row-1][0]);const materialIds=(draft.investigation?.materials||[]).filter(m=>item&&((item.templateId&&m.sourcePointId===item.templateId)||(item.id&&m.originKey===item.id))).map(m=>m.id);e.questionIds=(draft.research?.links||[]).filter(l=>materialIds.includes(l.line_id)).map(l=>l.question_id);main.rows[e.row-1][refs]=[...new Set(e.questionIds.map(id=>nums[id]).filter(Boolean))].join(';');}
  const ids=['pointId',main.columnIds[1],'questionRefs',...main.columnIds.filter((id,i)=>i>1&&id!=='questionRefs')],oldIds=[...main.columnIds],labels=[...main.rows[4]];
  remapSheet(main,ids,ids.map(id=>labels[oldIds.indexOf(id)]));
  styleProfileRegister(main,'interview');
 }else{
  const byRow=new Map(main.entries.map(e=>[e.row,draft.investigation?.materials.find(m=>m.id===e.lineId)]));
  const existing=[...main.columnIds],headers=[...main.rows[4]];
  const core=profile==='testing'?['pointId','title','questionRefs','category','controlObjective','control','parentCriterion','criterion','source','basis','location','selection','comments']:['pointId','title','questionRefs',...existing.filter(id=>!['pointId','title','questionRefs','selection'].includes(id)),'basis','selection'];
  const ids=[...new Set([...core,...existing])];
  const labels={title:'Onderwerp',questionRefs:'Vragen',category:'Element',controlObjective:'Beheersdoelstelling',control:'Beheersmaatregel',parentCriterion:'Toetscriterium',criterion:profile==='testing'?'Toetspunt / onderzoeksfocus':headers[existing.indexOf('criterion')],source:'Onderliggende bron',basis:'Grondslag',location:'Artikel / pagina',selection:'Selectie',comments:'Opmerkingen'};
  remapSheet(main,ids,ids.map(id=>labels[id]||headers[existing.indexOf(id)]),{parentCriterion:{width:48,get:r=>byRow.get(r)?.parentCriterion||''},basis:{width:27,get:r=>r>=6&&byRow.has(r)?basis(byRow.get(r),framework.lines.find(l=>l.id===main.entries.find(e=>e.row===r)?.lineId)):''},category:{width:30},controlObjective:{width:40},control:{width:40},criterion:{width:58},comments:{width:36},questionRefs:{width:18}});
  main.rows[2][0]='Vragen: scheid ID’s met een puntkomma (1.1; 1.2). Beheersmaatregelen zijn een interpretatie; toetspunten blijven gekoppeld aan hun bron. Geel: invulvelden.';
  const selection=ids.indexOf('selection'),comments=ids.indexOf('comments');
  for(const e of main.entries)main.cellStyles[e.row]={...main.cellStyles[e.row],2:5,[selection]:5,...(comments>=0?{[comments]:5}:{})};
  if(profile==='testing')groups(main,[['Onderzoeksopzet',0,2,7],['Beheersing',3,5,9],['Toetsing',6,7,11],['Bronnen',8,10,13],['Administratie',11,ids.length-1,15]]);
  else styleProfileRegister(main,profile);
  main.freezeColumns=3;
 }
 const sources=model.sheets.find(s=>/Bronverantwoording/.test(s.name));
 fitLongCriterionColumn(main,model.meta);fitLongInterviewColumn(main,model.meta);
 const basisCol=main.columnIds.indexOf('basis');
 if(basisCol>=0)main.validations.push({range:`${col(basisCol)}6:${col(basisCol)}1005`,formula:'"W · Wettelijke regeling,N · Verplichte norm,A · Afgeleid uit rapport,M · Onderzoeksmodel,E · Eigen uitwerking,? · Te bevestigen"'});
 const execution=model.sheets.find(s=>s.registerKind==='testing');
 improveExecution(execution,main);
 if(profile!=='testing'&&sources)for(const e of main.entries)for(const id of ['source','interview']){
  const c=main.columnIds.indexOf(id),text=main.rows[e.row-1][c];
  if(typeof text==='string')main.rows[e.row-1][c]=text.replaceAll(sources.name,`Bronverantwoording onderaan ${main.name}`).replaceAll('op Bronverantwoording','in de bronverantwoording onderaan dit werkblad');
 }
 model.definedNames=model.definedNames.filter(n=>!['OnderzoeksvraagIDs','ViewerVraag'].includes(n.name));
 const q=questionsSheet(model,main,draft);
 if(profile==='testing')model.sheets=[model.sheets[0],q,main,...(execution?[execution]:[]),sourceRegister(sources,main,draft)];
 else {appendSourceContext(main,sources);model.sheets=[model.sheets[0],q,main];}
 model.meta.exportLayout='reference-v2';
 return model;
}
