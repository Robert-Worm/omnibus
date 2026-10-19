'use client';
import {useRef,useState} from 'react';
import {BookOpen,X} from 'lucide-react';
import {groupedTerms} from '@/lib/terminology.mjs';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogClose} from '@/components/ui/dialog';

export default function Glossary() {
  const [query,setQuery]=useState('');
  const heading=useRef<HTMLHeadingElement>(null);
  const groups=groupedTerms(query);
  const count=groups.reduce((total,group)=>total+group.entries.length,0);
  return <Dialog>
    <DialogTrigger render={<button type="button" className="footer-glossary-trigger" aria-label="Begrippen" />}><BookOpen size={18} aria-hidden="true"/>Begrippen</DialogTrigger>
    <DialogContent className="glossary-dialog" showCloseButton={false} initialFocus={heading}>
      <DialogHeader>
        <DialogTitle ref={heading} tabIndex={-1}>Begrippen</DialogTitle>
        <DialogDescription>Uitleg bij de onderzoeksroutes, bronnen, toetspunten en modelvragen in Omnibus. Zoek een begrip of bekijk de groepen hieronder. Modelspecifieke begrippen vind je via het boek-icoon in de modelviewer.</DialogDescription>
      </DialogHeader>
      <DialogClose render={<Button className="glossary-close" variant="ghost" size="icon" aria-label="Begrippen sluiten"/>}><X size={18} aria-hidden="true"/></DialogClose>
      <label htmlFor="glossary-search">Zoek een begrip<Input id="glossary-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Bijvoorbeeld: normen, scope of werking" /></label>
      <div className="glossary-search-status"><output aria-live="polite">{count} {count===1?'begrip':'begrippen'}</output>{query && <Button variant="ghost" onClick={()=>setQuery('')}>Zoekopdracht wissen</Button>}</div>
      {!count && <p>Geen begrippen gevonden. Probeer een kortere zoekterm of wis je zoekopdracht.</p>}
      <div className="glossary-groups">{groups.map(group=><section className="glossary-group" key={group.id} aria-labelledby={`glossary-group-${group.id}`}>
        <h3 id={`glossary-group-${group.id}`}>{group.title}</h3>
        <dl className="glossary-list">{group.entries.map(entry=><div key={entry.id}><dt>{entry.term}</dt><dd>{entry.definition}</dd></div>)}</dl>
      </section>)}</div>
      <p>Dit zijn toelichtingen bij Omnibus, geen formele definities uit de bronnen.</p>
    </DialogContent>
  </Dialog>;
}
