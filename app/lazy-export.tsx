"use client";
import {useEffect,useState} from 'react';
import type ExportEntryContent from './export-entry-content';
import type {Props} from './export-entry-content';
import {loadExport} from './export-loader.mjs';
import {Button} from '@/components/ui/button';

export default function LazyExport(props:Props){
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<{Component?:typeof ExportEntryContent;error?:string}>({});
  useEffect(()=>{
    let current=true;
    loadExport().then(module=>{if(current)setState({Component:module.default});},()=>{
      if(current)setState({error:'Het exportscherm kon niet worden geladen. Je onderzoek en selecties zijn behouden.'});
    });
    return ()=>{current=false;};
  },[attempt]);
  if(state.Component)return <state.Component {...props}/>;
  if(state.error)return <div role="alert" className="report-source-status"><p>{state.error}</p>
    <Button variant="outline" onClick={()=>{setState({});setAttempt(n=>n+1);}}>Opnieuw proberen</Button></div>;
  return <output data-status-block="" aria-live="polite" className="report-source-status">Exportscherm laden…</output>;
}
