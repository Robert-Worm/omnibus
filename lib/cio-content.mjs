// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/cio-content.mjs";

import {validateEditorialTrace} from "@/lib/cio-trace-validation.mjs";
export const {catalogue,bank,pages,issues,status}=data;
export const cioOriginalCatalogue=data.original,cioEditorialVersion=data.version;
const required=(table,id)=>{const value=table[id];if(!value)throw Error('CIO-inhoud is nog niet geladen: '+id);return value;};
export const cioEditorialFor=id=>required(data.editorial,id);
export const cioControlForPoint=id=>required(data.pointControls,id);
export const cioControlMeasureFor=(id,group)=>required(data.rowControls,id+'|'+group);
// Interview revisions stay outside the normative point and saved source trace.
// Preserve explicit invalid/negative receipts; only the presentation gate approves.
export const cioInterviewFields=id=>Object.hasOwn(data.interviewReviews??{},id)
  ? {interviewReview:data.interviewReviews[id]} : {};
export const validateCioEditorialTrace=trace=>validateEditorialTrace(trace,cioEditorialFor,catalogue);

export default data;
