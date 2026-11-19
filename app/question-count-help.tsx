'use client';
import {useState} from 'react';
import {Info} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';

export default function QuestionCountHelp() {
  const [open,setOpen]=useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger className="term-help-trigger question-count-help" openOnHover delay={350} closeDelay={150}
      aria-label="Aantal bouwstenen: uitleg" title="">
      <Info size={13} aria-hidden="true"/>
    </PopoverTrigger>
    <PopoverContent className="term-help-popup" side="bottom" align="end" initialFocus={false}>
      <PopoverTitle>Zo tellen we</PopoverTitle>
      <PopoverDescription>Alle bouwstenen van deze vraag en haar deelvragen. Een bouwsteen bij meerdere vragen telt één keer. Rechtstreeks: gekoppeld aan de centrale vraag zelf.</PopoverDescription>
      <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
    </PopoverContent>
  </Popover>;
}
