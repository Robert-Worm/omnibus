'use client';
// DORA per onderwerp (B-068): een ingang op onderwerp boven de bestaande bronnen. De onderwerppagina toont per
// bron welke normen erbij horen en opent de gewone viewer met het onderwerp als filter. Er is één selectie:
// wat je hier kiest, is in de bronviewer gekozen en omgekeerd.
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowRight,Layers} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {foundations} from '@/lib/investigation.mjs';
import {frameworkTitle} from '@/lib/framework-title.mjs';
import {topicalPackage} from '@/lib/topical-content.mjs';
import {topicalSelection,chooseTopicalPoints} from '@/lib/topical-selection.mjs';
import {doraTopics,doraTopicCounts,doraTopicSelection,doraTopicSources,doraOutsideSources,doraTopicReview,requestDoraViewerFilter} from '@/lib/dora-onderwerpen.mjs';
import type {Draft} from '@/lib/framework-types';
import './dora-topics.css';

type Topic=(typeof doraTopics)[number];
const sourceTitle=(id:string)=>frameworkTitle(foundations.find(source=>source.id===id)?.title||id);
const plural=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;

/** Acht onderwerpen als ingang. Staat boven de bronnen van de DORA-categorie en boven de lijst. */
export function DoraTopicBand({active,onChoose}:{active:string;onChoose:(id:string)=>void}){
 return <section className="dora-topic-band" aria-labelledby="dora-topic-band-title">
  <header><h3 id="dora-topic-band-title"><Layers size={18} aria-hidden="true"/>DORA per onderwerp</h3>
   <p>Kies een onderwerp en zie welke normen uit de verordening en de uitvoeringsregelingen erbij horen. Je kiest daarna zelf.</p></header>
  <div className="dora-topic-cards">{doraTopics.map((topic,index)=>{const counts=doraTopicCounts(topic.id);
   return <button type="button" key={topic.id} data-active={active===topic.id||undefined} onClick={()=>onChoose(topic.id)}>
    <span className="dora-topic-number">{index+1}</span><strong>{topic.title}</strong>
    <small>{plural(counts.wet,'norm','normen')} · {plural(counts.bronnen,'bron','bronnen')}</small>
   </button>;})}</div>
 </section>;
}

type PanelProps={topicId:string;draft:Draft;onChange:(draft:Draft)=>void;disabled?:boolean;
 prepareSources:(ids:string[],action:()=>void)=>void;onOpenSource:(id:string)=>void;onClose:()=>void;onTopic:(id:string)=>void};

