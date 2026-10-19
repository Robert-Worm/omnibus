// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/cio-source-review.mjs";
// Individually reviewed additions to the marked evidence, not inferred matches.
// Existing sourceControlIds stay stable so saved selections retain their links.
export const cioAdditionalRefs = data.cioAdditionalRefs;
export const cioCommentaryPassages = data.cioCommentaryPassages;
export const cioPreferredPassages = data.cioPreferredPassages;
export const cioAdditionalPages=data.cioAdditionalPages;
export function applyCioSourceReview(item){
  const addition=cioCommentaryPassages[item.id];
  const refs=cioAdditionalRefs[item.id];
  const result={...item};
  if(item.id==='CIO2026-A18-b') result.body=item.body.replace('voorgenomen wetgeving','voorgenomen of bestaande wet- en regelgeving');
  if(item.id==='CIO2026-A20-d') result.body=item.body.replace('voorgenomen wetgeving','voorgenomen of bestaande wet- en regelgeving');
  if(item.id==='CIO2026-A07-e4') result.title='CISO: beveiligingsinbreng voor de rijksbrede strategie';
  if(addition||refs){
    const [reference,pageList]=item.location.split(' · PDF p. ');
    const pages=[...new Set([...pageList.split(', ').map(Number),...(cioAdditionalPages[item.id]||[]),...(addition?[addition.page]:[])])].sort((a,b)=>a-b);
    result.location=reference+(addition?` · ${addition.label}`:'')+(refs?` · Aanvullende grondslag: art. ${refs.join(', ')}`:'')+` · PDF p. ${pages.join(', ')}`;
  }
  if(addition||refs||result.body!==item.body) result.sourceChanges+=' Broncontrole 12 september 2026: norm en gemarkeerde onderbouwing opnieuw vergeleken; aanvullende grondslagen blijven onderscheiden van de kernbepaling.';
  return result;
}
