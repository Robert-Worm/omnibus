'use client';
import {useState} from 'react';
import {findTerm,termSegments} from '@/lib/terminology.mjs';
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
