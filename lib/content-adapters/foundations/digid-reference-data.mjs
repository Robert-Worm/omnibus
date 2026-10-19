// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/digid-reference-data.mjs";
export const digidSupplementSources=data.digidSupplementSources;
export function digidLocation(record){
 return {pages:record.pages,section:`${record.ma?'Bijlage 5 · Meervoudig assessment (tabelkop noemt abusievelijk 4)':record.evidence?'Bijlage 6 · Kwaliteit van auditbewijs':'Bijlage 3'} · ${record.code} · ${record.title}`};
}
export function digidAdditionalReferences(record){
 return [...(record.supplements||[]),'LOGIUS','DECEMBER'].map(k=>digidSupplementSources[k]);
}

// Saved project snapshots keep their exact original citation, not a new title/page set.
const historicalDigiDReferences=data.historicalDigiDReferences;
export function resolveDigiDReference(reference,current){
 if((reference.sourceId||reference.foundationId)!=='DIGID'||reference.sourceHash!=='c829e5c8f436a78d01a3f57f9cfa07aac8443a4a1b662aa06f2badd8c633455d'||reference.sourceControlId!==current?.code)return null;
 if(!reference.location)return current;
 const matches=entry=>entry&&(reference.location===entry.section||reference.location===`${entry.section} · PDF / gedrukt p. ${entry.pages.join(', ')}`);
 if(reference.location===`${current.section} · PDF / gedrukt p. ${current.pages.join(', ')}`)return current;
 const historical=historicalDigiDReferences[reference.sourceControlId];
 if(matches(historical))return {...current,...historical};
 return matches(current)?current:null;
}
