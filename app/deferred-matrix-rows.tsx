import {useEffect,useRef,useState,type ReactNode} from 'react';
import {TableBody,TableRow,TableCell} from '@/components/ui/table';
import {Button} from '@/components/ui/button';

/** Keep one table and its complete selection scope; mount off-screen controls on approach. */
export default function DeferredMatrixRows({children,immediate,count,columns}:{children:ReactNode;immediate:boolean;count:number;columns:number}){
 const [opened,setOpened]=useState(immediate);
 const placeholder=useRef<HTMLTableSectionElement>(null);
 const visible=opened||immediate||typeof IntersectionObserver==='undefined';
 useEffect(()=>{
  if(visible)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setOpened(true);observer.disconnect();}
  },{rootMargin:'500px 0px'});
  if(placeholder.current)observer.observe(placeholder.current);
  return ()=>observer.disconnect();
 },[visible]);
 return visible?<TableBody>{children}</TableBody>:<TableBody ref={placeholder}>
  <TableRow><TableCell colSpan={columns} style={{height:count*160}}>
   <Button variant="ghost" onClick={()=>setOpened(true)}>{count} {count===1?'norm':'normen'} tonen</Button>
  </TableCell></TableRow>
 </TableBody>;
}
