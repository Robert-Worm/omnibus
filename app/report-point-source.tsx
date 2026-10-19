"use client";
import {useState,type ComponentProps} from 'react';
import {Button} from '@/components/ui/button';
import {LawPointSourceLayout} from './law-point-source';
import LazyReportLibrary from './lazy-report-library';
import {reportPointTrace} from '@/lib/report-point-source.mjs';
import catalogue from '@/lib/report-point-catalogue.mjs';

type ReaderProps=ComponentProps<typeof LazyReportLibrary>;
export type ReportSourceEntry={framework:NonNullable<ReaderProps['framework']>;source:ReaderProps['source']};
type VisualContext={id:string;page:number;observation:string;interpretation_limit:string};
export default function ReportPointSource({pointId,entry,onReturn}:{pointId:string;entry?:ReportSourceEntry;onReturn:()=>void}){
 const point=catalogue.points.find(p=>p.id===pointId)!;
 const trace=reportPointTrace(catalogue,pointId);
 const [active,setActive]=useState<'criterion'|'source'>('source');
 const [index,setIndex]=useState(0),[page,setPage]=useState(trace.relations[0].page),[focus,setFocus]=useState(0);
 const relation=trace.relations[index];
 // Only the chosen evidence relation is marked. Context is separately labelled,
 // never made to look like direct support for the proposed test point.
 const passages=[{...relation,label:relation.evidence_id}];
 return <LawPointSourceLayout label="Bronpassage bij rapporttoetspunt" active={active} onActive={setActive}
  summary={<div className="cio-source-summary"><strong>{point.title}</strong><p>{point.id} · Historisch rapport · voorgesteld toetspunt, geen actuele bevinding</p></div>}
  publication={<Button variant="outline" onClick={onReturn}>Terug naar toetspunten</Button>}
  criterion={<>
   <h3>Norm</h3><p>{catalogue.blocks.find(b=>b.id===point.legacy_line_id)?.criterion.text}</p>
   <h3>Toetspunt</h3><p>{point.text}</p>
   <label htmlFor="report-point-passage">Bronbijdrage</label>
   <select id="report-point-passage" value={index} onChange={e=>{const n=Number(e.target.value);setIndex(n);setPage(trace.relations[n].page);setFocus(f=>f+1);setActive('source');}}>
    {trace.relations.map((r,i)=><option key={r.evidence_id+'-'+i} value={i}>{r.role==='MOTIVATES_PROPOSAL'?'Onderbouwing':'Context'} · p. {r.page} · {r.evidence_id}</option>)}
   </select>
   <p>{relation.reason||'Historische bronpassage ter onderbouwing van het onderzoeksvoorstel.'}</p>
   <blockquote>{relation.quote}</blockquote>
   <h3>Broncontext en beperkingen</h3><p>{trace.source_context.local||trace.source_context.report}</p>
   {trace.limitations.map((text,i)=><p key={i}>{text}</p>)}
   {trace.visuals.map((v:VisualContext)=><section key={v.id}><h4>Visuele context · pagina {v.page}</h4><p>{v.observation}</p><p>{v.interpretation_limit}</p><Button variant="outline" onClick={()=>{setPage(v.page);setActive('source');}}>Bekijk bronpagina {v.page}</Button></section>)}
  </>}
  source={entry?<LazyReportLibrary framework={entry.framework} source={entry.source} compactSource reportThemes={[]} page={page} onPage={setPage} sourcePassages={passages} sourceTarget={relation.start} sourceFocusRequest={focus} onTopic={()=>{}} onClearEvidence={()=>{}} onReturn={onReturn}/>:<p role="alert">De bijbehorende bronversie is niet beschikbaar.</p>}
 />;
}
