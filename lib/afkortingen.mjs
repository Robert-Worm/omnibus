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
  {afkorting:'lead overseer',vormen:['lead overseers','lead overseer'],voluit:'leidende toezichthouder',uitleg:'De Europese toezichthoudende autoriteit (EBA, EIOPA of ESMA) die het toezicht leidt op een kritieke ICT-dienstverlener. De Nederlandse DORA-tekst gebruikt zelf de term „lead overseer”.'},
  {afkorting:'JON',voluit:'gezamenlijk toezichtsnetwerk (Joint Oversight Network)',uitleg:'Overleg van de leidende toezichthouders op kritieke ICT-dienstverleners (artikel 34 DORA).'},
  {afkorting:'PDF',bekend:true,voluit:'documentformaat PDF'},
  // Andere kaders (9 november 2026): CIO-stelsel, BVA, WWKE en IIA Topical Requirements.
  {afkorting:'CIO',vormen:['CIO’s',"CIO's",'CIO'],voluit:'Chief Information Officer',uitleg:'Bestuurder die verantwoordelijk is voor informatievoorziening en ICT; in het Rijk de CIO van een ministerie of de CIO Rijk.'},
  {afkorting:'CISO',vormen:['CISO’s',"CISO's",'CISO'],voluit:'Chief Information Security Officer',uitleg:'Functionaris die verantwoordelijk is voor informatiebeveiliging.'},
  {afkorting:'BVA',vormen:['BVA’s',"BVA's",'BVA'],voluit:'beveiligingsambtenaar',uitleg:'Functionaris die binnen een ministerie de integrale beveiliging coördineert.'},
  {afkorting:'BZK',voluit:'ministerie van Binnenlandse Zaken en Koninkrijksrelaties'},
  {afkorting:'JenV',voluit:'ministerie van Justitie en Veiligheid'},
  {afkorting:'VIR',voluit:'Voorschrift Informatiebeveiliging Rijksdienst'},
  {afkorting:'PDCA',voluit:'plan-do-check-act',uitleg:'Verbetercyclus: plannen, uitvoeren, controleren en bijsturen.'},
  {afkorting:'CER',voluit:'CER-richtlijn, Richtlijn (EU) 2022/2557',uitleg:'Europese richtlijn over de weerbaarheid van kritieke entiteiten (Engels: critical entities resilience).'},
  {afkorting:'Wwke',vormen:['Wwke','WWKE'],voluit:'Wet weerbaarheid kritieke entiteiten'},
  {afkorting:'IIA',voluit:'Institute of Internal Auditors',uitleg:'Internationale beroepsorganisatie van interne auditors; stelt de Global Internal Audit Standards en de Topical Requirements op.'},
  {afkorting:'IPPF',voluit:'International Professional Practices Framework',uitleg:'Het geheel van standaarden en richtlijnen van het IIA.'},
  {afkorting:'CAE',vormen:['CAE’s',"CAE's",'CAE'],voluit:'hoofd interne audit (chief audit executive)'},
  {afkorting:'COSO',voluit:'Committee of Sponsoring Organizations of the Treadway Commission',uitleg:'Opsteller van veelgebruikte modellen voor interne beheersing en risicomanagement.'},
  {afkorting:'ERM',voluit:'organisatiebreed risicomanagement (enterprise risk management)'},
  {afkorting:'NIST',voluit:'National Institute of Standards and Technology',uitleg:'Amerikaans instituut dat onder meer het Cybersecurity Framework publiceert.'},
  {afkorting:'ISO',voluit:'Internationale Organisatie voor Standaardisatie'},
  {afkorting:'BCP',vormen:['BCP’s',"BCP's",'BCP'],voluit:'bedrijfscontinuïteitsplan (business continuity plan)'},
  {afkorting:'KPI',vormen:['KPI’s',"KPI's",'KPI'],voluit:'kritieke prestatie-indicator (key performance indicator)'},
  {afkorting:'KRI',vormen:['KRI’s',"KRI's",'KRI'],voluit:'kritieke risico-indicator (key risk indicator)'},
  {afkorting:'IT',bekend:true,voluit:'informatietechnologie'},
  {afkorting:'HR',bekend:true,voluit:'personeelszaken (human resources)'},
  // Panel 9 november 2026: afkortingen zonder uitleg in DORA- en NOREA-teksten.
  {afkorting:'SCM',voluit:'beheer van de toeleveringsketen (supply chain management)'},
  {afkorting:'SOC',voluit:'System and Organization Controls',uitleg:'Assurancerapport van een dienstverlener over de opzet en werking van zijn beheersmaatregelen.'},
  {afkorting:'BRRD',voluit:'Richtlijn herstel en afwikkeling van banken (Richtlijn 2014/59/EU)'},
  {afkorting:'SIEM',voluit:'security information and event management',uitleg:'Systeem dat beveiligingsmeldingen en logboeken verzamelt en analyseert.'},
  {afkorting:'IAM',voluit:'identiteits- en toegangsbeheer (identity and access management)'},
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
