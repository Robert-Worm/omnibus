import type {Project} from '@/lib/project-session.mjs';
import type {workbookFileSnapshot} from '@/lib/workbook-file-snapshot.mjs';

export type FileRequest = {kind:'project'; project:Project} |
  {kind:'xlsx'; model:ReturnType<typeof workbookFileSnapshot>};
export type FileContent = string | ArrayBuffer;
type Reply = {content?:FileContent; error?:string};

/** One explicit file at a time, independent of the autosave worker/queue. */
export function createFileEncoder({createWorker, fallback, schedule = (run:()=>void) => setTimeout(run,0)}:{
  createWorker:()=>Worker;
  fallback:(request:FileRequest)=>FileContent|Promise<FileContent>;
  schedule?:(run:()=>void)=>void;
}) {
  let worker:Worker|null=null, unavailable=false, disposed=false;
  let pending:{request:FileRequest; resolve:(content:FileContent)=>void; reject:(error:Error)=>void}|null=null;
  const settle=(reply:Reply)=>{
    const job=pending;if(!job)return;
    pending=null;
    // A completed workbook can be large. Do not retain it through an idle
    // worker's callbacks after the download has received its result.
    if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;}
    if(typeof reply.content==='string'||reply.content instanceof ArrayBuffer)job.resolve(reply.content);
    else job.reject(Error(reply.error||'Het bestand kon niet worden gemaakt.'));
  };
  const runFallback=()=>{
    worker?.terminate();worker=null;unavailable=true;
    const job=pending;if(!job)return;
    Promise.resolve().then(()=>fallback(job.request)).then(content=>{
      if(pending===job)settle({content});
    },error=>{
      if(pending===job)settle({error:error instanceof Error?error.message:'Het bestand kon niet worden gemaakt.'});
    });
  };
  return {
    encode(request:FileRequest):Promise<FileContent>{
      if(disposed)return Promise.reject(Error('Bestandstaak is afgesloten.'));
      if(pending)return Promise.reject(Error('Er wordt al een bestand gemaakt.'));
      return new Promise((resolve,reject)=>{
        pending={request,resolve,reject};
        const job=pending;
        // Let the button paint before cloning the immutable snapshot for the
        // worker. The same snapshot is also used if workers are unavailable.
        schedule(()=>{
          if(pending!==job||disposed)return;
          if(unavailable){runFallback();return;}
          try{
            worker??=createWorker();
            const active=worker;
            worker.onmessage=(event:MessageEvent<Reply>)=>{if(worker===active&&pending===job)settle(event.data);};
            const failed=()=>{if(worker===active&&pending===job)runFallback();};
            worker.onerror=failed;worker.onmessageerror=failed;
            worker.postMessage(job.request);
          }catch{runFallback();}
        });
      });
    },
    dispose(){
      disposed=true;worker?.terminate();worker=null;
      settle({error:'Bestandstaak is afgesloten.'});
    },
  };
}
