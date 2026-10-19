// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/eed-versioned-passages.mjs";
import {documentHashes} from "@/lib/provision-status.mjs";
const {historical,eedItems,eedDocuments}=data;
export function eedVersionedPassages(document,reference={}) {
 if(reference.sourceControlId!=='EED-033')return null;
 if((reference.sourceId&&reference.sourceId!=='EED')||(reference.foundationId&&reference.foundationId!=='EED'))return [];
 const source=eedDocuments.datacenter;
 if(document.id!==source.id||document.pdf_hash!==source.pdf_hash||document.source_sha256!==source.source_sha256||reference.sourceHash!==source.pdf_hash)return [];
 // Both original and current snapshots carry this single-document identity.
 const hashes=documentHashes(reference);
 if(Object.keys(hashes).length!==1||hashes[source.id]!==source.pdf_hash)return [];
 if(reference.location===historical.location){
  const old=historical.documents.find(d=>d.id===document.id);
  return old?.pdfHash===document.pdf_hash&&old.textHash===document.source_sha256?old.passages:[];
 }
 const current=eedItems.find(p=>p.id==='EED-033');
 if(!reference.location||reference.location!==current.location)return [];
 return data.rows
  .filter(r=>r.documentId===document.id)
  .map(r=>({start:r.start,end:r.end,page:r.page,label:r.label,quote:r.text}));
}

export default data;
