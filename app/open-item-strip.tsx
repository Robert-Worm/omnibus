"use client";
import {useCallback,useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {X,FolderOpen,Info} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';
type Item={id:string;title:string};
export function OpenWorkspaceEmpty({prompt}:{prompt:string}){
 return <p className="empty-framework">{prompt} Je eerdere selecties blijven bewaard bij Bouw je kader.</p>;
}
export default function OpenItemStrip({id,items,activeId,onActivate,onClose,onExplore,exploreLabel,disabled=false,onAll,allActive=false}:{id:string;items:Item[];activeId:string|null;onActivate:(id:string)=>void;onClose:(id:string)=>void;onExplore:()=>void;exploreLabel:string;disabled?:boolean;onAll?:()=>void;allActive?:boolean}){
 const strip=useRef<HTMLDivElement>(null);
 const key=useCallback((value:string)=>id+'-item-'+value,[id]);
 useEffect(()=>{const container=strip.current,active=document.getElementById(key(activeId||''));if(!container||!active)return;const a=active.getBoundingClientRect(),c=container.getBoundingClientRect();if(a.left<c.left)container.scrollLeft-=c.left-a.left;else if(a.right>c.right)container.scrollLeft+=a.right-c.right;},[activeId,key]);
 const close=(itemId:string)=>{const index=items.findIndex(i=>i.id===itemId),next=items[index+1]||items[index-1];onClose(itemId);if(itemId===activeId&&next)onActivate(next.id);if(typeof requestAnimationFrame!=='undefined')requestAnimationFrame(()=>document.getElementById(next?key(next.id):id+'-open')?.focus());};
 return <section className="open-item-workspace" aria-label="Geopend in deze werkruimte">
  <div className="open-item-heading"><span><FolderOpen size={16} aria-hidden="true"/>Geopend <strong>{items.length}</strong></span><Popover><PopoverTrigger className="open-item-help" aria-label="Uitleg over geopende onderdelen"><Info size={14} aria-hidden="true"/></PopoverTrigger><PopoverContent><PopoverTitle>Je geopende onderdelen</PopoverTitle><PopoverDescription>Wissel met de tabs tussen onderdelen. Met het kruisje sluit je alleen de tab: gekozen inhoud en bewerkingen blijven behouden.</PopoverDescription></PopoverContent></Popover></div>
  <div ref={strip} className="open-item-strip" aria-label="Wissel tussen geopende onderdelen">
   {onAll&&items.length>1&&<Button className="open-item-all" variant="ghost" aria-pressed={allActive} onClick={onAll}>Alles samen bekijken</Button>}
   {items.map(item=><div className={'open-item-chip'+(!allActive&&activeId===item.id?' is-active':'')} key={item.id}>
    <Button id={key(item.id)} variant="ghost" title={item.title} aria-pressed={!allActive&&activeId===item.id} onClick={()=>onActivate(item.id)}><span>{item.title}</span></Button>
    <Button variant="ghost" aria-label={'Sluit '+item.title} title="Sluiten bewaart je selectie en bewerkingen" disabled={disabled} onClick={()=>close(item.id)}><X size={14} aria-hidden="true"/></Button>
   </div>)}
  </div><Button className="open-item-explore" id={id+'-open'} variant="outline" onClick={onExplore}>{exploreLabel}</Button>
 </section>;
}
