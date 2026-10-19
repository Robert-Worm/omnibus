"use client";
import type {ComponentProps,ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import CriterionSourceLayout from './criterion-source-layout';
import ReportLibrary from './lazy-report-library';
import './cio-point-source.css';

type ReaderProps=ComponentProps<typeof ReportLibrary>;
export type LawPassage={page:number;start:number;end:number;quote:string;label:string};
export type LawReaderDocument=NonNullable<ReaderProps['document']>&ReaderProps['source'];

/** The CIO layout is the shared default for every law/framework source tab. */
export function LawPointSourceLayout({label,summary,publication,criterion,source,active,onActive,status}:{label:string;summary:ReactNode;publication:ReactNode;criterion:ReactNode;source:ReactNode;active:'criterion'|'source';onActive:(tab:'criterion'|'source')=>void;status?:ReactNode}){
 return <section className="cio-point-source law-point-source" aria-label={label}>
  {summary}<div className="cio-source-toolbar"><span>Brononderbouwing</span>{publication}</div>
  <CriterionSourceLayout criterion={criterion} source={source} active={active} onActive={onActive}/>
  {status&&<footer className="cio-source-status">{status}</footer>}
 </section>;
}

/** Receives only verified, document-global character offsets from a source adapter. */
export function LawSourceDocument({recordId,title,locator,sourceKind,document,passages,page,target,focusRequest,onFocus,onPage,onReturn,notice,fallback}:{recordId:string;title:string;locator:string;sourceKind:string;document:LawReaderDocument|null;passages:LawPassage[];page:number;target?:number;focusRequest:number;onFocus:(passage:LawPassage)=>void;onPage:(page:number)=>void;onReturn:()=>void;notice?:ReactNode;fallback?:ReactNode}){
 return <div className="cio-source-document">
  <header className="cio-source-record-heading"><h3 title={title}>{locator}</h3><span>{sourceKind}</span>
   <nav aria-label="Gemarkeerde passages in deze bepaling">{passages.map((p,i)=><Button key={`${p.start}-${i}`} variant="outline" aria-pressed={page===p.page&&target===p.start} onClick={()=>onFocus(p)}>p. {p.page}{passages.length>1?` · passage ${i+1}`:''}</Button>)}</nav>
  </header>
  {notice}
  {document?<ReportLibrary key={recordId} compactSource document={document} source={document} reportThemes={[]} page={page} onPage={onPage} sourcePassages={passages} sourceTarget={target} sourceFocusRequest={focusRequest} onTopic={()=>{}} onClearEvidence={()=>{}} onReturn={onReturn}/>:fallback||<p role="alert">Deze bronversie is niet lokaal beschikbaar.</p>}
 </div>;
}
