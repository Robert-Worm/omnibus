// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundation-passage-history.mjs";
import {catalogueDerived} from "@/lib/catalogue-runtime.mjs";
const {history,wooHistory,wdoHistory,archiefHistory,wwkeHistory,wbkHistory,wpgHistory,wjsgHistory,bio2History,cloudHistory,awHistory,csrdHistory,aiaItems,wooItems,wdoItems,wdoFutureItems,archiefItems,wwkeItems,wbkItems,wpgItems,wjsgItems,bio2Items,cloudItems,awItems,csrdItems}=data;const entries=[];
catalogueDerived(()=>entries.splice(0,entries.length,...history.entries,...wooHistory.entries,...wdoHistory.entries,...archiefHistory.entries,...wwkeHistory.entries,...wbkHistory.entries,...wpgHistory.entries,...wjsgHistory.entries,...bio2History.entries,...cloudHistory.entries,...awHistory.entries,...csrdHistory.entries));
export function recognizedVersionedReference(reference={}){
 if(['CSRD-001','CSRD-005','CSRD-055'].includes(reference.sourceControlId)){
  const current=csrdItems.find(p=>p.sourceControlId===reference.sourceControlId);
  return Boolean(reference.location&&(current?.location===reference.location||csrdHistory.entries.some(p=>p.id===reference.sourceControlId&&p.location===reference.location)));
 }
 if(awHistory.entries.some(p=>p.id===reference.sourceControlId)){
  const current=awItems.find(p=>p.sourceControlId===reference.sourceControlId);
  return Boolean(reference.location&&(current?.location===reference.location||awHistory.entries.some(p=>p.id===reference.sourceControlId&&p.location===reference.location)));
 }
 // Cloud clauses can share a page/section location (e.g. 020, 021 and 022).
 // Recognize the ID+location pair, never location alone, while preserving the
 // source-edition guards in foundationPassages/historicalFoundationPassages.
 if(reference.sourceControlId?.startsWith('CLOUD2026-')){
  if(!reference.location)return false;
  const current=cloudItems.find(p=>p.sourceControlId===reference.sourceControlId);
  return Boolean(current?.location===reference.location||cloudHistory.entries.some(p=>p.id===reference.sourceControlId&&p.location===reference.location));
 }
 // Article/page strings are not globally unique across unrelated laws.
 const family=['WOO-','AIA-','WDO-','ARCHIEF2026-','WWKE-','WBK-','WPG-','WJSG-','BIO2 · '].find(prefix=>reference.sourceControlId?.startsWith(prefix));
 if(!family)return true;
 const sameLocation=entries.filter(p=>p.id.startsWith(family)&&p.location===reference.location);
 if(sameLocation.length)return sameLocation.some(p=>p.id===reference.sourceControlId);
 if(family==='WBK-'||family==='WPG-'||family==='WJSG-'||family==='BIO2 · '){
  // Older aliases alone do not prove which version a user actually saved.
  // Unknown historical locations must not acquire the new, narrower passages.
  const current=(family==='WBK-'?wbkItems:family==='WPG-'?wpgItems:family==='BIO2 · '?bio2Items:wjsgItems).find(p=>p.sourceControlId===reference.sourceControlId||p.legacySourceControlIds?.includes(reference.sourceControlId));
  return Boolean(reference.location&&current?.location===reference.location);
 }
 if(!entries.some(p=>p.id===reference.sourceControlId))return true;
 const current=[...aiaItems,...wooItems,...wdoItems,...wdoFutureItems,...archiefItems,...wwkeItems].find(p=>p.sourceControlId===reference.sourceControlId);
 return Boolean(reference.location&&current?.location===reference.location);
}

// A split must not silently re-point a saved broad criterion to its narrower
// successor. Match the exact saved reference and the immutable document edition.
// Unknown or edited references never acquire historical provenance by guesswork.
export function historicalFoundationPassages(document,reference={}){
 const entry=entries.find(p=>p.id===reference.sourceControlId&&p.location===reference.location);
 const source=entry?.documents[document.id];
 if(!source||source.pdfHash!==document.pdf_hash||source.textHash!==document.source_sha256)return null;
 return source.passages;
}

export default data;
