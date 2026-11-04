import test from 'node:test';
import assert from 'node:assert/strict';
import {lawTestPhases} from './law-test-phases.mjs';

const phase=(action,boundary)=>({status:'APPLICABLE',action,expected_evidence:'Passend bewijs',interpretation_boundary:boundary,reason:'Brongebonden voorstel'});
test('shared limits retain exact bytes and keep phase actions and evidence separate',()=>{
 const boundary='Alleen voor actor A.\nUitzondering voor situatie B; geen werkingsoordeel.';
 const plans={opzet:phase('Beoordeel de inrichting.',boundary),bestaan:phase('Inspecteer een concrete invoering.',boundary),werking:{status:'NOT_SELECTED',reason:'Niet uitgewerkt'}};
 const before=structuredClone(plans),result=lawTestPhases(plans);
 assert.deepEqual(result.phases.map(p=>p.key),['opzet','bestaan']);
 assert.deepEqual(result.shared,[{text:boundary,labels:['Opzet','Bestaan']}]);
 assert.equal(result.phases[0].plan.action,before.opzet.action);
 assert.equal(result.phases[1].plan.action,before.bestaan.action);
 assert.deepEqual(plans,before);
});
test('different qualifiers remain separate even with only a whitespace difference',()=>{
 for(const boundary of ['Alleen actor B.','Alleen actor A. ']){
  const result=lawTestPhases({opzet:phase('Ontwerp','Alleen actor A.'),bestaan:phase('Invoering',boundary)});
  assert.deepEqual(result.shared,[]);
  assert.equal(result.phases[1].plan.interpretation_boundary,boundary);
 }
});
test('an explicitly applicable operation plan is displayed without replacing the earlier phases',()=>{
 const plans={opzet:phase('Ontwerp','Gedeelde grens'),bestaan:phase('Invoering','Gedeelde grens'),werking:phase('Onderzoek de uitvoering in de gekozen periode.','Conclusie begrensd tot periode en selectie.')};
 const before=structuredClone(plans),result=lawTestPhases(plans);
 assert.deepEqual(result.phases.map(p=>p.label),['Opzet','Bestaan','Werking']);
 assert.deepEqual(result.shared,[{text:'Gedeelde grens',labels:['Opzet','Bestaan']}]);
 assert.equal(result.phases[2].plan,plans.werking);
 assert.deepEqual(plans,before);
 for(const status of ['NOT_SELECTED','NOT_APPLICABLE','HOLD'])
  assert.equal(lawTestPhases({...plans,werking:{...plans.werking,status}}).phases.length,2);
});
