import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createHash} from 'node:crypto';
import {topicalTrace,topicalTraceHash as traceHash,acceptsReviewedTopicalTrace as acceptsTrace,verifyTopicalTraceTransitions as verifyTransitions} from './topical-source-trace.mjs';
import {evidenceMetadataJson,evidenceStringHash} from './evidence-path.mjs';
import {verifyLocalFrameworkQuestions} from '../content-tools/question-review-validation.mjs';
const nodeHash=text=>createHash('sha256').update(text).digest('hex');
const topicalTraceHash=trace=>traceHash(trace,nodeHash);
const acceptsReviewedTopicalTrace=(packet,saved,current)=>acceptsTrace(packet,saved,current,nodeHash);
const verifyTopicalTraceTransitions=packet=>verifyTransitions(packet,nodeHash);
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(s,c,next){
  if(c.parentURL?.endsWith('/topical-content.mjs')){
   if(s==='./topical-reviewed.json')return {url:'data:application/json,'+encodeURIComponent('{"packages":[]}'),shortCircuit:true};
   if(s==='./catalogue-runtime.mjs')return {url:'data:text/javascript,export const catalogueDerived=f=>f();',shortCircuit:true};
  }
  return next(s,c);
 }
`),import.meta.url);
const {makeTopicalMaterial,validateTopicalMaterial,topicalPackages}=await import('./topical-content.mjs');
function fixture(){
 const point={id:'P',selection_status:'SELECTABLE',title:'Fictieve toets',text:'Oorspronkelijke norm',criterion_id:'C',objective_ids:[],source_links:[{record_id:'R',explanation:'Bronrelatie'}],scope:'Fictieve scope',addressees:[],conditions:['Alleen bij toepasselijke aanleiding'],exceptions:[],chapter:'Groep',phase_plans:{opzet:{status:'APPLICABLE',action:'Beoordeel inrichting',expected_evidence:'Inrichting'},bestaan:{status:'APPLICABLE',action:'Inspecteer toepassing',expected_evidence:'Toepassing'},werking:{status:'NOT_SELECTED',action:'',expected_evidence:''}}};
 const packet={id:'F',reviewBasis:'b'.repeat(64),catalogue:{points:[point],criteria:[{id:'C',text:'Fictieve oudernorm',source_record_ids:['R']}],objectives:[],goals:[]},bank:{records:[{id:'R',source_spans:[{page:1,quote:'Oorspronkelijke bron',start:0,end:20}]}]},manifest:{documents:[{id:'D',first_package_page:1,last_package_page:1,sha256:'d'.repeat(64)}]},documents:[{id:'D',pdf_hash:'d'.repeat(64)}],context:{title:'Oefenkader',edition:'1',limitations:['Geen algemene conclusie'],applicability:'Oefening',status:'UNKNOWN'},status:{official_url:'https://example.org/source',publication_rights:'Fictief'}};
 const prior=topicalTrace(packet,point),material=makeTopicalMaterial(packet,point),currentPacket=structuredClone(packet);
 currentPacket.catalogue.points[0].phase_plans.werking={status:'APPLICABLE',action:'Onderzoek de gekozen periode',expected_evidence:'Gedateerde uitvoering'};
 const current=topicalTrace(currentPacket,currentPacket.catalogue.points[0]);
 const entry={format:'omnibus-reviewed-trace-transition/1',sourceId:'F',pointId:'P',previousTraceHash:topicalTraceHash(prior),currentTraceHash:topicalTraceHash(current),review:{decision:'ACCEPT',basisSha256:'e'.repeat(64),reviewer:'synthetic-independent-review'}};
 currentPacket.reviewedTraceTransitions=[entry];return {prior,current,entry,packet:currentPacket,material};
}
test('exact reviewed prior traces remain readable without replacing historical material or own work',()=>{
 const {prior,current,packet,material}=fixture();
 assert.equal(topicalTraceHash(prior),createHash('sha256').update(evidenceMetadataJson(prior)).digest('hex'));
 assert.doesNotThrow(()=>verifyTopicalTraceTransitions(packet));
 assert(acceptsReviewedTopicalTrace(packet,prior,current));
 const project={questions:[{text:'Mijn eigen vraag'}],materials:[{...material,observation:'Mijn eigen waarneming',testDesign:'Mijn eigen toets'}]};
 const before=structuredClone(project);topicalPackages.push(packet);
 try{assert.doesNotThrow(()=>validateTopicalMaterial(project.materials[0]));assert.deepEqual(project,before);
  assert.equal(project.materials[0].testOperation,'');assert.match(makeTopicalMaterial(packet,packet.catalogue.points[0]).testOperation,/gekozen periode/);
 }finally{topicalPackages.pop();}
});
test('prior trace approval is exact and cannot hide changes to phases, source meaning or evidence',()=>{
 const {prior,current,packet,material}=fixture();
 const mutations=[p=>{p.sourceId='OTHER';},p=>{p.point.id='OTHER';},p=>{p.point.text+=' gewijzigd';},p=>{p.point.phase_plans.werking.action='Eigen ongekeurde bronfase';},p=>{p.point.conditions=[];},p=>{p.criterion.text+=' gewijzigd';},p=>{p.records[0].source_spans[0].quote+=' gewijzigd';},p=>{p.records[0].source_spans[0].start=1;},p=>{p.documents[0].sha256='f'.repeat(64);},p=>{p.reviewBasis='f'.repeat(64);},p=>{p.limitations=[];}];
 topicalPackages.push(packet);try{for(const mutate of mutations){const changed=structuredClone(prior);mutate(changed);assert(!acceptsReviewedTopicalTrace(packet,changed,current));assert.throws(()=>validateTopicalMaterial({...material,topicalTrace:JSON.stringify(changed)}),/bronherleiding/);}
  assert.throws(()=>validateTopicalMaterial({...material,sourceHash:'changed'}),/bronversie/);
  assert.throws(()=>validateTopicalMaterial({...material,sourceDocumentHashes:'changed'}),/bronversie/);
 }finally{topicalPackages.pop();}
 assert(!acceptsReviewedTopicalTrace({...packet,reviewedTraceTransitions:undefined},prior,current));
});
test('publication rejects stale, negative, duplicate, foreign and nonselectable trace transitions',()=>{
 const mutations=[p=>{p.reviewedTraceTransitions={};},p=>{p.reviewedTraceTransitions[0].format='other';},p=>{p.reviewedTraceTransitions[0].review.decision='HOLD';},p=>{p.reviewedTraceTransitions[0].review.basisSha256='';},p=>{p.reviewedTraceTransitions[0].review.reviewer='';},p=>{p.reviewedTraceTransitions[0].sourceId='OTHER';},p=>{p.reviewedTraceTransitions[0].pointId='UNKNOWN';},p=>{p.catalogue.points[0].selection_status='HOLD';},p=>{p.reviewedTraceTransitions.push(structuredClone(p.reviewedTraceTransitions[0]));},p=>{p.reviewedTraceTransitions[0].currentTraceHash='f'.repeat(64);},p=>{p.catalogue.points[0].phase_plans.werking.action+=' nieuw';},p=>{p.bank.records[0].source_spans[0].quote+=' nieuw';}];
 for(const mutate of mutations){const {packet}=fixture();mutate(packet);assert.throws(()=>verifyTopicalTraceTransitions(packet),/trace transition/);assert.throws(()=>verifyLocalFrameworkQuestions(packet,{}),/trace transition/);}
 const {packet,prior,current}=fixture();packet.reviewedTraceTransitions[0].currentTraceHash='f'.repeat(64);assert(!acceptsReviewedTopicalTrace(packet,prior,current));
});

test('portable evidence normalization is identical in browser and dependency-free server hashing',()=>{
 const {prior}=fixture();prior.documents[0].file='C:\\fictieve-map\\brón.pdf';
 assert.equal(traceHash(prior,nodeHash),traceHash(prior,evidenceStringHash));
 const portable=JSON.parse(evidenceMetadataJson(prior));
 assert.equal(traceHash(prior,nodeHash),traceHash(portable,nodeHash));
 const changed=structuredClone(prior);changed.documents[0].file='C:\\andere-map\\brón.pdf';
 assert.notEqual(traceHash(changed,nodeHash),traceHash(portable,nodeHash));
});
