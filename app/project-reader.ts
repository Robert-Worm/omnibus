import {parseProjectText} from '@/lib/project-codec.mjs';

type Reply={value?:unknown;error?:string;errorName?:string};
type Options={signal?:AbortSignal;createWorker?:()=>Worker;schedule?:(run:()=>void)=>void;timeoutMs?:number};

/** Decode only; the caller must still validate sources and the complete project.
 * One short-lived worker per restore, with no storage or catalogue access. */
export function readProjectInBackground(text:string,{signal,
  createWorker=()=>new Worker(new URL('./project-reader.worker.ts',import.meta.url),{type:'module'}),
  schedule=run=>setTimeout(run,0),timeoutMs=15000}:Options={}):Promise<unknown>{
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)return Promise.reject(Error('Ongeldige projectleestijd.'));
 return new Promise((resolve,reject)=>{
  let worker:Worker|null=null,done=false,fallingBack=false,timer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{clearTimeout(timer);if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();worker=null;}};
  const finish=(value:unknown,error?:unknown)=>{
   if(done)return;done=true;stop();signal?.removeEventListener('abort',abort);
   if(error!==undefined)reject(error);else resolve(value);
  };
  const abort=()=>finish(undefined,signal?.reason??new DOMException('Project openen afgebroken.','AbortError'));
  const fallback=()=>{
   if(done||fallingBack)return;fallingBack=true;stop();
   Promise.resolve().then(()=>{if(!done)return parseProjectText(text);})
    .then(value=>finish(value),error=>finish(undefined,error));
  };
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  schedule(()=>{
   if(done)return;
   try{
    worker=createWorker();const target=worker;
    worker.onmessage=(event:MessageEvent<Reply>)=>{
     if(worker!==target||done)return;
     const reply=event.data;
     if(reply&&Object.hasOwn(reply,'value'))finish(reply.value);
     else if(typeof reply?.error==='string')finish(undefined,reply.errorName==='SyntaxError'?new SyntaxError(reply.error):Error(reply.error));
     else fallback();
    };
    worker.onerror=fallback;worker.onmessageerror=fallback;
    timer=setTimeout(fallback,timeoutMs);worker.postMessage(text);
   }catch{fallback();}
  });
 });
}
