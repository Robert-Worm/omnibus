'use client';
import {countLabel} from '@/lib/display-count.mjs';
import {CalendarDays,ExternalLink,History,Scale,ShieldCheck,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cioContextReview as review} from '@/lib/cio-source-context.mjs';
import {cioStatus,cioPoints,cioCatalogue} from '@/lib/cio-law-data.mjs';
import {LawAboutIntro,LawAboutSpecifications} from './law-about-layout';

type SourceKey=keyof typeof review.sources;
function SourceLinks({ids}:{ids:SourceKey[]}){return <div className="law-about-references">{ids.map(id=><a key={id} href={review.sources[id].url} target="_blank" rel="noreferrer"><span>{review.sources[id].label}</span><ExternalLink size={12} aria-hidden="true"/></a>)}</div>;}
export default function CioSourceAbout({onPoint}:{onPoint:(id:string)=>void}){
 const selectable=cioPoints.filter((p:{selection_status:string})=>p.selection_status==='SELECTABLE').length;
 return <section className="law-about" aria-label="Achtergrond CIO-stelsel">
  <LawAboutIntro title={cioStatus.title} links={[{label:'Officiële publicatie',url:review.sources.publication.url},{label:'Versie in de Wettenbank',url:review.sources.consolidation.url}]}><p>Wie stuurt op digitalisering binnen de rijksdienst, met welke taken en bevoegdheden? Dit besluit legt de inrichting en samenwerking van het CIO-stelsel vast.</p></LawAboutIntro>
  <LawAboutSpecifications>

   <div><dt>Soort regeling</dt><dd>Interne regeling van de rijksdienst</dd></div>
   <div><dt>Vastgesteld door</dt><dd>Staatssecretaris van BZK · E. van Marum</dd></div>
   <div><dt>Vastgesteld op</dt><dd>14 december 2025</dd></div>
   <div><dt>Officiële publicatie</dt><dd><a href={review.sources.metadata.url} target="_blank" rel="noreferrer">Staatscourant 2025, 40208</a><small>Gepubliceerd op 16 december 2025</small></dd></div>
   <div><dt>In werking vanaf</dt><dd>1 januari 2026<small>Artikel 26 · controleer ook de versie voor je onderzoeksperiode</small></dd></div>
   <div><dt>Bron in deze viewer</dt><dd>Publicatie met toelichting · 14 pagina’s<small>Geen automatisch bijgewerkte consolidatie</small></dd></div>
  </LawAboutSpecifications>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><Scale size={18} aria-hidden="true"/>Wat voor besluit is dit?</h3><p>Geen wet in formele zin, maar een interne regeling vastgesteld door de staatssecretaris van BZK, met instemming van de ministerraad. De indeling onder ‘Wetten’ in Omnibus is een zoekcategorie, geen aanduiding van de juridische rang.</p><p>De grondslag staat in de aanhef: artikel 2, lid 1, artikel 3, lid 1, en artikel 6, leden 1 en 2, van het Coördinatiebesluit organisatie, bedrijfsvoering en informatiesystemen rijksdienst. Het gaat om de inrichting van de rijksdienst en de coördinatie van informatievoorziening en digitalisering.</p><SourceLinks ids={['metadata','coordination']}/></section>
   <section className="law-about-card"><h3><Users size={18} aria-hidden="true"/>Voor wie en waarvoor?</h3><p>Artikel 2 omvat de kerndepartementen en hun dienstonderdelen, inclusief de gevestigde diensten op Caribisch Nederland. Een publieke organisatie valt dus niet alleen vanwege haar publieke taak onder dit besluit.</p><p>De bepalingen onderscheiden ministers, departementale CIO’s en CISO’s, CIO Rijk en CISO Rijk, dienstonderdeelrollen en het CIO-beraad. De rollen voor data, privacy en technologie zijn niet zonder meer overal verplicht: artikel 9 laat ministeries deze rollen invullen en eventueel als afzonderlijke functies formaliseren.</p><p>Artikel 24 biedt onder voorwaarden ruimte om op onderdelen af te wijken, in overleg met de minister van BZK. Dit is geen algemene vrijstelling.</p><SourceLinks ids={['publication']}/></section>
  </div>
  <section className="law-about-card"><h3><History size={18} aria-hidden="true"/>Hoe is het stelsel ontstaan?</h3><ol className="law-about-timeline">
   <li><span>2008</span><div><h4>CIO bij ieder ministerie</h4><p>Het kabinet besluit tot CIO’s per ministerie om de positie van ministers bij besluitvorming over grote ICT-projecten te versterken. De toelichting beschrijft dit als het begin van het stelsel.</p></div></li>
   <li><span>2019–2021</span><div><h4>Van kabinetsvoornemen naar formele regeling</h4><p>De minister van BZK kondigt namens het kabinet op 20 december 2019 een besluit aan. De regeling voor 2021 formaliseert rollen, verantwoordelijkheden en bevoegdheden. De voorganger is gepubliceerd in Staatscourant 2020, 62488.</p></div></li>
   <li><span>2024</span><div><h4>Evaluatie en advies</h4><p>De evaluatie van het stelsel en het advies van het Adviescollege ICT-toetsing geven aanleiding tot herziening, in overleg met departementen en experts.</p></div></li>
   <li><span>2025–2026</span><div><h4>Herziening op voorstel van Van Marum</h4><p>De ministerraad stemt op voorstel van staatssecretaris Van Marum in met de herziening. Het besluit wordt op 14 december 2025 vastgesteld en gaat op 1 januari 2026 in. De vernieuwing betreft onder meer data-, privacy- en technologierollen, CIO RCN, de positie van CIO Rijk, informatiehuishouding en interoperabiliteit.</p></div></li>
  </ol><SourceLinks ids={['publication','previous','evaluation','announcement']}/></section>
  <section className="law-about-card law-about-quality" aria-labelledby="law-about-quality"><h3 id="law-about-quality"><ShieldCheck size={18} aria-hidden="true"/>Bronkwaliteit en open punten</h3><p>Normen en toetspunten zijn gekoppeld aan de oorspronkelijke bronpassages, zodat je de herkomst en uitwerking kunt controleren. Geautomatiseerde extractie en uitwerking kunnen onduidelijkheden opleveren; soms zit de onduidelijkheid al in de bron. Punten die nog onvoldoende onderbouwd zijn voor selectie, staan op HOLD. Hieronder kun je ze bekijken en zien wat nog nodig is.</p><p className="law-about-quality-meta">{countLabel(cioCatalogue.criteria.length,'normen')} · {selectable} selecteerbare toetspunten · {cioPoints.length-selectable} op HOLD<br/>Aanvullende broncontrole: {review.checkedOn}. AI-beoordeeld; geen menselijke juridische of auditgoedkeuring.</p>
   <div className="law-about-holds">{review.holds.map(item=><article className="law-about-hold" key={item.pointId}><div className="law-about-hold-heading"><h4>{item.title}</h4><span>HOLD</span></div><small>{item.reference}</small><p>{item.established}</p><p>{item.missing}</p><p><strong>Wat is nog nodig?</strong> {item.next.replace(/^Nodig voor (actorgerichte )?vrijgave: /,'')}</p><SourceLinks ids={item.sourceKeys}/><Button variant="outline" onClick={()=>onPoint(item.pointId)}>Bekijk toetspunt</Button></article>)}</div>
   <div className="law-about-checks">{review.findings.map(item=><details key={item.id}><summary><span>{item.title}</span><small>{item.status}</small></summary><div><p>{item.text}</p>{'details' in item&&item.details&&<ul>{item.details.map(text=><li key={text}>{text}</li>)}</ul>}<SourceLinks ids={item.sourceKeys}/></div></details>)}</div>
   <p className="law-about-note"><CalendarDays size={14} aria-hidden="true"/>De broncontrole vernieuwt de achtergrondinformatie, niet de bewaarde bronextractie of eerdere projectselecties.</p>
  </section>
 </section>;
}
