import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdmittedFoundation,flatLawPresentation,flatLawSelection,flatLawSummary,admittedMaterialTarget} from './admitted-foundation.mjs';
const source={id:'S',catalogueAdmission:{schema:'reviewed-flat/v1',reviewBasis:'a'.repeat(64)}};
const norm={id:'S-1',sourceId:'S',originKey:'S:v1:1',auditRole:'norm',reviewStatus:'ai-reviewed',title:'Existing title',auditNorm:'Existing norm',sourceContext:'Only when applicable',rationale:'Only when applicable',risk:'Existing risk',groupId:'g',groupTitle:'Group',testDesign:'Design action',testExistence:'Existence action'};
test('only explicit review-bound admission enables a flat foundation',()=>{
 assert(isAdmittedFoundation(source));
 for(const value of [{id:'S'}, {...source,catalogueAdmission:{schema:'other',reviewBasis:'a'.repeat(64)}}, {...source,catalogueAdmission:{schema:'reviewed-flat/v1',reviewBasis:'invalid'}}]){
  assert(!isAdmittedFoundation(value));assert.throws(()=>flatLawPresentation(value,[norm]));
 }
});
test('flat mapping keeps reviewed text and scope without invented goals or measures',()=>{
 const result=flatLawPresentation(source,[norm,{...norm,id:'S-2',auditRole:'scope'}]);
 assert.equal(result.points.length,1);assert.equal(result.contextItems.length,1);
 assert.equal(result.points[0].scope,norm.sourceContext);assert.equal(result.points[0].text,norm.auditNorm);
 assert.equal(result.points[0].phase_plans.opzet.action,norm.testDesign);
 assert.equal(result.rows[0].objective.text,'');assert.equal(result.rows[0].controlObjective.text,'');assert.equal(result.rows[0].control.text,'');
 assert.throws(()=>flatLawPresentation(source,[norm,norm]),/Dubbele/);
 assert.throws(()=>flatLawPresentation(source,[{...norm,auditNorm:''}]),/Onvolledige/);
});
test('scope, draft and HOLD points remain unselectable and partial counts are unique',()=>{
 const items=[norm,{...norm,id:'S-2',originKey:'S:2'}, {...norm,id:'S-3',auditRole:'scope'}, {...norm,id:'S-4',selection_status:'HOLD'},{...norm,id:'S-5',reviewStatus:'draft'}];
 const draft={included:['WB-1'],investigation:{materials:[{id:'WB-1',originKey:norm.originKey}]}};
 assert.deepEqual(flatLawSelection(draft,items),{selectedIds:['S-1'],total:2,selected:1,all:false,partial:true});
 assert.equal(flatLawPresentation(source,items).items.length,2);
 assert.deepEqual(flatLawSummary(source,items),{groups:1,norms:2,pointIds:['S-1','S-2'],originKeys:['S:v1:1','S:2']});
 assert.equal(flatLawSummary({id:'S'},items),null);
});
test('old snapshots and personal text never route to a changed live norm',()=>{
 const material={...norm,id:'WB-1',foundationId:'S',body:norm.auditNorm};
 delete material.auditNorm;
 const draft={included:['WB-1'],investigation:{materials:[material]}};
 assert.deepEqual(admittedMaterialTarget(draft,'WB-1',[source],[norm]),{sourceId:'S',pointId:'S-1'});
 for(const field of ['auditNorm','question','rationale','sourceHash','sourceContext','testDesign','documents','procedure','statusNote','sourceChanges','location','sourceControlId','sourceText','edition','reviewStatus'])assert.equal(admittedMaterialTarget({...draft,investigation:{materials:[{...material,[field]:'My own or old value'}]}},'WB-1',[source],[norm]),null);
 assert.equal(admittedMaterialTarget({...draft,overrides:{'WB-1':{criterion:'Personal'}}},'WB-1',[source],[norm]),null);
});
