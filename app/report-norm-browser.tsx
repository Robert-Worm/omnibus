'use client';
import {countLabel} from '@/lib/display-count.mjs';
import {useEffect} from 'react';
import {ListChecks,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import type {Draft,Line,ElementKey} from '@/lib/framework-types';
import {reportBrowseGroups} from '@/lib/report-browse-groups.mjs';
import {reportBrowserGroups,reportSelection} from '@/lib/report-browser-model.mjs';
import {lawCountText} from '@/lib/law-view-counts.mjs';
import catalogue from '@/lib/report-point-catalogue.mjs';
import CompactMatrix,{type MatrixTextDensity} from './compact-matrix';
import FilterPicker from './filter-picker';
import LawReadingControls from './law-reading-controls';
import {useBrowseState} from './browse-state';
import './cio-law-browser.css';
const columns=[{id:'objective',title:'Doel'},{id:'risk',title:'Risico'},{id:'controlObjective',title:'Beheersdoelstelling'},{id:'control',title:'Beheersmaatregel'}];
type Counts=Record<string,{selected:number;total:number;legacySelected?:boolean}>;
type Group={id:string;title:string;lines:Line[];allRows:Line[]};
export default function ReportNormBrowser({title,lines,draft,viewDraft,counts,viewKey,disabled,onChange,onOpen,onSelect,reveal,onRevealComplete,resetRequest,onResetComplete}:{title:string;lines:Line[];draft:Draft;viewDraft:Draft;counts:Counts;viewKey:string;disabled:boolean;onChange:(d:Draft)=>void;onOpen:(id:string,field?:ElementKey)=>void;onSelect:(ids:string[],value:boolean)=>void;reveal?:{id:string;nonce:number};onRevealComplete:()=>void;resetRequest:number;onResetComplete:()=>void}){
 const [view,setView,ready]=useBrowseState('report-browser-'+viewKey,{query:'',group:'',selectedOnly:false,columns:columns.map(c=>c.id),density:'comfortable'});
 const reset=()=>setView(v=>({...v,query:'',group:'',selectedOnly:false}));
 useEffect(()=>{if(ready&&(resetRequest||reveal)){setView(v=>({...v,query:'',group:'',selectedOnly:false}));if(resetRequest)onResetComplete();if(reveal)onRevealComplete();}},[ready,resetRequest,reveal,setView,onResetComplete,onRevealComplete]);
 const groups=reportBrowserGroups(lines,counts,view,draft.included,catalogue.points) as Group[];
 const visibleCounts=lawCountText(groups.flatMap(g=>g.lines.map(line=>({groupId:g.id,criterionId:line.id}))));
 const selection=reportSelection(lines,counts,draft.included);
 const visibleColumns=view.columns.filter(id=>columns.some(c=>c.id===id));
 const density=(['compact','comfortable','full'].includes(view.density)?view.density:'comfortable') as MatrixTextDensity;
 return <section className="law-browser report-norm-browser" aria-label="Normen uit thema’s en processen">
  <div className="law-browse-intro"><div className="law-viewer-heading"><h2>{title}</h2><output aria-live="polite">{visibleCounts}</output></div><div className="law-selection-actions">
   <Button variant="outline" aria-pressed={view.selectedOnly} onClick={()=>setView(v=>({...v,selectedOnly:!v.selectedOnly}))}>Normen met gekozen toetspunten</Button>
   <Button variant="outline" disabled={disabled||!lines.length} title="Voor het hele geopende kader, ook buiten zoek- en groepsfilters. Je rapportkeuze blijft van toepassing." onClick={()=>onSelect(lines.map(l=>l.id),!selection.all)}><ListChecks size={15}/>{selection.all?'Deselecteer alle normen':'Selecteer alle normen'}</Button>
  </div></div>
  <div className="law-browse-filters" aria-label="Normen filteren">
   <label className="law-search-label" htmlFor="report-norm-search">Zoeken in dit kader<div className="law-search"><Search size={17}/><Input id="report-norm-search" placeholder="Zoek op norm, toetspunt of onderwerp…" value={view.query} onChange={e=>setView(v=>({...v,query:e.target.value}))}/></div></label>
   <label htmlFor="report-group-filter">Groep binnen het kader<select id="report-group-filter" value={view.group} onChange={e=>setView(v=>({...v,group:e.target.value}))}><option value="">Alle groepen</option>{reportBrowseGroups(lines).map((g:Group)=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
   <div className="law-column-control"><span>Weergave</span><FilterPicker subtle label="Kolommen" options={columns} value={visibleColumns} onChange={next=>setView(v=>({...v,columns:next}))}/></div>
   <LawReadingControls value={density} onChange={density=>setView(v=>({...v,density}))}/>
   {(view.query||view.group||view.selectedOnly)&&<Button variant="ghost" className="law-reset-filters" onClick={reset}>Filters wissen</Button>}
  </div>
  <div className="law-group-stack">{groups.map(g=>{const state=reportSelection(g.allRows,counts,draft.included);return <section className="law-group" key={g.id} data-report-group={g.id}>
   <header className="law-group-heading"><div><h3>{g.title}</h3><p className="law-group-count">{state.selected} van {countLabel(state.total,'toetspunten')} gekozen</p></div><label className="law-select-group" htmlFor={'report-group-'+g.id}><Checkbox id={'report-group-'+g.id} disabled={disabled||!state.total} checked={state.all} indeterminate={state.partial} aria-label={'Selecteer hele groep '+g.title} onCheckedChange={v=>onSelect(g.allRows.map(l=>l.id),v===true)}/><span>Selecteer hele groep<small>{countLabel(state.total,'toetspunten')}</small></span></label></header>
   <CompactMatrix lines={g.lines} draft={draft} viewDraft={viewDraft} disabled={disabled} onChange={onChange} onOpen={onOpen} onOpenField={onOpen} selected={reveal?.id||''} viewKey={'report-group-'+viewKey+'-'+g.id} embedded descriptiveTitles subjectColumnLabel="Norm" showProvenance={false} initialColumns={visibleColumns} columnOptions={columns.map(c=>c.id) as ElementKey[]} textDensity={density} pointChoices={{counts,onChoose:onOpen,onSelect}}/>
  </section>;})}</div>
  {!groups.length&&<section className="law-empty"><h3>Geen normen gevonden</h3><p>Pas je zoekterm, groepsfilter of selectiefilter aan.</p><Button variant="outline" onClick={reset}>Alle normen tonen</Button></section>}
  <footer className="law-list-footer">{selection.selected} van {countLabel(selection.total,'toetspunten')} uit dit kader gekozen</footer>
 </section>;
}
