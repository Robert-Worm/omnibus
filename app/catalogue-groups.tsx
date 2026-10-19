'use client';
import {countLabel} from '@/lib/display-count.mjs';
import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Brain,ShieldCheck,Users,RefreshCw,HandHeart,Database,Monitor,Landmark,Package,Leaf} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {catalogueDescription,searchCatalogueGroups} from '@/lib/catalogue-directory.mjs';
type Group={id:string;title:string;count:number;description?:string};
const icons:Record<string,typeof BookOpen>={gedrag:Users,verandering:RefreshCw,dienstverlening:HandHeart,risico:ShieldCheck,privacy:ShieldCheck,cyber:ShieldCheck,it:Monitor,governance:Landmark,information:Database,audit:BookOpen,procurement:Package,energy:Leaf};
export function CatalogueFamily({title,groupId,noun,children}:{title:string;groupId:string;noun:string;children:ReactNode}){
 const Icon=icons[groupId]||(noun==='modellen'?Brain:BookOpen);
 const description=catalogueDescription(noun,groupId);
 return <section className="directory-family catalogue-family"><header className="directory-family-heading"><h3><span className="directory-family-title"><Icon size={20} aria-hidden="true"/>{title}</span></h3>{description&&<p>{description}</p>}</header><div className="directory-children">{children}</div></section>;
}
// Navigation only: selecting a category must never select criteria or model questions.
export default function CatalogueGroups({groups,value,onChange,noun,searching=false,compact=false,query='',hideTitle=false}:{groups:Group[];value:string;onChange:(id:string)=>void;noun:string;searching?:boolean;compact?:boolean;query?:string;hideTitle?:boolean}){
 const root=useRef<HTMLDivElement>(null),focus=useRef('');
 const cards:Group[]=compact&&searching?searchCatalogueGroups(groups,noun,query):!value&&!searching?groups:[];
 const change=(next:string)=>{focus.current=next?'heading':value||'first';onChange(next);};
 useEffect(()=>{if(!focus.current)return;const target=focus.current;focus.current='';if(target==='heading')root.current?.querySelector<HTMLElement>('h2,button')?.focus();else {const cards=[...(root.current?.querySelectorAll<HTMLButtonElement>('[data-group]')||[])];(cards.find(el=>el.dataset.group===target)||cards[0])?.focus();}},[value,searching]);
 return <div className="catalogue-groups discovery-directory" data-compact={compact} ref={root}>
  {(!compact||value||searching)&&<div className="catalogue-group-heading">{!compact&&!hideTitle&&<h2 tabIndex={-1}>{searching?'Zoekresultaten':'Verken '+noun}</h2>}<div>
   {(value||searching)&&<Button variant="ghost" onClick={()=>change('')}><ArrowLeft size={15} aria-hidden="true"/>Alle categorieën</Button>}
   {!compact&&value!=='all'&&<Button variant="outline" onClick={()=>change('all')}>Toon alle {noun}</Button>}
  </div></div>}
  {cards.length>0&&<div className="directory-family-cards">{cards.filter(g=>g.count>0).map(group=>{const Icon=icons[group.id]||(noun==='modellen'?Brain:BookOpen),description=group.description||catalogueDescription(noun,group.id);return <button key={group.id} type="button" data-group={group.id} className="directory-family-card" onClick={()=>change(group.id)}><Icon size={24} aria-hidden="true"/><strong>{group.title}</strong>{description&&<span>{description}</span>}<small>Verken {countLabel(group.count,noun)}<ArrowRight size={16} aria-hidden="true"/></small></button>;})}</div>}
 </div>;
}
