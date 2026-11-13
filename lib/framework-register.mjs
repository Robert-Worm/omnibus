// Register van wetten en kaders: familie (bronnen die bij elkaar horen), een vaste werk-ID met versie,
// uitgever en datums. De werk-ID blijft gelijk als er later een nieuwe versie van dezelfde bron bijkomt;
// de versie onderscheidt ze. Datums zijn gecontroleerd tegen de bron in de viewer of de officiële publicatie.
import {frameworkPublication} from './framework-publication-facts.mjs';

export const frameworkFamilies={
 dora:{title:'DORA',description:'Digitale operationele weerbaarheid van de financiële sector: de verordening, de uitvoeringsregels, de richtsnoeren en handreikingen.'},
 iia:{title:'IIA-standaarden',description:'De Global Internal Audit Standards en de Topical Requirements van The Institute of Internal Auditors.'},
 rijk:{title:'Stelsels Rijksdienst',description:'Besluiten over de inrichting van functies binnen de rijksdienst, zoals het CIO-stelsel en het BVA-stelsel.'},
 cer:{title:'Kritieke entiteiten (CER)',description:'Weerbaarheid van kritieke entiteiten: de Europese CER-richtlijn en de Nederlandse uitwerking.'},
};
// rank: plaats binnen de familie (1 basisregeling, 2 uitvoeringsregel, 3 richtsnoer, 4 handreiking of beroepsuitwerking).
const eu=(number,instrument,extra={})=>({family:'dora',work:'EU '+number,instrument,rank:2,...extra});
const rts='RTS (gedelegeerde verordening)',its='ITS (uitvoeringsverordening)',del='Gedelegeerde verordening';
const iia='The Institute of Internal Auditors (IIA)';
/** @type {Record<string,{family:string,work:string,instrument:string,rank:number,version?:string,issuer?:string,published?:string,effective?:string,applies?:string,reference?:string}>} */
export const frameworkRegister={
 'CIO2026-REEXTRACT-1':{family:'rijk',work:'NL CIO-stelsel',instrument:'Besluit (interne regeling)',rank:1,version:'2026',issuer:'Staatssecretaris van BZK',published:'2025-12-16',effective:'2026-01-01',reference:'Staatscourant 2025, 40208'},
 'BVA2021':{family:'rijk',work:'NL BVA-stelsel',instrument:'Besluit (interne regeling)',rank:1,version:'2021',issuer:'Minister-President, Minister van Algemene Zaken',published:'2020-12',effective:'2021-01-01',reference:'Staatscourant 2020, 62845'},
 'WWKE-20260815-ASTRA-R1':{family:'cer',work:'NL Wwke',instrument:'Wet',rank:1,issuer:'Wetgever (regering en Staten-Generaal); Minister van Justitie en Veiligheid',published:'2026-07-10',effective:'2026-08-15',reference:'Staatsblad 2026, 188'},
 'GIAS-2024-NL':{family:'iia',work:'IIA GIAS',instrument:'Beroepsstandaard',rank:1,version:'2024',issuer:iia,published:'2024-01-09',effective:'2025-01-09',reference:'Nederlandse vertaling; Document Oordeelsvorming v1.0 (IIA Nederland)'},
 'TR-CYBER':{family:'iia',work:'IIA TR Cybersecurity',instrument:'Topical Requirement',rank:2,version:'2025',issuer:iia,published:'2025-02',effective:'2026-02-05',reference:'Uitgave februari 2025'},
 'TR-THIRD':{family:'iia',work:'IIA TR Third Party',instrument:'Topical Requirement',rank:2,version:'2025',issuer:iia,published:'2025-09',effective:'2026-09-15',reference:'Uitgave september 2025'},
 'TR-BEHAV':{family:'iia',work:'IIA TR Organizational Behavior',instrument:'Topical Requirement',rank:2,version:'2025',issuer:iia,published:'2025-12',effective:'2026-12-15',reference:'Uitgave december 2025'},
 'TR-RESIL':{family:'iia',work:'IIA TR Organizational Resilience',instrument:'Topical Requirement',rank:2,version:'2026',issuer:iia,published:'2026-04',effective:'2027-04-30',reference:'Uitgave april 2026'},
 'DORA-2022-2554':eu('2022/2554','Verordening',{rank:1,applies:'2025-01-17'}),
 'DORA-OVERSIGHT-31-44':eu('2022/2554','Verordening (deel: artikelen 31–44)',{rank:1,work:'EU 2022/2554, art. 31–44',applies:'2025-01-17'}),
 'DORA-SECTOR-2022-2556':eu('2022/2556','Richtlijn',{rank:1,applies:'2025-01-17'}),
 'DORA-2024-1774':eu('2024/1774',rts),'DORA-2024-1772':eu('2024/1772',rts),'DORA-2024-1773':eu('2024/1773',rts),
 'DORA-2025-301':eu('2025/301',rts),'DORA-2025-302':eu('2025/302',its),'DORA-2025-532':eu('2025/532',rts),
 'DORA-2024-2956':eu('2024/2956',its),'DORA-2025-1190':eu('2025/1190',rts),'DORA-2024-1502':eu('2024/1502',del),
 'DORA-OVERSIGHT-FEES-1505':eu('2024/1505',del),'DORA-OVERSIGHT-295':eu('2025/295',rts),'DORA-JOINT-TEAMS-420':eu('2025/420',rts),
 'DORA-COOPERATION-GL36':{family:'dora',work:'JC/GL/2024/36',instrument:'Richtsnoeren',rank:3,applies:'2025-01-17'},
 'DORA-INCIDENT-COSTS-GL34':{family:'dora',work:'JC/GL/2024/34',instrument:'Richtsnoeren',rank:3,applies:'2025-05-19'},
 'NOREA-DORA-3-2':{family:'dora',work:'NOREA DORA in Control',instrument:'Handreiking',rank:4,version:'3.2'},
};
const MAAND=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const KORT=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
/** '27 december 2022' → '2022-12-27'; 'december 2025' → '2025-12'; '2025' → '2025'. */
export function isoFromDutchDate(text=''){
 const m=String(text).trim().match(/^(?:(\d{1,2}) )?(?:([a-z]+) )?(\d{4})$/i);if(!m)return '';
 const month=m[2]?MAAND.indexOf(m[2].toLowerCase())+1:0;if(m[2]&&!month)return '';
 return m[3]+(month?'-'+String(month).padStart(2,'0'):'')+(m[1]&&month?'-'+m[1].padStart(2,'0'):'');
}
/** '2022-12-27' → '27 dec 2022'; '2025-12' → 'dec 2025'; '2025' → '2025'. */
export function shortDate(iso=''){
 const [y,m,d]=String(iso).split('-');if(!y)return '';
 return [d?String(Number(d)):'',m?KORT[Number(m)-1]:'',y].filter(Boolean).join(' ');
}
const shortIssuer=text=>String(text||'').replace('Europees Parlement en de Raad van de Europese Unie','Europees Parlement en Raad').replace(' (gezamenlijke Europese toezichthouders)','');
/** Eén regel voor de lijstweergave. Ontbreekt een gegeven, dan is het veld leeg; er wordt niets geraden. */
export function frameworkRecord(id=''){
 const own=Object.hasOwn(frameworkRegister,id)?frameworkRegister[id]:undefined,facts=frameworkPublication(id);
 const published=own?.published||isoFromDutchDate(facts?.published),effective=own?.effective||isoFromDutchDate(facts?.effective);
 const family=own?.family&&Object.hasOwn(frameworkFamilies,own.family)?own.family:'';
 return {family,familyTitle:family?frameworkFamilies[family].title:'',work:own?.work||'',instrument:own?.instrument||'',rank:own?.rank||9,applies:own?.applies||'',
  // Alleen een uitgave heeft een versie (standaard, handreiking, stelselbesluit); bij wetgeving is het nummer de identiteit.
  version:own?.version||'',
  issuer:own?.issuer||shortIssuer(facts?.issuer),published,effective,reference:own?.reference||facts?.publication||''};
}
