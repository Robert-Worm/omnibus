"use client";
import {useState,useRef,type ReactNode} from 'react';
import CriterionSourceLayout from './criterion-source-layout';
import {LawSourceDocument} from './law-point-source';
import {BookOpen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose} from '@/components/ui/sheet';
import {documentsForFoundation, foundationReaderPages, foundationPassages, foundationPassageTarget, isSpreadsheetSource, foundationLocationLabel} from '@/lib/foundation-reader.mjs';
import ReportLibrary from './lazy-report-library';
import CatalogueContent from './catalogue-content';
import {catalogueReady} from '@/lib/catalogue-runtime.mjs';
import {externalFoundationReference} from '@/lib/foundation-reference-only.mjs';
import {sourceCellNotice} from '@/lib/source-cell-notices.mjs';
import {doraFrameworkContextNotice} from '@/lib/foundations/dorafc-context.mjs';

import type {FoundationReference} from '@/lib/foundation-reader.mjs';
export type {FoundationReference} from '@/lib/foundation-reader.mjs';

type Props={reference:FoundationReference;inline?:boolean;onReturn?:()=>void;focusRequest?:number;criterion?:ReactNode;lawDocument?:boolean};
export default function FoundationSourceReader(props:Props) {
  const resource='source:'+(props.reference.sourceId||props.reference.foundationId||props.reference.sourceControlId?.split(' · ')[0]);
  const [requested,setRequested]=useState(false);
  if(!props.inline&&!requested&&!catalogueReady([resource]))
    return <Button variant="outline" onClick={()=>setRequested(true)}><BookOpen size={16}/> Bekijk bronpassage</Button>;
  return <CatalogueContent resource={resource}>{()=> <FoundationSourceReaderContent {...props} initialOpen={requested}/>}</CatalogueContent>;
}
function FoundationSourceReaderContent({reference,inline=false,onReturn,focusRequest=0,criterion,initialOpen=false,lawDocument=false}:Props&{initialOpen?:boolean}) {
  const documents = documentsForFoundation(reference);
  const [open,setOpen] = useState(initialOpen);
  const headingRef=useRef<HTMLHeadingElement>(null);
  const [docId,setDocId] = useState('');
  const [page,setPage] = useState(()=>documents.length ? foundationPassageTarget(documents[0],reference)?.page || foundationReaderPages(documents[0],reference)[0] || 1 : 1);
  const [target,setTarget] = useState<number|undefined>(()=>documents.length ? foundationPassageTarget(documents[0],reference)?.start : undefined);
  const [sourceFocusRequest,setSourceFocusRequest] = useState(0);
  const [comparisonTab,setComparisonTab]=useState<'criterion'|'source'>('source');
  if (!documents.length) {
    const external=externalFoundationReference(reference);
    return external ? <div className="external-source-links">
      {inline && <p>Dit document wordt niet in de viewer opgenomen. Controleer de verwijzing in je eigen exemplaar of bij de uitgever.</p>}
      <Button variant="outline" render={<a href={external.url} target="_blank" rel="noopener noreferrer" aria-label="Bekijk bron bij uitgever ↗" title={`${external.reason} PDF p. ${external.pages.join(', ')} · ${external.section}`}/>}><BookOpen size={16}/> Bekijk bron bij uitgever ↗</Button>
      {external.additionalReferences?.map((extra:{url:string;title:string})=><Button key={extra.url} variant="outline" render={<a href={extra.url} target="_blank" rel="noopener noreferrer" aria-label={`Aanvulling: ${extra.title} ↗`} title={extra.title}/>}>Aanvulling: {extra.title} ↗</Button>)}
    </div> : inline ? <p>Geen lokaal brondocument beschikbaar voor deze bronversie. Gebruik de bronverwijzing bij de norm.</p> : null;
  }
  const document = documents.find(d=>d.id===docId) || documents[0];
  const spreadsheet=isSpreadsheetSource(document);
  const sourceNotice=spreadsheet&&document.role==='main'?sourceCellNotice(reference):'';
  const contextNotice=doraFrameworkContextNotice(document,reference);
  const targets = foundationReaderPages(document,reference);
  const passages = foundationPassages(document,reference);
  const links = passages.filter((p,index)=>passages.findIndex(q=>q.page===p.page && q.label===p.label)===index);
  const hasPassages = foundationPassages(documents[0],reference).length>0;
  const content = <div className="source-reader-content">
        {inline && <p className="edit-note">{reference.sourceControlId || document.sourceId}{reference.location ? ` · ${reference.location}` : ''}</p>}
        {sourceNotice&&<p className="source-cell-notice">{sourceNotice}</p>}
        {contextNotice&&<p className="source-cell-notice">{contextNotice}</p>}
        <div className="source-reader-controls">
          {documents.length>1 && <label>Document <select value={document.id} onChange={e=>{
            const next=documents.find(d=>d.id===e.target.value)!;
            const first=foundationPassageTarget(next,reference);setDocId(next.id);setPage(first?.page || foundationReaderPages(next,reference)[0] || 1);setTarget(first?.start);
          }}>{documents.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
          {!!targets.length && <nav aria-label={spreadsheet?'Bronfragmenten bij deze norm':'Bronpagina’s bij deze norm'}>{spreadsheet?'Bronfragmenten:':'Bronpagina’s:'} {targets.map(p=><Button key={p} variant="outline" aria-label={spreadsheet?`Open bronfragment ${foundationLocationLabel(document,p)}`:`Open bronpagina ${p}`} aria-current={page===p?'page':undefined} onClick={()=>setPage(p)}>{spreadsheet?foundationLocationLabel(document,p):p}</Button>)}</nav>}
        </div>
        {links.length>0 && <aside className="source-passage-links" aria-label="Onderbouwende bepalingen">
          <strong>{spreadsheet?'Gemarkeerde broncellen bij deze norm':'Gemarkeerde bepalingen bij deze norm'}</strong>
          <nav>{links.map(p=><Button key={`${p.start}:${p.label}`} variant="outline" onClick={()=>{setTarget(p.start);setPage(p.page);setSourceFocusRequest(n=>n+1);}}>{p.label}{!spreadsheet&&` · p. ${p.page}`}</Button>)}</nav>
        </aside>}
        {reference.sourceControlId && !passages.length && <p className="edit-note">{spreadsheet?'Voor deze bronversie is geen gecontroleerde celverwijzing beschikbaar.':'Voor dit document is alleen de paginaverwijzing vastgelegd; er is geen exacte passage gemarkeerd.'}</p>}
        {lawDocument&&!spreadsheet?<LawSourceDocument recordId={reference.sourceControlId||document.id} title={reference.title||document.title} locator={reference.location||document.title} sourceKind="Gekozen broneditie" document={document} passages={passages} page={page} target={target} focusRequest={sourceFocusRequest+focusRequest}
          onFocus={p=>{setPage(p.page);setTarget(p.start);setSourceFocusRequest(n=>n+1);}} onPage={p=>{setPage(p);setTarget(undefined);}} onReturn={()=>onReturn?.()}/>:<ReportLibrary key={document.id} document={document} source={document} reportThemes={[]}
          page={page} onPage={p=>{setTarget(undefined);setPage(p);}} sourcePassages={passages} sourceTarget={target} sourceFocusRequest={sourceFocusRequest+focusRequest}
          onTopic={()=>{}} onClearEvidence={()=>{}} onReturn={()=>{if(inline)onReturn?.();else setOpen(false);}}/>}
      </div>;
  if(inline) return content;
  return <Sheet modal={true} open={open} onOpenChange={value=>{
    if(value) {const first=foundationPassageTarget(documents[0],reference);setDocId(documents[0].id);setPage(first?.page || foundationReaderPages(documents[0],reference)[0] || 1);setTarget(first?.start);}
    setOpen(value);
  }}>
    <SheetTrigger render={<Button variant="outline" />}><BookOpen size={16}/> {spreadsheet?(hasPassages?'Bekijk gemarkeerde broncellen':'Lees bronfragmenten'):(hasPassages?'Bekijk gemarkeerde bronpassage':'Lees brondocument')}</SheetTrigger>
    <SheetContent className={`foundation-source-reader${criterion?' foundation-comparison':''}`} showCloseButton={false}
      aria-modal="true" initialFocus={headingRef} finalFocus={true}>
      <SheetHeader>
        <div className="source-reader-top"><SheetTitle ref={headingRef} tabIndex={-1}>{reference.title || 'Bron lezen'}</SheetTitle>
          <SheetClose render={<Button variant="outline"/>}>Terug naar norm ×</SheetClose></div>
        <SheetDescription>{reference.sourceControlId || document.sourceId}{reference.location ? ` · ${reference.location}` : ''}</SheetDescription>
      </SheetHeader>
      {criterion ? <CriterionSourceLayout criterion={criterion} source={content} active={comparisonTab} onActive={setComparisonTab}/> : content}
    </SheetContent>
  </Sheet>;
}
