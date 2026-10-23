import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {projectFoundationOverview} from '../scripts/foundation-overview-projection.mjs';
import {registerCatalogueResource,ensureCatalogue,catalogueReady} from './catalogue-runtime.mjs';

const element=text=>({text,basis:'PROPOSED',reason:'Exact rationale',evidence_ids:[]});
const source={groups:[{id:'group',title:'Future framework'}],
 rows:Array.from({length:200},(_,i)=>({id:'row-'+i,criterionId:'norm-'+i,groupId:'group',pointIds:['point-'+i],title:'Title '+i,entity:'Team',
  objective:element('Goal'),risk:element('Risk'),controlObjective:element('Outcome'),control:element('Measure'),criterion:element('Norm 🧭 '+i),
  procedure:element('Private testing instruction'),auditQuestion:element('Private question')})),
 points:Array.from({length:200},(_,i)=>({id:'point-'+i,title:'Point '+i,text:'Exact point '+i,chapter:'Chapter',selection_status:i===199?'HOLD':'SELECTABLE',
  conditions:['Exact condition'],exceptions:['Exact exception'],addressees:[{label:'Responsible team',role:'TASK_BEARER'}],
  source_links:[{record_id:'record',contribution:'PRIMARY',explanation:'Private interpretation'}],phase_plans:{opzet:{action:'Private testing instruction'}}})),
 records:[{id:'record',locator:'Article 1',source_spans:[{page:2,start:0,end:20,quote:'Private source quote'}]}],
};
const projection=projectFoundationOverview('future',source,id=>'reviewed:'+id);
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(context.parentURL.endsWith('/foundation-overviews.mjs')&&specifier.endsWith('/foundation-overview-resources.mjs'))
   return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify('export default {future:async()=>('+JSON.stringify(projection)+')};')}),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {foundationOverviewKey,foundationOverview,foundationOverviewSelection}=await import('./foundation-overviews.mjs');

await test('a future 200-norm framework preserves all display, search, scope and HOLD data without full evidence',()=>{
 const before=JSON.stringify(source),value=projectFoundationOverview('future',source,id=>'reviewed:'+id);
 assert.equal(JSON.stringify(source),before);
 assert.deepEqual(value.groups,source.groups);assert.equal(value.rows.length,200);assert.equal(value.points.length,200);
 for(const [i,row] of value.rows.entries()){
  assert.equal(row.displayOnly,true);assert.deepEqual(row.pointIds,source.rows[i].pointIds);
  for(const field of ['objective','risk','controlObjective','control','criterion'])assert.deepEqual(row[field],source.rows[i][field]);
 }
 assert.deepEqual(value.records,[{id:'record',locator:'Article 1',source_spans:[{page:2}]}]);
 for(const [i,point] of value.points.entries())for(const key of ['title','text','chapter','conditions','exceptions','selection_status'])assert.deepEqual(point[key],source.points[i][key]);
 assert.doesNotMatch(JSON.stringify(value),/Private (testing|source|question|interpretation)/);
 const draft={included:['wb'],investigation:{materials:[{id:'wb',originKey:'reviewed:point-198'},{id:'unselected',originKey:'reviewed:point-0'}]}};
 assert.deepEqual(foundationOverviewSelection(value,draft),{selectedIds:['point-198'],selected:1,total:199,all:false,partial:true});
 assert.equal(foundationOverviewSelection(value,draft,['point-198','point-198','point-199']).total,1);
 assert.equal(foundationOverviewSelection(value,draft,['point-199']).all,false);
});

await test('opening a projection neither loads nor admits its full source; details keep the original boundary',async()=>{
 let loads=0;registerCatalogueResource('foundation:future:full',async()=>{loads++;return {};},()=>{});
 assert.equal(foundationOverviewKey('future'),'foundation-overview:future');
 assert.equal(foundationOverviewKey('future',true),'foundation:future');
 assert.equal(foundationOverviewKey('other'),'foundation:other');
 await ensureCatalogue([foundationOverviewKey('future')]);
 assert.equal(loads,0);assert.equal(catalogueReady(['foundation:future']),false);
 assert.deepEqual(foundationOverview('future'),projection);
 await ensureCatalogue([foundationOverviewKey('future',true)]);
 assert.equal(loads,1);assert.equal(foundationOverview('future'),null);
});

await test('unknown points, records, duplicate identities, missing origin and unknown selection statuses fail the projection',()=>{
 for(const edit of [s=>s.rows[0].pointIds.push('unknown'),s=>s.rows.push(s.rows[0]),s=>s.points.push(s.points[0]),
  s=>s.records.push(s.records[0]),s=>s.points[0].source_links[0].record_id='unknown',s=>s.points[0].selection_status='UNKNOWN']){
  const invalid=structuredClone(source);edit(invalid);assert.throws(()=>projectFoundationOverview('future',invalid),/identity/);
 }
 assert.throws(()=>projectFoundationOverview('future',source,()=>''),/identity/);
});
