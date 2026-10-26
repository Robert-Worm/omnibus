'use client';
import {createContext,useContext} from 'react';
import {collectionAllows,collectionOrigin,type CollectionKind,type CollectionMode,type SourceCollections} from '@/lib/source-collections.mjs';
import type {Draft,Line} from '@/lib/framework-types';

export const CollectionContext=createContext<{collections:SourceCollections;mode:CollectionMode;reports:Record<string,string>}|null>(null);
export function useCollectionScope(){
  const context=useContext(CollectionContext);
  return (kind:CollectionKind,id:string)=>!context||collectionAllows(context.collections,context.mode,kind,id);
}
export function CollectionBadge({kind,id}:{kind:CollectionKind;id:string}){
  const context=useContext(CollectionContext);
  if(!context||!id)return null;
  const origin=collectionOrigin(context.collections,kind,id);
  return <small className="criterion-reference" data-collection={origin?.kind||'unknown'}>{origin?.kind==='own'?'Eigen collectie':origin?.kind==='public'?'Openbare collectie':'Herkomst niet beschikbaar'}</small>;
}
export function NormCollection({line,draft,sourceId}:{line:Line;draft:Draft;sourceId?:string}){
  const context=useContext(CollectionContext);
  if(!context)return null;
  const material=draft.investigation?.materials.find(m=>m.id===line.id);
  if(sourceId||material?.foundationId)return <CollectionBadge kind="foundation" id={sourceId||material!.foundationId}/>;
  if(material?.reportTrace){let reportId:string;try{reportId=JSON.parse(material.reportTrace).report_id;}catch{return null;}return <CollectionBadge kind="report" id={reportId}/>;}
  if(material?.originalLineId)return <CollectionBadge kind="report" id={context.reports[material.originalLineId]}/>;
  return line.report_id?<CollectionBadge kind="report" id={line.report_id}/>:null;
}
export default function CollectionChoice({mode,onChange,disabled,hasOwn}:{mode:CollectionMode;onChange:(mode:CollectionMode)=>void;disabled:boolean;hasOwn:boolean}){
  return <div className="foundation-selection-bar" aria-label="Collecties kiezen"><label>Collecties
    <select aria-label="Collecties" value={mode} disabled={disabled} onChange={e=>onChange(e.target.value as CollectionMode)}>
      <option value="public">Openbaar</option><option value="own">Eigen</option><option value="both">Openbaar en eigen</option>
    </select></label><span>Normcollecties in deze publicatie. Je bestaande onderzoek blijft behouden.{!hasOwn&&' Er is geen eigen collectie beschikbaar.'}</span></div>;
}
