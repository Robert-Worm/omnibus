import {contentBatchLimits as limits} from './content-batch-contract.mjs';

/** Aggregate only explicitly requested sources. The shared transport bounds
 * concurrent responses and starts timeouts on admission, not while queued.
 * The caller retains per-source hash validation. Only the batch decoder marks
 * bytes canonical after parsing JSON and serializing the individual value.
 * Single reads remain raw; never trust a marker from a network response. */
export function createContentRequestBatch(readResponse) {
  let pending=[],scheduled=false,available=true;
  const single=async(ref,signal)=>({bytes:await readResponse(`/api/v1/content/${ref.hash}?release=${ref.release}`,signal)});
  function settle(job,error,result) {
    if(job.done)return;
    job.done=true;job.signal.removeEventListener('abort',job.abort);
    if(error)job.reject(error);else job.resolve(result);
    if(job.group?.jobs.every(item=>item.done))job.group.controller.abort();
  }
  async function run(jobs) {
    const group={jobs,controller:new AbortController()};
    for(const job of jobs)job.group=group;
    const refs=[...new Map(jobs.map(job=>[job.ref.hash,job.ref])).values()];
    const deliver=async ref=>{
      try{const result=await single(ref,group.controller.signal);
        for(const job of jobs)if(job.ref.hash===ref.hash)settle(job,null,result);
      }catch(error){for(const job of jobs)if(job.ref.hash===ref.hash)settle(job,error);}
    };
    if(!available||refs.length===1){await Promise.all(refs.map(deliver));return;}
    try {
      const release=refs[0].release;
      const bytes=await readResponse(`/api/v1/content-batch?release=${release}`+refs.map(ref=>'&hash='+ref.hash).join(''),group.controller.signal);
      const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      if(value?.release!==release || !Array.isArray(value.items) || value.items.length!==refs.length)
        throw Error('De gebundelde brongegevens hebben een ongeldige indeling.');
      const expected=new Map(refs.map(ref=>[ref.hash,ref])),results=new Map();
      for(const item of value.items){
        const ref=expected.get(item?.hash);
        if(!ref||results.has(item.hash)||!Object.hasOwn(item,'value'))
          throw Error('De gebundelde brongegevens hebben een ongeldige indeling.');
        const text=JSON.stringify(item.value),bytes=new TextEncoder().encode(text);
        if(bytes.length!==ref.bytes)throw Error('De brongegevens hebben een onverwachte grootte.');
        // Reuse the canonical text instead of immediately decoding these bytes
        // again. Consumers still parse their own value, preserving independent
        // objects and JSON normalization (for example -0 and overflow numbers).
        results.set(item.hash,{bytes,text,canonical:true});
      }
      for(const job of jobs)settle(job,null,results.get(job.ref.hash));
    }catch(error){
      // Old servers during a rolling update can use the original scoped route.
      // Never hide a malformed response, size error or failed content hash.
      if(error?.status===404&&!group.controller.signal.aborted){
        available=false;await Promise.all(refs.map(deliver));
      }else for(const job of jobs)settle(job,error);
    }
  }
  function flush() {
    scheduled=false;const jobs=pending.filter(job=>!job.done);pending=[];
    const groups=[];
    for(const job of jobs){
      const group=groups.find(group=>group.release===job.ref.release &&
        (group.hashes.has(job.ref.hash)||(group.hashes.size<limits.entries&&group.bytes+job.ref.bytes<=limits.bytes-limits.overhead)));
      if(group){group.jobs.push(job);if(!group.hashes.has(job.ref.hash)){group.hashes.add(job.ref.hash);group.bytes+=job.ref.bytes;}}
      else groups.push({release:job.ref.release,jobs:[job],hashes:new Set([job.ref.hash]),bytes:job.ref.bytes});
    }
    // Start the larger transfers first: short responses otherwise occupy the
    // shared slots while a large tail waits. This changes only transport order;
    // each caller and the atomic catalogue admission retain their own ordering.
    groups.sort((a,b)=>b.bytes-a.bytes);
    for(const group of groups)void run(group.jobs);
  }
  return (ref,signal)=>{
    signal.throwIfAborted();
    // Older callers lack size metadata; large items keep the original route.
    if(!available||!Number.isSafeInteger(ref.bytes)||ref.bytes<1||ref.bytes>limits.bytes-limits.overhead)
      return single(ref,signal);
    return new Promise((resolve,reject)=>{
      const job={ref,signal,resolve,reject,done:false,group:null,abort:null};
      job.abort=()=>settle(job,signal.reason);
      signal.addEventListener('abort',job.abort,{once:true});pending.push(job);
      if(!scheduled){scheduled=true;setTimeout(flush,0);}
    });
  };
}
