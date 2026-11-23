// Knop "Kopieer link" bij een toetspunt (besluit beheerder 23 november 2026, B-102).
// De link opent dit toetspunt in Omnibus op Bronpassage, zodat je één passage kunt delen of bespreken zonder export.
import {useEffect,useState} from 'react';
import {Check,Link2} from 'lucide-react';
import {pointLink} from '@/lib/point-link.mjs';

// Zonder toestemming of buiten https lukt kopiëren niet; dan staat de link in een veld om zelf te kopiëren.
async function copyText(text:string){
 try{await navigator.clipboard.writeText(text);return true;}catch{return false;}
}

export default function CopyPointLink({sourceId,pointId,fingerprint,title,inline=false}:{sourceId:string;pointId:string;fingerprint?:string;title:string;inline?:boolean}){
 const [state,setState]=useState<''|'done'|'failed'>('');
 const link=pointLink(sourceId,pointId,fingerprint||'');
 useEffect(()=>{if(!state)return;const timer=setTimeout(()=>setState(''),state==='done'?2500:8000);return ()=>clearTimeout(timer);},[state]);
 if(!link)return null;
 return <span className={'point-link-copy'+(inline?' is-inline':'')}>
  <button type="button" className="point-link-button" aria-label={`Kopieer link naar de bronpassage van ${title}`} title="Kopieer een vaste link naar dit toetspunt en zijn bronpassage" onClick={async()=>setState(await copyText(link)?'done':'failed')}>
   {state==='done'?<Check size={14} aria-hidden="true"/>:<Link2 size={14} aria-hidden="true"/>}{state==='done'?'Link gekopieerd':'Kopieer link'}</button>
  {state==='failed'&&<input className="point-link-fallback" readOnly value={link} aria-label="Link naar dit toetspunt; kopieer zelf" onFocus={e=>e.currentTarget.select()}/>}
  <span className="sr-only" aria-live="polite">{state==='done'?'Link gekopieerd':state==='failed'?'Kopiëren is niet gelukt; de link staat in het veld.':''}</span>
 </span>;
}
