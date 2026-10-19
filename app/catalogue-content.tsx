"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {catalogueReady,ensureCatalogue} from '@/lib/catalogue-runtime.mjs';
import {Button} from '@/components/ui/button';

/** Mount a source viewer only after its immutable evidence indexes are ready. */
export default function CatalogueContent({resource,children}:{resource:string;children:()=>ReactNode}) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<{resource:string;error?:string}|null>(null);
  const ready=catalogueReady([resource]);
  useEffect(()=>{
    if(ready)return;
    let current=true;
    ensureCatalogue([resource]).then(()=>{if(current)setState({resource});},error=>{
      if(current)setState({resource,error:error instanceof Error?error.message:'Brongegevens konden niet worden geopend.'});
    });
    return ()=>{current=false;};
  },[resource,attempt,ready]);
  if(ready)return children();
  const error=state?.resource===resource?state.error:null;
  if(error)return <div className="report-source-status" role="alert"><p>{error}</p>
    <p>Je onderzoek en selecties zijn behouden.</p>
    <Button variant="outline" onClick={()=>{setState(null);setAttempt(n=>n+1);}}>Opnieuw proberen</Button>
  </div>;
  return <output className="report-source-status" data-status-block="" aria-live="polite">Brongegevens ophalen…</output>;
}
