import {validateInvestigation} from './investigation.mjs';
import {cioLegacyOriginKeys,cioReplacements} from './foundations/cio-stelsel.mjs';

// Both notices describe the same selected snapshot. Validate it once per call;
// never cache user evidence or replace its saved text, IDs or question links.
export function cioSelectionNotices(draft) {
 const materials=validateInvestigation(draft.investigation).materials;
 const included=new Set(draft.included),legacyKeys=new Set(cioLegacyOriginKeys);
 const replacements=new Map(cioReplacements.map(p=>[p.oldOriginKey,p]));
 const legacy=[],superseded=[];
 for(const material of materials){
  if(!included.has(material.id))continue;
  if(legacyKeys.has(material.originKey))legacy.push(material);
  if(replacements.has(material.originKey))superseded.push({...material,...replacements.get(material.originKey)});
 }
 return {legacy,superseded};
}

// Preserve the existing individual query API for other callers.
export const legacyCioMaterials=draft=>cioSelectionNotices(draft).legacy;
export const supersededCioMaterials=draft=>cioSelectionNotices(draft).superseded;
