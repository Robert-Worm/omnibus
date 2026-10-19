import assert from 'node:assert/strict';
import registry from '../app/reviewed-reports.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};

// Counting is not admission: callers must run the unchanged, pinned release
// verifier first. Count the reviewed registry AND separately verified additions,
// not an older release total or child testing points from a viewer catalogue.
export function assertReportReleaseInventory(gate,packages=[registry,additions]){
 assert.equal(gate.status,'PASS','The pinned release verifier must pass');
 assert(packages.length>0,'At least one report package');
 const reports=[],norms=[];
 for(const pack of packages){
  assert(Array.isArray(pack.corpus),'Report package corpus');
  for(const entry of pack.corpus){
   const report=entry.framework?.report?.id;assert(typeof report==='string'&&report.length,'Report identity');
   assert(Array.isArray(entry.framework.lines),'Report norms');reports.push(report);
   for(const line of entry.framework.lines){
    assert(typeof line.id==='string'&&line.id.length,'Norm identity');
    assert.equal(line.report_id,report,'Norm belongs to its source report');norms.push(line.id);
   }
  }
 }
 assert.equal(new Set(reports).size,reports.length,'Duplicate report identity');
 assert.equal(new Set(norms).size,norms.length,'Duplicate norm identity');
 assert.equal(gate.reports,reports.length,'Released reports include separately verified additions');
 assert.equal(gate.items,norms.length,'Release items count norms, not child testing points');
 return {reports:reports.length,norms:norms.length};
}
