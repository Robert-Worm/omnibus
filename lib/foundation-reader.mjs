// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundation-reader.mjs";
import {documentHashes} from "@/lib/provision-status.mjs";
import {foundationDocumentFocus} from "@/lib/foundations/source-document-focus.mjs";
import {historicalFoundationPassages,recognizedVersionedReference} from "@/lib/foundation-passage-history.mjs";
import {doraFrameworkContextDocument,doraFrameworkContextIndex,doraFrameworkContextDocumentAllowed} from "@/lib/foundations/dorafc-context.mjs";
import {eedVersionedPassages} from "@/lib/foundations/eed-versioned-passages.mjs";
const {documents,passageIndex,bvaIndex}=data;const bvaDocument=documents.find(d=>d.id==="BVA2021-main");
export {documents as foundationDocuments};
export const isSpreadsheetSource = document => document?.format === 'xlsx-cells';
export const foundationDocumentHash = document => isSpreadsheetSource(document) ? document.source_file_hash : document.pdf_hash;
export const foundationLocationLabel = (document, fragment) => isSpreadsheetSource(document)
  ? document.pages.find(p=>p.page===fragment)?.label || `Bronfragment ${fragment}` : `p. ${fragment}`;

/** @returns {{start:number,end:number,page:number,label:string,quote:string,primary?:boolean}[]} */
export function foundationPassages(document,reference={}) {
  const eed=eedVersionedPassages(document,reference);
  if(eed!==null)return eed;
  if(!recognizedVersionedReference(reference))return [];
  if(reference.sourceDocumentHashes && !Object.values(documentHashes(reference)).includes(reference.sourceHash))return [];
  const indexed=(document.id===bvaDocument.id?bvaIndex:null)||doraFrameworkContextIndex(document,reference)||passageIndex[document.id];
  const hash=documentHashes(reference)[document.id] || reference.sourceHash;
  if(!reference.sourceControlId || hash!==foundationDocumentHash(document) ||
    (isSpreadsheetSource(document)?indexed?.sourceHash:indexed?.pdfHash)!==foundationDocumentHash(document) || indexed?.textHash!==document.source_sha256) return [];
  return historicalFoundationPassages(document,reference) || indexed.entries[reference.sourceControlId] || [];
}

// An explicit, reviewed focal passage wins over document order. Do not infer
// legal relevance from word similarity, page number or the shortest excerpt.
export function foundationPassageTarget(document,reference={}) {
  const passages=foundationPassages(document,reference);
  if(historicalFoundationPassages(document,reference))return passages.find(p=>p.primary)||passages[0];
  const reviewed=foundationDocumentFocus[reference.sourceControlId?.split(' · ')[0]];
  if(reviewed?.documentId===document.id&&reviewed.pdfHash===document.pdf_hash&&reviewed.textHash===document.source_sha256){
    return passages.find(p=>p.start===reviewed.start&&p.label===reviewed.label);
  }
  return passages.find(p=>p.primary) || passages[0];
}
/** @param {typeof documents} choices @param {any} reference @returns {typeof documents} */
function preferReviewedDocument(choices,reference){
  if(choices.some(d=>historicalFoundationPassages(d,reference)))return choices;
  const target=foundationDocumentFocus[reference.sourceControlId?.split(' · ')[0]];
  const preferred=target&&choices.find(d=>d.id===target.documentId&&d.pdf_hash===target.pdfHash&&d.source_sha256===target.textHash&&foundationPassageTarget(d,reference));
  return preferred?[preferred,...choices.filter(d=>d!==preferred)]:choices;
}

