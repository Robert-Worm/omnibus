"use client";
import {useId,useLayoutEffect,useRef,useState} from 'react';
import './viewer-readability.css';

/** Collapses presentation only: the exact full text remains in the same panel. */
export default function CompactContextText(props:{text:string;label:string;initialExpanded?:boolean}){
 return <ContextText key={props.text} {...props}/>;
}
function ContextText({text,label,initialExpanded=false}:{text:string;label:string;initialExpanded?:boolean}){
 const id=useId(),paragraph=useRef<HTMLParagraphElement>(null);
 const [expanded,setExpanded]=useState(initialExpanded),[long,setLong]=useState(false);
 useLayoutEffect(()=>{
  const node=paragraph.current;if(!node)return;
  const measure=()=>setLong(node.scrollHeight>parseFloat(getComputedStyle(node).lineHeight)*4+2);
  measure();const observer=new ResizeObserver(measure);observer.observe(node);
  return ()=>observer.disconnect();
 },[text]);
 return <div className="compact-context-text" data-expanded={expanded}>
  <p id={id} ref={paragraph}>{text}</p>
  {long&&<button type="button" className="context-read-more" aria-expanded={expanded} aria-controls={id} aria-label={`${expanded?'Toon minder':'Lees verder'}: ${label}`} onClick={()=>setExpanded(value=>!value)}>{expanded?'Toon minder':'Lees verder'}</button>}
 </div>;
}
