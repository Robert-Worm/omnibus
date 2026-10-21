import {useEffect,useRef,useState} from 'react';
import {createPreviewCalculator,initialPreviewState} from './preview-calculator';
import type {PreviewRequest} from './preview-calculator';

export function useExportPreview(request:PreviewRequest,enabled:boolean) {
  const [state,setState]=useState(initialPreviewState);
  const calculator=useRef<ReturnType<typeof createPreviewCalculator>|null>(null);
  useEffect(()=>{
    const instance=createPreviewCalculator({
      createWorker:()=>new Worker(new URL('./preview-calculator.worker.ts',import.meta.url),{type:'module'}),
      fallback:async input=>(await import('./calculate-preview')).calculatePreview(input),
      onChange:setState,
    });
    calculator.current=instance;
    return ()=>{instance.dispose();calculator.current=null;};
  },[]);
  useEffect(()=>{
    if(enabled)calculator.current?.request(request);
    else calculator.current?.pause();
  },[request,enabled]);
  const ready=state.request===request&&!state.busy;
  return {preview:state.result?.preview??null,ready,failed:ready&&state.failed,
    validation:ready?state.result?.validation??'':'',retry:()=>calculator.current?.request(request,true)};
}
