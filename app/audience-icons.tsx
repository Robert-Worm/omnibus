'use client';
// Doelgroepen als symbolen: één vast symbool per doelgroep, met de uitleg bij aanwijzen of focus.
import {Building2,ClipboardCheck,Eye,Landmark,Server,Zap} from 'lucide-react';
import {audienceGroups} from '@/lib/source-scope.mjs';

const icons={rijk:Landmark,financieel:Building2,ict:Server,kritiek:Zap,toezicht:Eye,audit:ClipboardCheck};
export function AudienceIcons({groups,text}:{groups:(keyof typeof audienceGroups)[];text:string}){
 return <span className="audience-icons">{groups.map((group,index)=>{const Icon=icons[group],info=audienceGroups[group];
  return <button type="button" key={group} className="audience-icon" data-audience={group} aria-label={info.label+(index===0&&text?': '+text:'')}>
   <Icon size={15} aria-hidden="true"/>
   <span className="audience-tip" aria-hidden="true"><strong>{info.label}</strong>{info.description}{text&&<em>Deze bron: {text}</em>}</span>
  </button>;})}</span>;
}

/** Rij symbolen met een vaste betekenis; de uitleg verschijnt bij aanwijzen of focus.
 * Een gevuld symbool is een primair proces, een open symbool een ondersteunend proces. Een grijs symbool betekent: niet van toepassing. */
export function SymbolRow({items,text}:{items:{id:string;Icon:typeof Landmark;label:string;lines:string[];active:boolean;solid?:boolean;count?:number}[];/** Korte tekst naast de symbolen, als er ruimte voor is. */text?:string}){
 return <span className="audience-icons">{items.map(item=><button type="button" key={item.id} className="audience-icon" data-symbol={item.id} data-off={!item.active||undefined} data-solid={item.solid||undefined}
   aria-label={item.label+': '+item.lines.join(' ')}>
   <item.Icon size={15} aria-hidden="true"/>{item.active&&item.count?<b aria-hidden="true">{item.count}</b>:null}
   <span className="audience-tip" aria-hidden="true"><strong>{item.label}</strong>{item.lines.map(line=><span key={line}>{line}</span>)}</span>
  </button>)}{text&&<span className="audience-icons-text">{text}</span>}</span>;
}
