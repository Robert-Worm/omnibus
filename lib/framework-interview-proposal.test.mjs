import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';
import {sourceInterviewPresentation} from './source-question-presentation.mjs';
import {registerCatalogueResource,ensureCatalogue} from './catalogue-runtime.mjs';

// Source payloads are fictitious; exercise the real projections and receipt gate.
const phase={status:'APPLICABLE',action:'Inspect an agreement',expected_evidence:'Agreement',interpretation_boundary:'One case'};
const point={id:'P1',criterion_id:'C1',objective_ids:[],selection_status:'SELECTABLE',
 title:'Synthetic point',text:'Synthetic source text',chapter:'Group',element:'Continuity',scope:'Synthetic scope',
 addressees:[],conditions:[],exceptions:[],source_links:[{record_id:'R1',contribution:'PRIMARY'}],
 control_measure:{text:'Synthetic control'},phase_plans:{opzet:phase,bestaan:phase}};
const criterion={id:'C1',title:'Criterion',text:'Synthetic criterion',objective_ids:[],source_record_ids:['R1']};
const record={id:'R1',locator:'Article 1',source_spans:[{page:3,quote:'Synthetic passage'}]};
const catalogue=()=>({points:[],criteria:[criterion],objectives:[],goals:[],issues:[]});
const wwke=catalogue(),topical={packages:[]};
const p={id:'SYNTHETIC-TOPICAL',catalogue:catalogue(),bank:{records:[record]},
 context:{title:'Synthetic framework',edition:'synthetic-1',limitations:[],applicability:'Synthetic scope'},
 status:{official_url:'https://example.invalid/framework'},manifest:{documents:[
  {id:'first',first_package_page:1,last_package_page:2},
  {id:'second',first_package_page:3,last_package_page:4}]},
 documents:[{id:'D1',packageDocumentId:'first',pdf_hash:'a'.repeat(64)},
  {id:'D2',packageDocumentId:'second',pdf_hash:'b'.repeat(64)}]};
const payloads={
 './wwke-reviewed/catalogue.json':wwke,'./topical-reviewed.json':topical,
 './wwke-reviewed/source-bank.json':{records:[record]},
 './wwke-reviewed/filters.json':{point_mappings:[]},
 './wwke-reviewed/context.json':{title:'Synthetic law',consolidation:{url:'https://example.invalid/law'}},
 './wwke-reviewed/status.json':{source_bank_sha256:'c'.repeat(64)},
 './wwke-reviewed/receipt.json':{},'./wwke-reviewed/impact.json':{issues:[]},
 './wwke-reviewed/pages.json':[], '../app/wwke-quality-revisions.json':{edits:[]},
 'omnibus-data:lib/wwke-readable-criteria.mjs':{wwkeReadableCriteria:{}}
};
globalThis.frameworkInterviewFixtures=payloads;
register('data:text/javascript,'+encodeURIComponent(`
 const keys=${JSON.stringify(Object.keys(payloads))};
 export function resolve(specifier,context,next){
  if(keys.includes(specifier))return {url:'data:text/javascript,'+encodeURIComponent(
   'export default globalThis.frameworkInterviewFixtures['+JSON.stringify(specifier)+']'),importAttributes:{},shortCircuit:true};
  if(specifier==='./wwke-readable-criteria.mjs')return {
   url:new URL('./content-adapters/wwke-readable-criteria.mjs',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {wwkeProposals,wwkeMetadata,wwkeCatalogue}=await import('./wwke-law-data.mjs');
const {topicalProposals,makeTopicalMaterial,validateTopicalMaterial}=await import('./topical-content.mjs');
const wording='Hoe bereidt u een besluit over continuïteit voor?';
let revision=0;
const update=async(fn)=>{const key='framework-interview-'+(++revision);registerCatalogueResource(key,async()=>true,fn);await ensureCatalogue([key]);};
const offered=(row,key='questionManagement')=>sourceInterviewPresentation(row,{sourceId:row.sourceId,itemId:row.originKey,
 questionId:key,text:row[key],sourceEdition:row.edition,sourceHash:row.sourceHash}).text;

test('WWKE and multi-document frameworks offer only exact reviewed interviews after lazy loading',async()=>{
 assert.equal(wwkeProposals.length,0);assert.equal(topicalProposals.length,0);
 await update(()=>{wwkeCatalogue.points.push(point);p.catalogue.points.push(structuredClone(point));topical.packages.push(p);});
 const originalPoint=structuredClone(point),originalMaterial=makeTopicalMaterial(p,p.catalogue.points[0]);
 for(const spec of [
  {rows:wwkeProposals,owner:wwkeCatalogue,key:'P1',edition:wwkeMetadata.edition,hash:'c'.repeat(64)},
  {rows:topicalProposals,owner:topical,key:p.id+':P1',edition:p.context.edition,hash:'b'.repeat(64)}
 ]){
  assert.equal(offered(spec.rows[0]),'');
  const row=spec.rows[0];assert.equal(row.edition,spec.edition);assert.equal(row.sourceHash,spec.hash);
  assert.equal(row.question,'','The proposal matches the empty saved default for level selection');
  const receipt=()=>questionReviewFixture({sourceId:row.sourceId,itemId:row.originKey,sourceEdition:spec.edition,sourceHash:spec.hash,
   questions:[{id:'questionManagement',kind:'interview',text:wording}]});
  await update(()=>{spec.owner.interviewReviews={[spec.key]:receipt()};});
  assert.equal(offered(spec.rows[0]),wording);assert.equal(offered(spec.rows[0],'questionStrategic'),'');
  for(const invalid of [null,{}, {...receipt(),sourceHash:'d'.repeat(64)}, {...receipt(),sourceEdition:'other'},
   {...receipt(),itemId:'OTHER'}, {...receipt(),reviews:[]},
   questionReviewFixture({sourceId:row.sourceId,itemId:row.originKey,sourceEdition:spec.edition,sourceHash:spec.hash,
    questions:[{id:'questionManagement',kind:'interview',text:wording}],decisions:{questionManagement:'schrappen'}})]){
   await update(()=>{spec.owner.interviewReviews[spec.key]=invalid;});
   assert(Object.hasOwn(spec.rows[0],'interviewReview'));assert.equal(offered(spec.rows[0]),'');
  }
  await update(()=>{delete spec.owner.interviewReviews;});
  assert(!Object.hasOwn(spec.rows[0],'interviewReview'));assert.equal(offered(spec.rows[0]),'');
 }
 assert.deepEqual(point,originalPoint);
 assert.deepEqual(makeTopicalMaterial(p,p.catalogue.points[0]),originalMaterial);
 validateTopicalMaterial(originalMaterial);
 await update(()=>{wwkeCatalogue.points.push({...point,id:'HOLD',selection_status:'HOLD'});p.catalogue.points.push({...point,id:'HOLD',selection_status:'HOLD'});});
 assert.equal(wwkeProposals.length,1);assert.equal(topicalProposals.length,1);
});
