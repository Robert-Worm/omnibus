// Afkortingen in bron- en kaderteksten (besluit beheerder 8 november 2026).
// Alleen voor de weergave in de viewer: de opgeslagen tekst, normtekst en export
// blijven ongewijzigd. Uitleg is een leeshulp, geen juridische definitie.
// `bekend`: alleen markeren, niet de eerste keer voluit erbij zetten.
export const afkortingen = [
  {afkorting:'DORA',bekend:true,voluit:'Digital Operational Resilience Act, Verordening (EU) 2022/2554',uitleg:'Europese verordening over digitale operationele weerbaarheid van de financiële sector.'},
  {afkorting:'ICT',bekend:true,voluit:'informatie- en communicatietechnologie'},
  {afkorting:'RTS',voluit:'technische reguleringsnormen',uitleg:'Gedelegeerde verordening van de Europese Commissie die een onderdeel van DORA nader uitwerkt (Engels: regulatory technical standards).'},
  {afkorting:'ITS',voluit:'technische uitvoeringsnormen',uitleg:'Uitvoeringsverordening die bijvoorbeeld formulieren en procedures vastlegt (Engels: implementing technical standards).'},
  {afkorting:'ETA',vormen:['ETA’s',"ETA's",'ETA'],voluit:'Europese toezichthoudende autoriteiten',uitleg:'EBA, EIOPA en ESMA samen (Engels: ESA’s).'},
  {afkorting:'ESA',vormen:['ESA’s',"ESA's",'ESAs','ESA'],voluit:'European Supervisory Authorities (Europese toezichthoudende autoriteiten)',uitleg:'EBA, EIOPA en ESMA samen.'},
  {afkorting:'EBA',voluit:'Europese Bankautoriteit'},
  {afkorting:'EIOPA',voluit:'Europese Autoriteit voor verzekeringen en bedrijfspensioenen'},
  {afkorting:'ESMA',voluit:'Europese Autoriteit voor effecten en markten'},
  {afkorting:'ESRB',voluit:'Europees Comité voor systeemrisico’s'},
  {afkorting:'ECB',voluit:'Europese Centrale Bank'},
  {afkorting:'ESCB',voluit:'Europees Stelsel van centrale banken'},
  {afkorting:'DNB',voluit:'De Nederlandsche Bank'},
  {afkorting:'AFM',voluit:'Autoriteit Financiële Markten'},
  {afkorting:'EU',bekend:true,voluit:'Europese Unie'},
  {afkorting:'VWEU',voluit:'Verdrag betreffende de werking van de Europese Unie'},
  {afkorting:'TLPT',voluit:'dreigingsgestuurde penetratietest',uitleg:'Een geavanceerde test waarbij een team een echte aanval nabootst op de kritieke systemen in productie (Engels: threat-led penetration testing).'},
  {afkorting:'BIA',voluit:'bedrijfsimpactanalyse',uitleg:'Analyse van de gevolgen van een ernstige verstoring voor de bedrijfsvoering.'},
  {afkorting:'RTO',voluit:'hersteltijddoelstelling',uitleg:'De maximale tijd waarbinnen een functie of systeem na een verstoring weer moet werken (Engels: recovery time objective).'},
  {afkorting:'RPO',voluit:'herstelpuntdoelstelling',uitleg:'Hoeveel gegevensverlies, gemeten in tijd, maximaal aanvaardbaar is (Engels: recovery point objective).'},
  {afkorting:'CIA',voluit:'beschikbaarheid, integriteit en vertrouwelijkheid',uitleg:'Engels: confidentiality, integrity, availability. Hier niet de Amerikaanse inlichtingendienst.'},
  {afkorting:'CSD',vormen:['CSD’s',"CSD's",'CSD'],voluit:'centrale effectenbewaarinstelling'},
  {afkorting:'CCP',vormen:['CCP’s',"CCP's",'CCP'],voluit:'centrale tegenpartij'},
  {afkorting:'LEI',voluit:'identificatiecode voor juridische entiteiten (Legal Entity Identifier)'},
  {afkorting:'EUID',voluit:'Europese unieke identificatiecode van een onderneming'},
  {afkorting:'SLA',vormen:['SLA’s',"SLA's",'SLA'],voluit:'dienstverleningsovereenkomst (service level agreement)'},
  {afkorting:'NIS2',voluit:'NIS2-richtlijn, Richtlijn (EU) 2022/2555',uitleg:'Europese richtlijn over netwerk- en informatiebeveiliging.'},
  {afkorting:'CSIRT',vormen:['CSIRT’s',"CSIRT's",'CSIRT'],voluit:'computercrisisteam (computer security incident response team)'},
  {afkorting:'MFA',voluit:'meerfactorauthenticatie',uitleg:'Inloggen met ten minste twee onafhankelijke bewijzen, bijvoorbeeld wachtwoord en telefoon.'},
  {afkorting:'PAM',voluit:'beheer van bevoorrechte toegang (privileged access management)'},
  {afkorting:'RCA',voluit:'oorzaakanalyse (root cause analysis)'},
  {afkorting:'MSI',vormen:['MSI’s',"MSI's",'MSI'],voluit:'mondiaal systeemrelevante instelling'},
  {afkorting:'ASI',vormen:['ASI’s',"ASI's",'ASI'],voluit:'andere systeemrelevante instelling'},
  {afkorting:'CRD',voluit:'richtlijn kapitaalvereisten, Richtlijn 2013/36/EU'},
  {afkorting:'EMIR',voluit:'Europese verordening over otc-derivaten, centrale tegenpartijen en transactieregisters (Verordening (EU) nr. 648/2012)'},
  {afkorting:'NOREA',bekend:true,voluit:'beroepsorganisatie van IT-auditors in Nederland',uitleg:'Publiceert onder meer een praktisch toetsingskader voor DORA.'},
  {afkorting:'JON',voluit:'gezamenlijk toezichtsnetwerk (Joint Oversight Network)',uitleg:'Overleg van de leidende toezichthouders op kritieke ICT-dienstverleners (artikel 34 DORA).'},
  {afkorting:'PDF',bekend:true,voluit:'documentformaat PDF'},
];

const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const vormen=afkortingen.flatMap(entry=>(entry.vormen||[entry.afkorting]).map(vorm=>({vorm,entry}))).sort((a,b)=>b.vorm.length-a.vorm.length);
const patroon=new RegExp(`(?<![\\p{L}\\p{N}_/-])(${vormen.map(v=>escape(v.vorm)).join('|')})(?![\\p{L}\\p{N}_/])`,'gu');
const perVorm=new Map(vormen.map(v=>[v.vorm,v.entry]));

/** Deelt tekst op in gewone tekst en afkortingen. `eerste` markeert het eerste voorkomen per afkorting in deze tekst. */
export function afkortingDelen(text){
  const delen=[],gezien=new Set();let vorige=0;
  for(const match of String(text||'').matchAll(patroon)){
    const entry=perVorm.get(match[1]);if(!entry)continue;
    if(match.index>vorige)delen.push({text:text.slice(vorige,match.index)});
    delen.push({text:match[1],afkorting:entry,eerste:!gezien.has(entry.afkorting),koppel:text[match.index+match[1].length]==='-'});
    gezien.add(entry.afkorting);vorige=match.index+match[1].length;
  }
  if(vorige<String(text||'').length)delen.push({text:String(text).slice(vorige)});
  return delen;
}
