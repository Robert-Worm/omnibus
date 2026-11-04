// Labels describe the document's recorded role, not its legal applicability.
const roles={
 'original-publication':'Oorspronkelijke publicatie',
 'frozen original-publication; referenced without rewriting':'Oorspronkelijke publicatie; de vastgelegde tekst blijft behouden',
 'original-publication; comparison evidence':'Oorspronkelijke publicatie, gebruikt voor tekstvergelijking',
 'consolidated-reading-basis':'Samengevoegde tekst met wijzigingen, gebruikt als leesbasis',
 'sector-consolidated-reading-basis':'Samengevoegde sectorwetgeving, gebruikt als leesbasis',
 corrigendum:'Officiële rectificatie van de publicatie',
 PRIMARY_ORIGINAL_NL:'Oorspronkelijke Nederlandse publicatie',
 AUTHENTIC_CORRIGENDUM_NL:'Officiële Nederlandse rectificatie',
 CONSOLIDATED_READING_AID_ONLY:'Samengevoegde tekst met wijzigingen, uitsluitend als leeshulp',
 'language-comparison-context':'Andere taalversie, gebruikt voor vergelijking en uitleg',
 'language-comparison':'Andere taalversie, gebruikt voor vergelijking',
 'external-text-context':'Aanvullende brontekst voor context',
 'external-context':'Aanvullende bron voor de context',
 'original-guideline':'Oorspronkelijke richtsnoeren',
 'original-directive':'Oorspronkelijke richtlijn',
};
export function frameworkSourceRole(role=''){return Object.hasOwn(roles,role)?roles[role]:role;}
export function frameworkSourceLink(url=''){
 try{const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password?parsed.href:undefined;}catch{return undefined;}
}
