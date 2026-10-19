"use client";

import {useState} from 'react';
import {LawPointSourceLayout,LawSourceDocument} from './law-point-source';
import CioNormSummary from './cio-norm-summary';
import CioEditorialHistory from './cio-editorial-history';
import {cioEditorialFor} from '@/lib/cio-content.mjs';
import {catalogueDerived} from '@/lib/catalogue-runtime.mjs';
import {lawReaderText} from '@/lib/law-reader-language.mjs';
import {cioSourceGroups} from '@/lib/cio-source-groups.mjs';
import {BookOpen} from 'lucide-react';
import type {Point, Criterion, RecordEntry, Issue} from './cio-law-workspace';
import {cioSourceBank,cioPages,cioStatus,cioIssues,cioContributionLabels,cioKindLabels,cioRoleLabels} from '@/lib/cio-law-adapter.mjs';
import {cioSourceDocument as readerSource} from '@/lib/cio-source-document.mjs';
import {cioReaderPassages,cioReaderFocus} from '@/lib/cio-source-reader.mjs';
import CatalogueContent from './catalogue-content';
import './cio-point-source.css';

type Props = {point:Point; parent:Criterion};
type Passage = {page:number;start:number;end:number;quote:string;label:string};
const bank = (cioSourceBank as unknown as {records:RecordEntry[]}).records;
const recordMap = new Map(bank.map(record=>[record.id,record]));
catalogueDerived(()=>{recordMap.clear();for(const record of bank)recordMap.set(record.id,record);});
const contributions = cioContributionLabels as Record<string,string>;
const kinds = cioKindLabels as Record<string,string>;
const roles = cioRoleLabels as Record<string,string>;
const derivations:Record<string,string> = {DIRECT:'Rechtstreeks',PARAPHRASE:'Parafrase',SYNTHESIS:'Synthese'};

function TextList({title,items}:{title:string;items:string[]}) {
  return items.length ? <section className="cio-source-text"><h4>{title}</h4><ul>{items.map((item,i)=><li key={i}>{lawReaderText(item)}</li>)}</ul></section> : null;
}
function ActorList({actors}:{actors:Point['addressees']}) {
  return actors.length ? <dl className="cio-source-actors">{actors.map((actor,i)=><div key={i}><dt>{actor.label}</dt><dd>{roles[actor.role]||actor.role}{actor.condition&&<p>{actor.condition}</p>}</dd></div>)}</dl> : <p>Geen actor benoemd in de bron.</p>;
}

