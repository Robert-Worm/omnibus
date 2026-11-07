'use client';
import {useState} from 'react';
import {Info} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';

// Why and when a toetspunt applies (besluit 7 november 2026). Hover, click and keyboard open the same text.
export default function RelevanceHelp({text,title}:{text?:string;title?:string}){
 const [open,setOpen]=useState(false);
 if(!text?.trim())return null;
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger className="relevance-help-trigger" openOnHover delay={250} closeDelay={150}
   aria-label={`Relevantie${title?' van '+title:''} bekijken`}>
   <Info size={16} aria-hidden="true"/>
  </PopoverTrigger>
  <PopoverContent className="relevance-help-popup" side="bottom" align="end" initialFocus={false}>
   <PopoverTitle>Relevantie</PopoverTitle>
   <PopoverDescription>{text}</PopoverDescription>
   <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
  </PopoverContent>
 </Popover>;
}
