'use client';
// Kiezen per onderwerp (B-068 tot en met B-073). Een familie kan een indeling in onderwerpen hebben (lib/family-topics.mjs).
// Er is geen eigen scherm: het onderwerp is één filter in de gewone lijst en in de gewone viewer. Dit bestand levert dat
// filter (één knop met een keuzelijst in de vorm van de andere filters, met onderaan de opties van de familie) en de
// tegels waarmee je vanuit de categorie in de gefilterde lijst komt. De teksten komen uit de familie zelf.
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Popover} from '@base-ui/react/popover';
import {Check,ChevronDown} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import './topic-filter.css';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {topicalPackage} from '@/lib/topical-content.mjs';
import type {TopicFamily,TopicChoice} from '@/lib/family-topics.mjs';

type Choice=TopicChoice;

/** Toetspunten van een keuze: in één bron, of in alle bronnen van de toetsgrondslag samen. `null` zolang een bron nog laadt. */
function choicePointCount(family:TopicFamily,choice:Choice,sourceId?:string):number|null{
 const sources=family.choiceSources(choice).filter(source=>sourceId?source.id===sourceId:source.laag===(choice.practice?'praktijk':'wet'));
 let total=0;
 for(const source of sources){const pack=topicalPackage(source.id);if(!pack?.catalogue?.points?.length)return null;
  const norms=new Set(source.normIds);total+=pack.catalogue.points.filter((point:{criterion_id:string;selection_status?:string})=>norms.has(point.criterion_id)&&point.selection_status==='SELECTABLE').length;}
 return total;
}

/** Het filter Onderwerp. `sourceId`: in de viewer van één bron; dan staan alleen de onderwerpen van die bron in de lijst.
 * `showValue`: toon het gekozen onderwerp in de knop. `onOpen`: de lijst opent; laad dan wat nodig is om te tellen. */
