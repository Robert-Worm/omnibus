"use client";
import {useEffect, useSyncExternalStore, type ReactNode} from 'react';
import {Moon, Sun, Share2, Download, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose} from '@/components/ui/dialog';

function subscribeAppearance(notify:()=>void) {
  window.addEventListener('omnibus-appearance',notify);
  return ()=>window.removeEventListener('omnibus-appearance',notify);
}
export function AppearanceToggle() {
  const dark = useSyncExternalStore(subscribeAppearance,()=>document.documentElement.dataset.appearance === 'dark',()=>false);
  useEffect(()=>{
    // The offline entry sets this before rendering. Also support the hosted shell.
    if (document.documentElement.dataset.appearance) return;
    let next = matchMedia('(prefers-color-scheme: dark)').matches;
    try {const saved=localStorage.getItem('omnibus-appearance'); if (saved==='dark'||saved==='light') next=saved==='dark';} catch { /* Use the system preference. */ }
    document.documentElement.dataset.appearance = next ? 'dark' : 'light';
    window.dispatchEvent(new Event('omnibus-appearance'));
  },[]);
  const label = dark ? 'Lichte weergave' : 'Donkere weergave';
  return <Button variant="outline" className="appearance-toggle" aria-label={label} title={label} onClick={()=>{
    const next = !dark;
    document.documentElement.dataset.appearance = next ? 'dark' : 'light';
    window.dispatchEvent(new Event('omnibus-appearance'));
    try {localStorage.setItem('omnibus-appearance',next ? 'dark' : 'light');} catch { /* Appearance also works without browser storage. */ }
  }}>{dark ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}</Button>;
}

export function ProjectUtilityContent({title,description,icon,children,footer,closeLabel='Sluiten',className=''}:{
  title:string; description:string; icon:ReactNode; children:ReactNode; footer:ReactNode; closeLabel?:string; className?:string;
}) {
  return <DialogContent className={'project-utility-dialog '+className} showCloseButton={false}>
    <DialogHeader className="project-utility-header">
      <span className="project-utility-icon" aria-hidden="true">{icon}</span>
      <div><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></div>
    </DialogHeader>
    <DialogClose render={<Button variant="ghost" className="project-utility-close" size="icon-sm" aria-label={closeLabel}/> }><X size={18} aria-hidden="true"/></DialogClose>
    <div className="project-utility-body">{children}</div>
    <div className="project-utility-footer">{footer}</div>
  </DialogContent>;
}

export function ShareProject({disabled,onDownload,error=''}:{disabled:boolean,onDownload:()=>void,error?:string}) {
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" disabled={disabled} />}><Share2 size={16} aria-hidden="true"/>Delen</DialogTrigger>
    <ProjectUtilityContent title="Je onderzoek delen" description="Geef iemand een kopie van je project om zelf mee verder te werken."
      icon={<Share2 size={20}/>} className="share-project-dialog" closeLabel="Delen sluiten"
      footer={<><DialogClose render={<Button variant="ghost"/>}>Sluiten</DialogClose><Button disabled={disabled} onClick={onDownload}><Download size={16} aria-hidden="true"/>Download projectbestand</Button></>}>
      {error && <p role="alert">{error}</p>}
      <p>Download het projectbestand en stuur het via een kanaal dat voor je onderzoeksgegevens is toegestaan. De ontvanger kiest <strong>Open project</strong>.</p>
      <p className="project-utility-hint">Ook teamgegevens en notities gaan mee; controleer ze vóór het delen.</p>
      <details className="share-link-explanation"><summary>Over het projectbestand en deellinks</summary>
        <p>De app en de oorspronkelijke brondocumenten zitten niet in het projectbestand. De ontvanger heeft die apart nodig. Jullie werken in afzonderlijke kopieën.</p>
        <p>Je project staat in deze browser, niet op een gedeelde projectserver. Een link naar Omnibus deelt je selecties en bewerkingen daarom niet. Er wordt niets geüpload bij het downloaden.</p>
      </details>
    </ProjectUtilityContent>
  </Dialog>;
}
