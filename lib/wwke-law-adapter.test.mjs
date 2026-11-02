import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// Verzonnen WWKE-gegevens; de echte adapter draait erop (#292). De echte wet zit niet in Git.
const fase={status:'APPLICABLE',action:'Bekijk het besluit',expected_evidence:'Besluit',interpretation_boundary:'Eén casus',reason:'Fictief'};
const punt=(id,extra={})=>({id,criterion_id:'C1',objective_ids:['O1'],selection_status:'SELECTABLE',title:'Punt '+id,text:'Fictieve norm '+id,
 chapter:'H1',element:'Continuïteit',scope:'Fictieve reikwijdte',selection_reason:'Fictief',addressees:[{label:'Entiteit'}],conditions:[],exceptions:[],
 source_links:[{record_id:'R1',contribution:'PRIMARY',basis_code:'B',visible_spans:[{page:1,start:0,end:10,quote:'Fictief citaat'}]}],
 control_measure:{text:'Fictieve maatregel',rationale:'Fictief'},phase_plans:{opzet:fase,bestaan:fase},facets:{target_roles:['CRITICAL_ENTITY']},...extra});
const catalogue={points:[punt('P1'),punt('P2',{selection_status:'HOLD'}),punt('P3')],
 criteria:[{id:'C1',title:'Criterium',text:'Fictief criterium',composition_rationale:'Fictief',objective_ids:['O1'],source_record_ids:['R1']}],
 objectives:[{id:'O1',title:'Doelstelling',text:'Fictieve doelstelling',rationale:'Fictief',risk:'Fictief risico',goal_ids:['G1'],source_record_ids:['R1']}],
 goals:[{id:'G1',text:'Fictief doel',rationale:'Fictief',source_record_ids:['R1']}],issues:[]};
