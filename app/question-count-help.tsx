'use client';
import {useState} from 'react';
import {Info} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';

export default function QuestionCountHelp() {
  const [open,setOpen]=useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger className="term-help-trigger question-count-help" openOnHover delay={350} closeDelay={150}
      aria-label="Totaal: uitleg over overlap" title="">
      <Info size={13} aria-hidden="true"/>
    </PopoverTrigger>
    <PopoverContent className="term-help-popup" side="bottom" align="end" initialFocus={false}>
      <PopoverTitle>Unieke bouwstenen</PopoverTitle>
      <PopoverDescription>Het totaal omvat deze vraag en de deelvragen. Toetspunten en modelvragen die aan meerdere vragen zijn gekoppeld, tellen maar één keer mee.</PopoverDescription>
      <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
    </PopoverContent>
  </Popover>;
}