export function DoraTopicPanel({topicId,draft,onChange,disabled,prepareSources,onOpenSource,onClose,onTopic}:PanelProps){
 const topic=doraTopics.find(t=>t.id===topicId) as Topic;
 const [sub,setSub]=useState(''),[norea,setNorea]=useState(false),[vereenvoudigd,setVereenvoudigd]=useState(false),[raaktOok,setRaaktOok]=useState(false);
 const [error,setError]=useState('');
 useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const rows=doraTopicSelection(topicId,{sub,norea,vereenvoudigd,raaktOok});
 // Aantallen toetspunten en de selectie vragen de volledige bron; laad die zodra de pagina opent.
 const prepare=useRef(prepareSources);
 useEffect(()=>{prepare.current=prepareSources;});
 useEffect(()=>{prepare.current(doraTopicSources.map(source=>source.id),()=>{});},[topicId]);
 // Een bron zonder eigen normen voor dit onderwerp, maar met normen die het raken, staat niet als lege regel in de lijst.
 const onlyTouching=rows.filter(row=>!row.normIds.length);
 const detail=rows.filter(row=>row.normIds.length).map(row=>{
  const pack=topicalPackage(row.id),norms=new Set(row.normIds);
  const pointIds=pack?pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id):null;
  const state=pack&&pointIds?topicalSelection(draft,row.id,pointIds):null;
  return {...row,pointIds,state};
 });
 const ready=detail.every(row=>row.state?.total);
 const total=detail.reduce((sum,row)=>sum+row.normIds.length,0),points=detail.reduce((sum,row)=>sum+(row.state?.total||0),0),chosen=detail.reduce((sum,row)=>sum+(row.state?.selected||0),0);
 const choose=(targets:typeof detail,include:boolean)=>prepareSources(targets.map(row=>row.id),()=>{try{
   let next=draft;const open=draft.investigation?.sourceIds||[];
   for(const row of targets){const pack=topicalPackage(row.id),norms=new Set(row.normIds);if(!pack)throw new Error('De bron is nog niet geladen. Probeer het opnieuw.');
    const ids=pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id);
    next=chooseTopicalPoints(next,row.id,ids,include) as Draft;}
   // Kiezen opent geen bronnen: de lijst met geopende bronnen blijft zoals ze was.
   onChange({...next,investigation:{...next.investigation,sourceIds:open}} as Draft);setError('');
  }catch(problem){setError(problem instanceof Error?problem.message:'Selecteren is niet gelukt.');}});
 const open=(row:typeof detail[number])=>{requestDoraViewerFilter(row.id,row.filter);onOpenSource(row.id);};
 const wet=detail.filter(row=>row.laag==='wet'),praktijk=detail.filter(row=>row.laag==='praktijk');
 const sectorCount=detail.reduce((sum,row)=>sum+row.sector,0);
 const section=(title:string,list:typeof detail,note?:string)=>list.length>0&&<section className="dora-topic-sources" aria-label={title}>
  <h4>{title}</h4>{note&&<p className="dora-topic-note">{note}</p>}
  <ul>{list.map(row=><li key={row.id} data-chosen={row.state?.selected?true:undefined}>
   <div><span className="dora-topic-kind" data-laag={row.laag}>{row.soort}</span><strong>{sourceTitle(row.id)}</strong>
    <small>{plural(row.normIds.length,'norm','normen')}{row.state?.total?` · ${plural(row.state.total,'toetspunt','toetspunten')} · ${row.state.selected} gekozen`:' · toetspunten worden geladen…'}{!raaktOok&&row.raakt.length>0&&` · ${row.raakt.length} ${row.raakt.length===1?'raakt':'raken'} dit onderwerp ook`}</small></div>
   <div className="dora-topic-actions">
    <Button variant="outline" disabled={disabled} onClick={()=>open(row)}>Bekijk in viewer<ArrowRight size={14} aria-hidden="true"/></Button>
    <Button variant="outline" disabled={disabled||!row.state||!row.state.total} aria-pressed={row.state?.all||false} onClick={()=>choose([row],!row.state?.all)}>{row.state?.all?'Deselecteer':'Kies deze normen'}</Button>
   </div></li>)}</ul></section>;
 return <section className="dora-topic-panel" aria-labelledby="dora-topic-title">
  <nav className="dora-topic-crumbs" aria-label="Kruimelpad"><Button variant="ghost" onClick={onClose}><ArrowLeft size={15} aria-hidden="true"/>Alle bronnen</Button>
   <label><span>Onderwerp</span><select value={topicId} onChange={event=>{setSub('');onTopic(event.target.value);}}>{doraTopics.map((t,i)=><option key={t.id} value={t.id}>{i+1}. {t.title}</option>)}</select></label></nav>
  <header><p className="dora-topic-eyebrow">DORA per onderwerp · selectiehulp</p><h3 id="dora-topic-title" tabIndex={-1}>{topic.title}</h3>
   <dl className="dora-topic-scope"><div><dt>Hoort erbij</dt><dd>{topic.includes}</dd></div><div><dt>Hoort er niet bij</dt><dd>{topic.excludes}</dd></div></dl></header>
  <fieldset className="dora-topic-options"><legend>Opties</legend>
   {topic.subs&&<label className="dora-topic-sub"><span>Deelonderwerp</span><select value={sub} onChange={event=>setSub(event.target.value)}><option value="">Alles</option>{topic.subs.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
   <label><input type="checkbox" checked={vereenvoudigd} onChange={event=>setVereenvoudigd(event.target.checked)}/><span><strong>Vereenvoudigd raamwerk</strong> in plaats van het gewone (artikel 16; alleen voor de daar genoemde kleine instellingen)</span></label>
   {!sub&&<label><input type="checkbox" checked={raaktOok} onChange={event=>setRaaktOok(event.target.checked)}/><span><strong>Ook normen die dit onderwerp raken</strong> maar bij een ander onderwerp horen</span></label>}
   <label><input type="checkbox" checked={norea} onChange={event=>setNorea(event.target.checked)}/><span><strong>Toon NOREA DORA in Control</strong> als verduidelijking (praktijkkader, geen wettelijke norm)</span></label>
  </fieldset>
  {section('Wet en uitvoeringsregelingen',wet)}
  {section('NOREA DORA in Control',praktijk,'NOREA beschrijft dezelfde eisen als beheersmaatregelen en vult ze soms zelf in, bijvoorbeeld met een frequentie. Kies de wet of NOREA als toetsgrondslag; beide kiezen geeft dubbele toetspunten.')}
  {!detail.length&&<p className="empty-framework">Geen normen binnen deze keuze.</p>}
  {onlyTouching.length>0&&<p className="dora-topic-touching">{onlyTouching.map(row=>`${sourceTitle(row.id)} heeft ${plural(row.raakt.length,'norm die','normen die')} dit onderwerp ${row.raakt.length===1?'raakt':'raken'}`).join('; ')}. Zet de optie <em>Ook normen die dit onderwerp raken</em> aan om ze te zien.</p>}
  {error&&<p role="alert">{error}</p>}
  <footer className="dora-topic-footer">
   <p><strong>{plural(total,'norm','normen')}</strong>{ready&&<> · {plural(points,'toetspunt','toetspunten')} · {chosen} gekozen</>}{sectorCount>0&&<> · {sectorCount} alleen voor één soort instelling</>}</p>
   <Button disabled={disabled||!ready||!points} onClick={()=>choose(detail,chosen<points)}>{chosen<points||!points?`Kies alle ${total} normen`:'Deselecteer alles'}</Button>
  </footer>
  <details className="dora-topic-transparency"><summary>Wat zit er niet in deze onderwerpen?</summary>
   <p>Dit is een selectiehulp, geen volledige of juridisch sluitende afbakening. {doraTopicReview.note}</p>
   <ul>{doraOutsideSources.map(source=><li key={source.id}><strong>{sourceTitle(source.id)}</strong>: {source.reason}. Je vindt deze bron in de bronnenlijst.</li>)}
    <li>Enkele normen passen in geen onderwerp, zoals het toepassingsgebied en taken van een autoriteit. Die vind je in de viewer van de bron zelf.</li></ul></details>
 </section>;
}
