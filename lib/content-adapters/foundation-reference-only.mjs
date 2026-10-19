// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundation-reference-only.mjs";
// Deliberate boundary: public source identity and references, no PDF, extract or source quotations.
import {resolveSuwiReference} from "@/lib/foundations/suwi-reference-data.mjs";
import {resolveDigiDReference} from "@/lib/foundations/digid-reference-data.mjs";
export const referenceOnlySources=data.referenceOnlySources;
// Known older ISO31000 source locations remain attached to saved project snapshots.
// Never accept arbitrary page/URL input as an authoritative source reference.
const isoRiskHistoricalReferences=data.isoRiskHistoricalReferences;
// ISO27001-18 previously combined ISMS and operational changes. Saved work keeps
// that exact historical scope; current18 and new30 have separate source focuses.
const ismsHistoricalReferences=data.ismsHistoricalReferences;
// Exact historical location stays with saved work; unknown locations are not accepted.
const cobitHistoricalReferences=data.cobitHistoricalReferences;
export function externalFoundationReference(reference={}){
 const source=referenceOnlySources[reference.sourceId||reference.foundationId];
 if(!source||reference.sourceHash!==source.pdf_hash)return null;
 let entry=source.references.find(r=>r.code===reference.sourceControlId);if(!entry)return null;
 if(source.sourceId==='SUWI'){entry=resolveSuwiReference(reference,entry);if(!entry)return null;}
 if(source.sourceId==='DIGID'){entry=resolveDigiDReference(reference,entry);if(!entry)return null;}
 if(source.sourceId==='ISO31000'&&isoRiskHistoricalReferences[reference.sourceControlId]&&reference.location){
  const historical=isoRiskHistoricalReferences[reference.sourceControlId];
  if(reference.location===historical.section)entry=historical;
  else if(reference.location!==entry.section)return null;
 }
 if(source.sourceId==='ISO27001'&&ismsHistoricalReferences[reference.sourceControlId]&&reference.location){
  const historical=ismsHistoricalReferences[reference.sourceControlId];
  if(reference.location===historical.section)entry=historical;
  else if(reference.location!==entry.section)return null;
 }
 if(source.sourceId==='COBIT'&&cobitHistoricalReferences[reference.sourceControlId]&&reference.location){
  const historical=cobitHistoricalReferences[reference.sourceControlId];
  if(reference.location===historical.section)entry=historical;
  else if(reference.location!==entry.section)return null;
 }
 return {sourceId:source.sourceId,documentId:source.id,documentHash:source.pdf_hash,title:source.title,edition:source.edition,pages:entry.pages,section:entry.section,reason:source.reason,url:source.pageAnchor===false?source.url:source.url+'#page='+entry.pages[0],...(entry.additionalReferences?{additionalReferences:entry.additionalReferences}:{})};
}
