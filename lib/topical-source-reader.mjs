import {lawReaderPassages} from './law-source-reader.mjs';

// Keep the pure material projection independent of reader/application imports.
export function topicalRecordSources(p,record){
 return p.documents.flatMap(document=>{
  const identity=p.manifest.documents.find(d=>d.id===document.packageDocumentId);
  const spans=record.source_spans.filter(s=>s.page>=identity.first_package_page&&s.page<=identity.last_package_page)
   .map(s=>({...s,page:s.page-identity.first_package_page+1}));
  if(!spans.length)return [];
  return [{document,spans,passages:lawReaderPassages(document.pages,spans,record.locator)}];
 });
}
