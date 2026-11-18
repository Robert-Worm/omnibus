'use client';
// Een onderwerp als één geheel (B-072): de normen van alle bronnen onder elkaar, per bron een sectie. Elke sectie is de
// gewone viewer van die bron, vast gefilterd op het onderwerp. Er is dus één selectie: wat je hier kiest, staat ook in de
// viewer van de bron en in de lijst, en omgekeerd.
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {foundations} from '@/lib/investigation.mjs';
import {frameworkTitle} from '@/lib/framework-title.mjs';
import {topicalPackage} from '@/lib/topical-content.mjs';
import {topicalSelection,chooseTopicalPoints} from '@/lib/topical-selection.mjs';
import type {TopicFamily} from '@/lib/family-topics.mjs';
import type {Draft} from '@/lib/framework-types';
import TopicalLawBrowser from './topical-law-browser';
import './topic-viewer.css';

type Props={family:TopicFamily;value:string;draft:Draft;onChange:(draft:Draft)=>void;disabled?:boolean;navigate:(page:string)=>void;
 /** Haal de volledige bron op en voer daarna de handeling uit. */prepare:(id:string,action:()=>void)=>void;
 /** Is deze bron beschikbaar in de huidige verzameling? */allowed:(id:string)=>boolean;onOpenSource:(id:string)=>void};

const pointsOf=(sourceId:string,normIds:string[])=>{const pack=topicalPackage(sourceId),norms=new Set(normIds);
 return pack?.catalogue?.points?.length?pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id) as string[]:null;};

export default function TopicViewer({family,value,draft,onChange,disabled,navigate,prepare,allowed,onOpenSource}:Props){
 useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const sources=family.choiceSources(value).filter(source=>allowed(source.id)),basis=family.basis(value);
 // De bronnen laden zodra het onderwerp in beeld komt; een sectie verschijnt als haar bron er is.
 const load=useRef(prepare),ids=sources.map(source=>source.id).join('|');
 useEffect(()=>{load.current=prepare;});
 useEffect(()=>{for(const id of ids.split('|').filter(Boolean))load.current(id,()=>{});},[ids]);
 const parts=sources.map(source=>{const points=pointsOf(source.id,source.normIds),state=points?topicalSelection(draft,source.id,points):null;return {...source,points,state};});
 const own=parts.filter(part=>part.laag===basis),ready=own.length>0&&own.every(part=>part.points);
 const total=own.reduce((sum,part)=>sum+(part.state?.total||0),0),selected=own.reduce((sum,part)=>sum+(part.state?.selected||0),0);
 const chooseAll=(include:boolean)=>{let next=draft;const open=draft.investigation?.sourceIds||[];
  for(const part of own){if(!part.points)return;next=chooseTopicalPoints(next,part.id,part.points,include) as Draft;
   const drop=include?pointsOf(part.id,family.otherRegimeNormIds(part.id,value)):null;if(drop?.length)next=chooseTopicalPoints(next,part.id,drop,false) as Draft;}
  // Kiezen opent geen bronnen: de lijst met geopende bronnen blijft zoals ze was.
  onChange({...next,investigation:{...next.investigation,sourceIds:open}} as Draft);};
 const title=(id:string)=>frameworkTitle(foundations.find(source=>source.id===id)?.title||id);
 const what=basis==='wet'?`${own.length} ${family.labels.lawNoun[own.length===1?0:1]}`:family.labels.practice?.full||'';
 return <section className="topic-viewer" aria-labelledby="topic-viewer-title">
  <header className="topic-viewer-heading"><div className="law-viewer-heading"><h2 id="topic-viewer-title">{family.label(value)}</h2>
    <output aria-live="polite">{what}{ready&&<> · {total} toetspunten · {selected} gekozen</>}</output></div>
   <Button disabled={disabled||!ready||!total} aria-pressed={ready&&total>0&&selected>=total} onClick={()=>chooseAll(selected<total)}>{ready&&total>0&&selected>=total?'Deselecteer':ready?`Kies alle ${total} toetspunten`:'Toetspunten tellen…'}</Button></header>
  {parts.map(part=><section className="topic-viewer-source" key={part.id} aria-label={title(part.id)}>
   <header><div><h3>{title(part.id)}</h3><p><span className="catalogue-pill" data-tone={part.laag==='wet'&&family.tone?family.tone:undefined}>{part.soort}</span>
     <span>{part.normIds.length} {part.normIds.length===1?'norm':'normen'}{part.state&&<> · {part.state.selected} van {part.state.total} toetspunten gekozen</>}</span></p></div>
    <Button variant="outline" onClick={()=>onOpenSource(part.id)}>Open bron<ArrowRight size={14} aria-hidden="true"/></Button></header>
   {topicalPackage(part.id)?<TopicalLawBrowser embedTopic={value} sourceId={part.id} draft={draft} onChange={onChange} navigate={navigate} disabled={disabled}
     overview="norms" onOverviewChange={()=>{}} prepareDetails={action=>prepare(part.id,action)}/>:<p className="topic-viewer-loading">Normen laden…</p>}
  </section>)}
 </section>;
}
