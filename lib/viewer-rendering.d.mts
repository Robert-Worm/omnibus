export const VIEWER_ROW_BATCH_SIZE:number;
export function viewerRowBatches<T>(rows:T[],defer?:boolean):T[][];
export function observeViewerApproach(element:Element,reveal:()=>void,Observer?:typeof IntersectionObserver):()=>void;
