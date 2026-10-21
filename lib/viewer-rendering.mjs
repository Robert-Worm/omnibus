// Presentation limits only. Never use these batches for counts, selection or exports.
export const VIEWER_ROW_BATCH_SIZE=8;
export function viewerRowBatches(rows,defer=true){
 const size=defer?VIEWER_ROW_BATCH_SIZE:Math.max(1,rows.length);
 return Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,(i+1)*size));
}
export function observeViewerApproach(element,reveal,Observer=globalThis.IntersectionObserver){
 if(!Observer){reveal();return ()=>{};}
 let active=true;
 const observer=new Observer(entries=>{
  if(active&&entries.some(entry=>entry.isIntersecting)){stop();reveal();}
 },{rootMargin:'500px 0px'});
 const stop=()=>{if(active){active=false;observer.disconnect();}};
 observer.observe(element);
 return stop;
}
