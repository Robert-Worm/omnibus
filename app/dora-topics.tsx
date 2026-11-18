'use client';
// Kies per onderwerp (B-068, herzien in B-069). Een familie kan een indeling in onderwerpen hebben; nu heeft alleen DORA
// die. Er is geen eigen scherm: het onderwerp is een filter in de gewone lijst en in de gewone viewer. Dit bestand levert
// de bediening van dat filter (één knop in de filterbalk met een overzicht van de onderwerpen en twee opties) en de
// tegels waarmee je vanuit de categorie in de gefilterde lijst komt.
import {useState} from 'react';
import {Check} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle} from '@/components/ui/popover';
import './dora-topics.css';
import {doraTopics,doraChoiceCounts,decodeDoraChoice,encodeDoraChoice,doraChoiceLabel,doraTopicHasRelated} from '@/lib/dora-onderwerpen.mjs';

const plural=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;
type Choice={topic:string;sub:string;regime:'volledig'|'vereenvoudigd';related:boolean};

/** Het filter Onderwerp: een knop in de filterbalk. Het overzicht toont alle onderwerpen met hun omvang en de opties. */
export function TopicFilter({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const choice=decodeDoraChoice(value) as Choice|null,current=choice?doraChoiceLabel(value):'Alle';
 // Het kader en de verwante normen blijven staan als je van onderwerp wisselt.
 const set=(next:Partial<Choice>)=>onChange(encodeDoraChoice({topic:'',sub:'',regime:choice?.regime||'volledig',related:choice?.related||false,...choice,...next}));
 const pick=(topic:string,sub='')=>{set({topic,sub});setOpen(false);};
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger render={<button type="button" className="catalogue-tool topic-filter-tool" data-active={choice?true:undefined} aria-label={`Onderwerp: ${current}`}/>}>
   <span className="catalogue-tool-label">Onderwerp:</span><span className="catalogue-tool-value">{current}</span>
  </PopoverTrigger>
  <PopoverContent className="topic-filter" align="start">
   <PopoverTitle>Kies per onderwerp</PopoverTitle>
   <ul className="topic-filter-list">
    {doraTopics.map((topic,index)=>{const counts=doraChoiceCounts({topic:topic.id,sub:'',regime:choice?.regime||'volledig',related:choice?.related||false}),active=choice?.topic===topic.id;
     return <li key={topic.id}>
      <button type="button" title={topic.includes} data-active={active&&!choice?.sub||undefined} aria-pressed={active&&!choice?.sub} onClick={()=>pick(topic.id)}>
       <span className="topic-filter-number">{index+1}</span>
       <span className="topic-filter-text"><strong>{topic.title}</strong></span>
       <span className="topic-filter-count">{plural(counts.normen,'norm','normen')}<small>{plural(counts.bronnen,'bron','bronnen')}</small></span>
       {active&&!choice?.sub&&<Check size={15} aria-hidden="true"/>}
      </button>
      {topic.subs&&<ul>{topic.subs.map(sub=>{const chosen=active&&choice?.sub===sub.id;
       return <li key={sub.id}><button type="button" data-active={chosen||undefined} aria-pressed={chosen} onClick={()=>pick(topic.id,sub.id)}><span className="topic-filter-text"><strong>{sub.title}</strong></span>
        <span className="topic-filter-count">{plural(doraChoiceCounts({topic:topic.id,sub:sub.id,regime:choice?.regime||'volledig',related:false}).normen,'norm','normen')}</span>{chosen&&<Check size={15} aria-hidden="true"/>}</button></li>;})}</ul>}
     </li>;})}
   </ul>
   <div className="topic-filter-options">
    <label className="filter-option" htmlFor="topic-filter-regime"><Checkbox id="topic-filter-regime" checked={choice?.regime==='vereenvoudigd'} disabled={!choice} onCheckedChange={checked=>set({regime:checked===true?'vereenvoudigd':'volledig'})}/><span>Vereenvoudigd ICT-risicobeheerkader (artikel 16)</span></label>
    <label className="filter-option" htmlFor="topic-filter-related"><Checkbox id="topic-filter-related" checked={Boolean(choice?.related)} disabled={!choice||Boolean(choice.sub)||!doraTopicHasRelated(choice.topic)} onCheckedChange={checked=>set({related:checked===true})}/><span>Ook verwante normen uit andere onderwerpen</span></label>
   </div>
   {choice&&<button type="button" className="topic-filter-clear" onClick={()=>{onChange('');setOpen(false);}}>Alle onderwerpen tonen</button>}
  </PopoverContent>
 </Popover>;
}

/** Tegels binnen de categorie: een klik opent de lijst met dat onderwerp als filter. Zelfde tegelvorm als de bronnen. */
export function TopicTiles({onChoose}:{onChoose:(value:string)=>void}){
 return <section className="topic-tiles" aria-labelledby="topic-tiles-title">
  <h4 id="topic-tiles-title">Kies per onderwerp</h4>
  <div className="topic-tiles-grid">{doraTopics.map((topic,index)=>{const counts=doraChoiceCounts(topic.id);
   return <button type="button" key={topic.id} onClick={()=>onChoose(topic.id)}>
    <span className="catalogue-card-id">Onderwerp {index+1}</span><strong>{topic.title}</strong>
    <span className="catalogue-card-stats"><span><strong>{counts.normen}</strong> normen</span><span><strong>{counts.bronnen}</strong> {counts.bronnen===1?'bron':'bronnen'}</span></span>
   </button>;})}</div>
 </section>;
}
