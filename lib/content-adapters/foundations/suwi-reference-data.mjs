// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/suwi-reference-data.mjs";
// Physical pages, identical to the printed pagination of the frozen 81-page edition.
// No original BIO/ISO/NOREA text is embedded in this location index.
export const suwiLocations=data.suwiLocations;
export function suwiLocation(record){
 const pages=[...new Set(record.refs.flatMap(ref=>{if(!suwiLocations[ref])throw Error('Missing Suwinet source location '+ref);return suwiLocations[ref];}))].sort((a,b)=>a-b);
 const section=record.group==='KETEN'?`${record.codes.join(' / ')} · ${record.title}`:`Bijlage 3 · ${record.codes.join(' / ')} · ${record.title}`;
 return {pages,section};
}

// Exact historical references from the published 2024 catalogue. Saved work
// retains its original citation; a current title or extra page must not replace it.
const historicalSuwiReferences=data.historicalSuwiReferences;
export function resolveSuwiReference(reference,current){
 if((reference.sourceId||reference.foundationId)!=='SUWI'||reference.sourceHash!=='41fc1428e79954ceb96a3bb10db786cf451d253a7efc29552b8a1a59ce28a778'||reference.sourceControlId!==current?.code)return null;
 if(!reference.location)return current;
 const matches=entry=>entry&&(reference.location===entry.section||reference.location===`${entry.section} · PDF / gedrukt p. ${entry.pages.join(', ')}`);
 // Full locations disambiguate T01, whose title is unchanged but pages expand.
 if(reference.location===`${current.section} · PDF / gedrukt p. ${current.pages.join(', ')}`)return current;
 const historical=historicalSuwiReferences[reference.sourceControlId];
 if(matches(historical))return {...historical,code:reference.sourceControlId};
 return matches(current)?current:null;
}
