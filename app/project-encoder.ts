import {serializeProject} from '../lib/project-codec.mjs';
import {packProjectSave} from '../lib/project-save-transfer.mjs';
import type {Project} from '@/lib/project-session.mjs';

/** The save queue sends one snapshot at a time; there is never a worker backlog. */
export function createProjectEncoder({createWorker=()=>new Worker(new URL('./project-encoder.worker.ts',import.meta.url),{type:'module'}),fallback=serializeProject}:{
 createWorker?:()=>Worker;fallback?:(project:Project)=>string;
}={}){
 let worker:Worker|null=null,unavailable=false,disposed=false,serial=0;
 let snapshots:ReturnType<typeof packProjectSave>['snapshots']=[];
 let pending:{reject:(error:Error)=>void}|null=null;
 return {
  encode(project:Project):Promise<string>{
   if(disposed)return Promise.reject(Error('Projectopslag is afgesloten.'));
   if(pending)return Promise.reject(Error('Er wordt al een project bewaard.'));
   if(unavailable)return Promise.resolve().then(()=>fallback(project));
   return new Promise((resolve,reject)=>{
    const job={reject},id=++serial;pending=job;
    const clear=()=>{pending=null;if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;}};
    const local=()=>{
     if(pending!==job)return;
     worker?.terminate();worker=null;unavailable=true;snapshots=[];clear();
     try{resolve(fallback(project));}catch(error){reject(error);}
    };
    try{
     worker??=createWorker();const target=worker,packed=packProjectSave(project,snapshots);
     worker.onmessage=(event:MessageEvent<{id:number;text?:string;error?:string}>)=>{
      if(pending!==job||worker!==target||event.data.id!==id)return;
      clear();
      if(typeof event.data.text==='string'){snapshots=packed.snapshots;resolve(event.data.text);}
      else {snapshots=[];reject(Error(event.data.error||'Project kon niet worden bewaard.'));}
     };
     worker.onerror=local;
     worker.onmessageerror=local;
     worker.postMessage({id,...packed.message});
    }catch{local();}
   });
  },
  dispose(){disposed=true;worker?.terminate();worker=null;snapshots=[];pending?.reject(Error('Projectopslag is afgesloten.'));pending=null;},
 };
}
