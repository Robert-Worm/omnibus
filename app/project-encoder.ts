import {serializeProject} from '@/lib/project-codec.mjs';
import type {Project} from '@/lib/project-session.mjs';

/** The save queue sends one snapshot at a time; there is never a worker backlog. */
export function createProjectEncoder(){
 let worker:Worker|null=null,unavailable=false;
 return {
  encode(project:Project):Promise<string>{
   if(unavailable||typeof Worker==='undefined')return Promise.resolve().then(()=>serializeProject(project));
   return new Promise((resolve,reject)=>{
    const fallback=()=>{
     worker?.terminate();worker=null;unavailable=true;
     try{resolve(serializeProject(project));}catch(error){reject(error);}
    };
    try{
     worker??=new Worker(new URL('./project-encoder.worker.ts',import.meta.url),{type:'module'});
     worker.onmessage=(event:MessageEvent<{text?:string;error?:string}>)=>{
      if(typeof event.data.text==='string')resolve(event.data.text);
      else reject(Error(event.data.error||'Project kon niet worden bewaard.'));
     };
     worker.onerror=fallback;
     worker.onmessageerror=fallback;
     worker.postMessage(project);
    }catch{fallback();}
   });
  },
  dispose(){worker?.terminate();worker=null;},
 };
}
