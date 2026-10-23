import test from 'node:test';
import assert from 'node:assert/strict';
import {projectWwkeOverview} from '../scripts/wwke-overview-projection.mjs';
import {wwkeBrowseInventory,wwkeBrowseRows,wwkeMatchesFields} from './wwke-browse-core.mjs';
import {wwkeOverviewRows,wwkeOverviewExcluded} from './wwke-overview.mjs';

const criteria=Array.from({length:200},(_,i)=>({id:i===199?'WWA-C-0016':'norm-'+i,title:'Norm '+i,chapter:'Chapter',text:'Original norm '+i}));
const points=criteria.map((c,i)=>({id:'point-'+i,criterion_id:c.id,title:'Point '+i,text:'Exact norm 🧭 '+i,element:'Continuity',scope:'Specific scope',
 selection_status:i===197?'HOLD':i===198?'CONTEXT_ONLY':'SELECTABLE',addressees:[{label:'Responsible team',condition:'Private condition'}],
 facets:{target_roles:[i%2?'SECTOR_MINISTER':'CRITICAL_ENTITY']},source_links:[{record_id:'record'}],control_measure:{text:'Measure '+i,rationale:'Private rationale'},
 phase_plans:{opzet:{action:'Private test'}},conditions:['Private condition'],exceptions:['Private exception']}));
const mappings=points.map((p,i)=>({point_id:p.id,sectors:i%3?['ENERGIE']:[],target_roles:p.facets.target_roles,government_relevance:['NATIONAL_GOVERNANCE'],known_article23_excluded_sectors:i%2?[]:['BANKWEZEN']}));
const groups=[{id:'first',title:'Group',criteria:criteria.map(c=>c.id)}];
const records=[{id:'record',locator:'Article 200',source_spans:[{quote:'Private quote',page:7}]}];
const filters={point_mappings:mappings,predicates:{government_navigation:{default_modes:['NATIONAL_GOVERNANCE']}},vocabularies:{sectors:[{id:'ENERGIE'},{id:'BANKWEZEN'}]}};
const contextFor=p=>({goals:[{text:'Goal '+p.id}],objectives:[{text:'Outcome '+p.id,risk:'Risk '+p.id}],records,issues:['Private issue']});
const criterionText=(c,a)=>a==='entities'?'Entity norm '+c.id:c.text;
const input={criteria,points,contextFor,criterionText,records,filters,groups};
const projection=projectWwkeOverview('future-law',input);
const full={criteria,points,contextFor,criterionText,matches:(p,f)=>wwkeMatchesFields(p,mappings.find(m=>m.point_id===p.id),['Article 200'],['NATIONAL_GOVERNANCE'],f)};
const stripDisplay=rows=>rows.map(({displayOnly,...row})=>{assert.equal(displayOnly,true);return row;});

await test('200-norm law projection retains identical audience, sector, search, status and selected-only rows',()=>{
 const before=JSON.stringify(input);
 for(const audience of ['', 'entities','supervision','governance'])for(const sector of ['', 'ENERGIE','BANKWEZEN'])
 for(const query of ['', 'article 200','point-196','SCOPE responsible','absent'])for(const section of [undefined,'norms','context','hold'])for(const selectedOnly of [false,true]){
  const view={audience,sector,query,section,selectedOnly},selected=['point-196','point-197','point-198','point-199'];
  assert.deepEqual(stripDisplay(wwkeOverviewRows(projection,view,selected)),wwkeBrowseRows(full,groups,view,selected));
 }
 assert.equal(JSON.stringify(input),before);
 assert.equal(projection.points.length,200);assert.equal(projection.rows.length,200);
 assert.doesNotMatch(JSON.stringify(projection),/Private (test|quote|condition|exception|rationale|issue)/);
 assert.equal(wwkeOverviewExcluded(projection,'point-196','BANKWEZEN'),true);
 assert.equal(wwkeOverviewExcluded(projection,'point-196','ENERGIE'),false);
 assert.equal(wwkeOverviewExcluded(projection,'missing','BANKWEZEN'),false);
});

await test('browsing keeps legal scopes, context, HOLD, wording and special rule-making audience intact',()=>{
 const inventory=wwkeBrowseInventory(full);
 assert.equal(inventory.norms.length,198);assert.equal(inventory.hold[0].id,'point-197');assert.equal(inventory.context[0].id,'point-198');
 const entity=wwkeOverviewRows(projection,{audience:'entities',section:'norms',query:'point-196'})[0];
 assert.deepEqual(entity.pointIds,['point-196']);assert.equal(entity.criterion.text,'Entity norm norm-196');
 assert.equal(entity.objective.text,'Goal point-196');assert.equal(entity.risk.text,'Risk point-196');
 assert.equal(entity.controlObjective.text,'Outcome point-196');assert.equal(entity.control.text,'Measure 196');
 assert.equal(entity.criterion.basis,'INFERRED');assert.equal(entity.controlStatus.operation.value,'NOT_ESTABLISHED');
 assert.equal(wwkeOverviewRows(projection,{audience:'supervision',query:'point-199'}).length,0);
 assert.equal(wwkeOverviewRows(projection,{audience:'governance',query:'point-199'}).length,1);
 const p=points[0],m=mappings[0];
 assert.equal(wwkeMatchesFields(p,m,['Article 200'],['NATIONAL_GOVERNANCE'],{query:'scope article 200'}),true);
 assert.equal(wwkeMatchesFields(p,m,['Article 200'],[],{role:'SECTOR_MINISTER'}),false);
 assert.equal(wwkeMatchesFields(p,m,[],[],{sector:'BANKWEZEN',includeGeneral:false}),false);
 assert.equal(wwkeMatchesFields(p,m,[],[],{government:'OTHER'}),false);
 assert.equal(wwkeMatchesFields(p,undefined,[],[],{}),false);
});

await test('unknown identities, missing mappings and changed selection statuses cannot create an overview',()=>{
 for(const change of [s=>s.points.push(s.points[0]),s=>s.criteria.push(s.criteria[0]),s=>s.records.push(s.records[0]),s=>s.filters.point_mappings.push(s.filters.point_mappings[0]),s=>s.points[0].criterion_id='unknown',
  s=>s.points[0].source_links[0].record_id='unknown',s=>s.filters.point_mappings.shift(),s=>s.points[0].selection_status='UNKNOWN']){
  const s={...structuredClone({criteria,points,filters,records,groups}),contextFor,criterionText};change(s);
  assert.throws(()=>projectWwkeOverview('future-law',s),/identity/);
 }
});