// Only link a saved criterion to the exact reviewed PDF version. Source IDs alone
// are sufficient for catalogue browsing, never for claiming snapshot provenance.
export function documentsForFoundation(reference = {}) {
  const id = reference.sourceId || reference.foundationId || reference.sourceControlId?.split(' · ')[0];
  const main = documents.find(d => d.sourceId === id && d.role === 'main');
  const belongs=d=>d.id===doraFrameworkContextDocument.id
    ?doraFrameworkContextDocumentAllowed(d,reference)
    :d.sourceId===id||doraFrameworkContextDocumentAllowed(d,reference);
  if(reference.sourceDocumentHashes){
    const hashes=documentHashes(reference);
    // Fail closed if even one expected source version is unavailable or changed.
    const expected=Object.entries(hashes);
    if(!expected.length || !Object.values(hashes).includes(reference.sourceHash) || expected.some(([key,hash])=>!documents.some(d=>belongs(d)&&d.id===key&&foundationDocumentHash(d)===hash)))return [];
    return preferReviewedDocument(documents.filter(d=>belongs(d)&&hashes[d.id]===foundationDocumentHash(d))
      .filter(d=>!isSpreadsheetSource(d)||!reference.sourceControlId||foundationPassages(d,reference).length)
      .sort((a,b)=>(foundationDocumentHash(a)===reference.sourceHash?-1:0)-(foundationDocumentHash(b)===reference.sourceHash?-1:0)),reference);
  }
  if (!main || (reference.sourceHash && foundationDocumentHash(main) !== reference.sourceHash)) return [];
  if(isSpreadsheetSource(main)&&reference.sourceControlId&&!foundationPassages(main,reference).length)return [];
  return preferReviewedDocument(documents.filter(d => d.sourceId === id && (!reference.sourceControlId || d.role==='main'||d.role==='guide'))
    .sort((a,b)=>(a.role==='main'?-1:0)-(b.role==='main'?-1:0)),reference);
}

// Physical page numbers only. Printed page offsets are handled solely where the
// existing reviewed metadata explicitly supplies them. Unknown references open p1.
export function foundationReaderPages(document, reference = {}) {
  const marked=foundationPassages(document,reference);
  if(marked.length)return [...new Set(marked.map(p=>p.page))];
  // XLSX fragment indices are internal navigation keys, never physical PDF pages.
  if(isSpreadsheetSource(document))return [];
  if(reference.sourceDocumentHashes && reference.sourceHash && document.pdf_hash!==reference.sourceHash)return [1];
  // Companion publications are available for verification, but consolidated page
  // references do not identify a page in a different original/amendment edition.
  if(reference.sourceDocumentHashes && document.role!=='main' && document.role!=='guide')return [1];
  const location = reference.location || '';
  const part = document.role === 'guide' ? location.split(/handleiding/i)[1] || '' : location.split(';')[0];
  let numbers = part.match(/PDF\s*(?:p\.\s*)?(\d[\d, –-]*)/i)?.[1];
  if (!numbers && /PDF gelijk/i.test(part)) numbers = part.match(/p\.\s*(\d[\d, –-]*)/i)?.[1];
  if (!numbers && document.role === 'main' && document.sourceId === 'DEVOPS')
    numbers = part.match(/p\.\s*(\d[\d, –-]*)/i)?.[1] || reference.sourceUrl?.match(/#page=(\d+)/)?.[1];
  // Legacy snapshots only stored printed guide pages. This hash-bound edition
  // has two unnumbered front pages (physical p3 is printed p1).
  let offset = 0;
  if (!numbers && document.role === 'guide' && document.sourceId === 'TR-CYBER')
    {numbers = part.match(/p\.\s*(\d[\d, –-]*)/i)?.[1]; offset = 2;}
  const pages = [];
  for (const token of (numbers || '').split(',')) {
    const range = token.trim().match(/^\d+(?:\s*[–-]\s*\d+)*$/)?.[0].split(/[–-]/).map(Number);
    if (!range) continue;
    const start = range[0] + offset, end = range.at(-1) + offset;
    if (start < 1 || end < start || end > document.pages.length) continue;
    for (let page = start; page <= end; page++) pages.push(page);
  }
  return [...new Set(pages)];
}

export default data;
