// Short catalogue explanations of the current offer, not broader normative
// coverage or changes to frozen source records, theme IDs or saved selections.
const descriptions = {
  'informatieveilig-gedrag':'Veilig omgaan met informatie in het dagelijks werk: delen, wachtwoorden, AI-tools, incidenten melden en het voorbeeld van leidinggevenden.',
  'backup-herstel':'Back-up en herstel van cloudgegevens, vanuit M365: volledigheid, maatwerk, hersteltests, toegangsrechten en vertrek bij de leverancier.',
  'uitvoerbaarheid-beleid':'Uitvoeringstoetsen bij nieuw beleid: opdracht, betrokken mensen, tijd en capaciteit, advies en de opvolging daarvan.',
  'informatie-op-orde':'Informatiebeheer verbeteren: mensen en kennis, bewaren en terugvinden, systeemkeuzes en het meten van werkelijke voortgang.',
  'samenwerking-beleid-uitvoering':'Samenwerken tussen opdrachtgever en uitvoerder: doelen, prioriteiten, kosten, taakverdeling, rapportages en haalbare afspraken.',
  'betaalprocessen':'Betalingen aan burgers, vanuit Toeslagen: rekeninggegevens, uitgestelde betalingen, klachten en wat de tijdigheidsmeting laat zien.',
  'duurzame-bedrijfsvoering':'Duurzame keuzes uitvoeren en vasthouden: inkoop, hergebruik, cloudcapaciteit, betrokkenheid van teams en leren van praktijkvoorbeelden.',
  'organisatie-inrichting':'Een nieuwe autoriteit inrichten: taken en besluiten, onafhankelijkheid, gegevensuitwisseling, financiering, mensen en bruikbaar advies.',
  'gegevensbevragingen':'CIOT-bevragingen in de opsporing: bevoegdheden, ondertekende vorderingen, vastlegging, toegangsrechten en interne controles.',
  'crisisregelingen':'Tijdelijke steunregelingen, vanuit TEK: ingrijpen afwegen, doelgroep bepalen, uitvoering organiseren, voorschotten uitleggen en effecten onderzoeken.',
};
export function describeThemes(themes, framework) {
  const lines=new Map(framework.lines.map(l=>[l.id,l]));
  return themes.map(t=>{
    const criteria=t.lineIds.map(id=>lines.get(id)).filter(Boolean).map(l=>({id:l.id,title:l.title}));
    return {...t,criteria,description:descriptions[t.id] || (criteria.length ? 'Onder meer: '+criteria.slice(0,3).map(l=>l.title).join('; ')+'.' : '')};
  });
}
export function themeDiscoveryText(theme) {
  return [theme.id,theme.title,theme.keywords,theme.description,...theme.criteria.flatMap(c=>[c.id,c.title])].join(' ');
}
export function matchingThemeCriteria(theme, query) {
  const terms=query.trim().toLocaleLowerCase('nl').split(/\s+/).filter(Boolean);
  return terms.length ? theme.criteria.filter(c=>terms.every(t=>(c.id+' '+c.title).toLocaleLowerCase('nl').includes(t))) : [];
}
