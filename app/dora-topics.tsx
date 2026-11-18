'use client';
// Kies per onderwerp (B-068, B-069, B-070). Een familie kan een indeling in onderwerpen hebben; nu heeft alleen DORA die.
// Er is geen eigen scherm: het onderwerp is één filter in de gewone lijst en in de gewone viewer. Dit bestand levert dat
// filter (één knop met een keuzelijst in de vorm van de andere filters, met onderaan twee opties) en de tegels waarmee
// je vanuit de categorie in de gefilterde lijst komt.
import {useState} from 'react';
import {Popover} from '@base-ui/react/popover';
import {Check,ChevronDown} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import './dora-topics.css';
import {doraTopics,doraChoiceCounts,doraChoiceNormIds,decodeDoraChoice,encodeDoraChoice,doraChoiceLabel,doraTopicHasRelated,doraTopicHasSector,doraSourceTopicIds,doraSourceHasRegimes} from '@/lib/dora-onderwerpen.mjs';

type Choice={topic:string;sub:string;regime:'volledig'|'vereenvoudigd';related:boolean;sector:boolean};

/** Het filter Onderwerp. `sourceId`: in de viewer van één bron; dan staan alleen de onderwerpen van die bron in de lijst.
 * `showValue`: toon het gekozen onderwerp in de knop. In de lijst staat het al in de regel boven de rijen. */
export function TopicFilter({value,onChange,sourceId,showValue=true}:{value:string;onChange:(value:string)=>void;sourceId?:string;showValue?:boolean}){
 const [open,setOpen]=useState(false);
 const choice=decodeDoraChoice(value) as Choice|null,current=choice?doraChoiceLabel(value):'Alle';
 const regime=choice?.regime||'volledig',related=Boolean(choice?.related),sector=Boolean(choice?.sector);
 // Het kader en de verwante normen blijven staan als je van onderwerp wisselt.
 const set=(next:Partial<Choice>)=>onChange(encodeDoraChoice({topic:'',sub:'',regime,related,sector,...choice,...next}));
 const pick=(topic:string,sub='')=>{set({topic,sub});setOpen(false);};
 const topics=sourceId?doraTopics.filter(topic=>doraSourceTopicIds(sourceId).includes(topic.id)):doraTopics;
 const count=(topic:string,sub:string)=>{const at={topic,sub,regime,related:related&&!sub,sector};return sourceId?doraChoiceNormIds(sourceId,at).length:doraChoiceCounts(at).normen;};
 const row=(key:string,label:string,amount:number,chosen:boolean,indent:boolean,onClick:()=>void)=><button type="button" key={key} className="catalogue-tool-option topic-filter-option" data-sub={indent||undefined} data-selected={chosen||undefined} aria-pressed={chosen} onClick={onClick}>
  <span>{label}</span>{amount>=0&&<small title={amount===1?'1 norm':amount+' normen'}>{amount}</small>}{chosen&&<Check size={14} aria-hidden="true"/>}</button>;
 return <Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger render={<button type="button" className="catalogue-tool topic-filter-tool" data-active={choice?true:undefined} title={choice?current:undefined} aria-label={`Onderwerp: ${current}`}/>}>
   <span className="catalogue-tool-label">{showValue||!choice?'Onderwerp:':'Onderwerp'}</span>{(showValue||!choice)&&<span className="catalogue-tool-value">{current}</span>}<ChevronDown size={15} aria-hidden="true"/>
  </Popover.Trigger>
  <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={4} collisionAvoidance={{side:'none',align:'shift'}} className="isolate z-50">
   <Popover.Popup className="catalogue-tool-menu topic-filter" aria-label="Onderwerp" onKeyDown={event=>{if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
     // Pijltjes lopen door de regels, net als in de andere filters.
     const items=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')],at=items.indexOf(document.activeElement as HTMLElement);
     event.preventDefault();items[(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}>
    <div className="topic-filter-list"><p className="topic-filter-unit" aria-hidden="true">normen</p>
     {row('alle','Alle onderwerpen',-1,!choice,false,()=>{onChange('');setOpen(false);})}
     {topics.filter(topic=>count(topic.id,'')>0||choice?.topic===topic.id).flatMap(topic=>[row(topic.id,topic.title,count(topic.id,''),choice?.topic===topic.id&&!choice.sub,false,()=>pick(topic.id)),
      ...(topic.subs||[]).filter(sub=>count(topic.id,sub.id)>0).map(sub=>row(topic.id+sub.id,sub.title,count(topic.id,sub.id),choice?.topic===topic.id&&choice.sub===sub.id,true,()=>pick(topic.id,sub.id)))])}
    </div>
    <div className="topic-filter-options">
     {(!sourceId||doraSourceHasRegimes(sourceId))&&<label className="catalogue-tool-option" htmlFor="topic-filter-regime" data-disabled={!choice||undefined}><Checkbox id="topic-filter-regime" checked={regime==='vereenvoudigd'} disabled={!choice} onCheckedChange={checked=>set({regime:checked===true?'vereenvoudigd':'volledig'})}/><span>Vereenvoudigd kader (artikel 16)</span></label>}
     <label className="catalogue-tool-option" htmlFor="topic-filter-related" data-disabled={!choice||Boolean(choice.sub)||!doraTopicHasRelated(choice.topic)||undefined}><Checkbox id="topic-filter-related" checked={related} disabled={!choice||Boolean(choice.sub)||!doraTopicHasRelated(choice.topic)} onCheckedChange={checked=>set({related:checked===true})}/><span>Ook verwante normen</span></label>
     {choice&&doraTopicHasSector(choice.topic,sourceId||'')&&<label className="catalogue-tool-option" htmlFor="topic-filter-sector" title="Normen voor één soort instelling, zoals een centrale tegenpartij, effectenbewaarinstelling of handelsplatform."><Checkbox id="topic-filter-sector" checked={sector} onCheckedChange={checked=>set({sector:checked===true})}/><span>Ook sectorspecifieke normen</span></label>}
    </div>
   </Popover.Popup>
  </Popover.Positioner></Popover.Portal>
 </Popover.Root>;
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
