"use client";
import {useState,type ReactNode} from 'react';
import {BookOpen,ShieldCheck} from 'lucide-react';
import {LawPointSourceLayout,LawSourceDocument,type LawPassage} from './law-point-source';
import {cioSourceGroups as lawSourceGroups} from '@/lib/cio-source-groups.mjs';
import {wwkeContext,wwkeRecordMap,wwkeLabels,wwkePointContext,type WwkePoint,type WwkeSourceTrace,type WwkeSourceRecord} from '@/lib/wwke-law-data.mjs';
import {wwkeReaderDocument,wwkeReaderPassages} from '@/lib/wwke-source-reader.mjs';

import {lawReaderText,lawBasisLabel} from '@/lib/law-reader-language.mjs';
import CatalogueContent from './catalogue-content';

const labels=wwkeLabels as Record<string,string>;
function TextList({title,items}:{title:string;items:string[]}){return items?.length?<section className="cio-source-text"><h4>{title}</h4><ul>{items.map((s,i)=><li key={i}>{lawReaderText(s)}</li>)}</ul></section>:null;}

/** Adapter for WWKE evidence. Layout and marked document viewer are shared with CIO. */
export default function WwkePointSource({point,trace,application}:{point:WwkePoint;trace?:WwkeSourceTrace;application?:ReactNode}){
 return <CatalogueContent resource="source:WWKE-20260815-ASTRA-R1">{()=> <WwkePointSourceContent point={point} trace={trace} application={application}/>}</CatalogueContent>;
}
function WwkePointSourceContent({point,trace,application}:{point:WwkePoint;trace?:WwkeSourceTrace;application?:ReactNode}){
 const records=trace?.records?new Map<string,WwkeSourceRecord>(trace.records.map(r=>[r.id,r])):wwkeRecordMap;
 const initialIndex=Math.max(0,point.source_links.findIndex(l=>l.contribution==='PRIMARY'));
 const [index,setIndex]=useState(initialIndex);
 const link=point.source_links[index],record=records.get(link?.record_id);
 const initialLink=point.source_links[initialIndex],initialPassage=wwkeReaderPassages(initialLink,records.get(initialLink.record_id))[0];
 const [page,setPage]=useState(initialPassage?.page||1),[target,setTarget]=useState<number|undefined>(initialPassage?.start),[focusRequest,setFocusRequest]=useState(0);
 const [active,setActive]=useState<'criterion'|'source'>('criterion');
 const passages=record?wwkeReaderPassages(link,record):[];
 const detail=trace||wwkePointContext(point);
 function focus(p?:LawPassage){setPage(p?.page||1);setTarget(p?.start);setFocusRequest(v=>v+1);setActive('source');}
 const criterion=<div className="cio-source-explanation">
  <h3>Hoe is dit toetspunt onderbouwd?</h3><p className="cio-source-composition">De kernbepaling beschrijft de inhoud van het toetspunt. Andere bepalingen verduidelijken of begrenzen die inhoud. Algemene reikwijdte en uitzonderingen staan apart: zij zijn geen aanvullende toetsverplichting.</p>
  <div className="cio-source-links">{lawSourceGroups(point.source_links).map((group:{id:string;title:string;entries:{link:WwkePoint['source_links'][number];index:number}[]})=><section key={group.id} data-source-group={group.id} aria-label={group.title}><h4>{group.title}</h4>{group.entries.map(({link:item,index:i})=>{const r=records.get(item.record_id);return <article key={`${item.record_id}-${i}`} className={'cio-source-link-card'+(i===index?' is-active':'')} data-record-id={item.record_id} data-contribution={item.contribution}>
   <button aria-pressed={i===index} onClick={()=>{setIndex(i);focus(wwkeReaderPassages(item,r)[0]);}}><strong>{r?.title||item.record_id}</strong><BookOpen size={16} aria-hidden="true"/><span>{r?.locator||item.record_id} · {labels[item.contribution]||item.contribution} · {r?.evidence_kind==='XML_ONLY'?'Consolidatietekst':[...new Set(item.visible_spans.map(s=>s.page))].map(p=>'p. '+p).join(', ')}</span></button>
   <p>{item.supported_clause}</p><p className="cio-link-contribution"><strong>Bijdrage aan dit toetspunt</strong>{lawReaderText(item.explanation)}</p>
   <small>{lawBasisLabel(item.basis_code)} · {lawReaderText(item.basis_reason)}</small>{item.derivation_reason&&<p>{lawReaderText(item.derivation_reason)}</p>}{item.interpretation_boundary&&<p>{lawReaderText(item.interpretation_boundary)}</p>}
   {item.unresolved_interpretation&&<p className="cio-source-caution">{lawReaderText(item.unresolved_interpretation)}</p>}
  </article>;})}</section>)}</div>
  {application||<section className="cio-source-text"><h4>Toepassing van dit toetspunt</h4><p>{point.scope}</p><TextList title="Wettelijke betrokkenen" items={point.addressees.map(a=>a.label+(a.condition?' — '+a.condition:''))}/><TextList title="Voorwaarden" items={point.conditions}/><TextList title="Uitzonderingen" items={point.exceptions}/><p>{lawReaderText(point.selection_reason)}</p>{trace?.assessment&&<><h4>{trace.assessment.mode==='SELECTION'?'Toepasselijkheid nog te beoordelen':'Jouw beoordeling van toepasselijkheid'}</h4>{trace.assessment.mode==='SELECTION'&&<p>Geselecteerd voor het onderzoek; er is geen toepasselijkheidsbeoordeling bevestigd.</p>}<p>{trace.assessment.basis}</p><p>{trace.assessment.boundary}</p></>}</section>}
  {record&&<section className="cio-source-text"><h4>Context van de gekozen bepaling</h4><p className="cio-source-kicker">{record.locator}</p><p>{record.assertion}</p><TextList title="Voorwaarden in de bron" items={record.conditions}/><TextList title="Uitzonderingen in de bron" items={record.exceptions}/><TextList title="Kruisverwijzingen" items={record.cross_references}/><TextList title="Interpretatie van de bron" items={record.interpretation_notes}/></section>}
  {detail.issues?.filter(i=>i.status==='OPEN').map(i=><section className="cio-source-caution" key={i.id}><h4>Open bronvraag · {i.id}</h4><p>{lawReaderText(i.description)}</p><p>{lawReaderText(i.resolution)}</p></section>)}
 </div>;
 const xmlOnly=record?.evidence_kind==='XML_ONLY';
 const source=record?<LawSourceDocument recordId={record.id} title={record.title} locator={record.locator} sourceKind={xmlOnly?'Geconsolideerde wettekst':'Oorspronkelijke publicatie'} document={xmlOnly?null:wwkeReaderDocument} passages={passages} page={page} target={target} focusRequest={focusRequest} onFocus={focus} onPage={next=>{setPage(next);setTarget(undefined);}} onReturn={()=>setActive('criterion')}
  notice={!xmlOnly&&passages.length!==link.visible_spans.length&&<section className="cio-source-caution" role="alert"><p>Niet alle citaten sluiten exact aan op de lokale pagina. Alleen gecontroleerde passages zijn gemarkeerd.</p>{link.visible_spans.map((s,i)=><blockquote key={i}>p. {s.page} · {s.quote}</blockquote>)}</section>}
  fallback={<section className="cio-source-text"><h4>Uitsluitend consolidatietekst</h4><p>Deze tekst heeft geen identieke passage in de oorspronkelijke publicatie. Daarom wordt geen PDF-markering getoond.</p><blockquote>{record.xml_evidence?.quote}</blockquote><p className="cio-source-kicker">{record.xml_anchor}</p><a href={wwkeContext.consolidation.url} target="_blank" rel="noreferrer">Gekozen consolidatie in de Wettenbank ↗</a></section>}/>:<p role="alert">Deze gekoppelde bron is niet beschikbaar.</p>;
 const summary=<section className="cio-norm-summary" aria-label="Inhoud van het toetspunt"><div className="cio-norm-heading"><ShieldCheck size={18} aria-hidden="true"/><h3>Wat houdt dit toetspunt in?</h3></div><p>{point.text}</p><small>{point.id}</small>{point.selection_status!=='SELECTABLE'&&<p className="cio-source-caution">{labels[point.selection_status]} · {lawReaderText(point.selection_reason)}</p>}</section>;
 return <LawPointSourceLayout label={'Bron bij '+point.title} summary={summary} publication={<><a href={wwkeContext.official_publication.url} target="_blank" rel="noreferrer">{wwkeContext.official_publication.identifier} ↗</a><a href={wwkeContext.consolidation.url} target="_blank" rel="noreferrer">Consolidatie {wwkeContext.dates.selected_consolidation} ↗</a></>} criterion={criterion} source={source} active={active} onActive={setActive} status={<p>Markeringen verwijzen naar de exacte bijdragen aan dit toetspunt in de oorspronkelijke publicatie. De gekozen consolidatie en de oorspronkelijke publicatie blijven afzonderlijke bronversies; tekst die alleen in de geconsolideerde versie staat, wordt niet in de oorspronkelijke PDF gemarkeerd.</p>}/>;
}
