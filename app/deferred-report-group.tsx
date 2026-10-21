import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';

/** Only defer presentation. Counts, filtering and selection retain the full group. */
export default function DeferredReportGroup({children,immediate=false,count}:{children:ReactNode;immediate?:boolean;count:number}){
 const [opened,setOpened]=useState(immediate);
 if(immediate&&!opened)setOpened(true);
 const placeholder=useRef<HTMLDivElement>(null);
 const visible=opened||immediate||typeof IntersectionObserver==='undefined';
 useEffect(()=>{
  if(visible)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setOpened(true);observer.disconnect();}
  },{rootMargin:'500px 0px'});
  if(placeholder.current)observer.observe(placeholder.current);
  return ()=>observer.disconnect();
 },[visible]);
 return visible?children:<div ref={placeholder} className="report-group-placeholder">
  <Button variant="ghost" onClick={()=>setOpened(true)}>{count} {count===1?'norm':'normen'} tonen</Button>
 </div>;
}
