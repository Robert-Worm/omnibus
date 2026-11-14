"use client";
import {countLabel} from '@/lib/display-count.mjs';
import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {Layers,ListFilter,ArrowRight,ArrowLeft,FolderOpen,Landmark,Users,Monitor,ShieldCheck,Database,Network,HandHeart,Package,BookOpen,Brain,Scale} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {groupedDiscovery} from '@/lib/discovery-navigation.mjs';
import type {Theme} from './workspace-catalogues';
import DirectorySearch from './directory-search';
import {TermText} from './term-help';
import CatalogueCardActions from './catalogue-card-actions';
import {catalogueSelection} from '@/lib/catalogue-selection.mjs';
import CatalogueTable,{CatalogueViewToggle,CellTip,useCatalogueView,type CatalogueColumn} from './catalogue-table';
import {processClasses,processKinds,processClassesOf,processMainClass,processCode} from '@/lib/process-taxonomy.mjs';
import {organisationsOf,reportOrganisations} from '@/lib/report-organisations.mjs';
import {SymbolRow} from './audience-icons';
import {Building,Compass,Euro,Gavel,ScrollText,Server,ShoppingCart} from 'lucide-react';
type ClassId=keyof typeof processClasses;

type View=Theme&{axis:string;categoryId:string;description:string};
export type DirectoryView={query:string;expanded:string[];closedSearchGroups:string[];limits:Record<string,number>};
export const emptyDirectoryView=():DirectoryView=>({query:'',expanded:[],closedSearchGroups:[],limits:{}});
const classIcons:Record<ClassId,typeof Layers>={beleid:ScrollText,uitvoering:HandHeart,toezicht:Gavel,sturing:Compass,financien:Euro,inkoop:ShoppingCart,informatie:Database,ict:Server,personeel:Users,facilitair:Building};
const familyIcons:Record<string,typeof Layers>={public:Landmark,organisation:Users,operations:Monitor,security:ShieldCheck,technology:Monitor,policy:Landmark,information:Database,governance:Network,integrity:ShieldCheck,service:HandHeart,resources:Package};

