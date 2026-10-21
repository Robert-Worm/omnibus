import {addDetailSections} from './excel-detail-sections.mjs';
import {recordsFrom,versionSheet,questionSheet} from './excel-template-design.mjs';
import {templateDesign,readingStyles as rs} from './excel-template-style.mjs';
import {compactSourceText,sourcePassageUrl} from './excel-source-links.mjs';
import {fitExportTypography} from './export-design.mjs';
import {questionNumbers} from './research-plan.mjs';
import {kapteinSource} from './export-presets.mjs';
import {fittedRowHeight} from './excel-text-height.mjs';
import {workbookEvidence,sourceBackground} from './excel-saved-evidence.mjs';
import {excelCellTextLimit} from './excel-detail-text.mjs';

const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const f=(formula,value='')=>({formula,value});
const scalar=v=>v?.formula?v.value:String(v??'');
const detailName='04 Detailviewer';
const labels={pointId:'Toetspunt-ID',questionRefs:'Vragen',category:'Element',title:'Onderwerp',parentCriterion:'Norm',criterion:'Toetspunt',objective:'Doel',risk:'Risico',controlObjective:'Beheersdoelstelling',control:'Beheersmaatregel',owner:'Verantwoordelijke',auditQuestion:'Toetsvraag',procedure:'Toetsaanpak',documentation:'Documenten / verificatie',interview:'Interviewvraag / doorvragen',source:'Onderliggende bron',basis:'Grondslag',location:'Artikel / pagina',selection:'Selectie',comments:'Opmerkingen',notes:'Gespreksnotities',respondent:'Gesprekspartner',interviewer:'Interviewer',interviewDate:'Gespreksdatum',variable:'Variabele',indicator:'Indicator',level:'Interviewniveau',probes:'Doorvragen',starr:'STARR',documents:'Documenten / cijfers',observation:'Observatie / verificatie'};
const widths={pointId:16,questionRefs:13,category:25,title:35,parentCriterion:40,criterion:52,objective:34,risk:38,controlObjective:36,control:44,owner:24,auditQuestion:38,procedure:42,documentation:38,interview:56,source:34,basis:15,location:34,selection:18,comments:36,notes:46,respondent:24,interviewer:24,interviewDate:18,variable:28,indicator:35,level:24,probes:42,starr:48,documents:38,observation:42};
const inputIds=new Set(['questionRefs','owner','selection','comments','notes','respondent','interviewer','interviewDate']);
const displayProposal=text=>String(text??'').replace(/(^|\n)([ \t]*)Voorstel[ \t]*:[ \t]*/gi,'$1$2');
const riskGroup=id=>['objective','risk'].includes(id)?'risk':['control','controlObjective','interview','probes','starr'].includes(id)?'control':inputIds.has(id)?'input':['procedure','documentation','documents','observation','source','basis','location'].includes(id)?'source':null;
function blankSheet(name,ws){return {name,widths:ws,rows:[],heights:{},rowStyles:{},cellStyles:{},merges:[],notes:[],hyperlinks:[],validations:[],conditionalFormats:[],freeze:4,freezeColumns:2,headerRow:4,zoom:85,templateStyles:true,previewHiddenColumns:[0]};}
function set(s,r,c,v,style=16){while(s.rows.length<r){s.rows.push(s.widths.map(()=>''));s.rowStyles[s.rows.length]=1;s.heights[s.rows.length]=24;}s.rows[r-1][c]=v;(s.cellStyles[r]??={})[c]=style;}
function band(s,r,text,last,style=48){set(s,r,1,text,style);s.merges.push(`B${r}:${col(last)}${r}`);}

