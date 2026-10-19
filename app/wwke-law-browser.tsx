"use client";
import {countLabel} from '@/lib/display-count.mjs';
import {catalogueDerived} from '@/lib/catalogue-runtime.mjs';
import {useId,useState} from 'react';
import {ArrowRight,BookOpen,ClipboardCheck,ListChecks,Search,Settings2,ShieldCheck,Target,TriangleAlert,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose} from '@/components/ui/sheet';
import type {Draft,Line,ElementKey} from '@/lib/framework-types';
import {wwkeCatalogue,wwkePoints,wwkePointMap,wwkePointContext,wwkeMetadata,wwkeFilters,wwkeLabels,wwkeExcludedForSector} from '@/lib/wwke-law-data.mjs';
import {wwkeSelection,chooseWwkePoints,selectWwkePointsDirect} from '@/lib/wwke-law-adapter.mjs';
import {useBrowseState} from './browse-state';
import {useLawOverview,type LawOverviewProps} from './law-overview-state';
import CompactMatrix from './compact-matrix';
import CompactContextText from './compact-context-text';
import LawReadingControls from './law-reading-controls';
import {lawReaderText} from '@/lib/law-reader-language.mjs';
import {lawCountText} from '@/lib/law-view-counts.mjs';
import FilterPicker from './filter-picker';
import WwkeSourceAbout from './wwke-source-about';
import WwkeSource from './wwke-point-source';
export {default as WwkeSource} from './wwke-point-source';
import {wwkeRelatedContext} from '@/lib/wwke-about-view.mjs';
import {wwkeAudiences} from '@/lib/wwke-audiences.mjs';
import {TermText} from './term-help';
import {wwkeBrowserRows,wwkeBrowserGroups,lawBrowserColumns as columns} from '@/lib/wwke-browser-view.mjs';
import './control-objective-pilot.css';
import './cio-law-browser.css';
import './cio-source-about.css';
import './wwke-law-browser.css';

type Point=typeof wwkePoints[number];
type Props=LawOverviewProps&{draft:Draft;onChange:(d:Draft)=>void;disabled?:boolean;navigate:(p:string)=>void;initialPointId?:string;viewerOnly?:boolean;onClose?:()=>void};
const labels=wwkeLabels as Record<string,string>;
const vocab=wwkeFilters.vocabularies;
const textList=(title:string,items:string[])=>items.length>0&&<section className="wwke-text"><h4>{title}</h4><ul>{items.map((s,i)=><li key={i}>{s}</li>)}</ul></section>;

