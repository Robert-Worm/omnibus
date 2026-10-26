import {discoveryThemes,discoveryProcesses,discoveryItems} from './content-discovery.mjs';
import {childThemeIds,parentFullyClassified,themeCurationVersion} from './theme-curation.mjs';
export const themeFamilies=[
 {id:'public',title:'Beleid en publieke dienstverlening',description:'Van beleidskeuzes tot de uitvoering voor burgers en organisaties.',ids:['policy','service']},
 {id:'organisation',title:'Besturing en organisatie',description:'Sturing, verantwoordelijkheden, mensen en samenwerking.',ids:['governance',...childThemeIds('governance'),'people']},
 {id:'operations',title:'Informatie en bedrijfsvoering',description:'Digitale middelen, gegevens, duurzaamheid en leveranciers.',ids:['digital','information',...childThemeIds('information'),'sustainability','suppliers']},
];
export const processFamilies=[
 {id:'security',title:'Toegang en veilig werken',description:'Toegang regelen, informatie beschermen en incidenten melden.',ids:['safe-sharing','access','credentials','physical-access','incidents','awareness','security-monitoring','security-testing']},
 {id:'technology',title:'IT en continuïteit',description:'Systeem- en cloudkeuzes, wijzigingen, incidentafhandeling en herstel.',ids:['backup','restore','changes','cloud-assessment','supplier-evidence','capacity','system-choices','chain-continuity','it-incident-response']},
 {id:'policy',title:'Beleid en samenwerking',description:'Beleid voorbereiden, uitvoerbaarheid toetsen en effecten onderzoeken.',ids:['policy-test','policy-choice','collaboration','evaluation']},
 {id:'information',title:'Informatiebeheer',description:'Gegevens bewaren, beoordelen, bevragen en openbaar maken.',ids:['records','data-quality','disclosure','data-requests','data-supply']},
 {id:'governance',title:'Sturing en interne beheersing',description:'Verantwoordelijkheden, capaciteit, monitoring en controles.',ids:['staffing','roles','monitoring','commitments','visit-planning','improvement','independence','internal-controls','control-framework','it-risk-analysis','assurance-planning','risk-prioritisation','legal-task-scope','decision-support','leadership-dialogue','professional-learning']},
 {id:'integrity',title:'Fraude, corruptie en integriteit',description:'Beleid, risicoanalyse, herkenning, melden, onderzoek en detectie.',ids:['fraud-policy','fraud-analysis','fraud-awareness','fraud-reporting','fraud-investigation','fraud-detection']},
 {id:'service',title:'Dienstverlening',description:'Betalen, klachten opvolgen en aanvragers ondersteunen.',ids:['payments','complaints','communication']},
 {id:'resources',title:'Inkoop en middelen',description:'Duurzame keuzes, inkoop, hergebruik en contractlevering.',ids:['sustainable-choice','procurement','reuse','contract-delivery']},
];
processFamilies.find(f=>f.id==='resources').ids.push('maintenance-planning','contract-handover','additional-work','contract-incentives','supplier-payment');
processFamilies.find(f=>f.id==='governance').ids.push('programme-goals','programme-risk','programme-quality','programme-costs');
processFamilies.find(f=>f.id==='governance').ids.push('budget-estimates','budget-decisions','budget-instruments');
processFamilies.find(f=>f.id==='information').ids.push('budget-presentation');
processFamilies.find(f=>f.id==='service').ids.push('subsidy-accountability');
processFamilies.find(f=>f.id==='governance').ids.push('milestone-planning');
processFamilies.find(f=>f.id==='resources').ids.push('invoice-rates','invoice-approval','recourse-remittance');
processFamilies.find(f=>f.id==='information').ids.push('financial-reconciliation');
processFamilies.find(f=>f.id==='resources').ids.push('procurement-route','contract-obligations','advance-settlement');
processFamilies.find(f=>f.id==='governance').ids.push('revenue-forecast');
// These existing report routes already carry reviewed item-to-process mappings.
// Attach their containers to the shared directory; do not reclassify any norm,
// replace an ID, merge it into another process or change its source evidence.
processFamilies.find(f=>f.id==='security').ids.push('report-PR02');
processFamilies.find(f=>f.id==='technology').ids.push('report-PR01','report-PR10');
processFamilies.find(f=>f.id==='governance').ids.push('report-PR12','report-PR13');
// These are navigation containers over exact existing report items. Opening one
// never selects criteria or rewrites evidence. Legacy theme IDs remain available.
export function discoveryWorkspaces(framework){
 const rows=discoveryItems(framework).filter(r=>r.kind==='report');
 return [['themes',discoveryThemes],['processes',discoveryProcesses]].flatMap(([axis,categories])=>categories.map(c=>{
  const members=rows.filter(r=>(axis==='themes'?r.themeIds:r.processIds).includes(c.id));
  return {id:(axis==='themes'?'theme:':'process:')+c.id,categoryId:c.id,axis,title:c.title,description:c.description||'',keywords:[c.title,c.description||'',c.keywords||''].join(' '),lineIds:members.map(r=>r.id),reportIds:[...new Set(members.map(r=>r.sourceId))],
   ...(axis==='themes'&&parentFullyClassified(c.id,members.map(r=>r.id))?{directoryHidden:true}:{}),
   ...(c.parentId?{parentId:'theme:'+c.parentId,curationVersion:themeCurationVersion}:{}),
  };
 }).filter(v=>v.lineIds.length));
}
export function groupedDiscovery(views,axis,query=''){
 const terms=query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
 const families=axis==='processes'?processFamilies:themeFamilies;
 // Locally admitted reports supply their own theme identity. Keep it visible
 // without assigning its norms to an unrelated public taxonomy category.
 const localIds=axis==='themes'?[...new Set(views.filter(v=>v.axis===axis&&v.categoryId?.startsWith('local-')).map(v=>v.categoryId))]:[];
 const groups=localIds.length?[...families,{id:'local',title:'Lokale thema’s',description:'Thema’s uit eigen rapporten in deze publicatie.',ids:localIds}]:families;
 return groups.map(f=>{
  const familyMatch=terms.length&&terms.every(t=>(f.title+' '+f.description).toLocaleLowerCase('nl').includes(t));
  const children=views.filter(v=>!v.directoryHidden&&v.axis===axis&&f.ids.includes(v.categoryId)&&(familyMatch||terms.every(t=>(v.keywords??[v.title,v.description].join(' ')).toLocaleLowerCase('nl').includes(t))));
  return {...f,children,count:new Set(children.flatMap(v=>v.lineIds)).size};
 }).filter(f=>f.children.length);
}
export function relatedQuestionThemes(openIds,views,legacyThemes){
 const ids=new Set(views.filter(v=>openIds.includes(v.id)).flatMap(v=>v.lineIds));
 return [...new Set([...openIds,...legacyThemes.filter(t=>t.lineIds.some(id=>ids.has(id))).map(t=>t.id)])];
}
