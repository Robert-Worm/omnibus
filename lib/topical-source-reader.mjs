import {lawReaderPassages} from './law-source-reader.mjs';

// Keep the pure material projection independent of reader/application imports.
export function topicalRecordSources(p,record){
 // The reviewed span order identifies the preferred source, including corrigenda.
 // Keep the package's document order intact: it also binds research questions.
 const sources=p.documents.flatMap(document=>{
  const identity=p.manifest.documents.find(d=>d.id===document.packageDocumentId);
  const spans=record.source_spans.filter(s=>s.page>=identity.first_package_page&&s.page<=identity.last_package_page)
   .map(s=>({...s,page:s.page-identity.first_package_page+1}));
  if(!spans.length)return [];
  const firstSpan=record.source_spans.findIndex(s=>s.page>=identity.first_package_page&&s.page<=identity.last_package_page);
  return [{document,spans,passages:lawReaderPassages(document.pages,spans,record.locator),firstSpan}];
 });
 return sources.sort((a,b)=>a.firstSpan-b.firstSpan).map(({firstSpan:_firstSpan,...source})=>source);
}