export function WwkeSavedSource({serialized}:{serialized:string}){
 let trace;try{trace=JSON.parse(serialized);}catch{return <p role="alert">De opgeslagen WWKE-herleiding is niet leesbaar.</p>;}
 return <section className="wwke-saved"><h3>Opgeslagen WWKE-bronmomentopname</h3><p>{trace.source?.title} · bronversie {trace.source?.dates?.selected_consolidation}</p><p>{trace.point.text}</p><details><summary>{trace.assessment?.mode==='SELECTION'?'Onderzoeksselectie — toepasselijkheid nog te beoordelen':'Vastgelegde beoordeling van toepasselijkheid'}</summary>{trace.assessment?.mode==='SELECTION'&&<p>Geselecteerd voor het onderzoek; er is geen toepasselijkheidsbeoordeling bevestigd.</p>}<dl>{Object.entries(trace.assessment||{}).filter(([k])=>['subject','period','sector','roles','basis','boundary'].includes(k)).map(([k,v])=><div key={k}><dt>{({subject:'Onderzoeksobject',period:'Periode',sector:'Sector',roles:'Wettelijke rollen',basis:'Grondslag voor je beoordeling',boundary:'Afbakening'})[k]}</dt><dd>{Array.isArray(v)?v.map(x=>labels[x]||x).join(', '):labels[String(v)]||String(v)}</dd></div>)}</dl></details><WwkeSource point={trace.point} trace={trace}/></section>;
}
type BrowseRow=Line&{criterionId:string;groupId:string;groupTitle:string;sourceChapter:string;pointIds:string[]};
type Tab='points'|'source'|'approach';
const allRows=wwkeBrowserRows() as BrowseRow[];
catalogueDerived(()=>allRows.splice(0,allRows.length,...wwkeBrowserRows() as BrowseRow[]));
const defaultView={query:'',sector:'',audience:'entities',selectedOnly:false,columns:columns.map(c=>c.id)};
function PointConditions({point,draft}:{point:Point;draft:Draft}){
 const detail=wwkePointContext(point);
 const stored=draft.investigation?.materials.find(m=>m.sourcePointId===point.id)?.lawTrace;
 const assessment=stored?JSON.parse(stored).assessment:null;
 return <section className="law-application"><h3>Voor wie en binnen welk bereik?</h3><p>{point.scope}</p>{textList('Wettelijke betrokkenen',point.addressees.map(a=>a.label+(a.condition?' — '+a.condition:'')))}{textList('Voorwaarden',point.conditions)}{textList('Uitzonderingen',point.exceptions)}
 <details open={point.selection_status!=='SELECTABLE'}><summary>Selectiegrens en open bronvragen</summary><p>{lawReaderText(point.selection_reason)}</p>{detail.issueUses.map(u=><p key={u.issue_id}>{u.issue_id} · {lawReaderText(u.reason)}</p>)}</details>
 {assessment&&<details><summary>{assessment.mode==='SELECTION'?'Toepasselijkheid nog te beoordelen':'Jouw beoordeling van toepasselijkheid'}</summary>{assessment.mode==='SELECTION'&&<p>Deze bouwsteen is direct aan je onderzoeksselectie toegevoegd. De toepasselijkheid is nog niet bevestigd.</p>}<p>{assessment.basis}</p><p>{assessment.boundary}</p></details>}</section>;
}
export default function WwkeLawBrowser(props:Props){return <Browser key={props.initialPointId||'catalogue'} {...props}/>;}
function Browser({draft,onChange,disabled=false,navigate,initialPointId,viewerOnly=false,onClose,...overviewProps}:Props){
 const checkboxId=useId();
 const [openId,setOpenId]=useState(allRows.find(r=>r.pointIds.includes(initialPointId||''))?.id||'');
 const [readingDensity,setReadingDensity]=useState<'compact'|'comfortable'|'full'>('comfortable');
 const [pointId,setPointId]=useState(initialPointId||''),[tab,setTab]=useState<Tab>('points'),[error,setError]=useState('');
 const [overview,setOverview]=useLawOverview(overviewProps),about=overview==='source';
 const setAbout=(value:boolean)=>setOverview(value?'source':'norms');
 // Old government/role preferences must not override the new entity-first default.
 const [storedView,setView]=useBrowseState('wwke-browser-audience-v3',defaultView);
 const view={...storedView,audience:wwkeAudiences.some(a=>a.id===storedView.audience)?storedView.audience:'entities'};
 const selection=wwkeSelection(draft),selected=new Set(selection.selectedIds);
 const rows=wwkeBrowserRows({...view,section:'norms'},selection.selectedIds) as BrowseRow[];
 const groups=wwkeBrowserGroups.map(group=>({...group,...(view.audience==='entities'&&group.id==='toezicht'?{title:'Opgelegd onderzoek en aanwijzingen',description:'Verplichtingen voor de entiteit wanneer een onderzoek of bindende aanwijzing is opgelegd.'}:{}),rows:rows.filter(r=>r.groupId===group.id)})).filter(group=>group.rows.length);
 const counts=Object.fromEntries(rows.map(r=>[r.id,wwkeSelection(draft,r.pointIds)]));
 const visiblePointIds=[...new Set(rows.flatMap(r=>r.pointIds))].filter(id=>wwkePointMap.get(id)?.selection_status==='SELECTABLE'&&!wwkeExcludedForSector(id,view.sector));
 const visibleSelection=wwkeSelection(draft,visiblePointIds);
 const [detailAudience,setDetailAudience]=useState('');
 const detailRows=detailAudience?wwkeBrowserRows({audience:detailAudience}) as BrowseRow[]:allRows;
 const row=detailRows.find(r=>r.id===openId),children=row?.pointIds.map(id=>wwkePointMap.get(id)!).filter(Boolean)||[];
 const point=wwkePointMap.get(pointId),parent=wwkeCatalogue.criteria.find(c=>c.id===row?.criterionId),rowSelection=wwkeSelection(draft,row?.pointIds||[]);
 const visibleColumns=view.columns.filter(id=>columns.some(c=>c.id===id));
 function choose(ids:string[],value:boolean){
  if(disabled)return;
  try{onChange((value?selectWwkePointsDirect(draft,ids,view.sector):chooseWwkePoints(draft,ids,false)) as Draft);setError('');}catch(e){setError(e instanceof Error?e.message:'Selectie mislukt.');}
 }
 function selectAll(){
  choose(visiblePointIds,!visibleSelection.all);
 }
 function open(id:string,focus?:string,fullSource=false){const audience=fullSource?'':view.audience;const row=(audience?wwkeBrowserRows({audience}):allRows).find(r=>r.id===id);if(!row)return;setDetailAudience(audience);setOpenId(id);setPointId(focus||row.pointIds[0]);setTab('points');}
 function openPoint(id:string){const row=allRows.find(r=>r.pointIds.includes(id));if(row)open(row.id,id,true);}
 function close(){setOpenId('');setPointId('');onClose?.();}
 return <section className="law-browser wwke-browser" aria-label="WWKE">
 {!viewerOnly&&<><div className="law-view-actions"><nav className="law-overview-tabs" aria-label="Kaderweergave"><button aria-pressed={!about} onClick={()=>setAbout(false)}>Normen</button><button aria-pressed={about} onClick={()=>setAbout(true)}>Over dit kader</button></nav><Button onClick={()=>navigate('framework')}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button></div>
 {about?<WwkeSourceAbout initialSector={view.sector} onPoint={id=>{openPoint(id);setTab('source');}}/>:<>
 <div className="law-browse-intro"><div className="law-viewer-heading"><h2>Wet weerbaarheid kritieke entiteiten</h2><output aria-live="polite" title="Unieke normen binnen de huidige filters. Gekoppelde toetspunten tellen in je selectie maar één keer.">{lawCountText(rows)}</output></div><div className="law-selection-actions"><Button variant="outline" aria-pressed={view.selectedOnly} onClick={()=>setView(v=>({...v,selectedOnly:!v.selectedOnly}))}>Normen met gekozen toetspunten</Button><Button variant="outline" disabled={disabled||!visibleSelection.total} title={visibleSelection.all?'Verwijder de normen binnen de huidige filters uit je selectie. Andere bronnen en bewerkingen blijven behouden.':'Voeg alle normen binnen de huidige filters direct toe aan je selectie. Toepasselijkheid blijft afzonderlijk te beoordelen; punten met open bronvragen blijven uitgesloten.'} onClick={selectAll}><ListChecks size={15}/>{visibleSelection.all?'Deselecteer alle normen':'Selecteer alle normen'}</Button></div></div>
 <div className="law-browse-filters" aria-label="Normen filteren">
 <label className="law-search-label" htmlFor="wwke-search">Zoeken in dit kader<div className="law-search"><Search size={16}/><Input id="wwke-search" value={view.query} onChange={e=>setView(v=>({...v,query:e.target.value}))} placeholder="Zoek op norm, onderwerp of artikel…"/></div></label>
 <label htmlFor="wwke-audience">Voor wie?<select id="wwke-audience" aria-label="Voor wie?" value={view.audience} onChange={e=>setView(v=>({...v,audience:e.target.value}))}>{wwkeAudiences.map(a=><option value={a.id} key={a.id}>{a.title}</option>)}</select></label>
 <label htmlFor="wwke-sector">Sector<select id="wwke-sector" aria-label="Sector" value={view.sector} onChange={e=>setView(v=>({...v,sector:e.target.value}))}><option value="">Alle sectoren</option>{vocab.sectors.map(s=><option value={s.id} key={s.id}>{labels[s.id]}</option>)}</select></label>
 <div className="law-column-control"><span>Weergave</span><FilterPicker subtle label="Kolommen" options={columns} value={visibleColumns} onChange={cols=>setView(v=>({...v,columns:cols}))}/></div>
 <LawReadingControls value={readingDensity} onChange={setReadingDensity}/>
 </div>
 <div className="law-group-stack">{groups.map(group=>{const ids=group.rows.flatMap(r=>r.pointIds),state=wwkeSelection(draft,ids);return <section className="law-group" key={group.id} data-wwke-group={group.id}><header className="law-group-heading"><div><h3>{group.title}</h3><p className="law-group-description">{group.description}</p><p className="law-group-location">Bron: hoofdstuk {[...new Set(group.rows.map(r=>r.sourceChapter))].join(' · ')}</p><p className="law-group-count">{state.selected} van {countLabel(state.total,'toetspunten')} gekozen</p></div><label className="law-select-group" htmlFor={checkboxId+group.id}><Checkbox id={checkboxId+group.id} checked={state.all} indeterminate={state.partial} disabled={disabled||!state.total} aria-label={'Selecteer hele groep '+group.title} onCheckedChange={v=>choose(ids,v===true)}/><span>Selecteer hele groep<small>{countLabel(state.total,'toetspunten')}</small></span></label></header>
 <CompactMatrix lines={group.rows} draft={draft} viewDraft={draft} disabled={disabled} onChange={onChange} selected={openId} viewKey={'wwke-group-'+group.id+'-v3'} embedded descriptiveTitles subjectColumnLabel="Norm" showProvenance={false} textDensity={readingDensity} initialColumns={visibleColumns} columnOptions={columns.map(c=>c.id) as ElementKey[]} onOpen={id=>open(id)} onOpenField={id=>open(id)} pointChoices={{counts,onChoose:id=>open(id),onSelect:(rowIds,value)=>choose(rows.filter(r=>rowIds.includes(r.id)).flatMap(r=>r.pointIds),value)}}/>
 </section>;})}</div>{!groups.length&&<div className="law-empty"><h3>Geen selecteerbare normen in deze weergave</h3><p>Pas je filters aan om andere normen en toetspunten te bekijken. Achtergrondinformatie en open bronvragen vind je bij Over dit kader.</p></div>}
 </>}{error&&<p role="alert">{error}</p>}</>}
 <Sheet open={Boolean(row&&parent)} onOpenChange={v=>{if(!v)close();}}><SheetContent className="audit-detail bd-pilot-detail law-detail wwke-detail" showCloseButton={false} aria-modal="true">
 <SheetHeader className="bd-header"><div className="bd-heading-row"><div><SheetDescription>{row?.groupTitle} · {row?.id} · {wwkeMetadata.edition}</SheetDescription><SheetTitle>{row?.title}</SheetTitle></div><SheetClose render={<Button variant="ghost" size="icon" aria-label="Sluiten"/>}><X size={20}/></SheetClose></div></SheetHeader>
 <nav className="law-point-tabs law-main-tabs" aria-label="Kaderanalyse">{([['points','Toetspunten',ListChecks],['source','Bronpassage',BookOpen],['approach','Toetsaanpak',ClipboardCheck]] as const).map(([id,title,Icon])=><Button key={id} variant="ghost" aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={16}/>{title}</Button>)}</nav>
 {row&&parent&&<div className="law-detail-body law-focused-body">
 {tab==='points'?<>
 {!rowSelection.total&&<section className="law-application"><h3>{children.some(p=>p.selection_status==='HOLD')?'Broncontext en open bronvragen':'Broncontext'}</h3><p>Deze onderdelen zijn geen selecteerbare uitvoeringsnormen. Ontbrekende analytische velden zijn hier niet ‘nog in te vullen’: de bron geeft daarvoor geen voldoende afgebakende grondslag.</p></section>}
 {(['objective','risk','controlObjective','control'] as const).some(key=>row[key]?.text)&&<section className="law-context law-flow"><div className="law-context-grid">{([['objective','Doel',Target],['risk','Risico',TriangleAlert],['controlObjective','Beheersdoelstelling',ShieldCheck],['control','Beheersmaatregel',Settings2]] as const).map(([id,title,Icon])=><section key={id} className={'law-context-card law-context-'+id}><h4><Icon size={15}/><TermText text={title}/></h4><small className="law-context-reason">{row[id]?.text?'Analytisch voorstel':'Niet verantwoord uit te werken'}</small><CompactContextText label={title} text={row[id]?.text||'Voor dit onderdeel staat de bronvraag nog open. Er wordt geen beheersmaatregel verondersteld zolang de norm niet voldoende is afgebakend.'}/></section>)}</div></section>}
 <section className="law-parent-criterion"><h3><ListChecks size={16}/>Norm</h3><p>{row.criterion.text}</p></section>
 {(wwkeRelatedContext[parent.id]||[]).map(id=>{const contextPoint=wwkePointMap.get(id)!;return <section className="law-application" key={id} data-related-context={id}><h3>{contextPoint.title}</h3><p>{contextPoint.text}</p><Button variant="ghost" onClick={()=>{openPoint(id);setTab('source');}}>Bronpassage · {id}</Button></section>;})}
 <div className="law-points-heading">{rowSelection.total>0?<label htmlFor={checkboxId+"-all"}><Checkbox id={checkboxId+"-all"} checked={rowSelection.all} indeterminate={rowSelection.partial} disabled={disabled||!rowSelection.total} onCheckedChange={v=>choose(row.pointIds,v===true)}/>Alle toetspunten</label>:<strong>Brononderdelen bekijken</strong>}<output>{rowSelection.total>0?rowSelection.selected+' van '+rowSelection.total+' gekozen':children.length+' niet-selecteerbare brononderdelen'}</output></div>
 <p className="law-browse-boundary">{detailAudience?'Toetspunten voor '+wwkeAudiences.find(a=>a.id===detailAudience)?.title.toLocaleLowerCase('nl')+'. De voorwaarden en bronpassages van ieder punt blijven volledig beschikbaar.':'Alle toetspunten en brononderdelen van deze norm.'}</p>
 <div className="law-choice-grid">{children.map(p=>{const material=draft.investigation?.materials.find(m=>m.sourcePointId===p.id);const ownText=material&&draft.overrides[material.id]?.criterion;const excluded=wwkeExcludedForSector(p.id,view.sector);return <article key={p.id} data-point={p.id} data-inspected={pointId===p.id||undefined} className={'law-choice-card'+(selected.has(p.id)?' is-chosen':'')}>
 {viewerOnly&&initialPointId===p.id&&<small>Deze bouwsteen</small>}<label>{p.selection_status==='SELECTABLE'&&<Checkbox checked={selected.has(p.id)} disabled={disabled||p.selection_status!=='SELECTABLE'||(excluded&&!selected.has(p.id))} aria-label={'Selecteer toetspunt '+p.id} onCheckedChange={v=>choose([p.id],v===true)}/>}<strong>{p.title}</strong></label><p>{p.text}</p>
 {p.selection_status!=='SELECTABLE'&&<span className={'wwke-status '+p.selection_status.toLowerCase()}>{labels[p.selection_status]}</span>}
 {excluded&&<p className="wwke-warning">Artikel 23: uitgezonderd voor de sector in je overzichtsfilter.</p>}
 {ownText&&ownText!==p.text&&<details><summary>Jouw formulering</summary><p>{ownText}</p></details>}
 <div className="law-choice-actions"><small>{p.id}</small><button onClick={()=>{setPointId(p.id);setTab('source');}}>Bronpassage · voorwaarden</button><button onClick={()=>{setPointId(p.id);setTab('approach');}}>Toetsaanpak</button></div>
 </article>;})}</div>
 </>:point&&<>
 {children.length>1&&<nav className="law-point-switcher" aria-label="Kies een toetspunt">{children.map(p=><button key={p.id} aria-pressed={point.id===p.id} onClick={()=>setPointId(p.id)}>{p.title}</button>)}</nav>}
 {tab==='approach'&&<section className="law-active-point"><div className="law-point-kind">{point.id} · {labels[point.selection_status]}</div><h2>{point.title}</h2><p>{point.text}</p></section>}
 {tab==='source'?<WwkeSource key={point.id} point={point} application={<PointConditions point={point} draft={draft}/>}/>:<section className="cio-approach"><p className="cio-muted">Analytische toetsvoorstellen. Werking is niet geselecteerd; er zijn geen onderzoeksresultaten ingevuld.</p><div className="cio-phase-grid">{Object.entries(point.phase_plans).map(([key,plan])=><section className={'cio-phase cio-phase-'+key} key={key}><h4>{key==='opzet'?'Opzet':key==='bestaan'?'Bestaan':'Werking'}</h4><p className="cio-phase-action">{plan.action||plan.reason}</p>{plan.expected_evidence&&<p className="cio-phase-evidence"><strong>Verwacht bewijs</strong><br/>{plan.expected_evidence}</p>}<p className="cio-phase-boundary">{plan.interpretation_boundary}</p><p className="cio-phase-reason">{plan.reason}</p></section>)}</div></section>}
 </>}
 </div>}
 <footer className="bd-footer"><span>{rowSelection.total>0?rowSelection.selected+' van '+countLabel(rowSelection.total,'toetspunten')+' gekozen':'Broncontext · geen normselectie'}</span><div><Button variant="outline" onClick={()=>navigate('framework')}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button><Button variant="outline" onClick={close}>Gereed</Button></div></footer>
 </SheetContent></Sheet>
 </section>;
}
export function WwkePointViewer({pointId,onClose,...props}:Omit<Props,'navigate'|'initialPointId'> & {pointId:string;onClose:()=>void}){return <WwkeLawBrowser {...props} initialPointId={pointId} viewerOnly onClose={onClose} navigate={onClose}/>;}