export function TopicFilter({family,value,onChange,sourceId,showValue=true,onOpen}:{family:TopicFamily;value:string;onChange:(value:string)=>void;sourceId?:string;showValue?:boolean;onOpen?:()=>void}){
 const [open,setOpen]=useState(false);
 // Zodra het filter in beeld is, laadt de app wat nodig is om toetspunten te tellen; de lijst opent dan met getallen.
 const preload=useRef(onOpen);
 useEffect(()=>{preload.current=onOpen;});
 useEffect(()=>{preload.current?.();},[]);
 useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const choice=family.decode(value),current=choice?family.label(value):'Alle',labels=family.labels;
 const regime=choice?.regime||'volledig',related=Boolean(choice?.related),sector=Boolean(choice?.sector),practice=Boolean(choice?.practice);
 // De opties blijven staan als je van onderwerp wisselt.
 const set=(next:Partial<Choice>)=>onChange(family.encode({topic:'',sub:'',regime,related,sector,practice,...choice,...next}));
 // Nog een klik op het gekozen onderwerp zet het filter uit. De lijst blijft open, zodat de opties in beeld komen.
 const pick=(topic:string,sub='')=>{if(choice?.topic===topic&&choice.sub===sub)onChange('');else set({topic,sub,related:related&&!sub});};
 const topics=sourceId?family.topics.filter(topic=>family.sourceTopicIds(sourceId).includes(topic.id)):family.topics;
 const at=(topic:string,sub:string):Choice=>({topic,sub,regime,related:related&&!sub,sector,practice});
 const norms=(topic:string,sub:string)=>sourceId?family.normIds(sourceId,at(topic,sub)).length:(c=>practice?c.praktijk:c.normen)(family.counts(at(topic,sub)));
 const row=(key:string,label:string,chosen:boolean,indent:boolean,onClick:()=>void,amount?:number|null)=><button type="button" key={key} className="catalogue-tool-option topic-filter-option" data-sub={indent||undefined} data-selected={chosen||undefined} aria-pressed={chosen} onClick={onClick}>
  <span>{label}</span>{amount!==undefined&&<small>{amount??'…'}</small>}{chosen&&<Check size={14} aria-hidden="true"/>}</button>;
 const option=(id:string,label:string,title:string,checked:boolean,onCheck:(checked:boolean)=>void)=><label className="catalogue-tool-option" htmlFor={id} title={title}><Checkbox id={id} checked={checked} onCheckedChange={next=>onCheck(next===true)}/><span>{label}</span></label>;
 return <Popover.Root open={open} onOpenChange={next=>{setOpen(next);if(next)onOpen?.();}}>
  <Popover.Trigger render={<button type="button" className="catalogue-tool topic-filter-tool" data-active={choice?true:undefined} title={choice?current:undefined} aria-label={`Onderwerp: ${current}`}/>}>
   <span className="catalogue-tool-label">{showValue||!choice?'Onderwerp:':'Onderwerp'}</span>{(showValue||!choice)&&<span className="catalogue-tool-value">{current}</span>}<ChevronDown size={15} aria-hidden="true"/>
  </Popover.Trigger>
  <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={4} collisionAvoidance={{side:'none',align:'shift'}} className="isolate z-50">
   <Popover.Popup className="catalogue-tool-menu topic-filter" aria-label="Onderwerp" onKeyDown={event=>{if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
     // Pijltjes lopen door de regels, net als in de andere filters.
     const items=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')],index=items.indexOf(document.activeElement as HTMLElement);
     event.preventDefault();items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}>
    <div className="topic-filter-list"><p className="topic-filter-unit" aria-hidden="true">toetspunten</p>
     {row('alle','Alle onderwerpen',!choice,false,()=>onChange(''))}
     {topics.filter(topic=>norms(topic.id,'')>0||choice?.topic===topic.id).flatMap(topic=>[row(topic.id,topic.title,choice?.topic===topic.id&&!choice.sub,false,()=>pick(topic.id),choicePointCount(family,at(topic.id,''),sourceId)),
      ...(topic.subs||[]).filter(sub=>norms(topic.id,sub.id)>0).map(sub=>row(topic.id+sub.id,sub.title,choice?.topic===topic.id&&choice.sub===sub.id,true,()=>pick(topic.id,sub.id),choicePointCount(family,at(topic.id,sub.id),sourceId)))])}
    </div>
    {/* De opties horen bij een onderwerp en verschijnen dus pas als er een gekozen is. */}
    {choice&&<div className="topic-filter-options">
     {labels.regime&&(!sourceId||family.sourceHasRegimes(sourceId))&&option('topic-filter-regime',labels.regime.label,labels.regime.title,regime==='vereenvoudigd',checked=>set({regime:checked?'vereenvoudigd':'volledig'}))}
     {!choice.sub&&family.topicHasRelated(choice.topic)&&option('topic-filter-related',labels.related.label,labels.related.title,related,checked=>set({related:checked}))}
     {labels.sector&&family.topicHasSector(choice.topic,sourceId||'')&&option('topic-filter-sector',labels.sector.label,labels.sector.title,sector,checked=>set({sector:checked}))}
     {labels.practice&&!sourceId&&option('topic-filter-practice',labels.practice.label,labels.practice.title,practice,checked=>set({practice:checked}))}
    </div>}
   </Popover.Popup>
  </Popover.Positioner></Popover.Portal>
 </Popover.Root>;
}

/** Tegels binnen de categorie: een klik opent de lijst met dat onderwerp als filter. Zelfde tegelvorm als de bronnen. */
export function TopicTiles({family,onChoose}:{family:TopicFamily;onChoose:(value:string)=>void}){
 return <section className="topic-tiles" aria-labelledby="topic-tiles-title">
  <h4 id="topic-tiles-title">Kies per onderwerp</h4>
  <div className="topic-tiles-grid">{family.topics.map((topic,index)=>{const value=family.encode({topic:topic.id}),counts=family.counts(value);
   return <button type="button" key={topic.id} onClick={()=>onChoose(value)}>
    <span className="catalogue-card-id">Onderwerp {index+1}</span><strong>{topic.title}</strong>
    <span className="catalogue-card-stats"><span><strong>{counts.bronnen}</strong> {family.labels.lawNoun[counts.bronnen===1?0:1]}</span></span>
   </button>;})}</div>
 </section>;
}
