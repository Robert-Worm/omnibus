import type {Framework,Draft} from '@/lib/framework-types';
import type {LibraryModel} from './model-library';
import type {workbookPreviewSnapshot} from '@/lib/workbook-preview-snapshot.mjs';
import type {ContentTransfer} from '@/lib/database-source-client.mjs';

export type PreviewContext={framework:Framework;draft:Draft;models:LibraryModel[]};
export type PreviewRequest=PreviewContext & {config:Record<string,unknown>};
export type PreviewResult={preview:ReturnType<typeof workbookPreviewSnapshot>;validation:string};
export type PreviewMessage={id:number;context?:PreviewContext;config:Record<string,unknown>;sources?:ContentTransfer[]};
type Reply={id:number;result?:PreviewResult;error?:string};
export type PreviewState={request:PreviewRequest|null;result:PreviewResult|null;busy:boolean;failed:boolean};
export const initialPreviewState:PreviewState={request:null,result:null,busy:false,failed:false};

/** Settings edits must not repeatedly clone all source snapshots into the worker. */
export function samePreviewContext(a:PreviewContext|null,b:PreviewContext) {
  if(!a||a.framework!==b.framework||a.models!==b.models)return false;
  const keys=(draft:Draft)=>Object.keys(draft).filter(key=>key!=='exportSettings') as (keyof Draft)[];
  const before=keys(a.draft),after=keys(b.draft);
  return before.length===after.length&&after.every(key=>Object.hasOwn(a.draft,key)&&a.draft[key]===b.draft[key]);
}

/** One calculation in flight and only the newest edit queued; never publish stale results. */
export function createPreviewCalculator({createWorker,fallback,onChange,prepareSources,schedule=(run:()=>void)=>setTimeout(run,0)}:{
  createWorker:()=>Worker;fallback:(request:PreviewRequest)=>PreviewResult|Promise<PreviewResult>;
  onChange:(state:PreviewState)=>void;schedule?:(run:()=>void)=>void;
  prepareSources?:(request:PreviewRequest,known:ReadonlySet<string>)=>ContentTransfer[];
}) {
  type Job={id:number;request:PreviewRequest};
  let worker:Worker|null=null,sent:PreviewContext|null=null,unavailable=false,disposed=false;
  let active:Job|null=null,queued:Job|null=null,serial=0,state=initialPreviewState;
  const transferred=new Set<string>();
  const update=(next:PreviewState)=>{state=next;onChange(state);};
  function finish(job:Job,reply:Reply) {
    if(disposed||active!==job)return;
    active=null;
    if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;}
    if(state.request===job.request)update({request:job.request,busy:false,failed:!!reply.error,
      result:reply.result??{preview:null,validation:reply.error||'Het exportvoorbeeld kon niet worden gemaakt.'}});
    pump();
  }
  function local(job:Job) {
    worker?.terminate();worker=null;sent=null;unavailable=true;
    Promise.resolve().then(()=>fallback(job.request)).then(result=>finish(job,{id:job.id,result}),
      error=>finish(job,{id:job.id,error:error instanceof Error?error.message:'Het exportvoorbeeld kon niet worden gemaakt.'}));
  }
  function pump() {
    if(disposed||active||!queued)return;
    const job=queued;queued=null;active=job;
    schedule(()=>{
      if(disposed||active!==job)return;
      if(unavailable){local(job);return;}
      try {
        worker??=createWorker();const target=worker;
        worker.onmessage=(event:MessageEvent<Reply>)=>{
          if(worker===target&&event.data.id===job.id)finish(job,event.data);
        };
        const failed=()=>{if(worker===target&&active===job)local(job);};
        worker.onerror=failed;worker.onmessageerror=failed;
        const {framework,draft,models,config}=job.request;
        const context=samePreviewContext(sent,job.request)?undefined:{framework,draft,models};
        const sources=context?prepareSources?.(job.request,transferred):undefined;
        worker.postMessage({id:job.id,context,config,sources} satisfies PreviewMessage,sources?.map(source=>source.bytes)??[]);
        for(const source of sources??[])transferred.add(source.release+':'+source.hash);
        sent=job.request;
      }catch{local(job);}
    });
  }
  return {
    request(request:PreviewRequest,retry=false) {
      if(disposed||(!retry&&state.request===request))return;
      queued={id:++serial,request};update({...state,request,busy:true,failed:false});pump();
    },
    pause(){queued=null;if(state.busy)update({...state,request:null,busy:false});},
    dispose(){disposed=true;queued=null;active=null;sent=null;worker?.terminate();worker=null;},
  };
}