const payloads={
 './wwke-reviewed/catalogue.json':catalogue,
 './wwke-reviewed/source-bank.json':{records:[{id:'R1',locator:'Artikel 1',source_spans:[{page:1,quote:'Fictief citaat'}]}]},
 './wwke-reviewed/filters.json':{point_mappings:[{point_id:'P1',known_article23_excluded_sectors:[]},{point_id:'P3',known_article23_excluded_sectors:['OVERHEID']}],
  vocabularies:{sectors:[{id:'OVERHEID'},{id:'ENERGIE'}],target_roles:[{id:'CRITICAL_ENTITY'}]},predicates:{government_navigation:{default_modes:[]}}},
 './wwke-reviewed/context.json':{title:'Fictieve wet',consolidation:{url:'https://example.invalid/wet'},dates:{commencement:'2026-01-01',context_checked_on:'2026-08-15'},scope:{navigation_boundary:'Fictieve grens'}},
 './wwke-reviewed/status.json':{source_bank_sha256:'c'.repeat(64)},
 './wwke-reviewed/receipt.json':{status:'PASS',basis_sha256:'d'.repeat(64),review_results:[]},
 './wwke-reviewed/impact.json':{issues:[]},'./wwke-reviewed/pages.json':[],
 '../app/wwke-quality-revisions.json':{edits:[]},'./topical-reviewed.json':{packages:[]},
 'omnibus-data:lib/wwke-readable-criteria.mjs':{wwkeReadableCriteria:{}},
};
globalThis.wwkeAdapterFixtures=payloads;
register('data:text/javascript,'+encodeURIComponent(`
 const keys=${JSON.stringify(Object.keys(payloads))};
 export function resolve(specifier,context,next){
  if(keys.includes(specifier))return {url:'data:text/javascript,'+encodeURIComponent(
   'export default globalThis.wwkeAdapterFixtures['+JSON.stringify(specifier)+']'),importAttributes:{},shortCircuit:true};
  // investigation.mjs trekt inhoud mee die niet in Git staat; een kleine stand-in bewaart materialen per originKey.
  if(specifier==='./investigation.mjs')return {url:'data:text/javascript,'+encodeURIComponent(
   'export const validateInvestigation=v=>v??{materials:[],sourceIds:[]};'+
   'export function addMaterials(d,ms){const wb=validateInvestigation(d.investigation),have=new Set(wb.materials.map(m=>m.originKey));'+
   'const nieuw=ms.filter(m=>!have.has(m.originKey)).map(m=>({...m,id:m.originKey}));'+
   'return {...d,included:[...new Set([...d.included,...wb.materials.filter(m=>ms.some(x=>x.originKey===m.originKey)).map(m=>m.id),...nieuw.map(m=>m.id)])],investigation:{...wb,materials:[...wb.materials,...nieuw]}};}'),shortCircuit:true};
  if(specifier==='./wwke-readable-criteria.mjs')return {
   url:new URL('./content-adapters/wwke-readable-criteria.mjs',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {selectWwkePointsDirect,chooseWwkePoints,wwkeSelection}=await import('./wwke-law-adapter.mjs');
const {wwkeReviewBasis}=await import('./wwke-law-data.mjs');
const leeg={included:[]};
const spoor=(draft,id)=>JSON.parse(draft.investigation.materials.find(m=>m.sourcePointId===id).lawTrace);

test('directe selectie bevestigt nooit de toepasselijkheid',()=>{
 const d=selectWwkePointsDirect(leeg,['P1']);
 const a=spoor(d,'P1').assessment;
 assert.equal(a.mode,'SELECTION');assert.equal(a.scopeConfirmed,false);assert.equal(a.unresolvedCasesExcluded,false);
 assert.equal(wwkeSelection(d,['P1']).selected,1);
});

test('HOLD en een voor de sector uitgezonderd punt worden niet toegevoegd',()=>{
 const d=selectWwkePointsDirect(leeg,['P1','P2','P3'],'OVERHEID');
 assert.deepEqual(d.investigation.materials.map(m=>m.sourcePointId),['P1']);
 assert.equal(selectWwkePointsDirect(leeg,['P2']),leeg);
});

test('opnieuw selecteren behoudt een opgeslagen punt ongewijzigd',()=>{
 const eerst=selectWwkePointsDirect(leeg,['P1']);
 const opnieuw=selectWwkePointsDirect(eerst,['P1']);
 assert.deepEqual(opnieuw.investigation.materials,eerst.investigation.materials);
});

test('een nieuwe scopebeoordeling bewaart de vorige, en de kop staat er één keer',()=>{
 const norm=(subject)=>({mode:'NORM',pointId:'P1',reviewBasis:wwkeReviewBasis,scopeConfirmed:true,unresolvedCasesExcluded:true,subject,period:'2026',basis:'Fictieve grond',boundary:'Fictieve afbakening',sector:'ENERGIE',roles:['CRITICAL_ENTITY'],confirmedAt:'2026-11-02T10:00:00Z'});
 const eerst=chooseWwkePoints(leeg,['P1'],true,{P1:norm('Eerste object')});
 const daarna=chooseWwkePoints(eerst,['P1'],true,{P1:norm('Tweede object')});
 const t=spoor(daarna,'P1');
 assert.equal(t.assessment.subject,'Tweede object');
 assert.equal(t.assessmentHistory.length,1);assert.equal(t.assessmentHistory[0].subject,'Eerste object');
 const ctx=daarna.investigation.materials.find(m=>m.sourcePointId==='P1').sourceContext;
 assert.equal(ctx.split('Vastgelegde scopebeoordeling door gebruiker').length-1,1);
 assert.match(ctx,/Tweede object/);assert.doesNotMatch(ctx,/Eerste object/);
});

test('een scopebeoordeling zonder bevestiging wordt geweigerd',()=>{
 assert.throws(()=>chooseWwkePoints(leeg,['P1'],true,{P1:{mode:'NORM',pointId:'P1',reviewBasis:wwkeReviewBasis,scopeConfirmed:false}}),/Beoordeel eerst de scope/);
});
