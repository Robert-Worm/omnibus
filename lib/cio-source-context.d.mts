// Data-only exports supplied by the pinned publication; no source text in code.
export type CioContextSourceKey = 'publication' | 'metadata' | 'previous' |
  'announcement' | 'evaluation' | 'coordination' | 'consolidation' | 'planning';
export type CioContextReview = {
  version:string;
  checkedOn:string;
  humanValidation:boolean;
  sources:Record<CioContextSourceKey,{label:string;url:string}>;
  holds:{pointId:string;issueIds:string[];title:string;reference:string;
    established:string;missing:string;next:string;sourceKeys:CioContextSourceKey[]}[];
  findings:{id:string;issueIds:string[];status:string;title:string;text:string;
    details?:string[];sourceKeys:CioContextSourceKey[]}[];
};
export const cioContextReview:CioContextReview;
