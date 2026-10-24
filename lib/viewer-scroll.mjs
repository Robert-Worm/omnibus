// Device-local presentation only: an anchor is a row identity, never source text.
const finite=value=>Number.isFinite(value)?value:0;
const positive=value=>Math.max(0,finite(value));

function matrixRow(container,id){
 return Array.from(container?.querySelectorAll('[data-norm-id]')||[])
  .find(element=>element.getAttribute('data-norm-id')===id);
}

/** Acknowledge explicit navigation only after its actual row has mounted. */
export function revealMatrixRow(container,id){
 const row=matrixRow(container,id);
 if(!row)return false;
 row.scrollIntoView({block:'nearest'});
 return true;
}

/** Nearby deferred groups can move a just-revealed row below the viewport.
 * Follow only this explicit request until its visible position settles. */
export function settleMatrixRowReveal(container,id,complete,request=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame){
 const document=container?.ownerDocument;
 let active=true,frame,previous='',stable=0,attempts=0;
 const events=['pointerdown','wheel','keydown'];
 const stop=()=>{
  active=false;
  if(frame!==undefined)cancel(frame);
  for(const event of events)document?.removeEventListener(event,interrupt,true);
 };
 // A new user action takes precedence over finishing the scroll correction.
 const interrupt=()=>{if(active){stop();complete();}};
 const step=()=>{
  if(!active)return;
  const row=matrixRow(container,id);
  if(!row){stop();return;}
  const bounds=row.getBoundingClientRect(),table=row.closest('[data-slot=table-container]')?.getBoundingClientRect();
  const visible=bounds.bottom>Math.max(0,table?.top??0)&&bounds.top<Math.min(document?.defaultView?.innerHeight??Infinity,table?.bottom??Infinity);
  const position=`${bounds.top}:${bounds.bottom}`;
  stable=position===previous?stable+1:0;
  if(visible&&stable>=3){stop();complete();return;}
  // A hidden/unavailable target never acknowledges a successful reveal, and
  // must not keep an animation loop alive indefinitely.
  if(attempts++>=12){stop();return;}
  row.scrollIntoView({block:'nearest'});
  const after=row.getBoundingClientRect();previous=`${after.top}:${after.bottom}`;
  frame=request(step);
 };
 if(!matrixRow(container,id))return stop;
 for(const event of events)document?.addEventListener(event,interrupt,true);
 step();
 return stop;
}

/** Resolve only anchors still present in the complete filtered/page result. */
export function matrixAnchorId(rows,view){
 return positive(view.top)>0&&typeof view.anchorId==='string'&&rows.some(row=>row.id===view.anchorId)?view.anchorId:'';
}

function geometry(container){
 const box=container.getBoundingClientRect();
 const top=box.top+(container.querySelector('thead')?.getBoundingClientRect().height||0);
 return {top,bottom:box.bottom,rows:Array.from(container.querySelectorAll('[data-norm-id]'))};
}

/** Read mounted rows only; a placeholder-only viewport retains the pixel fallback. */
export function matrixScrollView(container){
 const {top,bottom,rows}=geometry(container);
 const anchor=rows.find(row=>{const bounds=row.getBoundingClientRect();return bounds.bottom>top&&bounds.top<bottom;});
 return {
  top:positive(container.scrollTop),left:positive(container.scrollLeft),
  anchorId:anchor?.getAttribute('data-norm-id')||'',
  anchorOffset:anchor?anchor.getBoundingClientRect().top-top:0,
 };
}

/** Restore the same visible row/offset even when earlier batches are placeholders. */
export function matrixScrollPosition(container,view,anchorId){
 const {top,rows}=geometry(container);
 const anchor=anchorId&&rows.find(row=>row.getAttribute('data-norm-id')===anchorId);
 return {left:positive(view.left),top:anchor
  ?positive(container.scrollTop+anchor.getBoundingClientRect().top-top-finite(view.anchorOffset))
  :positive(view.top)};
}
