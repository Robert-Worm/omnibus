'use client';
import {useState} from 'react';
import {findTerm,termSegments} from '@/lib/terminology.mjs';
import {afkortingDelen} from '@/lib/afkortingen.mjs';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';

export default function TermHelp({id,children}: {id:string;children?:string}) {
  const [open,setOpen]=useState(false);
  const term=findTerm(id);
  if(!term)return <>{children}</>;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger className="term-help-trigger" openOnHover delay={350} closeDelay={150}
      aria-label={`${children || term.term}: betekenis bekijken`}>
      {children || term.term}
    </PopoverTrigger>
    <PopoverContent className="term-help-popup" side="bottom" align="start" initialFocus={false}>
      <PopoverTitle>{term.term}</PopoverTitle>
      <PopoverDescription>{term.definition}</PopoverDescription>
      <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
    </PopoverContent>
  </Popover>;
}

// Call only for deliberately selected, static interface copy; never global DOM replacement.
export function TermText({text}: {text:string}) {
  return <>{termSegments(text).map((part,index)=>part.id ? <TermHelp key={index} id={part.id}>{part.text}</TermHelp> : part.text)}</>;
}

type Afkorting={afkorting:string;voluit:string;uitleg?:string};
function AfkortingHelp({text,afkorting}:{text:string;afkorting:Afkorting}){
  const [open,setOpen]=useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger className="term-help-trigger afkorting-trigger" openOnHover delay={350} closeDelay={150} aria-label={`${text}: ${afkorting.voluit}`}>{text}</PopoverTrigger>
    <PopoverContent className="term-help-popup" side="bottom" align="start" initialFocus={false}>
      <PopoverTitle>{text}</PopoverTitle>
      <PopoverDescription>{afkorting.voluit}{afkorting.uitleg?`. ${afkorting.uitleg}`:''}</PopoverDescription>
      <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
    </PopoverContent>
  </Popover>;
}

/** Afkortingen in brontekst: uitleg bij aanwijzen. Met `voluit` staat de eerste keer ook de uitgeschreven vorm erbij; nooit in normtekst. De tekst zelf wijzigt niet. */
export function AfkortingText({text,voluit=false}:{text:string;voluit?:boolean}){
  return <>{afkortingDelen(text).map((deel,index)=>deel.afkorting
    ? <span key={index}><AfkortingHelp text={deel.text} afkorting={deel.afkorting}/>{voluit&&deel.eerste&&!deel.koppel&&!deel.afkorting.bekend&&<span className="afkorting-voluit"> ({deel.afkorting.voluit})</span>}</span>
    : deel.text)}</>;
}
