// Node-only exact provenance transition, not a new semantic approval.
// Closed AW adapter/review remain untouched; the existing CSRD compatibility
// is composed explicitly at call sites and retains its own proof.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bvaReaderAfterHash,closedBVAReaderBytes,verifyBVAReaderTransition} from './bva-reader-compatibility.mjs';

const moduleKey='foundation-reader.mjs';
const beforeHash='01df29c35ef7c89ac90d94a27e544227b475a2defb155116eedd597616c2d451';
const afterHash='c68503cdbad77fa84a61dbae16b54c495f980b67a190bd62d538060b1d55e7c9';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const additions=[
 "import {eedVersionedPassages} from './foundations/eed-versioned-passages.mjs';\n",
 '  const eed=eedVersionedPassages(document,reference);\n  if(eed!==null)return eed;\n',
];
export function verifyAWReaderTransition(readerBytes){
 const fail=reason=>{throw Error('AW exact reader compatibility: '+reason);};
 const bvaTransition=sha(readerBytes)===bvaReaderAfterHash?verifyBVAReaderTransition(readerBytes):null;
 if(bvaTransition)readerBytes=closedBVAReaderBytes(readerBytes);
 if(sha(readerBytes)!==afterHash)fail('unknown current reader bytes');
 let previous=readerBytes.toString('utf8');
 for(const addition of additions){
  if(previous.split(addition).length!==2)fail('non-exact EED-only addition');
  previous=previous.replace(addition,'');
 }
 if(sha(previous)!==beforeHash)fail('inverse bytes differ from closed AW reader');
 return {type:'EXACT_EED_ONLY_READER_EXTENSION',moduleKey,beforeHash,afterHash,inverseByteHash:sha(previous),...(bvaTransition?{bvaTransition}:{}),scope:'Only the AW recordHash reader-module component; all authored fields, runtime, source rows, groups and other hashes remain checked by the unchanged semantic gate.'};
}
export function awReaderCompatiblePackage(pkg){
 const fail=reason=>{throw Error('AW exact reader compatibility: '+reason);};
 if(pkg.sourceId!=='AW')fail('unsupported source');
 const currentBytes=readFileSync(new URL('./foundation-reader.mjs',import.meta.url));
 const readerTransition=verifyAWReaderTransition(currentBytes);
 const originals=new Map(pkg.records.map(r=>[r.id,r]));
 const records=pkg.records.map(record=>{
  if(record.shared?.moduleHashes?.[moduleKey]!==sha(currentBytes))fail('record reader hash differs from current bytes');
  return {...record,shared:{...record.shared,moduleHashes:{...record.shared.moduleHashes,[moduleKey]:beforeHash}}};
 });
 return {...pkg,records,sourceRows:record=>pkg.sourceRows(originals.get(record.id)),
  compatibility:{...(pkg.compatibility||{}),readerTransition},
 };
}
