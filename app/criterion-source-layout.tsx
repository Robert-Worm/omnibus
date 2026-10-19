"use client";
import {useId,useLayoutEffect,useRef,useSyncExternalStore,type ReactNode} from 'react';

const query='(max-width: 1023px)';
function subscribe(notify:()=>void) {
  const media=window.matchMedia(query);
  media.addEventListener('change',notify);
  return ()=>media.removeEventListener('change',notify);
}

/** Both panels stay mounted: switching the narrow-screen tab preserves page and scroll. */
export default function CriterionSourceLayout({criterion,source,active,onActive}:{criterion:ReactNode;source:ReactNode;active:'criterion'|'source';onActive:(tab:'criterion'|'source')=>void}) {
  const narrow=useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>false);
  const id=useId();
  const tabs=useRef<(HTMLButtonElement|null)[]>([]);
  const layout=useRef<HTMLDivElement>(null);
  const lastFocus=useRef<HTMLElement|null>(null);
  useLayoutEffect(()=>{
    const current=document.activeElement;
    const previous=lastFocus.current;
    const hidden=layout.current?.querySelector<HTMLElement>('.criterion-source-panels > [hidden]');
    // Responsive changes and source links can hide the control that had focus.
    // Keep the reading position in the layout instead of falling back to the dialog.
    if(hidden?.contains(current)||(current===document.body&&previous&&hidden?.contains(previous))) {
      tabs.current[active==='criterion'?0:1]?.focus();
    } else if(!narrow&&current===document.body&&previous?.getAttribute('role')==='tab'&&!previous.isConnected) {
      layout.current?.querySelector<HTMLElement>(`#${CSS.escape(id+'-'+active)}`)?.focus();
    }
  },[active,narrow,id]);
  return <div className="criterion-source-layout" ref={layout}
    onFocusCapture={event=>{lastFocus.current=event.target;}}
    onBlurCapture={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))lastFocus.current=null;}}>
    {narrow && <div className="criterion-source-tabs" role="tablist" aria-label="Norm en bron vergelijken">
      {(['criterion','source'] as const).map((key,i)=><button key={key} type="button" role="tab" id={`${id}-${key}-tab`} aria-controls={`${id}-${key}`} aria-selected={active===key} tabIndex={active===key?0:-1} ref={node=>{tabs.current[i]=node;}}
        onClick={()=>onActive(key)} onKeyDown={e=>{
          if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
          e.preventDefault(); const next=e.key==='Home'?0:e.key==='End'?1:1-i;
          onActive(next===0?'criterion':'source');tabs.current[next]?.focus();
        }}>{i===0?'Norm':'Bronpassage'}</button>)}
    </div>}
    <div className="criterion-source-panels">
      <section id={`${id}-criterion`} className="comparison-criterion" role={narrow?'tabpanel':'region'} aria-label={narrow?undefined:'Norm'} aria-labelledby={narrow?`${id}-criterion-tab`:undefined} hidden={narrow&&active!=='criterion'} tabIndex={0}>
        {criterion}
      </section>
      <section id={`${id}-source`} className="comparison-source" role={narrow?'tabpanel':'region'} aria-label={narrow?undefined:'Gemarkeerde bron en context'} aria-labelledby={narrow?`${id}-source-tab`:undefined} hidden={narrow&&active!=='source'} tabIndex={0}>
        {source}
      </section>
    </div>
  </div>;
}
