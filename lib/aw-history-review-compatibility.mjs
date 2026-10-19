// Node-only, exact technical compatibility transition; not a semantic approval.
// Keep the closed AW adapter, review and evidence immutable. Only the proven
// CSRD-only history extension may be projected for the recordHash comparison.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const moduleKey='foundation-passage-history.mjs';
const beforeHash='11bb3d36fb4dbac5d4a39e156468ecd4da531d3a341a06f3979ede84d2eaf8cb';
const afterHash='be746bc5a1c06129daf55f4f9b9afbc8fd17d29f041d5ea669389c76a4c31df1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const additions=[
 "import csrdHistory from './foundations/csrd-source-passage-history.json' with {type:'json'};\n",
 "import {csrdItems} from './foundations/csrd.mjs';\n",
 ',...csrdHistory.entries',
 " if(['CSRD-001','CSRD-005','CSRD-055'].includes(reference.sourceControlId)){\n  const current=csrdItems.find(p=>p.sourceControlId===reference.sourceControlId);\n  return Boolean(reference.location&&(current?.location===reference.location||csrdHistory.entries.some(p=>p.id===reference.sourceControlId&&p.location===reference.location)));\n }\n",
];

export function verifyAWHistoryTransition(historyBytes){
 const fail=reason=>{throw Error('AW exact history compatibility: '+reason);};
 if(sha(historyBytes)!==afterHash)fail('unknown current history bytes');
 let previous=historyBytes.toString('utf8');
 for(const addition of additions){
  if(previous.split(addition).length!==2)fail('non-exact CSRD-only addition');
  previous=previous.replace(addition,'');
 }
 if(sha(previous)!==beforeHash)fail('inverse bytes differ from closed AW history');
 return {type:'EXACT_CSRD_ONLY_HISTORY_EXTENSION',moduleKey,beforeHash,afterHash,inverseByteHash:sha(previous),scope:'Only the AW recordHash history-module component; no semantic reapproval, review/evidence rewrite or normalization of runtime, source rows, groups or other record fields.'};
}

export function awHistoryCompatiblePackage(pkg){
 const fail=reason=>{throw Error('AW exact history compatibility: '+reason);};
 if(pkg.sourceId!=='AW')fail('unsupported source');
 const compatibility=verifyAWHistoryTransition(readFileSync(new URL('./foundation-passage-history.mjs',import.meta.url)));
 const originals=new Map(pkg.records.map(r=>[r.id,r]));
 const records=pkg.records.map(record=>{
  if(record.shared?.moduleHashes?.[moduleKey]!==afterHash)fail('record history hash differs from current bytes');
  return {...record,shared:{...record.shared,moduleHashes:{...record.shared.moduleHashes,[moduleKey]:beforeHash}}};
 });
 return {...pkg,records,
  // Source validation still uses the untouched current record and current API.
  sourceRows:record=>pkg.sourceRows(originals.get(record.id)),
  compatibility,
 };
}
