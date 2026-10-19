// Short orientation copy, not a claim of legal applicability or model suitability.
export const catalogueDescriptions={
 bronnen:{
  energy:'Energiegebruik en verduurzaming van gebouwen en bedrijfsvoering.',
  procurement:'Inkoop, leveranciersafspraken en beheersing van uitbestede diensten.',
  privacy:'Omgaan met persoonsgegevens, gegevensdeling en bescherming van betrokkenen.',
  cyber:'Informatiebeveiliging, digitale weerbaarheid en continuïteit.',
  it:'Digitale voorzieningen, IT-dienstverlening en technologische verandering.',
  governance:'Sturing, verantwoordelijkheden, risicobeheersing en gedrag.',
  information:'Informatie bewaren, terugvinden en openbaar maken.',
  audit:'De inrichting, uitvoering en kwaliteitsbewaking van internal audit.',
 },
 modellen:{
  gedrag:'Gedrag, samenwerking en de cultuur waarin mensen hun werk doen.',
  verandering:'Hoe mensen en organisaties verandering begrijpen, uitvoeren en volhouden.',
  dienstverlening:'De inrichting en ervaren kwaliteit van dienstverlening.',
  risico:'Kwetsbaarheden, beheersing en het omgaan met fouten en onzekerheid.',
 },
};
export const catalogueDescription=(noun,id)=>catalogueDescriptions[noun]?.[id]||'';
export const scopeFoundationSources=(sources,scope)=>sources.filter(source=>scope==='laws'?source.kind==='law':scope==='frameworks'?source.kind!=='law':true);
export function searchCatalogueGroups(groups,noun,query){
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const terms=normalize(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
 return terms.length?groups.filter(group=>terms.every(term=>normalize(group.title+' '+catalogueDescription(noun,group.id)).includes(term))):groups;
}