/** Use key={point.id} when the caller switches points, preserving navigation within one point. */
export default function CioPointSource({point,parent}:Props) {
  return <CatalogueContent resource="source:CIO2026-REEXTRACT-1">{()=> <CioPointSourceContent point={point} parent={parent}/>}</CatalogueContent>;
}
function CioPointSourceContent({point,parent}:Props) {
  const edition=cioEditorialFor(point.id);
  const [linkIndex,setLinkIndex] = useState(()=>Math.max(0,point.source_links.findIndex(link=>link.contribution==='PRIMARY')));
  const link = point.source_links[linkIndex];
  const record = recordMap.get(link?.record_id);
  const passages:Passage[] = record ? cioReaderPassages(cioPages,record) : [];
  const firstRecord = recordMap.get(point.source_links[Math.max(0,point.source_links.findIndex(item=>item.contribution==='PRIMARY'))]?.record_id);
  const firstPassage:Passage|undefined = firstRecord ? cioReaderFocus(cioReaderPassages(cioPages,firstRecord),firstRecord.locator) : undefined;
  const [page,setPage] = useState(firstPassage?.page||1);
  const [target,setTarget] = useState<number|undefined>(firstPassage?.start);
  const [focusRequest,setFocusRequest] = useState(0);
  const [active,setActive] = useState<'criterion'|'source'>('criterion');
  const related = new Set([point.id,parent.id,...point.objective_ids,...point.source_links.map(item=>item.record_id),...(record?[record.id]:[])]);
  const limits = (cioIssues as unknown as {issues:Issue[]}).issues.filter(issue=>issue.status==='ACCEPTED_SOURCE_LIMIT'&&issue.affected_ids.some(id=>related.has(id)));
  function focusRecord(id:string) {
    const next = recordMap.get(id);
    const passage:Passage|undefined = next ? cioReaderFocus(cioReaderPassages(cioPages,next),next.locator) : undefined;
    setPage(passage?.page||next?.source_spans[0]?.page||1);setTarget(passage?.start);setFocusRequest(value=>value+1);setActive('source');
  }
  const criterion = <div className="cio-source-explanation">
    <h3>Hoe is dit toetspunt onderbouwd?</h3>
    <p className="cio-source-composition">De kernbepaling beschrijft de inhoud van het toetspunt. Andere inhoudelijke bepalingen verduidelijken die inhoud of begrenzen wanneer en hoe deze geldt. Algemene reikwijdte en uitzonderingen staan apart: zij zijn geen aanvullende toetsverplichting.</p>
    <CioEditorialHistory edition={edition}/>
    <div className="cio-source-links">{cioSourceGroups(point.source_links).map((group:{id:string;title:string;entries:{link:Point['source_links'][number];index:number}[]})=><section key={group.id} data-source-group={group.id} aria-label={group.title}><h4>{group.title}</h4>{group.entries.map(({link:item,index:i})=>{const sourceRecord=recordMap.get(item.record_id);return <article key={`${item.record_id}-${i}`} className={`cio-source-link-card${i===linkIndex?' is-active':''}`} data-record-id={item.record_id} data-contribution={item.contribution}>
      <button aria-pressed={i===linkIndex} onClick={()=>{setLinkIndex(i);focusRecord(item.record_id);}}><strong>{sourceRecord?.title||item.record_id}</strong><BookOpen size={16} aria-hidden="true"/><span>{sourceRecord?.locator||item.record_id} · {contributions[item.contribution]||item.contribution} · p. {[...new Set(sourceRecord?.source_spans.map(span=>span.page)||[])].join(', ')}</span></button>
      <p>{sourceRecord?.assertion||item.supported_clause}</p>
      <p className="cio-link-contribution"><strong>Bijdrage aan dit toetspunt</strong>{lawReaderText(item.explanation)}</p>
      {item.supported_clause!==point.text&&item.supported_clause!==edition.originalPoint.text&&item.supported_clause!==sourceRecord?.assertion&&<p className="cio-link-clause"><strong>Betekenis voor dit toetspunt:</strong> {item.supported_clause}</p>}
      <small>{sourceRecord?.source_status==='EXPLANATORY_CONTEXT'?'Toelichting — geen zelfstandige nieuwe plicht · ':''}{derivations[item.derivation]||item.derivation}</small>
      {item.unresolved_interpretation&&<p className="cio-source-caution">{lawReaderText(item.unresolved_interpretation)}</p>}
    </article>;})}</section>)}</div>
    <section className="cio-source-text"><h4>Toepassing van dit toetspunt</h4><p>{point.scope}</p><ActorList actors={point.addressees}/><TextList title="Voorwaarden" items={point.conditions}/><TextList title="Uitzonderingen" items={point.exceptions}/><p>{lawReaderText(point.selection_reason)}</p><p>{lawReaderText(point.split_rationale)}</p>{point.interpretation_resolution&&<p>{lawReaderText(point.interpretation_resolution.reason)}</p>}<TextList title="Verwijzingen en afhankelijkheden" items={point.source_cross_references}/><TextList title="Interpretatienotities" items={point.source_interpretation_notes}/></section>
    {record&&<section className="cio-source-text"><h4>Context van de gekozen bepaling</h4><p className="cio-source-kicker">{record.locator} · {kinds[record.normative_kind]||record.normative_kind}</p><p>{record.source_status==='EXPLANATORY_CONTEXT'?'Toelichting — geen zelfstandige nieuwe plicht':'Hoofdtekst / directe bron'}</p><p>{record.assertion}</p><ActorList actors={record.actors}/><TextList title="Voorwaarden in de bron" items={record.conditions}/><TextList title="Uitzonderingen in de bron" items={record.exceptions}/><TextList title="Kruisverwijzingen" items={record.cross_references}/><TextList title="Interpretatie van de bron" items={record.interpretation_notes}/></section>}
    {limits.map(issue=><section key={issue.id} className="cio-source-caution"><h4>Bronbeperking · {issue.id}</h4><p>{lawReaderText(issue.description)}</p><p>{lawReaderText(issue.resolution)}</p></section>)}
  </div>;
  const source = record ? <LawSourceDocument recordId={record.id} title={record.title} locator={record.locator} sourceKind={record.source_status==='EXPLANATORY_CONTEXT'?'Toelichting':'Hoofdtekst'} document={readerSource} passages={passages} page={page} target={target} focusRequest={focusRequest}
    onFocus={passage=>{setPage(passage.page);setTarget(passage.start);setFocusRequest(value=>value+1);}} onPage={next=>{setPage(next);setTarget(undefined);}} onReturn={()=>setActive('criterion')}
    notice={passages.length!==record.source_spans.length&&<section className="cio-source-caution" role="alert"><p>Niet alle opgeslagen citaten sluiten aan op de lokale pagina. Alleen exact overeenkomende passages zijn gemarkeerd.</p>{record.source_spans.map((span,i)=><blockquote key={i}>p. {span.page} · {span.quote}</blockquote>)}</section>}
    fallback={<section><p role="alert">De oorspronkelijke bronversie is niet beschikbaar. Hieronder staan de opgeslagen citaten.</p>{record.source_spans.map((span,i)=><blockquote key={i}>p. {span.page} · {span.quote}</blockquote>)}</section>}/>:<p role="alert">Deze gekoppelde bron is niet beschikbaar.</p>;
  return <LawPointSourceLayout label={`Bron bij ${point.title}`} summary={<CioNormSummary point={point}/>}
    publication={<a href={cioStatus.official_url} target="_blank" rel="noreferrer">{cioStatus.official_publication} ↗</a>}
    criterion={criterion} source={source} active={active} onActive={setActive}
    status={<><p>{cioStatus.current_consolidation_verification.display_note}</p><p>{cioStatus.external_dependencies}</p></>}/>;
}
