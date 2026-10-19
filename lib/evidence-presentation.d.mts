import type {Framework,Line,Draft,Evidence} from './framework-types';
export function reportContextIds(framework:Framework):Set<string>;
export function uniqueEvidence(entries:Evidence[]):Evidence[];
export function directEvidence(framework:Framework,ids:string[]):Evidence[];
export function lineEvidenceView(framework:Framework,line:Line,activeId?:string|null):{direct:Evidence[];focused:Evidence|null|undefined;remaining:Evidence[];context:Evidence[]};
export function sharedControlCriterion(line:Line):boolean;
export function sameDraftControlCriterion(line:Line,draft:Draft):boolean;
