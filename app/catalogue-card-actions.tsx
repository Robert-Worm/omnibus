"use client";
import {useId,useEffect,useRef} from 'react';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';

export default function CatalogueCardActions({title,opened,onOpen,onPrepare,onToggle,disabled=false,selection,openId,layout='toggles'}:{
 title:string;opened:boolean;onOpen:()=>void;onToggle:(value:boolean)=>void;disabled?:boolean;
 openId?:string;
 onPrepare?:()=>void;
 layout?:'toggles'|'buttons';
 selection?:{label:string;ariaLabel?:string;checked:boolean;partial:boolean;disabled?:boolean;onChange:(value:boolean)=>void};
}) {
 const id=useId();
 const intent=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const cancel=()=>{clearTimeout(intent.current);};
 const prepare=()=>{cancel();if(onPrepare&&!disabled)intent.current=setTimeout(onPrepare,120);};
 useEffect(()=>()=>clearTimeout(intent.current),[]);
 return <div className="catalogue-card-actions directory-child-actions" data-layout={layout}>
   <Button id={openId} variant="outline" disabled={disabled} aria-label={'Open in viewer: '+title} onPointerEnter={prepare} onPointerLeave={cancel} onFocus={prepare} onBlur={cancel} onClick={()=>{cancel();onOpen();}}>Open in viewer <ArrowRight size={14} aria-hidden="true"/></Button>
   {layout==='buttons' ? selection&&<Button variant="outline" disabled={disabled||selection.disabled}
     aria-pressed={selection.partial?'mixed':selection.checked}
     aria-label={(selection.checked?'Deselecteer ':'Selecteer ')+selection.label.toLowerCase()+': '+title}
     onClick={()=>selection.onChange(!selection.checked)}>
     {selection.checked?'Deselecteer ':'Selecteer '}{selection.label.toLowerCase()}
   </Button> : <div className="catalogue-card-toggles">
     <label className="directory-check" htmlFor={id+'-open'}><Checkbox id={id+'-open'} aria-label={'Open houden: '+title} checked={opened} disabled={disabled} onCheckedChange={value=>onToggle(Boolean(value))}/>Open houden</label>
     {selection&&<label className="directory-check" htmlFor={id+'-select'}><Checkbox id={id+'-select'} aria-label={selection.ariaLabel||selection.label+': '+title} checked={selection.checked} indeterminate={selection.partial} disabled={disabled||selection.disabled} onCheckedChange={value=>selection.onChange(Boolean(value))}/>{selection.label}</label>}
   </div>}
 </div>;
}
