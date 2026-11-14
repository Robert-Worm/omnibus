'use client';
import {ToolSelect} from './catalogue-table';
import SelectionMenu from './selection-menu';
import {countLabel} from '@/lib/display-count.mjs';
import {useEffect,useMemo,useRef} from 'react';
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import type {Draft,Line,ElementKey} from '@/lib/framework-types';
import {reportBrowseGroups} from '@/lib/report-browse-groups.mjs';
import {reportBrowserGroups,reportSelection} from '@/lib/report-browser-model.mjs';
import {lawCountText} from '@/lib/law-view-counts.mjs';
import catalogue from '@/lib/report-point-catalogue.mjs';
import CompactMatrix,{type MatrixTextDensity} from './compact-matrix';
import DeferredViewerSection from './deferred-viewer-section';
import FilterPicker from './filter-picker';
import LawReadingControls from './law-reading-controls';
import {useBrowseState} from './browse-state';
const columns=[{id:'objective',title:'Doel'},{id:'risk',title:'Risico'},{id:'controlObjective',title:'Beheersdoelstelling'},{id:'control',title:'Beheersmaatregel'}];
type Counts=Record<string,{selected:number;total:number;legacySelected?:boolean}>;
type Group={id:string;title:string;lines:Line[];allRows:Line[]};
export default function ReportNormBrowser({title,lines,draft,viewDraft,counts,searchPoints=catalogue.points,viewKey,disabled,onChange,onOpen,onPrepare,onSelect,reveal,onRevealComplete,resetRequest,onResetComplete}:{title:string;lines:Line[];draft:Draft;viewDraft:Draft;counts:Counts;searchPoints?:{id:string;legacy_line_id:string;title:string;text:string}[];viewKey:string;disabled:boolean;onChange:(d:Draft)=>void;onOpen:(id:string,field?:ElementKey)=>void;onPrepare?:(id:string)=>void;onSelect:(ids:string[],value:boolean)=>void;reveal?:{id:string;nonce:number};onRevealComplete:()=>void;resetRequest:number;onResetComplete:()=>void}){
 const [view,setView,ready]=useBrowseState('report-browser-'+viewKey,{query:'',group:'',selectedOnly:false,columns:columns.map(c=>c.id),density:'compact'});
 const reset=()=>setView(v=>({...v,query:'',group:'',selectedOnly:false}));
 const revealHandled=useRef(0);
 useEffect(()=>{if(ready&&resetRequest){setView(v=>({...v,query:'',group:'',selectedOnly:false}));onResetComplete();}},[ready,resetRequest,setView,onResetComplete]);
 useEffect(()=>{
  if(!ready||!reveal||revealHandled.current===reveal.nonce)return;
  revealHandled.current=reveal.nonce;
  setView(v=>v.query||v.group||v.selectedOnly?{...v,query:'',group:'',selectedOnly:false}:v);
 },[ready,reveal,setView]);
 const groups=useMemo(()=>reportBrowserGroups(lines,counts,view,draft.included,searchPoints) as Group[],[lines,counts,view,draft.included,searchPoints]);
 const groupOptions=useMemo(()=>reportBrowseGroups(lines) as Group[],[lines]);
 const visibleCounts=lawCountText(groups.flatMap(g=>g.lines.map(line=>({groupId:g.id,criterionId:line.id}))));
 const selection=reportSelection(lines,counts,draft.included);
 const visibleColumns=view.columns.filter(id=>columns.some(c=>c.id===id));
 const density=(['compact','comfortable','full'].includes(view.density)?view.density:'compact') as MatrixTextDensity;
 return <section className="law-browser report-norm-browser" aria-label="Normen uit thema’s en processen">
  <div className="law-browse-intro"><div className="law-viewer-heading"><h2>{title}</h2><output aria-live="polite">{visibleCounts}</output></div><div className="law-selection-actions">
   <SelectionMenu selectedOnly={view.selectedOnly} onSelectedOnly={value=>setView(v=>({...v,selectedOnly:value}))} allChosen={selection.all} disabled={disabled||!lines.length} allTitle="Voor het hele geopende kader, ook buiten zoek- en groepsfilters. Je rapportkeuze blijft van toepassing." onToggleAll={()=>onSelect(lines.map(l=>l.id),!selection.all)}/>
  </div></div>
  <div className="law-browse-filters" aria-label="Normen filteren">
   <div className="law-search"><Search size={16} aria-hidden="true"/><Input id="report-norm-search" aria-label="Zoeken in dit kader" placeholder="Zoek op norm, toetspunt of onderwerp…" value={view.query} onChange={e=>setView(v=>({...v,query:e.target.value}))}/></div>
   {groupOptions.length>1&&<ToolSelect label="Groep:" active={Boolean(view.group)} value={view.group} onChange={group=>setView(v=>({...v,group}))} options={[{value:'',label:'Alle groepen'},...groupOptions.map(g=>({value:g.id,label:g.title}))]}/>}
   <div className="law-column-control"><FilterPicker subtle label="Kolommen" options={columns} value={visibleColumns} onChange={next=>setView(v=>({...v,columns:next}))}/></div>
   <LawReadingControls value={density} onChange={density=>setView(v=>({...v,density}))}/>
   {(view.query||view.group||view.selectedOnly)&&<Button variant="ghost" className="law-reset-filters" onClick={reset}>Filters wissen</Button>}
  </div>
  <div className="law-group-stack">{groups.map((g,index)=>{const state=reportSelection(g.allRows,counts,draft.included);return <section className="law-group" key={g.id} data-report-group={g.id}>
   <header className="law-group-heading"><div><h3>{g.title}</h3><p className="law-group-count">{state.selected} van {countLabel(state.total,'toetspunten')} gekozen</p></div><label className="law-select-group" htmlFor={'report-group-'+g.id}><Checkbox id={'report-group-'+g.id} disabled={disabled||!state.total} checked={state.all} indeterminate={state.partial} aria-label={'Selecteer hele groep '+g.title} onCheckedChange={v=>onSelect(g.allRows.map(l=>l.id),v===true)}/><span>Selecteer hele groep<small>{countLabel(state.total,'toetspunten')}</small></span></label></header>
   <DeferredViewerSection count={g.lines.length} immediate={index===0||g.lines.some(line=>line.id===reveal?.id)}>
    <CompactMatrix lines={g.lines} draft={draft} viewDraft={viewDraft} disabled={disabled} onChange={onChange} onOpen={onOpen} onOpenField={onOpen} onPrepare={onPrepare} selected={reveal?.id||''} viewKey={'report-group-'+viewKey+'-'+g.id} embedded reveal={ready&&g.lines.some(line=>line.id===reveal?.id)?reveal:undefined} onRevealComplete={onRevealComplete} descriptiveTitles subjectColumnLabel="Norm" showProvenance={false} initialColumns={visibleColumns} columnOptions={columns.map(c=>c.id) as ElementKey[]} textDensity={density} pointChoices={{counts,onChoose:onOpen,onSelect}}/>
   </DeferredViewerSection>
  </section>;})}</div>
  {!groups.length&&<section className="law-empty"><h3>Geen normen gevonden</h3><p>Pas je zoekterm, groepsfilter of selectiefilter aan.</p><Button variant="outline" onClick={reset}>Alle normen tonen</Button></section>}
  <footer className="law-list-footer">{selection.selected} van {countLabel(selection.total,'toetspunten')} uit dit kader gekozen</footer>
 </section>;
}
