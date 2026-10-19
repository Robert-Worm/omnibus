// Runtime logic retained from the reviewed local application; content comes from the pinned database.
// Explicit supplementary routes. The original NOREA and DORA documents stay intact.
import data from "@/lib/foundations/dorafc-context.json" with {type:'json'};
import {documentHashes} from "@/lib/provision-status.mjs";

export const doraFrameworkContextDocument=data.workbook.document;
export const doraFrameworkLawContextRefs=data.law.refs;
export const doraFrameworkCellContextRefs=data.workbook.refs;
export const doraFrameworkContextData=data;

export function doraFrameworkContextHashes(code){
 return {...(data.law.refs[code]?{[data.law.documentId]:data.law.pdfHash}:{}),
  ...(data.workbook.refs[code]?{[data.workbook.document.id]:data.workbook.sourceHash}:{})};
}
export function doraFrameworkContextLocation(code){
 const parts=[];
 if(data.law.refs[code])parts.push('bestaande DORA-publicatie: '+data.law.refs[code].join(', '));
 if(data.workbook.refs[code])parts.push('aanvullende lokale broncellen: '+data.workbook.refs[code].map(r=>r.sheet+'!'+r.cell).join('; '));
 return parts.join('; ');
}
export function doraFrameworkContextIndex(document,reference={}){
 const sourceId=reference.sourceId||reference.foundationId,code=reference.sourceControlId;
 if(sourceId!=='DORAFC'||!code?.startsWith('DORAFC-'))return null;
 const hashes=documentHashes(reference);
 if(reference.sourceHash!==data.workbookHash||hashes['DORAFC-main']!==data.workbookHash)return null;
 if(document.id===data.law.documentId&&document.sourceId==='DORA'&&document.pdf_hash===data.law.pdfHash&&document.source_sha256===data.law.textHash&&hashes[document.id]===data.law.pdfHash&&data.law.entries[code])return {pdfHash:data.law.pdfHash,textHash:data.law.textHash,entries:data.law.entries};
 if(document.id===data.workbook.document.id&&document.sourceId==='DORAFC'&&document.source_file_hash===data.workbook.sourceHash&&document.source_sha256===data.workbook.textHash&&hashes[document.id]===data.workbook.sourceHash&&data.workbook.entries[code])return {sourceHash:data.workbook.sourceHash,textHash:data.workbook.textHash,entries:data.workbook.entries};
 return null;
}
// Used at both ownership filters. No general cross-foundation document access.
export function doraFrameworkContextDocumentAllowed(document,reference={}){
 return Boolean(doraFrameworkContextIndex(document,reference));
}
export function doraFrameworkContextNotice(document,reference={}){
 if(!doraFrameworkContextIndex(document,reference))return '';
 if(document.id===data.law.documentId)return 'Aanvullende context uit de reeds opgenomen DORA-publicatie. De oorspronkelijke NOREA-hoofdcontrol blijft in zijn eigen brondocument beschikbaar; deze verwijzing vervangt die broncontrol niet.';
 return 'Aanvullende lokale DORA-/RTS-weergave uit de NOREA-werkmap, geen nieuwe officiële of automatisch actuele publicatie. De volledige getoonde cel is context; de markering hoort bij dit criterium. '+(data.notices[reference.sourceControlId.slice(7)]||'Bepaal toepasselijkheid en de voorwaarden bij de gemarkeerde passage afzonderlijk.');
}
