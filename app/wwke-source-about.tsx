import {useState,type ReactNode} from 'react';
import {countLabel} from '@/lib/display-count.mjs';
import {CalendarDays,ExternalLink,History,Scale,ShieldCheck,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {wwkeContext as context,wwkeCatalogue,wwkePoints,wwkePointContext,wwkePointMap,wwkeLabels} from '@/lib/wwke-law-data.mjs';
import {wwkeAboutSectors,wwkeAboutCopy} from '@/lib/wwke-about-view.mjs';
import {LawAboutIntro,LawAboutSpecifications} from './law-about-layout';

const date=(value:string)=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value));
function Reference({url,children}:{url:string;children:ReactNode}){return <div className="law-about-references"><a href={url} target="_blank" rel="noreferrer"><span>{children}</span><ExternalLink size={12} aria-hidden="true"/></a></div>;}
export default function WwkeSourceAbout({onPoint,initialSector=''}:{onPoint:(id:string)=>void;initialSector?:string}){
 const [sectorId,setSectorId]=useState(wwkeAboutSectors.some(s=>s.id===initialSector)?initialSector:'OVERHEID');
 const sector=wwkeAboutSectors.find(s=>s.id===sectorId)!;
 const sectorPoint=wwkePointMap.get(sector.pointId)!;
 const labels=wwkeLabels as Record<string,string>;
 const sourceButton=(id:string,label='Bronpassage en voorwaarden')=><button className="wwke-about-source-link" onClick={()=>onPoint(id)}>{label}</button>;
 const holds=wwkePoints.filter(p=>p.selection_status==='HOLD');
 const issues=wwkeCatalogue.issues.filter(i=>i.status==='OPEN'&&i.severity==='MATERIAL');
 return <section className="law-about" aria-label="Achtergrond WWKE">
  <LawAboutIntro title={context.title} links={[{label:'Officiële publicatie',url:context.official_publication.url},{label:'Versie in de Wettenbank',url:context.consolidation.url}]}><p>Deze wet gaat over de weerbaarheid van kritieke entiteiten en hun vermogen essentiële diensten te verlenen. De bronversie in deze viewer is die van {date(context.dates.selected_consolidation)}.</p></LawAboutIntro>
  <LawAboutSpecifications>
   <div><dt>Soort regeling</dt><dd>{context.document_type}</dd></div>
   <div><dt>Vastgesteld door</dt><dd>{context.adopter}</dd></div>
   <div><dt>Vastgesteld op</dt><dd>{date(context.dates.adoption)}</dd></div>
   <div><dt>Officiële publicatie</dt><dd><a href={context.official_publication.url} target="_blank" rel="noreferrer">{context.official_publication.identifier}</a><small>Gepubliceerd op {date(context.dates.publication)}</small></dd></div>
   <div><dt>In werking vanaf</dt><dd>{date(context.dates.commencement)}<small>Algemene ingang; entiteitsgebonden termijnen afzonderlijk beoordelen.</small></dd></div>
   <div><dt>Bron in deze viewer</dt><dd>Consolidatie {date(context.dates.selected_consolidation)}<small>Oorspronkelijke publicatie en consolidatie zijn afzonderlijke bronlagen. Geen automatisch bijgewerkte versie.</small></dd></div>
  </LawAboutSpecifications>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><Scale size={18} aria-hidden="true"/>Wat voor wet is dit?</h3><p>{context.document_type}, vastgesteld door {context.adopter}</p><p>{wwkeAboutCopy.history}</p><Reference url={context.official_publication.url}>Wet en publicatiegegevens</Reference></section>
   <section className="law-about-card"><h3><Users size={18} aria-hidden="true"/>Begrippen en betrokkenen</h3><p>{wwkePointMap.get('WWA-P-0001')!.text}</p>{sourceButton('WWA-P-0001','Wettelijke begrippen in de bron')}</section>
  </div>
  <section className="law-about-card wwke-about-scope" id="wwke-about-scope" tabIndex={-1} aria-labelledby="wwke-about-scope-title">
   <h3 id="wwke-about-scope-title"><Users size={18} aria-hidden="true"/>Voor wie en waarvoor?</h3>
   <p>{context.scope.government_boundary}</p><p>{wwkeAboutCopy.extension}</p>
   <div className="wwke-about-boundary"><h4>Algemene en specifieke uitzonderingen</h4><p>{wwkePointMap.get('WWA-P-0002')!.text}</p>{sourceButton('WWA-P-0002','Uitzonderingen in de bron')}</div>
   <h4 id="wwke-sector-label">Verken de sectoren</h4><p className="law-about-quality-meta" id="wwke-sector-explanation">De knoppen tonen achtergrondinformatie. Ze wijzigen je normenfilter of selectie niet en bepalen niet of de wet op jouw organisatie van toepassing is.</p>
   <fieldset className="wwke-about-sector-buttons"  aria-labelledby="wwke-sector-label" aria-describedby="wwke-sector-explanation">{wwkeAboutSectors.map(s=><button key={s.id} aria-pressed={s.id===sectorId} aria-controls="wwke-sector-description" onClick={()=>setSectorId(s.id)}>{labels[s.id]}</button>)}</fieldset>
   <section id="wwke-sector-description" className="wwke-about-sector-description" aria-live="polite" aria-atomic="true" aria-labelledby="wwke-sector-title">
    <h4 id="wwke-sector-title">{labels[sector.id]}</h4><p>{sectorPoint.text}</p>
    {sectorPoint.selection_status==='HOLD'&&<p className="wwke-warning"><strong>Open afbakeningsvraag · HOLD</strong><br/>{sectorPoint.selection_reason}</p>}
    <p><strong>Bevoegde autoriteit volgens de gekozen bronversie:</strong> {sector.authority} (artikel 8). Voor het bereik van artikel 7 is dit de minister die de entiteit heeft aangewezen.</p>
    <div className="wwke-about-source-links">{sourceButton(sector.pointId)}{sourceButton('WWA-P-0014','Bevoegde autoriteiten in de bron')}</div>
   </section>
  </section>
  <section className="law-about-card"><h3><History size={18} aria-hidden="true"/>Hoe is de wet ontstaan?</h3><ol className="law-about-timeline">
   <li><span>2022</span><div><h4>Europese oorsprong</h4><p>Richtlijn (EU) 2022/2557 (CER-richtlijn) vormt de aanleiding voor deze implementatiewet. Een afzonderlijke uitwerking van de richtlijn is hier niet opgenomen.</p></div></li>
   <li><span>{date(context.dates.adoption)}</span><div><h4>Vaststelling van de wet</h4><p>{context.adopter} Het bij de publicatie genoemde parlementaire dossier is 36765; de volledige parlementaire geschiedenis is hier niet opgenomen.</p></div></li>
   <li><span>{date(context.dates.publication)}</span><div><h4>Officiële publicatie</h4><p>De oorspronkelijke wet is gepubliceerd in {context.official_publication.identifier}. Deze publicatie blijft naast de gekozen consolidatie beschikbaar.</p></div></li>
   <li><span>{date(context.dates.commencement)}</span><div><h4>Algemene inwerkingtreding</h4><p>{context.commencement_evidence.boundary}</p></div></li>
  </ol><Reference url={context.commencement_evidence.url}>Inwerkingtredingsbesluit · {context.commencement_evidence.identifier}</Reference></section>
  <section className="law-about-card law-about-quality" id="wwke-about-quality" tabIndex={-1}><h3><ShieldCheck size={18} aria-hidden="true"/>Bronkwaliteit en open punten</h3><p>Normen en toetspunten zijn gekoppeld aan hun bronpassages. De oorspronkelijke publicatie en de gekozen consolidatie blijven herkenbaar als afzonderlijke bronnen. Onduidelijke passages worden niet stilzwijgend gecorrigeerd. Punten die onvoldoende onderbouwd zijn voor normselectie staan op HOLD; contextpunten zijn geen zelfstandige normen.</p><p>{wwkePointMap.get('WWA-P-0015')!.text}</p>{sourceButton('WWA-P-0015','Broneditie en verwijzingen bekijken')}<p className="law-about-quality-meta">{countLabel(wwkeCatalogue.criteria.length,'normen')} · {wwkePoints.filter(p=>p.selection_status==='SELECTABLE').length} selecteerbare toetspunten · {wwkePoints.filter(p=>p.selection_status==='CONTEXT_ONLY').length} contextpunten · {holds.length} op HOLD<br/>Broncontrole: {date(context.dates.context_checked_on)}. Drie onafhankelijke AI-eindreviews op één vaste basis; geen menselijke juridische of auditgoedkeuring.</p>
   <div className="law-about-holds">{holds.map(point=><article className="law-about-hold" key={point.id}><div className="law-about-hold-heading"><h4>{point.title}</h4><span>HOLD</span></div><small>{point.id}</small><p>{point.selection_reason}</p><Button variant="outline" onClick={()=>onPoint(point.id)}>Bekijk toetspunt</Button></article>)}</div>
   <div className="law-about-checks">{issues.map(issue=><details key={issue.id}><summary><span>{issue.id} · open bronvraag</span><small>Nog niet opgelost</small></summary><div><p>{issue.description}</p><p>{issue.resolution}</p>{holds.filter(p=>wwkePointContext(p).issues.some(i=>i.id===issue.id)).map(p=><Button key={p.id} variant="ghost" onClick={()=>onPoint(p.id)}>{p.title}</Button>)}</div></details>)}<details><summary><span>Broncontrole en grenzen van de uitwerking</span></summary><div><p>{context.quality.fresh_pdf_text_check}</p><p>{context.quality.source_differences}</p><ul>{context.limitations.map(text=><li key={text}>{text}</li>)}</ul></div></details></div>
   <p className="law-about-note"><CalendarDays size={14} aria-hidden="true"/>Deze uitleg verandert je selectie niet. Beoordeel zelf welke normen gelden voor jouw organisatie en onderzoeksperiode.</p>
  </section>
 </section>;
}
