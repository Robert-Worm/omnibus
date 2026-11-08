import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(s,c,next){
  if(c.parentURL?.endsWith('/excel-template-execution.mjs')&&s==='./excel-template-style.mjs')
   return {url:'data:text/javascript,export const readingStyles={body:0,section:0,norm:0};',shortCircuit:true};
  if(c.parentURL?.endsWith('/topical-content.mjs')){
   if(s==='./topical-reviewed.json')return {url:'data:application/json,'+encodeURIComponent('{"packages":[]}'),shortCircuit:true};
   if(s==='./catalogue-runtime.mjs')return {url:'data:text/javascript,export const catalogueDerived=f=>f();',shortCircuit:true};
  }
  return next(s,c);
 }
`),import.meta.url);
const {makeTopicalMaterial}=await import('./topical-content.mjs');
const {executionSheet}=await import('./excel-template-execution.mjs');
const {unselectedOperationText}=await import('./excel-operation-guidance.mjs');
const phase=(action,boundary)=>({status:'APPLICABLE',action,expected_evidence:'Fictieve uitvoeringsregistratie',interpretation_boundary:boundary,reason:'Fictief toetsontwerp'});
const point={id:'P',selection_status:'SELECTABLE',title:'Fictieve toets',text:'Fictieve norm',criterion_id:'C',objective_ids:[],source_links:[],scope:'Fictieve scope',addressees:[],conditions:[],exceptions:[],chapter:'Groep',phase_plans:{opzet:phase('Beoordeel de inrichting.','Ontwerpgrens'),bestaan:phase('Inspecteer invoering.','Peildatumgrens'),werking:phase('Onderzoek uitvoering in de gekozen periode.','Beperk conclusie tot periode en onderbouwde selectie.')}};
const packet={id:'F',reviewBasis:{},catalogue:{points:[point],criteria:[{id:'C',text:'Fictieve norm',source_record_ids:[]}],objectives:[],goals:[]},bank:{records:[]},manifest:{documents:[]},documents:[{id:'D',pdf_hash:'fictieve-hash'}],context:{title:'Oefenkader',edition:'1',limitations:[],applicability:'Oefening',status:'UNKNOWN'},status:{official_url:'https://example.org/source',publication_rights:'Fictief'}};

test('authored operation survives material construction with its exact source trace, without phase boundaries',()=>{
 const before=structuredClone(point),material=makeTopicalMaterial(packet,point);
 assert.match(material.testOperation,/Onderzoek uitvoering in de gekozen periode/);
 assert.match(material.testOperation,/Verwacht bewijs: Fictieve uitvoeringsregistratie/);
 assert(!material.sourceContext.includes(point.phase_plans.werking.interpretation_boundary));
 assert.deepEqual(JSON.parse(material.topicalTrace).point,before);
 assert.deepEqual(point,before);
 const oldPoint={...point,phase_plans:{...point.phase_plans,werking:{status:'NOT_SELECTED',reason:'Niet uitgewerkt'}}};
 const without=makeTopicalMaterial({...packet,catalogue:{...packet.catalogue,points:[oldPoint]}},oldPoint);
 assert.equal(without.testOperation,'');
 assert(!without.sourceContext.includes('werking ·'));
});

test('selected operation export retains the authored instruction, while older material keeps short planning help',()=>{
 for(const included of [true,false]){
  const material=makeTopicalMaterial(packet,point);if(!included)material.testOperation='';
  const entry={lineId:'P',pointId:'P',title:point.title,pointText:point.text,parent:'Fictieve norm',element:'Oefengroep',row:5,refs:'V1',material,line:{materialKind:'criterion'}};
  const main={name:'03 Referentiekader',entries:[entry],merges:[],rows:Array.from({length:5},()=>[])};
  const original={registerKind:'testing',entries:[{lineId:'P',row:1,aspects:['werking']}],columnIds:['werkingApproach'],rows:[[unselectedOperationText]]};
  const sheet=executionSheet({sheets:[original],meta:{}},main,{testingAspects:['werking']});
  const plan=sheet.entries[0].plans.werking;
  if(included){assert(plan.includes(point.phase_plans.werking.action));assert(plan.includes(point.phase_plans.werking.expected_evidence));}
  else{assert.match(plan,/^De bron werkt bij dit toetspunt geen werkingstoets uit\./);assert.match(plan,/Verwacht bewijs:\nNiet uitgewerkt in de bron\./);assert(!plan.includes('Fictieve uitvoeringsregistratie'));}
  assert(!plan.includes('NOT_SELECTED'));
 }
});

test('verwacht bewijs met meer alinea\'s staat volledig in de bewijskolom, niet in de instructie (#310)',async()=>{
 const {splitPhasePlan}=await import('./excel-template-execution.mjs');
 const deel=splitPhasePlan('Vergelijk de inrichting.\n\nVerwacht bewijs: Eerste alinea.\n\nTweede alinea.');
 assert.equal(deel.approach,'Vergelijk de inrichting.');
 assert.equal(deel.evidence,'Eerste alinea.\n\nTweede alinea.');
 const cio=splitPhasePlan('Doe dit.\n\nVerwacht bewijs: Stuk.\n\nBewijsgrens: Grens.\n\nStatus: Klaar.');
 assert.equal(cio.evidence,'Stuk.');
 assert.match(cio.approach,/^Doe dit\.\n\nBewijsgrens: Grens\.\n\nStatus: Klaar\.$/);
});
