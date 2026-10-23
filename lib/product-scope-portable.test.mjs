import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {registerCatalogueResource,ensureCatalogue,onCatalogueChange} from './catalogue-runtime.mjs';

// Real admission/cleanup with synthetic reviewed data. Count the expensive
// reconstruction independently of the comparison of each live candidate line.
register('data:text/javascript,'+encodeURIComponent(`
 export async function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/product-scope.mjs'))return next(specifier,context);
  if(specifier.endsWith('.json'))return {url:'data:application/json,%7B%7D',shortCircuit:true};
  const fixtures={
   './reviewed-reports.mjs':'export const reviewedScopeSnapshots={},reviewedScopeDecisions={};globalThis.scopeFixture={snapshots:reviewedScopeSnapshots,decisions:reviewedScopeDecisions,calls:0,revision:"first"};',
   './investigation.mjs':'export const materialMatchesLine=()=>{throw Error("Unused material path");};',
   './report-quality-revisions.mjs':'export function revisedReportLine(line){globalThis.scopeFixture.calls++;return {...line,practicalRevision:globalThis.scopeFixture.revision};}'
  };
  if(fixtures[specifier])return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {scopeDecision,scopeReview,admittedLines,cleanScopeDraft,assertScopeExport}=await import('./product-scope.mjs');
const fixture=globalThis.scopeFixture;
function source(id) {
  const line={id,report_id:'FUTURE',title:'Norm '+id,criterion:{text:'Exacte bron 🧭 '+id,evidence_ids:['evidence']}};
  fixture.snapshots[id]={line:JSON.stringify(line),sourceHash:'verified-source'};
  fixture.decisions[id]=['retain','Reviewed'];
  return line;
}
const projected=line=>({...line,practicalRevision:fixture.revision});
const framework=lines=>({productScope:'internal-it-1',lines,report:{id:'FUTURE',source_hash:'verified-source'}});

test('unchanged reviewed text is reconstructed once while live content, hashes and decisions remain checked',()=>{
  const original=source('R1'),line=projected(original),f=framework([line]),before=fixture.calls;
  for(let i=0;i<20;i++)assert.equal(scopeDecision(f,line).status,'retain');
  assert.equal(fixture.calls-before,1);
  const draft={included:['R1'],research:{links:[{line_id:'R1',question_id:'q'}]}};
  assert.equal(cleanScopeDraft(f,draft).draft,draft);
  assert.deepEqual(admittedLines(f),[line]);
  line.criterion.text='Changed quotation';
  assert.equal(scopeDecision(f,line).status,'hold');
  assert.deepEqual(cleanScopeDraft(f,draft).removed,['R1']);
  assert.throws(()=>assertScopeExport(f,draft),/R1/);
  line.criterion.text='Exacte bron 🧭 R1';
  for(const change of [()=>{f.report.source_hash='different';},
    ()=>{fixture.snapshots.R1.sourceHash='different';},
    ()=>{fixture.decisions.R1=['hold','Review required'];},
    ()=>{scopeReview.R1=['hold','Editorial hold'];},
    ()=>{line.displayOnly=true;},()=>{line.practicalRevision='wrong';}]){
    change();assert.equal(scopeDecision(f,line).status,'hold');
    f.report.source_hash=fixture.snapshots.R1.sourceHash='verified-source';
    fixture.decisions.R1=['retain','Reviewed'];delete scopeReview.R1;delete line.displayOnly;line.practicalRevision=fixture.revision;
  }
  assert.equal(fixture.calls-before,1);
  assert.equal(scopeDecision({...f,productScope:'unknown'},line).status,'hold');
  assert.equal(scopeDecision(f,original).status,'retain');
  assert.equal(scopeDecision(f,{...original,title:'Not reviewed'}).status,'hold');
  assert.equal(scopeDecision(f,{id:'not-in-catalogue',practicalRevision:'first'}).status,'hold');
});

test('changed or replaced reviewed snapshots invalidate reuse without trusting their identity',()=>{
  const original=source('R2'),line=projected(original),f=framework([line]);
  assert.equal(scopeDecision(f,line).status,'retain');const before=fixture.calls;
  fixture.snapshots.R2.line=JSON.stringify({...original,title:'Corrected norm'});
  assert.equal(scopeDecision(f,line).status,'hold');
  line.title='Corrected norm';assert.equal(scopeDecision(f,line).status,'retain');
  assert.equal(fixture.calls-before,1);
  fixture.snapshots.R2={...fixture.snapshots.R2};
  assert.equal(scopeDecision(f,line).status,'retain');assert.equal(fixture.calls-before,2);
  fixture.snapshots.R2.line='{invalid';
  assert.throws(()=>scopeDecision(f,line),SyntaxError);
  assert.throws(()=>scopeDecision(f,line),SyntaxError);
  fixture.snapshots.R2.line=JSON.stringify({...original,title:'Repaired norm'});
  assert.equal(scopeDecision(f,line).status,'hold');
  line.title='Repaired norm';assert.equal(scopeDecision(f,line).status,'retain');
  delete fixture.snapshots.R2;assert.equal(scopeDecision(f,line).status,'hold');
});

test('a new 200-norm report, catalogue correction and rollback preserve admission and every link',async()=>{
  const lines=Array.from({length:200},(_,i)=>projected(source('NEW-'+i)));
  const f=framework(lines),draft={included:lines.map(l=>l.id),research:{links:lines.map(l=>({line_id:l.id,question_id:'q'}))}};
  const before=fixture.calls;
  assert.equal(admittedLines(f).length,200);
  for(let i=0;i<20;i++)assert.equal(cleanScopeDraft(f,draft).draft,draft);
  assert.equal(fixture.calls-before,200);
  registerCatalogueResource('scope-correction',async()=>null,()=>{
    const previous=fixture.revision;fixture.revision='second';return ()=>{fixture.revision=previous;};
  });
  await ensureCatalogue(['scope-correction']);
  assert.equal(scopeDecision(f,lines[199]).status,'hold');
  const updated=lines.map(l=>({...l,practicalRevision:fixture.revision})),current=framework(updated);
  assert.equal(cleanScopeDraft(current,draft).draft,draft);
  assert.equal(fixture.calls-before,400);
  registerCatalogueResource('scope-failed-publication',async()=>null,()=>{
    const previous=fixture.revision;fixture.revision='failed';return ()=>{fixture.revision=previous;};
  });
  let fail=true;const stop=onCatalogueChange(()=>{if(fail){fail=false;throw Error('Rejected publication');}});
  try{await assert.rejects(ensureCatalogue(['scope-failed-publication']),/Rejected publication/);}finally{stop();}
  assert.equal(fixture.revision,'second');
  assert.equal(cleanScopeDraft(current,draft).draft,draft);
  assert.equal(fixture.calls-before,600);
  const reloaded=structuredClone(current);
  reloaded.lines[199].criterion.text='Altered source';
  const cleaned=cleanScopeDraft(reloaded,draft);
  assert.deepEqual(cleaned.removed,['NEW-199']);assert.equal(cleaned.draft.research.links.length,199);
  assert.equal(fixture.calls-before,600);
});
