import {wwkeBank,wwkeContext,wwkePages} from './wwke-law-data.mjs';
import {lawReaderPassages} from './law-source-reader.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';

export const wwkeReaderDocument={
 id:'WWKE-20260815-ASTRA-R1-PUBLICATION',
 title:wwkeContext.official_publication.identifier+' · oorspronkelijke publicatie',
 sourceUrl:wwkeContext.official_publication.url,
 source_sha256:wwkeBank.source_pages_sha256,
 pdf_hash:wwkeBank.source_pdf_sha256,
 pages:wwkePages.map(p=>({...p,readingLayout:'prose'})),
};
catalogueDerived(()=>wwkeReaderDocument.pages.splice(0,wwkeReaderDocument.pages.length,...wwkePages.map(p=>({...p,readingLayout:'prose'}))));
// Link-level spans are the exact contribution to this point, not every passage
// on the broader source record. Never match consolidation-only text to a PDF.
export function wwkeReaderPassages(link,record){
 if(record?.evidence_kind==='XML_ONLY')return [];
 return lawReaderPassages(wwkePages,link.visible_spans||[],record?.locator||link.record_id);
}
