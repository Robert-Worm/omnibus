import {useEffect,useRef,useState} from 'react';
import {observeViewerApproach} from '@/lib/viewer-rendering.mjs';

/** Once mounted, keep controls alive so edits, focus and expanded panels survive. */
export function useViewerVisibility<T extends HTMLElement>(immediate=false){
 const [opened,setOpened]=useState(immediate);
 if(immediate&&!opened)setOpened(true);
 const placeholder=useRef<T>(null);
 const visible=opened||immediate||typeof IntersectionObserver==='undefined';
 useEffect(()=>{
  if(visible||!placeholder.current)return;
  return observeViewerApproach(placeholder.current,()=>setOpened(true));
 },[visible]);
 return {visible,placeholder,reveal:()=>setOpened(true)};
}
