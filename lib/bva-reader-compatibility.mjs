// Node-only byte proof for the additive BVA reader extension. This does not
// approve criteria, rewrite independent judgments, or ignore arbitrary drift.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const bvaReaderBeforeHash='c68503cdbad77fa84a61dbae16b54c495f980b67a190bd62d538060b1d55e7c9';
export const bvaReaderAfterHash='109908b5925d48e6052eef589c066b26d835d2ce80d2d39171693023501e2590';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const changes=[
 ["import {bvaDocument,bvaIndex} from './foundations/bva.mjs';\n",''],
 ['const documents=[...pdfDocuments,...spreadsheetDocuments,doraFrameworkContextDocument,bvaDocument];','const documents=[...pdfDocuments,...spreadsheetDocuments,doraFrameworkContextDocument];'],
 ['const indexed=(document.id===bvaDocument.id?bvaIndex:null)||doraFrameworkContextIndex(document,reference)||passageIndex[document.id];','const indexed=doraFrameworkContextIndex(document,reference)||passageIndex[document.id];'],
];
function inverse(readerBytes){
 const fail=reason=>{throw Error('BVA exact reader compatibility: '+reason);};
 if(sha(readerBytes)!==bvaReaderAfterHash)fail('unknown current reader bytes');
 let previous=readerBytes.toString('utf8');
 for(const [current,closed] of changes){
  if(previous.split(current).length!==2)fail('non-exact BVA-only change');
  previous=previous.replace(current,closed);
 }
 const bytes=Buffer.from(previous,'utf8');
 if(sha(bytes)!==bvaReaderBeforeHash)fail('inverse bytes differ from closed reader');
 return bytes;
}
export function closedBVAReaderBytes(readerBytes=readFileSync(new URL('./foundation-reader.mjs',import.meta.url))){
 return inverse(readerBytes);
}
export function verifyBVAReaderTransition(readerBytes){
 const previous=inverse(readerBytes);
 return {type:'EXACT_BVA_ONLY_READER_EXTENSION',moduleKey:'foundation-reader.mjs',beforeHash:bvaReaderBeforeHash,afterHash:bvaReaderAfterHash,inverseByteHash:sha(previous),changeCount:changes.length,scope:'Only one BVA import, one appended BVA document and a document-ID-scoped BVA index branch. Existing judgments and all other bytes remain unchanged.'};
}
