"use client";
import {countLabel} from '@/lib/display-count.mjs';

import {useEffect,useState,type ComponentType} from 'react';
import {ArrowRight,BookOpen,ClipboardCheck,ListChecks,Search,Settings2,ShieldCheck,Target,TriangleAlert,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose} from '@/components/ui/sheet';
import type {Draft,Line,ElementKey} from '@/lib/framework-types';
import {cioCatalogue as rawCatalogue,cioPoints as rawPoints,cioStatus,cioSourceBank as rawBank,cioGoalFor,cioSelection,chooseCioPoints} from '@/lib/cio-law-adapter.mjs';
import {cioFunctionGroups,cioFunctionRows} from '@/lib/cio-function-view.mjs';
import {cioSourceId,cioKindLabels} from '@/lib/cio-law-data.mjs';
import {cioControlMeasureFor} from '@/lib/cio-content.mjs';
import {catalogueDerived} from '@/lib/catalogue-runtime.mjs';
import {closeFoundation} from '@/lib/foundation-workspace.mjs';
import CompactMatrix from './compact-matrix';
import CompactContextText from './compact-context-text';
import LawReadingControls from './law-reading-controls';
import {lawCountText} from '@/lib/law-view-counts.mjs';
import FilterPicker from './filter-picker';
import OpenItemStrip from './open-item-strip';
import {useBrowseState} from './browse-state';
import {useLawOverview,type LawOverviewProps} from './law-overview-state';
import {Approach} from './cio-law-workspace';
import CioSourceAbout from './cio-source-about';
import CioPointSource from './cio-point-source';
import CioNormSummary from './cio-norm-summary';
import {TermText} from './term-help';
import type {Point,Criterion,Objective,RecordEntry} from './cio-law-workspace';
import './control-objective-pilot.css';
import './cio-law-browser.css';

export type LawBrowserAdapter={sourceId:string;title:string;heading:string;viewKey:string;analysisNotice?:string;catalogue:{objectives:Objective[];criteria:Criterion[]};points:Point[];records:RecordEntry[];rows:FunctionRow[];groups:{id:string;title:string}[];goalFor:(id:string)=>{text:string}|null;measureFor:(id:string,group:string)=>{text:string}|null;selection:typeof cioSelection;choose:typeof chooseCioPoints;About:ComponentType<{onPoint:(id:string)=>void}>;Source:ComponentType<{point:Point;parent:Criterion}>;Approach?:ComponentType<{point:Point}>};
type Props=LawOverviewProps&{draft:Draft;onChange:(d:Draft)=>void;disabled?:boolean;navigate:(p:string)=>void;initialPointId?:string;viewerOnly?:boolean;onClose?:()=>void;hideOpenStrip?:boolean;adapter?:LawBrowserAdapter};
type FunctionRow=Line&{criterionId:string;groupId:string;pointIds:string[];articleReferences?:string[]};
type Tab='points'|'source'|'approach';
const catalogue=rawCatalogue as unknown as {objectives:Objective[];criteria:Criterion[]};
const points=rawPoints as unknown as Point[];
const records=(rawBank as unknown as {records:RecordEntry[]}).records;
const rows=cioFunctionRows as unknown as FunctionRow[];
const pointMap=new Map(points.map(p=>[p.id,p]));
const recordMap=new Map(records.map(r=>[r.id,r]));
const cioDefaults={catalogue,points,rows,pointMap,recordMap};
catalogueDerived(()=>{pointMap.clear();for(const p of points)pointMap.set(p.id,p);recordMap.clear();for(const r of records)recordMap.set(r.id,r);});
const columns=[{id:'objective',title:'Doel'},{id:'risk',title:'Risico'},{id:'controlObjective',title:'Beheersdoelstelling'},{id:'control',title:'Beheersmaatregel'}];
const unique=(values:string[])=>[...new Set(values)];

