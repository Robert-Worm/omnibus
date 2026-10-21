import {useSyncExternalStore} from 'react';
import {download} from '@/lib/browser-download.mjs';
import {createFileEncoder} from './file-encoder';
import type {FileRequest} from './file-encoder';

// Application-lifetime file job: switching workflow screens must not cancel a
// requested download. Nothing is sent to a server or written into the project.
const encoder=createFileEncoder({
  createWorker:()=>new Worker(new URL('./file-encoder.worker.ts',import.meta.url),{type:'module'}),
  fallback:async request=>(await import('./encode-file')).encodeFile(request),
});
let state={busy:false,error:''};
const listeners=new Set<()=>void>();
const snapshot=()=>state;
const subscribe=(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener);};};
const update=(next:typeof state)=>{state=next;for(const listener of listeners)listener();};
export const useFileDownload=()=>useSyncExternalStore(subscribe,snapshot,snapshot);
export async function downloadFile(request:FileRequest,name:string,mime:string) {
  if(state.busy)return false;
  update({busy:true,error:''});
  try{
    const content=await encoder.encode(request);
    download(content,name,mime);
    update({busy:false,error:''});return true;
  }catch(error){
    update({busy:false,error:error instanceof Error?error.message:'Het bestand kon niet worden gemaakt.'});return false;
  }
}
