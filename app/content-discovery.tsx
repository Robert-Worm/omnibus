"use client";
import {useMemo,useState} from 'react';
import {Layers,ListFilter,ArrowRight,Check,Search,BookOpen,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {discoveryThemes,discoveryProcesses,discoveryItems,filterDiscovery,discoverySelected,chooseDiscovery,discoveryFacets,discoveryPage} from '@/lib/content-discovery.mjs';
import type {Draft,Framework,Line} from '@/lib/framework-types';
type Item={key:string;id:string;kind:string;item:Line;title:string;risk:string;criterion:string;sourceId:string;sourceTitle:string;processIds:string[];themeIds:string[]};
const preview=(text:string)=>text.length>240?text.slice(0,240).replace(/\s+\S*$/,'')+'…':text;
const basisLabel:Record<string,string>={EXPLICIT:'Norm uit het rapport',INFERRED:'Afgeleide norm',PROPOSED:'Voorgestelde norm',NOT_ESTABLISHED:'Norm niet vastgesteld'};
const restoreFocus=(id:string)=>{if(typeof document!=='undefined')document.getElementById(id)?.focus();};
export default function ContentDiscovery({framework,draft,onChange,axis,category,onCategory,onAxis,onReportItem,onFoundation,onLegacy,onContinue,disabled,riskMode=false}:{
 framework:Framework;draft:Draft;onChange:(draft:Draft)=>void;axis:'themes'|'processes';category:string;onCategory:(id:string)=>void;onAxis:(axis:'themes'|'processes')=>void;
 onReportItem:(line:Line)=>void;onFoundation:(source:string,id:string)=>void;onLegacy:()=>void;onContinue?:()=>void;disabled:boolean;riskMode?:boolean;
}){
 const items:Item[]=useMemo(()=>discoveryItems(framework),[framework]);
 const [query,setQuery]=useState(''),[kind,setKind]=useState(riskMode?'report':'all'),[page,setPage]=useState(0),[error,setError]=useState('');
 const [picker,setPicker]=useState<''|'themes'|'processes'>(''),[categoryQuery,setCategoryQuery]=useState(''),[categoryPage,setCategoryPage]=useState(0);
 const [processNarrow,setProcessNarrow]=useState(''),[selectedOnly,setSelectedOnly]=useState(false);
 const themeId=axis==='themes'?category:'',processId=axis==='processes'?category:processNarrow;
 const theme=discoveryThemes.find(c=>c.id===themeId),process=discoveryProcesses.find(c=>c.id===processId);
 const searched:Item[]=useMemo(()=>filterDiscovery(items,{query,kind}),[items,query,kind]);
 const scoped:Item[]=filterDiscovery(searched,{themeId,processId});
 const filtered=selectedOnly?scoped.filter(r=>discoverySelected(r,draft)):scoped;
 const result=discoveryPage(filtered,page,8);
 const selectedCount=items.filter(r=>discoverySelected(r,draft)).length;
 const facets=useMemo(()=>discoveryFacets(filterDiscovery(searched,picker==='processes'?{themeId}:{}),picker==='processes'?discoveryProcesses:discoveryThemes,picker||'themes',categoryQuery),[searched,picker,themeId,categoryQuery]);
 const facetPage=discoveryPage(facets,categoryPage,12);
 const select=(chosen:Item[],include:boolean)=>{try{onChange(chooseDiscovery(draft,chosen,include) as Draft);setError('');}catch(e){setError(e instanceof Error?e.message:'De selectie kon niet worden gewijzigd.');}};
 const chooseCategory=(id:string)=>{
  if(picker==='processes'&&themeId)setProcessNarrow(id);
  else{onAxis(picker||'themes');onCategory(id);setProcessNarrow('');}
  setPicker('');setPage(0);restoreFocus('discovery-'+picker+'-button');
 };
 const clear=()=>{onCategory('');setProcessNarrow('');setQuery('');setKind(riskMode?'report':'all');setSelectedOnly(false);setPage(0);};
 const openPicker=(next:'themes'|'processes')=>{setPicker(picker===next?'':next);setCategoryQuery('');setCategoryPage(0);};
 return <section className="content-discovery foundation-catalogue" aria-label="Risico’s en normen verkennen">
  <div className="discovery-intro"><span className="discovery-icon"><Search size={21} aria-hidden="true"/></span><div><h2>{riskMode?'Welke risico’s herken je?':'Vind wat past bij je onderzoek'}</h2><p>Verken → bekijk de uitwerking → kies wat je wilt onderzoeken.</p></div></div>
  <div className="discovery-toolbar">
   <label className="collection-search-label" htmlFor="discovery-search">Zoek risico, norm of bron<Input id="discovery-search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setCategoryPage(0);}} placeholder="Bijvoorbeeld: toegangsrechten, cloud of betalingen"/></label>
   <label htmlFor="discovery-kind">Bronsoort<select id="discovery-kind" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);setCategoryPage(0);}}><option value="all">Rapporten en kaders</option><option value="report">Risico’s uit rapporten</option><option value="foundation">Normen uit wetten en kaders</option></select></label>
  </div>
  <div className="discovery-filterbar"><span>Verfijn je zoekgebied</span><Button id="discovery-themes-button" variant="outline" aria-expanded={picker==='themes'} aria-controls="discovery-picker" onClick={()=>openPicker('themes')}><Layers size={15} aria-hidden="true"/>Thema</Button><Button id="discovery-processes-button" variant="outline" aria-expanded={picker==='processes'} aria-controls="discovery-picker" onClick={()=>openPicker('processes')}><ListFilter size={15} aria-hidden="true"/>Proces</Button><Button variant={selectedOnly?'secondary':'ghost'} aria-pressed={selectedOnly} onClick={()=>{if(!selectedOnly){onCategory('');setProcessNarrow('');setQuery('');setKind('all');setPicker('');}setSelectedOnly(!selectedOnly);setPage(0);}}>Mijn selectie ({selectedCount})</Button></div>
  {picker&&<section id="discovery-picker" className="discovery-picker" aria-label={picker==='themes'?'Thema kiezen':'Proces kiezen'}>
   <div className="discovery-picker-heading"><div><h3>{picker==='themes'?'Welk breed onderwerp?':'Welk specifiek proces?'}</h3><p>{picker==='themes'?'Een thema groepeert meerdere processen. Een nieuw thema vervangt je huidige afbakening.':theme?`Processen binnen ${theme.title}. Je themafilter blijft gelden.`:'Kies één activiteit om gericht te zoeken.'}</p></div><Button variant="ghost" aria-label="Keuzelijst sluiten" onClick={()=>{setPicker('');restoreFocus('discovery-'+picker+'-button');}}><X size={16} aria-hidden="true"/></Button></div>
   <label htmlFor="discovery-category-search">{picker==='themes'?'Zoek thema':'Zoek proces'}<Input id="discovery-category-search" value={categoryQuery} onChange={e=>{setCategoryQuery(e.target.value);setCategoryPage(0);}} placeholder="Typ een naam of onderwerp"/></label>
   <output className="discovery-meta" data-status-block="">{facets.length} {picker==='themes'?'thema’s':'processen'} bij je zoekopdracht</output>
   <div className="discovery-category-list">{facetPage.rows.map((c:{id:string;title:string;count:number})=><Button key={c.id} variant="ghost" onClick={()=>chooseCategory(c.id)}><span>{c.title}</span><span className="discovery-count">{c.count}</span><ArrowRight size={14} aria-hidden="true"/></Button>)}</div>
   {!facets.length&&<p>Geen match. Pas deze zoekterm aan of wis de zoekfilters boven de resultaten.</p>}
   {facetPage.last>0&&<nav className="discovery-pagination" aria-label="Categoriepagina’s"><Button variant="outline" disabled={!facetPage.current} onClick={()=>setCategoryPage(facetPage.current-1)}>Vorige categorieën</Button><span>{facetPage.current+1} / {facetPage.last+1}</span><Button variant="outline" disabled={facetPage.current===facetPage.last} onClick={()=>setCategoryPage(facetPage.current+1)}>Volgende categorieën</Button></nav>}
  </section>}
  {(theme||process||query||selectedOnly||kind!==(riskMode?'report':'all'))&&<div className="discovery-active-filters" aria-label="Actieve filters">
   {theme&&<Button variant="secondary" onClick={()=>{onCategory('');setProcessNarrow('');setPage(0);}}>{theme.title}<X size={14} aria-label="Thema en onderliggend proces wissen"/></Button>}
   {process&&<Button variant="secondary" onClick={()=>{if(axis==='processes')onCategory('');else setProcessNarrow('');setPage(0);}}>{process.title}<X size={14} aria-label="Proces wissen"/></Button>}
   <Button variant="link" onClick={clear}>Wis zoekfilters</Button>
  </div>}
  <div className="discovery-result-heading"><div><h3>{process?.title||theme?.title||(selectedOnly?'Je gekozen inhoud':riskMode?'Risico’s om te verkennen':'Risico’s en normen')}</h3><output data-status-block="">{filtered.length} resultaten{filtered.length?` · ${result.current*8+1}–${Math.min((result.current+1)*8,filtered.length)} zichtbaar`:''}</output></div>
   <details className="discovery-bulk"><summary>Meerdere kiezen</summary><Button variant="outline" disabled={disabled||!result.rows.length} onClick={()=>select(result.rows,true)}>Kies deze pagina ({result.rows.length})</Button><Button variant="outline" disabled={disabled||!filtered.length} onClick={()=>select(filtered,true)}>Kies alle {filtered.length} resultaten</Button><Button variant="ghost" disabled={disabled||!filtered.some(r=>discoverySelected(r,draft))} onClick={()=>select(filtered,false)}>Deselecteer deze resultaten</Button></details>
  </div>
  <p className="discovery-boundary">Historische risico’s zijn aanknopingspunten, geen vastgestelde problemen in jouw organisatie.</p>
  <div className="discovery-results">{result.rows.map((row:Item)=>{
   const chosen=discoverySelected(row,draft),id='pick-'+row.key,isReport=row.kind==='report';
   return <article key={row.key} className={chosen?'discovery-card is-selected':'discovery-card'}>
    <div className="discovery-card-meta"><span className="discovery-kind">{isReport?'Risico · afgeleid uit rapport':'Norm · eigen uitwerking'}</span><span>{row.sourceId}</span>{chosen&&<span className="discovery-chosen"><Check size={14} aria-hidden="true"/>Gekozen</span>}</div>
    <h4 id={'title-'+row.key}>{row.title}</h4><p className="discovery-source">{row.sourceTitle}</p>
    <p className="discovery-risk"><span>{isReport?'Wat kan er misgaan?':'Wat kun je beoordelen?'}</span>{preview(isReport?row.risk:row.criterion)}</p>
    <div className="discovery-card-actions"><label className="discovery-pick" htmlFor={id}><Checkbox id={id} aria-labelledby={'title-'+row.key+' action-'+row.key} checked={chosen} disabled={disabled} onCheckedChange={v=>select([row],Boolean(v))}/><span id={'action-'+row.key}>{chosen?'Opgenomen in je selectie':'Kies voor mijn onderzoek'}</span></label></div>
    <details className="discovery-detail"><summary>Bekijk norm, gebruik en bron</summary>
     {row.risk&&<section><h5>{isReport?'Risico · volledige tekst':'Risicocontext'}</h5><p>{row.risk}</p></section>}
     <section><h5>{isReport?row.item.criterion.basis==='EXPLICIT'&&row.sourceId==='OCW26'?'Gedragsomschrijving uit het rapport':basisLabel[row.item.criterion.basis]||'Norm':'Norm · eigen uitwerking bij de bron'}</h5><p>{row.criterion}</p>{isReport&&row.item.criterion.basis==='EXPLICIT'&&<p className="discovery-meta">{row.item.criterion.reason}</p>}</section>
     {isReport&&row.item.auditQuestion?.text&&<section><h5>Vraagvoorstel voor je onderzoek</h5><p>{row.item.auditQuestion.text}</p></section>}
     <section className="discovery-use"><h5>Hoe gebruik je dit?</h5><p>{isReport?'Gebruik dit als vertrekpunt voor je eigen toetsing. Controleer of het risico en de beschreven verwachtingen passen bij jouw organisatie.':'Controleer of de bron en deze eigen uitwerking van toepassing zijn op jouw organisatie en onderzoek.'} Bij kiezen neem je dit item op in je selectie. Bij Bouw je kader kun je het aanpassen en aan een onderzoeksvraag koppelen.</p></section>
     <dl>{isReport&&row.item.entity&&<div><dt>Broncontext</dt><dd>{row.item.entity}</dd></div>}<div><dt>Proces</dt><dd>{row.processIds.map(pid=>discoveryProcesses.find(p=>p.id===pid)?.title).join(' · ')}</dd></div><div><dt>Bron</dt><dd>{row.sourceTitle}</dd></div><div><dt>Referentie</dt><dd>{row.id}</dd></div></dl>
     <Button variant="outline" onClick={()=>isReport?onReportItem(row.item):onFoundation(row.sourceId,row.id)}><BookOpen size={15} aria-hidden="true"/>Bekijk uitwerking en bron</Button>
    </details>
   </article>;
  })}</div>
  {!filtered.length&&<div className="discovery-empty"><Search size={24} aria-hidden="true"/><h3>Geen resultaten binnen deze selectie</h3><p>Probeer een bredere zoekterm of wis de filters. Niet alle wetten en kaders zijn hier ingedeeld; de volledige broncatalogus staat in stap 2.</p><Button variant="outline" onClick={clear}>Wis zoekfilters</Button></div>}
  {result.last>0&&<nav className="discovery-pagination" aria-label="Resultaatpagina’s"><Button variant="outline" disabled={!result.current} onClick={()=>setPage(result.current-1)}>Vorige</Button><span>{result.current+1} / {result.last+1}</span><Button variant="outline" disabled={result.current===result.last} onClick={()=>setPage(result.current+1)}>Volgende</Button></nav>}
  {error&&<p role="alert">{error}</p>}
  <div className="discovery-selection-footer"><div><strong>{selectedCount} gekozen in deze verkenning</strong><span>Je selectie blijft behouden als je verder zoekt.</span></div>{onContinue&&<Button onClick={onContinue}>Naar stap 3: Bouw je kader<ArrowRight size={16} aria-hidden="true"/></Button>}</div>
  <details className="creator-review discovery-about"><summary>Over de dekking en de vraagvoorstellen</summary><p>Deze indeling bevat {items.filter(r=>r.kind==='report').length} rapportitems en een eerste selectie van {items.filter(r=>r.kind==='foundation').length} broncriteria. Overige wetten en kaders blijven beschikbaar in stap 2. Een koppeling bewijst geen toepasselijkheid, volledige procesdekking of risicokans. Een item dat bij meerdere processen past, kies je maar één keer.</p><Button variant="link" onClick={onLegacy}>Rapportuitwerkingen en vraagvoorstellen bekijken</Button></details>
 </section>;
}
