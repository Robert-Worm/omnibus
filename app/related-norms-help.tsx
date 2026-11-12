'use client';
import {useState} from 'react';
import {Link2} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle} from '@/components/ui/popover';

export type Verwant={id:string;label:string;grondslag:string;norm?:string;groep?:string};
/** Verwante normen in andere kaders achter een knopje bij de norm (besluit beheerder 9 november 2026: minder ruimte). */
export default function RelatedNormsHelp({links,onOpen}:{links?:Verwant[];onOpen?:(link:Verwant)=>void}){
 const [open,setOpen]=useState(false);
 if(!links?.length)return null;
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger className="related-norms-trigger" openOnHover delay={250} closeDelay={200} aria-label={`Verwijzingen naar andere kaders bekijken (${links.length})`}>
   <Link2 size={14} aria-hidden="true"/><span>Verwant</span><span className="related-norms-count">{links.length}</span>
  </PopoverTrigger>
  <PopoverContent className="relevance-help-popup related-norms-popup" side="bottom" align="end" initialFocus={false}>
   <PopoverTitle>Verwant in andere kaders</PopoverTitle>
   <p className="related-norms-intro">Klik op een verwijzing om daar te kijken; de norm of groep licht kort op. Onder elke verwijzing staat waarom ze erbij hoort.</p>
   <ul>{links.map(l=><li key={l.id+l.label+l.grondslag}>
    {onOpen?<button type="button" className="related-norms-link" onClick={()=>{setOpen(false);onOpen(l);}}>{l.label}</button>:<strong>{l.label}</strong>}
    <small>{l.grondslag}</small></li>)}</ul>
   <button type="button" className="term-help-close" onClick={()=>setOpen(false)}>Sluiten</button>
  </PopoverContent>
 </Popover>;
}
