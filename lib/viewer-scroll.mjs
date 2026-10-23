// Device-local presentation only: an anchor is a row identity, never source text.
const finite=value=>Number.isFinite(value)?value:0;
const positive=value=>Math.max(0,finite(value));

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
