import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {projectReportOverviews} from '../scripts/report-overview-projection.mjs';
import {reportPointCounts} from './report-point-counts.mjs';
import {ensureCatalogue, registerCatalogueResource, catalogueReady} from './catalogue-runtime.mjs';

register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  let source;
  if(context.parentURL.endsWith('/report-overviews.mjs')&&specifier.endsWith('/report-overview-resources.mjs'))source=
   'export default {A:async()=>({report:{report:{id:"A"}},lines:[{id:"A1",overviewOrder:2}],points:[]}),B:async()=>({report:{report:{id:"B"}},lines:[{id:"B1",overviewOrder:1}],points:[]})}';
  if(context.parentURL.endsWith('/product-scope.mjs')){
   if(specifier.endsWith('.json'))return {url:'data:application/json,%7B%7D',shortCircuit:true};
   if(specifier.endsWith('/reviewed-reports.mjs'))source='export const reviewedScopeSnapshots={},reviewedScopeDecisions={}';
   if(specifier.endsWith('/investigation.mjs'))source='export const materialMatchesLine=(m,l)=>JSON.stringify(m)===JSON.stringify(l);';
   if(specifier.endsWith('/report-quality-revisions.mjs'))source='export const revisedReportLine=l=>l';
  }
  if(context.parentURL.endsWith('/report-browse-groups.mjs')&&specifier.endsWith('/content-discovery.mjs'))source='export const discoveryProcesses=[]';
  if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {reportOverviewKey,reportOverviewCatalogue}=await import('./report-overviews.mjs');
const {scopeDecision}=await import('./product-scope.mjs');
const {reportBrowserGroups,reportSelection}=await import('./report-browser-model.mjs');

const element=text=>({text,basis:'PROPOSED',reason:'Synthetic reviewed rationale',evidence_ids:['e1']});
const line=(id,report_id)=>({id,report_id,title:'Synthetic norm '+id,entity:'Test team',
  objective:element('Original goal'),risk:element('Test risk'),control:element('Test measure'),
  criterion:element('Test criterion'),procedure:element('Full procedure must stay out'),
  controlStatus:{design:{value:'UNKNOWN',evidence_ids:[]}},relationships:[],sourceItems:[]});
const reports=['A','B'].map(id=>({report:{id,title:'Report '+id},scope:'Exact scope',limitations:['Exact limitation'],gaps:[],evidence:[{quote:'Full source must stay out'}]}));
const points=[{id:'A1/P1',legacy_line_id:'A1',title:'First point',text:'Unique wording',design_test:{instruction:'Full phase must stay out'}},
  {id:'A1/P2',legacy_line_id:'A1',title:'Second point',text:'Other'},
  {id:'held/P1',legacy_line_id:'held',title:'Held point',text:'Not admitted'}];
const resolveElement=(l,key)=>key==='objective'?element('Reviewed goal'):key==='controlObjective'?element('Reviewed outcome'):l[key];

await test('projection preserves reviewed display text, order, report context and complete search/count units',()=>{
  const source=[line('B1','B'),line('A1','A')];
  const before=JSON.stringify({source,reports,points});
  const overview=projectReportOverviews(source,reports,points,resolveElement);
  assert.equal(JSON.stringify({source,reports,points}),before);
  assert.equal(overview.A.lines[0].overviewOrder,1);
  for(const key of ['objective','risk','controlObjective','control','criterion'])
    assert.deepEqual(overview.A.lines[0][key],resolveElement(source[1],key));
  assert.deepEqual(overview.A.report.limitations,['Exact limitation']);
  assert.equal(overview.A.points.length,2);
  assert.doesNotMatch(JSON.stringify(overview),/Full (source|phase|procedure) must stay out|Held point/);
  const draft={included:['material'],investigation:{materials:[{id:'material',sourcePointId:'A1/P2'}]}};
  const counts=reportPointCounts({blocks:overview.A.lines,points:overview.A.points},draft);
  assert.equal(reportSelection(overview.A.lines,counts,draft.included).total,2);
  assert.equal(counts.A1.selected,1);
  assert.deepEqual(reportBrowserGroups(overview.A.lines,counts,{query:'unique wording'},draft.included,overview.A.points)[0].lines.map(l=>l.id),['A1']);
});

await test('display rows cannot be admitted, even outside a scoped catalogue',()=>{
  const overview=projectReportOverviews([line('A1','A')],reports,points,resolveElement);
  assert.equal(scopeDecision({},overview.A.lines[0]).status,'hold');
  assert.equal(scopeDecision({productScope:'internal-it-1'},overview.A.lines[0]).status,'hold');
  assert.equal(scopeDecision({},line('A1','A')).status,'retain');
});

await test('unknown report and duplicate norm identities fail the projection',()=>{
  assert.throws(()=>projectReportOverviews([line('X','missing')],reports,points,resolveElement),/identity/);
  assert.throws(()=>projectReportOverviews([line('A1','A'),line('A1','A')],reports,points,resolveElement),/identity/);
});

await test('opening an overview does not hydrate full reports; overlapping views retain global order',async()=>{
  let fullLoads=0;
  registerCatalogueResource('report:A',async()=>{fullLoads++;return {};},()=>{});
  assert.equal(reportOverviewKey('A'),'overview:A');
  assert.equal(reportOverviewKey('offline'),'report:offline');
  assert.equal(reportOverviewCatalogue(['A','B']),null);
  await ensureCatalogue([reportOverviewKey('A')]);
  assert.equal(fullLoads,0);
  assert.equal(catalogueReady(['report:A']),false);
  assert.equal(reportOverviewCatalogue(['A','B']),null);
  await ensureCatalogue([reportOverviewKey('B')]);
  assert.deepEqual(reportOverviewCatalogue(['A','B','A']).lines.map(l=>l.id),['B1','A1']);
  assert.equal(reportOverviewCatalogue(['A','B','A']).reports.length,2);
  await ensureCatalogue(['report:A']);
  assert.equal(fullLoads,1);
});