function sourceLocations(ids:string[],recordMap:Map<string,RecordEntry>){
 return unique(ids.flatMap(id=>{const record=recordMap.get(id);return record?[`${record.locator} · p. ${unique(record.source_spans.map(s=>String(s.page))).join(', ')}`]:[];})).join(' · ');
}
function groupLocation(groupRows:FunctionRow[],pointMap:Map<string,Point>,recordMap:Map<string,RecordEntry>){
 const children=groupRows.flatMap(row=>row.pointIds.map(id=>pointMap.get(id)).filter((p):p is Point=>Boolean(p)));
 const chapters=unique(children.map(p=>p.chapter));
 const articles=unique(children.flatMap(p=>p.source_links.filter(l=>l.contribution==='PRIMARY').flatMap(l=>{
  const match=recordMap.get(l.record_id)?.locator.match(/Artikel\s+(\d+)/i);return match?[match[1]]:[];
 }))).sort((a,b)=>Number(a)-Number(b));
 return [chapters.join(' / '),articles.length?`Artikel ${articles.join(', ')}`:''].filter(Boolean).join(' · ');
}
export default function CioLawBrowser(props:Props){return <Browser key={props.initialPointId||'catalogue'} {...props}/>;}
export function CioPointViewer({pointId,onClose,...props}:Omit<Props,'navigate'|'initialPointId'> & {pointId:string;onClose:()=>void}){
 return <CioLawBrowser {...props} initialPointId={pointId} viewerOnly onClose={onClose} navigate={onClose}/>;
}
function Browser({draft,onChange,disabled=false,navigate,initialPointId,viewerOnly=false,onClose,hideOpenStrip=false,adapter,...overviewProps}:Props){
 const sourceId=adapter?.sourceId||cioSourceId,title=adapter?.title||cioStatus.title;
 const activeCatalogue=adapter?.catalogue||cioDefaults.catalogue,activePoints=adapter?.points||cioDefaults.points,activeRows=adapter?.rows||cioDefaults.rows;
 const activePointMap=adapter?new Map(activePoints.map(p=>[p.id,p])):cioDefaults.pointMap,activeRecordMap=adapter?new Map(adapter.records.map(r=>[r.id,r])):cioDefaults.recordMap;
 const groupsForSource=adapter?.groups||cioFunctionGroups,select=adapter?.selection||cioSelection,choosePoints=adapter?.choose||chooseCioPoints;
 const goalFor=adapter?.goalFor||cioGoalFor,measureFor=adapter?.measureFor||cioControlMeasureFor;
 const About=adapter?.About||CioSourceAbout,Source=adapter?.Source||CioPointSource;
 const PointApproach=adapter?.Approach||Approach;
 const catalogue=activeCatalogue,points=activePoints,rows=activeRows,pointMap=activePointMap,recordMap=activeRecordMap;
 const initial=pointMap.get(initialPointId||'');
 const [openId,setOpenId]=useState(rows.find(row=>initial&&row.pointIds.includes(initial.id))?.id||'');
 const [pointId,setPointId]=useState(initial?.id||'');
 const [overview,setOverview]=useLawOverview(overviewProps);
 const [tab,setTab]=useState<Tab>('points');
 const [error,setError]=useState('');
 const [readingDensity,setReadingDensity]=useState<'compact'|'comfortable'|'full'>('comfortable');
 const [view,setView,viewReady]=useBrowseState(adapter?.viewKey||'cio-source-groups-v3',{query:'',group:'',selectedOnly:false,density:'compact',columns:columns.map(c=>c.id),columnsVersion:0});
 // Expand only the previous default; deliberately customised column choices stay intact.
 const chosenColumns=view.columnsVersion===0&&view.columns.join(',')==='objective,risk,controlObjective,criterion'?columns.map(c=>c.id):view.columns;
 useEffect(()=>{if(viewReady&&view.columnsVersion===0)setView(v=>({...v,columns:v.columns.join(',')==='objective,risk,controlObjective,criterion'?columns.map(c=>c.id):v.columns,columnsVersion:1}));},[viewReady,view.columnsVersion,setView]);
 const visibleColumns=columns.filter(c=>chosenColumns.includes(c.id)).map(c=>c.id);
 const selection=select(draft),selected=new Set<string>(selection.selectedIds);
 const row=rows.find(r=>r.id===openId);
 const children=row?row.pointIds.map(id=>pointMap.get(id)).filter((p):p is Point=>Boolean(p)):[];
 const point=children.find(p=>p.id===pointId)||children[0];
 const parent=catalogue.criteria.find(c=>c.id===row?.criterionId);
 const measure=row?measureFor(row.criterionId,row.groupId):null;
 const objectives=catalogue.objectives.filter(o=>point?.objective_ids.includes(o.id));
 const state=select(draft,children.map(p=>p.id));
 const query=view.query.trim().toLocaleLowerCase('nl');
 const matches=rows.filter(r=>{
  if(view.group&&r.groupId!==view.group)return false;
  if(view.selectedOnly&&!r.pointIds.some(id=>selected.has(id)))return false;
  if(!query)return true;
  const content=[r.id,r.title,r.entity,...(r.articleReferences||[]),r.objective.text,r.risk.text,r.controlObjective?.text,r.control.text,r.criterion.text,...r.pointIds.flatMap(id=>{
   const p=pointMap.get(id);return p?[p.id,p.title,p.text,p.chapter,...p.addressees.map(a=>a.label),...p.conditions,...p.exceptions,sourceLocations(p.source_links.map(l=>l.record_id),recordMap)]:[];
  })].join(' ').toLocaleLowerCase('nl');
  return content.includes(query);
 });
 const groups=groupsForSource.map(group=>({...group,allRows:rows.filter(r=>r.groupId===group.id),visibleRows:matches.filter(r=>r.groupId===group.id)})).filter(group=>group.visibleRows.length>0);
 const counts=Object.fromEntries(rows.map(r=>{const s=select(draft,r.pointIds);return [r.id,{selected:s.selected,total:s.total}];}));
 function choose(ids:string[],value:boolean){
  if(disabled)return;
  try{onChange(choosePoints(draft,unique(ids),value) as Draft);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Selectie kon niet worden bewaard.');}
 }
 function open(id:string){const next=rows.find(r=>r.id===id);setOpenId(id);setPointId(next?.pointIds[0]||'');setTab('points');}
 function close(){setOpenId('');onClose?.();}
 const resetFilters=()=>setView(v=>({...v,query:'',group:'',selectedOnly:false}));
 return <section className="law-browser" aria-label={title}>
  {!viewerOnly&&<>
  {!hideOpenStrip&&<OpenItemStrip id="cio-open" items={[{id:sourceId,title}]} activeId={sourceId} onActivate={()=>{}} onClose={()=>{onChange(closeFoundation(draft,sourceId) as Draft);navigate('foundations');}} onExplore={()=>navigate('foundations')} exploreLabel="Wet of kader openen" disabled={disabled}/>}
  <div className="law-view-actions"><nav className="law-overview-tabs" aria-label="Kaderweergave"><button aria-pressed={overview==='norms'} onClick={()=>setOverview('norms')}>Normen</button><button aria-pressed={overview==='source'} onClick={()=>setOverview('source')}>Over dit kader</button></nav><Button onClick={()=>navigate('framework')}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button></div>
  {overview==='source'&&<About onPoint={id=>{const match=rows.find(row=>row.pointIds.includes(id));if(match)open(match.id);}}/>}
  {error&&<p className="cio-error" role="alert">{error}</p>}
  {overview==='norms'&&<>
   <div className="law-browse-intro"><div className="law-viewer-heading"><h2>{adapter?.heading||'Normen van het CIO-stelsel'}</h2><output aria-live="polite" title="Unieke normen binnen de huidige filters. Een norm kan bij meerdere groepen staan; gekoppelde toetspunten tellen in je selectie maar één keer.">{lawCountText(matches)}</output></div><div className="law-selection-actions"><Button variant="outline" aria-pressed={view.selectedOnly} onClick={()=>setView(v=>({...v,selectedOnly:!v.selectedOnly}))}>Normen met gekozen toetspunten</Button><Button variant="outline" disabled={disabled} title="Voor het hele kader, ook buiten de huidige filters. Punten met open bronvragen blijven uitgesloten." onClick={()=>choose(points.map(p=>p.id),!selection.all)}><ListChecks size={15}/>{selection.all?'Deselecteer alle normen':'Selecteer alle normen'}</Button></div></div>
   <div className="law-browse-filters" aria-label="Normen filteren">
    <label className="law-search-label" htmlFor="law-search">Zoeken in dit kader<div className="law-search"><Search size={17}/><Input id="law-search" placeholder="Zoek op norm, functie of artikel…" value={view.query} onChange={e=>setView(v=>({...v,query:e.target.value}))}/></div></label>
    <label htmlFor="law-group-filter">Groep binnen het kader<select id="law-group-filter" value={view.group} onChange={e=>setView(v=>({...v,group:e.target.value}))}><option value="">Alle groepen</option>{groupsForSource.map(group=><option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
    <div className="law-column-control"><span>Weergave</span><FilterPicker subtle label="Kolommen" options={columns} value={visibleColumns} onChange={next=>setView(v=>({...v,columns:next}))}/></div>
    <LawReadingControls value={readingDensity} onChange={setReadingDensity}/>
    {(query||view.group||view.selectedOnly)&&<Button className="law-reset-filters" variant="ghost" onClick={resetFilters}>Filters wissen</Button>}
   </div>
   <div className="law-group-stack">{groups.map(group=>{
    const ids=unique(group.allRows.flatMap(r=>r.pointIds)),groupState=select(draft,ids),hold=ids.length-groupState.total;
    return <section className="law-group" key={group.id} data-law-group={group.id} aria-labelledby={`law-group-${group.id}`}>
     <header className="law-group-heading"><div><p className="law-group-location">{adapter?'':groupLocation(group.allRows,pointMap,recordMap)}</p><h3 id={`law-group-${group.id}`}>{group.title}</h3><p className="law-group-count">{groupState.selected} van {countLabel(groupState.total,'toetspunten')} gekozen{hold>0&&` · ${hold} nog niet selecteerbaar`}{group.visibleRows.length<group.allRows.length&&` · ${group.visibleRows.length} van ${countLabel(group.allRows.length,'normen')} zichtbaar`}</p></div><label className="law-select-group" htmlFor={`law-group-all-${group.id}`}><Checkbox id={`law-group-all-${group.id}`} checked={groupState.all} indeterminate={groupState.partial} disabled={disabled||!groupState.total} aria-label={`Selecteer hele groep ${group.title}, ${countLabel(groupState.total,'toetspunten')}`} onCheckedChange={value=>choose(ids,value===true)}/><span>Selecteer hele groep<small>{countLabel(groupState.total,'toetspunten')}</small></span></label></header>
     <CompactMatrix lines={group.visibleRows} draft={draft} viewDraft={draft} disabled={disabled} onChange={onChange} selected={openId} viewKey={`${adapter?.sourceId||'cio'}-group-${group.id}-v2`} embedded descriptiveTitles subjectColumnLabel="Norm" showProvenance={false} textDensity={readingDensity}
      initialColumns={visibleColumns} columnOptions={columns.map(c=>c.id) as ElementKey[]}
      onOpen={open} onOpenField={id=>open(id)} pointChoices={{counts,onChoose:open,onSelect:(rowIds,value)=>choose(rows.filter(r=>rowIds.includes(r.id)).flatMap(r=>r.pointIds),value)}}/>
    </section>;
   })}</div>
   {!groups.length&&<section className="law-empty"><h3>Geen normen gevonden</h3><p>Pas je zoekterm of filters aan om de onderdelen van dit kader weer te zien.</p><Button variant="outline" onClick={resetFilters}>Alle normen tonen</Button></section>}
  </>}
  <footer className="law-list-footer"><span>{selection.selected} van {countLabel(selection.total,'toetspunten')} uit dit kader gekozen</span></footer>
  </>}
  <Sheet open={Boolean(row&&parent)} onOpenChange={value=>{if(!value)close();}}>
   <SheetContent className="audit-detail bd-pilot-detail law-detail" showCloseButton={false} aria-modal="true">
    <SheetHeader className="bd-header"><div className="bd-heading-row"><div><SheetDescription>{row?.entity} · {row?.id}</SheetDescription><SheetTitle>{row?.title}</SheetTitle></div><SheetClose render={<Button variant="ghost" size="icon" aria-label="Sluiten"/>}><X size={20}/></SheetClose></div></SheetHeader>
    <nav className="law-point-tabs law-main-tabs" aria-label="Kaderanalyse">{([{id:'points',label:'Toetspunten',Icon:ListChecks},{id:'source',label:'Bronpassage',Icon:BookOpen},{id:'approach',label:'Toetsaanpak',Icon:ClipboardCheck}] as const).map(({id,label,Icon})=><Button key={id} variant="ghost" aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={16}/>{label}</Button>)}</nav>
    {row&&parent&&point&&<div className="law-detail-body law-focused-body">
     {tab==='points'?<>
      {adapter?.analysisNotice&&<p className="text-xs text-muted-foreground">{adapter.analysisNotice}</p>}
      <section className="law-context law-flow" aria-label="Samenhang van doel, risico en beheersing">{objectives.map(objective=><div className="law-context-grid" key={objective.id}>
       {[{label:'Doel',text:goalFor(objective.id)?.text||'Niet geformuleerd',field:'objective',Icon:Target},{label:'Risico',text:objective.risk||'Niet geformuleerd',field:'risk',Icon:TriangleAlert},{label:'Beheersdoelstelling',text:objective.text,field:'controlObjective',Icon:ShieldCheck},{label:'Beheersmaatregel',text:measure?.text||'Niet geformuleerd',field:'control',Icon:Settings2}].map(({label,text,field,Icon})=><section className={`law-context-card law-context-${field}`} key={field}><h4><Icon size={16}/><TermText text={label}/></h4><CompactContextText text={text} label={label}/></section>)}
      </div>)}</section>
      <section className="law-parent-criterion"><h3><ListChecks size={16}/> <TermText text="Norm"/></h3><p>{parent.text}</p></section>
      <div className="law-points-heading"><label htmlFor="law-select-all"><Checkbox id="law-select-all" disabled={disabled||!state.total} checked={state.all} indeterminate={state.partial} onCheckedChange={value=>choose(children.map(p=>p.id),value===true)}/>Alle toetspunten</label><output>{state.selected} van {state.total} gekozen</output></div>
      <div className="law-choice-grid">{children.map(p=><article key={p.id} data-point={p.id} data-inspected={initialPointId===p.id||undefined} className={`law-choice-card${selected.has(p.id)?' is-chosen':''}`}>
       {viewerOnly&&initialPointId===p.id&&<small className="viewer-current-point">Bekeken bouwsteen</small>}
       <label htmlFor={`law-${p.id}`}><Checkbox id={`law-${p.id}`} aria-label={`${p.title} selecteren`} disabled={disabled||p.selection_status!=='SELECTABLE'} checked={selected.has(p.id)} onCheckedChange={value=>choose([p.id],value===true)}/><strong>{p.title}</strong></label>
       <p>{p.text}</p>{p.selection_status!=='SELECTABLE'&&<p className="cio-notice">HOLD · {p.selection_reason}</p>}
       {(()=>{const material=draft.investigation?.materials.find(m=>m.sourcePointId===p.id),text=material&&draft.overrides[material.id]?.criterion;return text!==undefined&&text!==p.text?<section className="viewer-own-wording"><strong>Eigen formulering in je kader</strong><p>{text}</p></section>:null;})()}
       <div className="law-choice-actions"><small>{p.id} · {(cioKindLabels as Record<string,string>)[p.normative_kind]||p.normative_kind}</small><button onClick={()=>{setPointId(p.id);setTab('source');}}>Bronpassage{p.conditions.length+p.exceptions.length>0?' · voorwaarden':''}</button><button onClick={()=>{setPointId(p.id);setTab('approach');}}>Toetsaanpak</button></div>
      </article>)}</div>
     </>:<>
      {children.length>1&&<nav className="law-point-switcher" aria-label="Kies een toetspunt">{children.map(p=><button key={p.id} data-point={p.id} className="law-inspect-point" aria-pressed={point.id===p.id} onClick={()=>setPointId(p.id)}>{p.title}</button>)}</nav>}
      {tab==='source'?<Source key={point.id} point={point} parent={parent}/>:<>
       <CioNormSummary point={point}/>
       <PointApproach point={point}/>
      </>}
     </>}
    </div>}
    <footer className="bd-footer"><span>{error||`${countLabel(selection.selected,'toetspunten')} uit dit kader gekozen · keuzes worden direct bewaard`}</span><div>{!viewerOnly&&<Button variant="outline" onClick={()=>{close();navigate('framework');}}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button>}<Button onClick={close}>Gereed</Button></div></footer>
   </SheetContent>
  </Sheet>
 </section>;
}
