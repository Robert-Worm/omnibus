"use client";
import {useEffect,useState,type ComponentProps} from 'react';
import ReportLibrary from './report-library';
import DatabaseReportLibrary from './database-report-library';
import {reportSourceLoader} from '@/lib/report-source-loader.mjs';
import {reportDisplaySource} from '@/lib/report-display-context.mjs';
import {Button} from '@/components/ui/button';

type Props=ComponentProps<typeof ReportLibrary>;
// Parent key is the report ID. The identity guard also handles a changed source version.
export default function LazyReportLibrary(props:Props) {
  return props.source.databaseSource ? <DatabaseReportLibrary {...props}/> : <PackedReportLibrary {...props}/>;
}
function PackedReportLibrary(props:Props) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<{input:Props['source'];source?:Props['source'];error?:string}|null>(null);
  useEffect(()=>{
    let current=true;
    reportSourceLoader.load(props.source).then(source=>{
      if(current)setState({input:props.source,source});
    },error=>{if(current)setState({input:props.source,error:error instanceof Error?error.message:'Brontekst kon niet worden geopend.'});});
    return ()=>{current=false;};
  },[props.source,attempt]);
  const result=state?.input===props.source?state:null;
  if(result?.error)return <div className="report-source-status" role="alert">
    <p>{result.error}</p>
    <p>Je onderzoek en selecties zijn behouden.</p>
    <Button variant="outline" onClick={()=>{setState(null);setAttempt(n=>n+1);}}>Opnieuw proberen</Button>
  </div>;
  if(!result?.source)return <output className="report-source-status" data-status-block="" aria-live="polite">Brontekst openen…</output>;
  return <ReportLibrary {...props} source={reportDisplaySource(props.framework?.report.id,result.source)}/>;
}
