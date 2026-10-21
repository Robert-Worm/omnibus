/** Coalesce autosaves without allowing an older encoding to replace newer work. */
export function createBackgroundProjectSave({encode,write,onPending,onSaved,onError,schedule=run=>setTimeout(run,0)}) {
 let revision=0,queued=null,running=false,disposed=false,pending=false,scheduled=false;
 function scheduleDrain(){
  if(running||scheduled||!queued||disposed)return;
  scheduled=true;
  // Mark dirty synchronously, but don't clone the full worker message inside
  // an input handler. Edits and the following view effect coalesce here too.
  schedule(()=>{scheduled=false;void drain();});
 }
 async function drain(){
  if(running||!queued||disposed)return;
  const job=queued;queued=null;running=true;
  try{
   const text=await encode(job.project);
   if(!disposed&&job.revision===revision){write(text);pending=false;onSaved();}
  }catch(error){
   if(!disposed&&job.revision===revision){pending=false;onError(error);}
  }finally{running=false;scheduleDrain();}
 }
 return {
  get pending(){return pending;},
  save(project){if(disposed)return;queued={project,revision:++revision};pending=true;onPending();scheduleDrain();},
  cancel(){revision++;queued=null;pending=false;},
  dispose(){disposed=true;revision++;queued=null;pending=false;},
 };
}
