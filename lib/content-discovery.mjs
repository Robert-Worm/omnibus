// Editorial navigation only. Reviewed item text, evidence and question plans
// remain untouched. Membership is explicit at item level, never by report title
// or a keyword match. New imports remain unclassified until mapped deliberately.
import {preparedFoundationItems,chooseFoundationItems} from './foundation-workspace.mjs';
import {validateInvestigation,foundations} from './investigation.mjs';
import {selectLines} from './workspace-view.mjs';
import {cioProposals} from './cio-law-data.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
import reportAdditions from '../app/report-additions.json' with {type:'json'};
import {processes as establishedProcesses} from './process-catalogue.mjs';
import {reportDiscoveryProcesses} from './report-discovery.mjs';
import {curatedThemes,curatedMemberships,parentFullyClassified} from './theme-curation.mjs';
export const discoveryThemes=[
 {id:'digital',title:'Digitale dienstverlening en weerbaarheid',description:'Van keuzes en toegang tot beheer, herstel en veilig gebruik.'},
 {id:'information',title:'Informatie en gegevens',description:'Verzamelen, bewaren, gebruiken en verantwoord delen van informatie.'},
 {id:'governance',title:'Besturing, risico’s en verantwoording',description:'Doelen, besluiten, beheersing, onafhankelijkheid en inzicht in resultaten.'},
 {id:'policy',title:'Van beleid naar uitvoering',description:'Beleidskeuzes, uitvoerbaarheid, samenwerking en leren van effecten.'},
 {id:'service',title:'Dienstverlening aan burgers en organisaties',description:'Aanvragen, betalingen, uitleg, klachten en aansluiting op de doelgroep.'},
 {id:'sustainability',title:'Duurzame bedrijfsvoering',description:'Duurzame keuzes, inkoop, hergebruik en het vasthouden van verbeteringen.'},
 {id:'people',title:'Mensen, samenwerking en gedrag',description:'Deskundigheid, werkafspraken, voorbeeldgedrag en samenwerking.'},
 {id:'suppliers',title:'Leveranciers en afhankelijkheden',description:'Inkoop, leveranciersinformatie, contractuitvoering en afhankelijkheden.'},
 ...curatedThemes,
];
const group=(prefix,values)=>values.split(' ').filter(Boolean).map(n=>`${prefix}-K${n.padStart(2,'0')}`);
const digi=values=>values.split(' ').map(n=>`DIGIINKOOP25-${n.padStart(2,'0')}`);
const begroting=values=>values.split(' ').map(n=>`BEGVOORB25-${n}`);
const p=(id,title,themeIds,lineIds,foundationIds=[])=>({id,title,themeIds,lineIds,foundationIds});
export const discoveryProcesses=[
 ...reportDiscoveryProcesses(reportAdditions.process_mappings,establishedProcesses),
 p('procurement-route','Inkooproutes afwegen en verantwoorden',['suppliers','governance'],group('F35V25','1')),
 p('contract-obligations','Contractverplichtingen registreren en aansluiten',['suppliers','information','governance'],group('F35V25','2')),
 p('advance-settlement','Voorschotten aansluiten en verrekenen',['suppliers','information','governance'],group('F35V25','3')),
 p('revenue-forecast','Ontvangstenramingen en realisaties onderscheiden',['governance','information'],group('F35V25','4')),
 p('invoice-rates','Factuurtarieven en indexaties controleren',['suppliers','governance'],group('BSA2324','2 4')),
 p('invoice-approval','Uren en factuurvoorstellen beoordelen',['suppliers','governance'],group('BSA2324','3')),
 p('financial-reconciliation','Financiële rapportagetotalen aansluiten',['information','governance'],group('BSA2324','7')),
 p('recourse-remittance','Ontvangen regresbedragen doorbetalen',['suppliers','governance'],group('BSA2324','8 9')),
 p('subsidy-accountability','Verantwoordingsafspraken met subsidieontvangers vastleggen',['governance','information','service'],group('HVP25','3')),
 p('milestone-planning','Resultaatafspraken en mijlpalen bijstellen',['governance','policy'],group('HVP25','4')),
 p('budget-estimates','Begrotingsramingen en financiële ruimte beoordelen',['governance','information'],begroting('DEF01 EZ01 IW01 JV01 LV01 SZW01')),
 p('budget-decisions','Begrotingsvoorstellen beoordelen en autoriseren',['governance'],begroting('G01 G03 AZ01 BZ01 JV02 OCW01 SZW02 VWS01 M02')),
 p('budget-instruments','Financiële instrumenten kiezen en wijzigen',['governance','information'],begroting('G04 AZ02 BZ02 BZK02 DEF02 EZ02 FIN02 IW02 JV03 LV02 OCW02 SZW03 VWS03')),
 p('budget-presentation','Begrotingsinformatie structureren en toelichten',['information','governance'],begroting('G05 AZ03 BZ03 BZK03 DEF03 EZ03 FIN03 IW03 LV03 OCW03')),
 p('maintenance-planning','Onderhoud en herstel uitvoerbaar plannen',['suppliers','governance'],group('BOC25','1 2 6 10')),
 p('contract-handover','Contractuitvoering overdragen en opstarten',['suppliers','people'],group('BOC25','3')),
 p('additional-work','Aanvullend contractwerk besluiten en plannen',['suppliers','governance'],group('BOC25','9')),
 p('contract-incentives','Contractprijzen en prikkels afwegen',['suppliers','governance'],group('BOC25','11 13')),
 p('supplier-payment','Leveranciersdeclaraties en betaling afstemmen',['suppliers'],group('BOC25','12')),
 p('programme-goals','Programmadoelen en concessies afwegen',['governance','digital'],digi('1')),
 p('programme-risk','Programmarisico’s en issues afhandelen',['governance'],digi('12')),
 p('programme-quality','Programmakwaliteit toetsen en opvolgen',['governance'],digi('13')),
 p('programme-costs','Programmabudget en totale kosten onderbouwen',['governance'],digi('14')),
 p('risk-prioritisation','Toezichtprioriteiten afwegen en bijstellen',['governance'],group('ILTRISK25','1 2 4 6 7 12')),
 p('legal-task-scope','Wettelijke taken en beleidsruimte bepalen',['governance'],group('ILTRISK25','5')),
 p('data-supply','Externe gegevenslevering afspreken en bewaken',['information','governance'],group('ILTRISK25','8')),
 p('decision-support','Ondersteuning bij besluiten organiseren',['governance','people'],group('ILTRISK25','9')),
 p('leadership-dialogue','Risicoafwegingen bespreken en toelichten',['governance','people'],group('ILTRISK25','11 14')),
 p('professional-learning','Vakbekwaamheid ontwikkelen en beoordelen',['people','governance'],group('ILTRISK25','15')),
 p('commitments','Toezeggingen registreren en opvolgen',['governance','information'],group('IVHO25','1')),
 p('visit-planning','Bezoekintervallen plannen en verantwoorden',['governance','information'],group('IVHO25','5')),
 p('system-choices','Systeemkeuzes en koppelvlakken afwegen',['digital','governance'],['ERP25-L01']),
 p('control-framework','Een samenhangend beheersingskader kiezen',['governance','digital'],['ERP25-L04']),
 p('it-risk-analysis','IT-risico’s integraal afwegen en opvolgen',['digital','governance'],['ERP25-L08']),
 p('chain-continuity','Continuïteit en herstel in gedeelde ketens voorbereiden',['digital','suppliers'],['ERP25-L09']),
 p('it-incident-response','IT-incidenten afhandelen en evalueren',['digital'],['ERP25-L11']),
 p('security-monitoring','Technische beveiligingssignalen beoordelen en opvolgen',['digital','governance'],['ERP25-L13']),
 p('security-testing','Beveiliging in de systeemketen beproeven',['digital','suppliers'],['ERP25-L14']),
 p('assurance-planning','Onafhankelijke toetsing afstemmen op eigen toezicht',['governance'],['ERP25-L15']),
 p('fraud-policy','Fraude- en corruptiebeleid afstemmen',['governance'],group('FRAUDE25','1')),
 p('fraud-analysis','Fraude- en corruptierisico’s analyseren',['governance'],group('FRAUDE25','4')),
 p('fraud-awareness','Fraude- en corruptiesignalen leren herkennen',['governance','people'],group('FRAUDE25','6')),
 p('fraud-reporting','Vermoedens van fraude en corruptie melden',['governance','people'],group('FRAUDE25','7')),
 p('fraud-investigation','Vermoedens van fraude en corruptie onderzoeken',['governance'],group('FRAUDE25','8')),
 p('fraud-detection','Fraude- en corruptiesignalen met data detecteren',['governance'],group('FRAUDE25','9')),
 p('safe-sharing','Informatie veilig delen en gebruiken',['digital','information','people'],group('OCW26','1 2 4 7 9'),['ISO27002-14','ISO27002-71']),
 p('access','Toegangsrechten verlenen en herbeoordelen',['digital','information'],group('CIOT25','7 8 9'),['ISO27002-15','ISO27002-16','ISO27002-18','ISO27002-61','ISO27002-62']),
 p('credentials','Wachtwoorden en sessies beveiligen',['digital','people'],group('OCW26','3 6'),['ISO27002-17','ISO27002-64']),
 p('physical-access','Fysieke toegang en herkenbaarheid regelen',['digital','people'],group('OCW26','10')),
 p('incidents','Beveiligingsincidenten herkennen en melden',['digital','information'],group('OCW26','5 8')),
 p('awareness','Veilig werkgedrag bespreken en ondersteunen',['digital','people'],group('OCW26','11 12 13')),
 p('backup','Back-ups uitvoeren en op volledigheid controleren',['digital','information'],group('M36526','1 2 4 5 6 7'),['ISO27002-72']),
 p('restore','Gegevens herstellen en cloudexit voorbereiden',['digital','suppliers'],group('M36526','5 8 9 10'),['CLOUD2026-012','ISO27002-72','ISO27002-73']),
 p('changes','IT-wijzigingen voorbereiden en beoordelen',['digital'],[...group('M36526','3'),...group('IHH26','5 6'),...group('TOES26','3'),...group('CLOUD25','9')],['ISO27002-91']),
 p('cloud-assessment','Cloudkeuzes toetsen en risico’s accepteren',['digital','governance','suppliers'],[...group('CLOUD25','1 2 3 4 6 7 8 10'),...group('M36526','11')],['CLOUD2026-007','CLOUD2026-008','CLOUD2026-009','CLOUD2026-010','CLOUD2026-015','CLOUD2026-021','CLOUD2026-022']),
 p('supplier-evidence','Leveranciersverklaringen beoordelen',['suppliers','digital'],group('CLOUD25','5')),
 p('capacity','IT-capaciteit afstemmen op gebruik',['digital','sustainability'],[...group('M36526','6 7'),...group('DUUR25','6')],['ISO27002-65']),
 p('policy-test','Beleidsvoorstellen op uitvoerbaarheid toetsen',['policy','governance'],group('IENW26','1 2 3 4 5 6 7 8 9')),
 p('policy-choice','Beleidsopties en doelgroepen afwegen',['policy','service'],group('TEK25','1 2 4 5 6')),
 p('collaboration','Opdrachten en samenwerking afstemmen',['policy','people','governance'],[...group('LVVN26','1 2 3 4 5 6 7 9 10'),...group('FRAUDE25','11')]),
 p('records','Informatie bewaren en terugvindbaar houden',['information'],group('IHH26','2 4 6 7 8')),
 p('staffing','Mensen, kennis en middelen plannen',['people','governance'],[...group('IHH26','1 9'),...group('LVVN26','5'),...group('ADV26','10 11'),...group('TEK25','3')]),
 p('roles','Verantwoordelijkheden en opvolging beleggen',['governance','people'],[...group('IHH26','3'),...group('DUUR25','2'),...group('ADV26','1 2'),...group('FRAUDE25','2')]),
 p('monitoring','Stuurinformatie opstellen en beoordelen',['governance','policy','service'],[...group('IHH26','10 11 12'),...group('LVVN26','8 10'),...group('TOES26','1 2 3 7'),...group('ADV26','3 4 13'),...group('TEK25','9'),...group('FRAUDE25','3 10')]),
 p('payments','Betalingen voorbereiden en hervatten',['service'],group('TOES26','4 5 6 7 8 10')),
 p('complaints','Klachten herkennen en opvolgen',['service','people'],group('TOES26','9')),
 p('communication','Aanvragers informeren en ondersteunen',['service','policy'],group('TEK25','7 8')),
 p('sustainable-choice','Duurzame oplossingen afwegen',['sustainability'],group('DUUR25','1 10')),
 p('procurement','Inkoopbehoefte en voorwaarden bepalen',['suppliers','sustainability'],group('DUUR25','4')),
 p('reuse','Materialen hergebruiken en overdragen',['sustainability'],group('DUUR25','5')),
 p('contract-delivery','Contractlevering beoordelen',['suppliers','sustainability'],group('DUUR25','12')),
 p('improvement','Verbeteringen beproeven en vasthouden',['governance','people','sustainability'],[...group('DUUR25','3 7 8 9 11'),...group('IENW26','10'),...group('CLOUD25','12')]),
 p('independence','Onafhankelijke oordeelsvorming waarborgen',['governance'],[...group('ADV26','5 6 10'),...group('CLOUD25','11')]),
 p('data-quality','Aangeleverde gegevens op bruikbaarheid beoordelen',['information','governance'],group('ADV26','7 8 12')),
 p('disclosure','Informatie verantwoord openbaar maken',['information','governance'],group('ADV26','9'),['CLOUD2026-024']),
 p('internal-controls','Interne controles uitvoeren en opvolgen',['governance','information'],[...group('CIOT25','1 2 3'),...group('FRAUDE25','5')]),
 p('data-requests','Gegevensbevragingen autoriseren en verantwoorden',['information'],group('CIOT25','4 5 6')),
 p('evaluation','Beleidseffecten onderzoeken',['policy','governance'],group('TEK25','10')),
];
// Deliberate item-level overlaps: preserve prior process memberships and source wording.
for(const [id,lineIds] of Object.entries({
 roles:['ERP25-L02'],monitoring:['ERP25-L03'],'cloud-assessment':['ERP25-L05'],
 'contract-delivery':['ERP25-L06'],'supplier-evidence':['ERP25-L07'],changes:['ERP25-L10'],staffing:['ERP25-L12'],
}))discoveryProcesses.find(p=>p.id===id).lineIds.push(...lineIds);
// IVHO's source-approved chains link to activities, not to a new report-shaped theme.
for(const [id,numbers] of Object.entries({roles:'2',monitoring:'3 7','data-quality':'4 6',disclosure:'8',staffing:'9',collaboration:'10'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('IVHO25',numbers));
// Navigation-only overlaps retain the ILT report's decision-making scope.
for(const [id,numbers] of Object.entries({monitoring:'3',improvement:'6 10 13',staffing:'16'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('ILTRISK25',numbers));
// Explicit cross-report matches; these links do not alter source wording or PR codes.
for(const [id,numbers] of Object.entries({'decision-support':'4',collaboration:'5','data-quality':'7 8',monitoring:'8 16','contract-delivery':'14 15',improvement:'17'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('BOC25',numbers));
for(const [id,numbers] of Object.entries({roles:'2 3',collaboration:'4 5','system-choices':'6 9 18',procurement:'7','contract-delivery':'7 8',changes:'8 10 17',monitoring:'11',staffing:'15',records:'16'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...digi(numbers));
// FEZ preparation, not budget execution, operational AI or broad policy effectiveness.
for(const [id,codes] of Object.entries({improvement:'G02','data-quality':'G06 G07 M01 M03 M04',monitoring:'G06',records:'G07 VWS02',roles:'BZK01 FIN01',collaboration:'BZK01','internal-controls':'FIN01 VWS02'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...begroting(codes));
// Result-financing accountability: neither assured outcomes nor audit-function quality.
for(const [id,numbers] of Object.entries({'decision-support':'1','programme-goals':'2','data-supply':'5',records:'5','data-quality':'6',monitoring:'6',staffing:'7','programme-costs':'7','assurance-planning':'8',improvement:'9',collaboration:'9'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('HVP25',numbers));
// Keep supplier invoices separate from remitted recovery proceeds and citizen payments.
for(const [id,numbers] of Object.entries({'contract-delivery':'1',improvement:'1 4','supplier-payment':'5','data-quality':'6 11',roles:'10','internal-controls':'10',monitoring:'11'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('BSA2324',numbers));
// Historical project research; no current assurance or technical aircraft judgement.
for(const [id,numbers] of Object.entries({'budget-estimates':'5','programme-costs':'7','programme-risk':'6',roles:'6 9','financial-reconciliation':'8','programme-goals':'10',records:'11','data-supply':'13',monitoring:'12 14'}))
 discoveryProcesses.find(p=>p.id===id).lineIds.push(...group('F35V25',numbers));
// Report context limits cross-cutting process links: an evaluation of a cloud
// test must not become a sustainability item merely because both use improvement.
const reportThemeScope={
 OCW26:['digital','information','people'],M36526:['digital','information','suppliers'],
 IENW26:['policy','governance','people'],IHH26:['information','governance','people','digital'],
 LVVN26:['policy','people','governance'],TOES26:['service','governance','digital'],
 DUUR25:['sustainability','suppliers','digital','people','governance'],ADV26:['governance','information','people'],
 CIOT25:['information','governance','digital'],TEK25:['policy','service','people','governance'],
 CLOUD25:['digital','governance','suppliers'],
 FRAUDE25:['governance','people'],
 ERP25:['digital','governance','suppliers','people'],
 IVHO25:['information','governance','people'],
 ILTRISK25:['governance','people','information'],
 BOC25:['suppliers','governance','information','people'],
 DIGIINKOOP25:['governance','digital','information','suppliers','people'],
 BEGVOORB25:['governance','information','people'],
 HVP25:['governance','information','people','policy','service'],
 BSA2324:['suppliers','governance','information','people'],
 F35V25:['governance','suppliers','information','people'],
};
// The explicit references below are a starter classification, not a claim that
// every law/framework is classified. Non-mapped items remain in their catalogue.
discoveryProcesses.push(p('cio-stelsel','Digitale besturing volgens het CIO-stelsel',['governance','digital'],[],cioProposals.map(p=>p.id)));
catalogueDerived(()=>{discoveryProcesses.find(p=>p.id==='cio-stelsel').foundationIds=cioProposals.map(p=>p.id);});
export function discoveryItems(framework){
 const lines=new Map(framework.lines.map(l=>[l.id,l]));
 const normMap=new Map(preparedFoundationItems.map(i=>[i.id,i]));
 const byKey=new Map();
 for(const process of discoveryProcesses){
  for(const [kind,ids,map] of [['report',process.lineIds,lines],['foundation',process.foundationIds,normMap]]){
   for(const id of ids){
    const item=map.get(id);if(!item || item.auditRole==='scope')continue;
    const key=kind+':'+id;
    if(!byKey.has(key))byKey.set(key,{key,id,kind,item,title:item.title,
      risk:kind==='report'?item.risk.text:(item.risk||''),
      criterion:kind==='report'?item.criterion.text:(item.auditNorm||item.body||''),
      sourceId:kind==='report'?item.report_id:item.sourceId,
      processIds:[],themeIds:[]});
    const row=byKey.get(key);row.processIds.push(process.id);
    const scope=kind==='report'?reportThemeScope[row.sourceId]:null;
    const related=scope?[scope[0],...process.themeIds.filter(id=>scope.includes(id))]:process.themeIds;
    row.themeIds=[...new Set([...row.themeIds,...related])];
   }
  }
 }
 return [...byKey.values()].map(row=>({...row,
   themeIds:row.kind==='report'?[...row.themeIds,...curatedMemberships(row.id,row.themeIds)]:row.themeIds,
   sourceTitle:row.kind==='report'
   ?(framework.reports||[framework.report]).find(s=>s.id===row.sourceId)?.title||row.sourceId
   :foundations.find(s=>s.id===row.sourceId)?.title||row.sourceId}));
}
export function filterDiscovery(items,{axis='themes',category='',query='',kind='all',processId='',themeId=''}={}){
 const terms=query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
 return items.filter(row=>(!category||(axis==='processes'?row.processIds:row.themeIds).includes(category))
  &&(!processId||row.processIds.includes(processId))&&(!themeId||row.themeIds.includes(themeId))
  &&(kind==='all'||row.kind===kind)&&terms.every(term=>[row.id,row.title,row.risk,row.criterion,row.sourceTitle].join(' ').toLocaleLowerCase('nl').includes(term)));
}
// One pass over memberships instead of scanning the corpus for every category.
export function discoveryFacets(items,categories,axis,query=''){
 const counts=new Map(),members=new Map();
 for(const row of items)for(const id of axis==='processes'?row.processIds:row.themeIds){
  counts.set(id,(counts.get(id)||0)+1);
  const group=members.get(id)||[];group.push(row.id);members.set(id,group);
 }
 const terms=query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
 return categories.filter(c=>counts.has(c.id)&&!(axis==='themes'&&parentFullyClassified(c.id,members.get(c.id)))&&terms.every(t=>[c.title,c.description||'',c.keywords||''].join(' ').toLocaleLowerCase('nl').includes(t)))
  .map(c=>({...c,count:counts.get(c.id)})).sort((a,b)=>a.title.localeCompare(b.title,'nl'));
}
export function discoveryPage(rows,page=0,size=8){
 const last=Math.max(0,Math.ceil(rows.length/size)-1),current=Math.max(0,Math.min(page,last));
 return {rows:rows.slice(current*size,(current+1)*size),current,last,total:rows.length};
}
export function discoverySelected(row,draft){
 if(row.kind==='report')return draft.included.includes(row.id);
 const material=draft.investigation?.materials.find(m=>m.originKey===row.item.originKey);
 return Boolean(material&&draft.included.includes(material.id));
}
export function chooseDiscovery(draft,rows,include){
 const proposals=rows.filter(r=>r.kind==='foundation').map(r=>r.item);
 const wb=validateInvestigation(draft.investigation);
 const opened={...draft,investigation:{...wb,sourceIds:[...new Set([...wb.sourceIds,...proposals.map(p=>p.sourceId)])]}};
 const next=proposals.length?chooseFoundationItems(opened,proposals,include):draft;
 const selected=selectLines(next,rows.filter(r=>r.kind==='report').map(r=>r.id),include);
 return include?selected:{...selected,investigation:{...selected.investigation,sourceIds:wb.sourceIds}};
}