function modelRecords(model,draft,options){
 const original=model.sheets.find(s=>s.columnIds),numbers=questionNumbers(draft);
 return original.entries.map((e,i)=>{
  const item=options.modelItems.filter(v=>v.included)[i],values={};
  original.columnIds.forEach((id,c)=>values[id]=scalar(original.rows[e.row-1][c]));
  const materialIds=(draft.investigation?.materials||[]).filter(m=>(item.templateId&&m.sourcePointId===item.templateId)||(item.id&&m.originKey===item.id)).map(m=>m.id);
  const questionIds=[...new Set((draft.research?.links||[]).filter(l=>materialIds.includes(l.line_id)).map(l=>l.question_id))];
  values.criterion=item.question;values.title=item.title;values.questionRefs=questionIds.map(id=>numbers[id]).filter(Boolean).join(';');values.selection='Meenemen';
  values.modelContext=[options.modelQuestion?'Centrale vraag: '+options.modelQuestion:'',options.modelVersion?'Modelversie: '+options.modelVersion:'',options.basis==='kaptein'?'Eigen kwalitatieve voorbeeldvragen bij Kaptein. Geen gevalideerde vragenlijst of scoremodel.':'Eigen kwalitatieve interviewuitwerking. Geen gevalideerde meting of automatische score.',item.triangulation?'Bewijssuggesties zijn opties, geen bewijs dat documenten bestaan of verplichte eisen uit de publicatie. Verifieer context, onafhankelijkheid en eventuele tegenstrijdigheden.':''].filter(Boolean).join('\n\n');
  const source=options.modelSource?.trim()||(options.basis==='kaptein'?kapteinSource:'Eigen model; bron nog vast te leggen');
  return {...e,pointId:item.id,title:item.title,point:item.question,refs:values.questionRefs,questionIds,get:id=>values[id]||'',sources:[{title:source,basis:options.basis==='own'?'E':'M',location:'',url:''}],modelItem:item};
 });
}
function register(records,profile,modelBasis){
 const ids=modelBasis?['pointId','questionRefs','title',...(records.some(e=>e.get('variable'))?['variable','indicator','level']:[]),'criterion','probes',...(records.some(e=>e.get('starr'))?['starr']:[]),...(records.some(e=>e.get('documents')||e.get('observation'))?['documents','observation']:[]),'notes','respondent','interviewer','interviewDate','source','basis','selection']:
 profile==='risk'?['pointId','questionRefs','category','parentCriterion','objective','risk','controlObjective','control','criterion','procedure','documentation','source','basis','location','selection','comments']:
 ['pointId','questionRefs','category','parentCriterion','criterion','interview','documentation','notes','respondent','interviewer','interviewDate','source','basis','location','selection','comments'];
 const name=profile==='risk'?'03 Risico-controlmatrix':'03 Interviewleidraad',s=blankSheet(name,[4,...ids.map(id=>widths[id])]);s.columnIds=['gutter',...ids];s.entries=[];if(modelBasis)s.questionTitleColumn='title';
 band(s,2,name.slice(3),Math.min(6,ids.length),47);s.heights[2]=38;
 band(s,3,f(`HYPERLINK("#'${detailName}'!B4","Compact register · volledige tekst lezen: open de detailviewer")`,'Compact register · volledige tekst lezen: open de detailviewer'),Math.min(8,ids.length),17);s.heights[3]=30;
 ids.forEach((id,c)=>set(s,4,c+1,modelBasis&&id==='criterion'?'Interviewvraag':modelBasis&&id==='pointId'?'Vraag-ID':labels[id],rs[riskGroup(id)?riskGroup(id)+'Header':'section']));s.heights[4]=54;
 if(profile==='interview'&&!modelBasis){set(s,3,1,'Interviewvragen zijn eigen uitwerkingen bij de toetspunten; geen broncitaten. De volledige norm en voorwaarden blijven leidend.',48);s.heights[3]=30;}
 for(const p of records){
  const r=s.entries.length+5,values={pointId:p.pointId,questionRefs:p.refs,category:p.element,parentCriterion:p.parent,criterion:modelBasis?p.point:[p.title,p.point].filter(Boolean).join(':\n'),selection:'Meenemen',source:compactSourceText(p,'title'),basis:compactSourceText(p,'basis'),location:compactSourceText(p,'location')};
  for(const [i,id] of ids.entries()){
   let value=values[id]??p.get(id);
   if(id==='interview')value=value.replace('op Bronverantwoording','in de detailviewer bij Toetsaanpak');
   if(id==='procedure'&&!value)value=[p.material?.testDesign,p.material?.testExistence,p.material?.testOperation].filter(Boolean).join('\n\n');
   if(['controlObjective','procedure','interview','documentation'].includes(id))value=displayProposal(value);
   const group=riskGroup(id);
   set(s,r,i+1,value,id==='interviewDate'?rs.date:group?rs[group+'Body']:id==='pointId'||id==='source'?rs.linked:rs.body);
  }
  s.heights[r]=66;s.entries.push({...p,row:r,endRow:r,pointText:values.criterion});
  const c=id=>col(s.columnIds.indexOf(id));
  s.validations.push({range:c('selection')+r,formula:'"Meenemen,Niet meenemen"'});
  if(ids.includes('interviewer'))s.validations.push({range:c('interviewer')+r,formula:'Teamleden'});
  const source=p.sources[0],target=sourcePassageUrl(source);if(target){s.hyperlinks.push({ref:c('source')+r,target,tooltip:'Open de eerste bronverwijzing bij dit toetspunt'});if(ids.includes('location'))s.hyperlinks.push({ref:c('location')+r,target,tooltip:'Open het eerste genoemde artikel of de eerste pagina'});}
  const context=['objective','risk','controlObjective','control'].filter(id=>p.get(id)).map(id=>labels[id]+'\n'+(id==='controlObjective'?displayProposal(p.get(id)):p.get(id))).join('\n\n');
  if(context)s.notes.push({ref:c('criterion')+r,text:context});
 }
 {
  // Fit the entire row, including long norms and audit instructions. Widen a
  // column only if its text would otherwise exceed Excel's row-height limit.
  for(let c=1;c<s.widths.length;c++)while(s.widths[c]<255&&s.entries.some(e=>fittedRowHeight(s.rows[e.row-1][c],s.widths[c])>325))s.widths[c]=Math.min(255,s.widths[c]+4);
  for(const e of s.entries)s.heights[e.row]=Math.min(409,Math.max(36,...s.rows[e.row-1].slice(1).map((v,c)=>fittedRowHeight(v,s.widths[c+1]))));
 }
 if(!records.length)set(s,5,1,'');
 s.tables=[{name:profile==='risk'?'RisicoControlmatrix':'Interviewleidraad',ref:`B4:${col(ids.length)}${Math.max(5,s.rows.length)}`,style:'TableStyleLight1'}];
 const selection=col(s.columnIds.indexOf('selection'));s.conditionalFormats.push({range:`${selection}5:${selection}${s.rows.length}`,rules:[{formula:`${selection}5="Niet meenemen"`,dxfId:30}]});
 return s;
}
function viewer(main,profile,modelBasis){
 const sections=modelBasis?[['Interviewvraag',['title','variable','indicator','level','criterion']],['Doorvragen',['probes','starr']],['Verificatie',['documents','observation']],['Bronnen',['source','basis']],['Modelcontext',['modelContext']],['Gespreksnotities',['respondent','interviewer','interviewDate','notes']]]:
 profile==='risk'?[['Norm en toetspunt',['parentCriterion','criterion']],['Risico en beheersing',['objective','risk','controlObjective','control',...(main.entries.some(e=>e.get('owner'))?['owner']:[])]],['Toetsaanpak',[...(main.entries.some(e=>e.get('auditQuestion'))?['auditQuestion']:[]),'procedure','documentation']],['Bronnen',['source','basis','location']],['Opmerkingen',['comments']]]:
 [['Interview',['interview']],['Norm en toetspunt',['parentCriterion','criterion']],['Context',['objective','risk','controlObjective','control']],['Toetsaanpak',['procedure','documentation']],['Bronnen',['source','basis','location']],['Gespreksnotities',['respondent','interviewer','interviewDate','notes','comments']]];
 for(let i=sections.length-1;i>=0;i--){sections[i][1]=sections[i][1].filter(id=>main.columnIds.includes(id)||main.entries.some(e=>e.get(id)));if(!sections[i][1].length)sections.splice(i,1);}
 if(!modelBasis&&main.entries.some(e=>sourceBackground(e))){
  const sourceIndex=sections.findIndex(([label])=>label==='Bronnen'),fields=sections[sourceIndex][1];
  const oversized=main.entries.some(e=>{
   const sources=fields.map(id=>labels[id]+'\n'+scalar(main.rows[e.row-1][main.columnIds.indexOf(id)])).join('\n\n');
   return sources.length+2+sourceBackground(e).length>excelCellTextLimit;
  });
  // Keep editable register references live. A long immutable source context is
  // its own continuation section, never a giant concatenation in one formula.
  if(oversized)sections.splice(sourceIndex+1,0,['Broncontext',['sourceBackground']]);
  else fields.push('sourceBackground');
 }
 const s=blankSheet(detailName,[4,...(profile==='risk'?[32,38,38,32]:[25,30,30,25]),4,44,12,...sections.map(()=>40),4,30]);s.freeze=4;s.freezeColumns=0;s.hiddenColumns=Array.from({length:s.widths.length-6},(_,i)=>i+6);s.previewHiddenColumns=[0,5,...s.hiddenColumns];s.detailRecords=[];
 band(s,2,profile==='risk'?'Risico en beheersing bekijken':'Interviewvraag bekijken',4,47);s.heights[2]=36;
 band(s,3,modelBasis?'Kies een interviewvraag. Alle bijbehorende informatie staat hieronder.':'Kies een toetspunt. Alle bijbehorende informatie staat hieronder.',4,48);
 band(s,4,main.entries[0]?main.entries[0].pointId+' · '+main.entries[0].title:'',4,33);s.heights[4]=44;
 s.heights[5]=10;
 // Store non-register values in hidden cells, not formula string literals.
 // Long saved source text can exceed Excel's literal/formula length limits.
 const textColumns=new Map();
 const storedText=(r,id,text)=>{
  if(!textColumns.has(id)){
   const c=s.widths.length;textColumns.set(id,c);s.widths.push(40);
   s.hiddenColumns.push(c);s.previewHiddenColumns.push(c);
  }
  const c=textColumns.get(id);set(s,r,c,text);return `$${col(c)}${r}`;
 };
 const end=Math.max(2,main.entries.length+1),pos=`MATCH($B$4,$G$2:$G$${end},0)`;
 set(s,6,1,f('HYPERLINK("#\'02 Onderzoeksvragen\'!C2","Per onderzoeksvraag bekijken")','Per onderzoeksvraag bekijken'),17);s.merges.push('B6:C6');
 set(s,6,3,f(`IF(B4="","",HYPERLINK("#'${main.name}'!B"&INDEX($H$2:$H$${end},${pos}),"Naar register / invullen"))`,main.entries.length?'Naar register / invullen':''),17);s.merges.push('D6:E6');
 for(const [i,e] of main.entries.entries()){
  const r=i+2;set(s,r,6,e.pointId+' · '+e.title);set(s,r,7,f(`MATCH("${e.pointId.replaceAll('"','""')}",'${main.name}'!$B$5:$B$${Math.max(5,main.rows.length)},0)+4`,e.row));
  const contents=[];
  for(const [j,[label,fields]] of sections.entries()){
   if(fields.length===1&&fields[0]==='sourceBackground'){
    const text=sourceBackground(e);contents.push(text);set(s,r,8+j,text);continue;
   }
   const parts=[],cached=[];
   for(const id of fields){
    if(id==='sourceBackground'){
     const text=sourceBackground(e);if(text){parts.push(storedText(r,id,text));cached.push(text);}continue;
    }
    const c=main.columnIds.indexOf(id),raw=c>=0?scalar(main.rows[e.row-1][c]):e.get(id)||(id==='procedure'?[e.material?.testDesign,e.material?.testExistence,e.material?.testOperation].filter(Boolean).join('\n\n'):''),value=['controlObjective','procedure','documentation','interview'].includes(id)?displayProposal(raw):raw,name=modelBasis&&id==='criterion'?'Interviewvraag':id==='modelContext'?'Model en gebruik':labels[id];
    // Every editable register cell is read live by ID, including after sorting.
    const range=`'${main.name}'!$${col(c)}$5:$${col(c)}$${Math.max(5,main.rows.length)}`,ids=`'${main.name}'!$B$5:$B$${Math.max(5,main.rows.length)}`,key=e.pointId.replaceAll('"','""');
    const read=c>=0?`INDEX(${range},MATCH("${key}",${ids},0))`:null;
    const text=id==='interviewDate'&&read?`IF(${read}="","",TEXT(${read},"dd-mm-yyyy"))`:read?`(${read}&"")`:storedText(r,id,String(value));
    parts.push(fields.length===1&&name===label?text:`"${name}"&CHAR(10)&${text}`);cached.push(fields.length===1&&name===label?value:name+'\n'+value);
   }
   const content=cached.join('\n\n');contents.push(content);set(s,r,8+j,f(parts.join('&CHAR(10)&CHAR(10)&')||'""',content));
  }
  s.detailRecords.push({pointId:e.pointId,contents});
 }
 s.validations.push({range:'B4',formula:`$G$2:$G${end}`});
 addDetailSections(s,sections.map(x=>x[0]),8,end,pos,(r,c,v,style)=>set(s,r,c,v,style));return s;
}
export function profileTemplateWorkbook(model,draft,options,framework){
 const profile=options.profile,modelBasis=options.basis&&options.basis!=='norms',records=modelBasis?modelRecords(model,draft,options):recordsFrom(model,draft,framework);
 const main=register(records,profile,modelBasis),questions=questionSheet(main,draft,detailName,modelBasis?'Interviewvragen':'Toetspunten'),detail=viewer(main,profile,modelBasis),log=versionSheet(model,records,draft),design=templateDesign(model.meta);
 log.rows[10][6]='Vul hierboven teamleden in; kies ze bij Gewijzigd door'+(profile==='interview'?' en Interviewer.':'.');
 const evidence=workbookEvidence(records,draft);
 const result=fitExportTypography({...model,...design,meta:{...model.meta,exportLayout:'tbb-profile-v1'},sheets:[log,questions,main,detail],evidence,definedNames:[{name:'Teamleden',formula:"'01 Versiebeheer'!$G$6:$G$10"}]});
 for(const s of result.sheets)s.tabColor=design.previewStyles[3].fill;
 return result;
}