export default function DiscoveryCatalogue({views,axis,onAxis,openIds,onOpen,onPrepare,onToggle,onWorkspace,view,onViewChange,guided=false,onSources,onFrameworks,onModels,area=axis,children,included=[],onSelect,disabled=false,reports=[]}:{reports?:{id:string;title:string;year:number}[];views:View[];axis:'themes'|'processes';onAxis:(axis:'themes'|'processes')=>void;openIds:string[];onOpen:(id:string)=>void;onPrepare?:(id:string)=>void;onToggle:(id:string,open:boolean)=>void;onWorkspace:()=>void;view:DirectoryView;onViewChange:(patch:Partial<DirectoryView>)=>void;guided?:boolean;onSources?:()=>void;onFrameworks?:()=>void;onModels?:()=>void;area?:'themes'|'processes'|'laws'|'frameworks'|'models';children?:ReactNode;included?:string[];onSelect?:(ids:string[],include:boolean)=>void;disabled?:boolean}){
 const {query,expanded,closedSearchGroups,limits}=view;
 const groups=groupedDiscovery(views,axis,query);
 const selectedGroup=!query&&groups.find(g=>g.id===expanded.at(-1));
 // 'all' kan nog in een bewaarde weergave staan en toont dan elke groep onder elkaar; de lijstweergave vervangt de knop.
 const showAll=!query&&expanded.at(-1)==='all';
 const detailGroups=query||showAll?groups:selectedGroup?[selectedGroup]:[];
 const noun=axis==='themes'?'thema’s':'processen';
 // Lijstweergave: alle thema's of processen in één tabel, als alternatief voor de tegels per groep.
 const catalogueView=useCatalogueView(),listMode=catalogueView.list;
 const seen=new Set<string>(),groupLabel=axis==='themes'?'Themagroep':'Procesfamilie';
 // Symbolen in de lijst: wat voor soort proces het is, bij welke ministeries het is onderzocht en uit hoeveel rapporten het komt.
 // Alleen berekend voor de lijst, uit de taxonomie (lib/process-taxonomy.mjs) en de indeling van rapporten (lib/report-organisations.mjs).
 const reportById=new Map(reports.map(r=>[r.id,r]));
 const listRows=listMode?groups.flatMap(group=>group.children.filter((item:View)=>!seen.has(item.id)&&Boolean(seen.add(item.id))).map((item:View)=>{const selection=catalogueSelection({included},item.lineIds);
  const sources=item.reportIds.map(id=>reportById.get(id)).filter((r):r is {id:string;title:string;year:number}=>Boolean(r)).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title,'nl')),years=sources.map(r=>r.year);
  const classes=(processClassesOf(item.categoryId) as ClassId[]).map(id=>({id,...processClasses[id]})),mainId=processMainClass(item.categoryId) as ClassId|'',mainClass=mainId?processClasses[mainId]:null;
  return {id:item.id,code:processCode(item.categoryId),title:item.title,opened:openIds.includes(item.id),selected:selection.selected,total:item.lineIds.length,all:selection.all,partial:selection.partial,group:group.title,description:item.description||'',lines:item.lineIds.length,reports:item.reportIds.length,lineIds:item.lineIds,
   sources,period:years.length?(Math.min(...years)===Math.max(...years)?String(years[0]):Math.min(...years)+'–'+Math.max(...years)):'',
   classes,main:mainClass?processKinds[mainClass.kind as 'primair'|'ondersteunend'].label.replace(' proces','')+' · '+mainClass.label:'',kind:mainClass?(mainClass.kind==='primair'?'Primair':'Ondersteunend'):'',
   orgs:(organisationsOf(item.reportIds) as {id:string;label:string;name:string;reports:string[]}[])};})):[];
 type ListRow=typeof listRows[number];
 const classOrder=Object.values(processClasses as Record<string,{kind:'primair'|'ondersteunend';label:string}>).map(c=>processKinds[c.kind].label.replace(' proces','')+' · '+c.label);
 const strength=(n:number)=>n>=10?4:n>=5?3:n>=2?2:n?1:0;
 const reportLine=(id:string)=>{const r=reportById.get(id),at=(reportOrganisations as Record<string,{at:string}>)[id]?.at;return r?`${r.year} · ${at?at+': ':''}${r.title}`:id;};
 const listColumns:CatalogueColumn<ListRow>[]=[
  {key:'group',label:groupLabel,width:'14%',groupKey:'group',sort:r=>r.group,render:r=>r.group},
  {key:'reports',label:'Rapporten',width:'6.6rem',sort:r=>r.reports,
   render:r=>!r.reports?<small>–</small>:<CellTip plain label={`${r.reports} ${r.reports===1?'rapport':'rapporten'}${r.period?', '+r.period:''}`}
    tip={<><strong>{r.reports===1?'Uit één rapport':`Uit ${r.reports} rapporten`}{r.period&&` (${r.period})`}</strong>{r.orgs.length>0&&<span>Onderzocht bij: {r.orgs.map((o:{label:string})=>o.label).join(', ')}</span>}{r.sources.slice(0,8).map((o:{id:string})=><span key={o.id}>{reportLine(o.id)}</span>)}{r.sources.length>8&&<span>en {r.sources.length-8} andere</span>}<em>{r.reports===1?'Eén rapport is een voorbeeld uit de praktijk, geen patroon.':'Meer rapporten wijzen op een breder beeld, niet op een zwaarder risico.'}</em></>}>
    <span className="catalogue-meter" data-level={strength(r.reports)} aria-hidden="true"><i/><i/><i/><i/></span><span className="catalogue-meter-count">{r.reports}</span></CellTip>},
  {key:'kind',label:'Soort proces',width:'8.5rem',sort:r=>(r.kind==='Primair'?'a':'b')+r.classes.map((c:{label:string})=>c.label).join(' '),
   render:r=>r.classes.length?<SymbolRow items={r.classes.map((c:{id:ClassId;kind:'primair'|'ondersteunend';label:string;description:string})=>({id:c.id,Icon:classIcons[c.id],label:c.label,active:true,solid:c.kind==='primair',
    lines:[processKinds[c.kind].label+': '+processKinds[c.kind].description.toLowerCase(),c.description]}))}/>:<small>–</small>},
  {key:'type',label:'Primair of ondersteunend',width:'11.5rem',groupKey:'main',sort:r=>r.kind||'zzz',render:r=>r.kind?<CellTip plain label={r.kind+': '+processKinds[r.kind==='Primair'?'primair':'ondersteunend'].description} tip={<><strong>{processKinds[r.kind==='Primair'?'primair':'ondersteunend'].label}</strong><span>{processKinds[r.kind==='Primair'?'primair':'ondersteunend'].description}</span></>}><span className="catalogue-pill" data-tone={r.kind==='Primair'?'primair':'ondersteunend'}>{r.kind}</span></CellTip>:<small>–</small>},
 ];
 const familyHeading=useRef<HTMLHeadingElement>(null);
 const focusRequest=useRef(false);
 const returnCard=useRef('');
 const cards=useRef<HTMLDivElement>(null);
 const focusSearch=()=>{if(typeof document!=='undefined')document.getElementById('directory-search')?.focus();};
 useEffect(()=>{
  if(focusRequest.current){familyHeading.current?.focus();focusRequest.current=false;}
  if(returnCard.current){cards.current?.querySelector<HTMLButtonElement>('[data-family="'+returnCard.current+'"]')?.focus();returnCard.current='';}
 },[selectedGroup]);
 return <section className="catalogue-explorer discovery-directory foundation-catalogue" aria-label="Thema’s en processen openen">
  <header className="directory-heading" data-below-tabs={!guided||undefined}><div><h2>{guided?'Waar wil je beginnen?':'Verken thema’s en processen'}</h2>{guided&&<p className="directory-lead"><TermText text="Begin bij een wet, kader of model, of verken eerdere risico’s via thema’s of processen."/></p>}</div><div className="directory-heading-actions">{guided&&openIds.length>0&&<Button variant="outline" onClick={onWorkspace}><FolderOpen size={16} aria-hidden="true"/>Geopend ({openIds.length})</Button>}{catalogueView.available&&<CatalogueViewToggle mode={catalogueView.mode} onChange={catalogueView.setMode}/>}</div></header>
  <fieldset className="directory-axis" data-guided={guided}  aria-label="Bladeren op">
   {/* Van wat moet, via wat wordt aangeraden en wat de wetenschap zegt, naar thema’s en processen (besluit beheerder 12 november 2026). */}
   {guided&&onSources&&<button type="button" aria-pressed={area==='laws'} onClick={onSources}><Scale size={22} aria-hidden="true"/><span><strong>Wetten</strong><small>Wettelijke eisen</small></span></button>}
   {guided&&onFrameworks&&<button type="button" aria-pressed={area==='frameworks'} onClick={onFrameworks}><BookOpen size={22} aria-hidden="true"/><span><strong>Kaders</strong><small>Beheersing en normen</small></span></button>}
   {guided&&onModels&&<button type="button" aria-pressed={area==='models'} onClick={onModels}><Brain size={22} aria-hidden="true"/><span><strong>Modellen</strong><small>Wetenschappelijke modellen</small></span></button>}
   <button type="button" aria-pressed={area==='themes'} onClick={()=>onAxis('themes')}><Layers size={22} aria-hidden="true"/><span><strong>Thema’s</strong><small>Breed verkennen</small></span></button>
   <button type="button" aria-pressed={area==='processes'} onClick={()=>onAxis('processes')}><ListFilter size={22} aria-hidden="true"/><span><strong>Processen</strong><small>Gericht zoeken</small></span></button>
  </fieldset>
  {guided&&(area==='laws'||area==='frameworks'||area==='models')?<div className="directory-inline-catalogue">{children}</div>:<>
  {!listMode&&<DirectorySearch id="directory-search" label={axis==='themes'?'Zoek thema of themagroep':'Zoek proces of procesfamilie'} value={query} onChange={value=>onViewChange({query:value,closedSearchGroups:[],limits:{}})} placeholder={axis==='themes'?'Zoek thema…':'Zoek proces…'}/>}
  {listMode?<CatalogueTable id={'discovery2-'+axis} describe={r=>r.description||null} noun={axis==='themes'?['thema','thema’s']:['proces','processen']} unit={['bouwsteen','bouwstenen']} rows={listRows} columns={listColumns} searching={Boolean(query)} disabled={disabled}
   search={{id:'directory-search',label:axis==='themes'?'Zoek thema of themagroep':'Zoek proces of procesfamilie',placeholder:axis==='themes'?'Zoek thema…':'Zoek proces…',value:query,onChange:value=>onViewChange({query:value,closedSearchGroups:[],limits:{}})}}
   filters={[{key:'group',label:groupLabel,all:'Alle groepen',value:r=>[r.group]},{key:'kind',label:'Soort proces',all:'Alle',value:r=>r.classes.map((c:{label:string})=>c.label)}]}
   groups={[{key:'main',label:'Soort proces',plural:'soorten proces',value:r=>r.main,order:name=>classOrder.indexOf(name),describe:name=>Object.values(processClasses).find(c=>name.endsWith(' · '+c.label))?.description||''},{key:'group',label:groupLabel,plural:axis==='themes'?'themagroepen':'procesfamilies',value:r=>r.group,describe:name=>groups.find(g=>g.title===name)?.description||''}]}
   nameLabel={axis==='themes'?'Thema':'Proces'} nameMeta={r=>r.code?<span className="catalogue-id" title={'Vaste ID van dit '+(axis==='themes'?'thema':'proces')}>{r.code}</span>:null} countLabel="Gekozen bouwstenen" hint={`Een vinkje kiest alle bouwstenen van dat ${axis==='themes'?'thema':'proces'}. Open het om er een paar te kiezen.`} selectLabel={r=>`Kies alle ${r.total} bouwstenen van ${r.title}`} chosenUnique={new Set(listRows.flatMap(r=>r.lineIds).filter(id=>included.includes(id))).size}
   onOpen={onOpen} onSelect={onSelect?(ids,checked)=>onSelect([...new Set(listRows.filter(r=>ids.includes(r.id)).flatMap(r=>r.lineIds))],checked):undefined}
   empty={<p>Geen passend onderdeel gevonden. Wis je zoekopdracht of pas het filter aan.</p>}/>:<>
  {!query&&!selectedGroup&&!showAll&&<div className="directory-family-cards" ref={cards}>{groups.map(group=>{const Icon=familyIcons[group.id]||Layers;return <button type="button" key={group.id} data-family={group.id} className="directory-family-card" onClick={()=>{focusRequest.current=true;onViewChange({expanded:[group.id]});}}>
   <Icon size={24} aria-hidden="true"/><strong>{group.title}</strong><span>{group.description}</span><small>{countLabel(group.children.length,noun)}<ArrowRight size={16} aria-hidden="true"/></small>
  </button>;})}</div>}
  {!query&&(selectedGroup||showAll)&&<div className="directory-view-actions">
   {(selectedGroup||showAll)&&<Button variant="ghost" className="directory-back" onClick={()=>{returnCard.current=selectedGroup?selectedGroup.id:'';onViewChange({expanded:[]});}}><ArrowLeft size={15} aria-hidden="true"/>Alle {axis==='themes'?'themagroepen':'procesfamilies'}</Button>}
  </div>}
  {query&&<output className="directory-result-count" data-status-block="">{countLabel(groups.reduce((sum,g)=>sum+g.children.length,0),noun)} gevonden in {countLabel(groups.length,'groepen')}</output>}
  <div className="directory-families">{detailGroups.map(group=>{const Icon=familyIcons[group.id]||Layers;return <section className="directory-family" key={group.id} id={'family-'+axis+'-'+group.id}>
   <header className="directory-family-heading"><h3 ref={selectedGroup?familyHeading:undefined} tabIndex={-1}>{query?<button type="button" aria-expanded={!closedSearchGroups.includes(group.id)} aria-controls={'children-'+axis+'-'+group.id} onClick={()=>onViewChange({closedSearchGroups:closedSearchGroups.includes(group.id)?closedSearchGroups.filter(id=>id!==group.id):[...closedSearchGroups,group.id]})}><span className="directory-family-title"><Icon size={20} aria-hidden="true"/>{group.title}</span><span aria-hidden="true">{closedSearchGroups.includes(group.id)?'+':'−'}</span></button>:<span className="directory-family-title"><Icon size={20} aria-hidden="true"/>{group.title}</span>}</h3>{selectedGroup&&<p>{group.description}</p>}</header>
   {(!query||!closedSearchGroups.includes(group.id))&&<div id={'children-'+axis+'-'+group.id} className="directory-children">{group.children.slice(0,limits[group.id]||12).map((item:View)=><article key={item.id} data-open={openIds.includes(item.id)}>
    <div className="directory-child-body"><span className="catalogue-card-id">{axis==='themes'?'Thema':'Proces'}</span><h4>{item.title}</h4>{item.description&&<p>{item.description}</p>}<div className="catalogue-card-stats"><span><strong>{item.lineIds.length}</strong> {item.lineIds.length===1?'bouwsteen':'bouwstenen'}</span><span><strong>{item.reportIds.length}</strong> {item.reportIds.length===1?'bronrapport':'bronrapporten'}</span><span className="catalogue-card-selected"><strong>{catalogueSelection({included},item.lineIds).selected}</strong> gekozen</span></div></div>
    <CatalogueCardActions layout="buttons" title={item.title} opened={openIds.includes(item.id)} onOpen={()=>onOpen(item.id)} onPrepare={onPrepare?()=>onPrepare(item.id):undefined} onToggle={value=>onToggle(item.id,value)} disabled={disabled}
      selection={onSelect?{label:'Alle bouwstenen',checked:catalogueSelection({included},item.lineIds).all,partial:catalogueSelection({included},item.lineIds).partial,disabled:!item.lineIds.length,onChange:value=>onSelect(item.lineIds,value)}:undefined}/>
   </article>)}{group.children.length>(limits[group.id]||12)&&<Button variant="link" onClick={()=>onViewChange({limits:{...limits,[group.id]:(limits[group.id]||12)+12}})}>Toon meer onderdelen</Button>}</div>}
  </section>;})}</div>
  {!groups.length&&<output data-status-block="">Geen passend onderdeel gevonden. <Button variant="link" onClick={()=>{onViewChange({query:'',expanded:[]});focusSearch();}}>Toon alle groepen</Button></output>}
  </>}
  <p className="directory-note"><TermText text="Risico’s uit eerdere onderzoeken zijn aanknopingspunten, geen oordeel over jouw organisatie."/></p>
 </>}
 </section>;
}
