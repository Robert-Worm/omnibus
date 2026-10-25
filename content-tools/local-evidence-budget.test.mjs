import test from "node:test";
import assert from "node:assert/strict";
import { baselineArchiveIds, reserveLocalPackageBytes } from "./local-evidence-budget.mjs";
const MiB = 1024 * 1024, hash = 'a'.repeat(64);
const manifest = { package: { kind: 'report' }, files: [
  { id:'basis', path:'packet/REVIEW-BASIS.json', roles:['review-basis'], bytes:100 },
  { id:'freeze', path:'packet/BASELINE-FREEZE.json', roles:['supporting'], bytes:100 },
  { id:'html', path:'archive/old.html', roles:['supporting'], sha256:hash, bytes:65*MiB },
  { id:'viewer', path:'packet/APP-FINAL.json', roles:['viewer-content'], sha256:hash, bytes:MiB }
] };
const proof = { paths:[{ original:'/old/old.html', fileId:'html' }] };
test('only exact frozen supporting evidence receives the separate bounded budget', () => {
  const ids = baselineArchiveIds(manifest, proof, () => ({files:{'/old/old.html':hash,'APP-FINAL.json':hash}}));
  assert.deepEqual([...ids], ['html']);
  const budget = {bytes:0,archiveBytes:0};
  reserveLocalPackageBytes(budget, manifest, ids, 200, 64*MiB);
  assert.equal(budget.archiveBytes,65*MiB); assert.equal(budget.bytes,MiB+400);
  assert.throws(()=>reserveLocalPackageBytes(budget,manifest,ids,200,64*MiB),/archives exceed/);
  assert.throws(()=>reserveLocalPackageBytes({bytes:0,archiveBytes:0},manifest,new Set(),200,64*MiB),/64 MiB/);
});
test('unknown or modified archive pins fail and non-report packages get no exception', () => {
  assert.deepEqual([...baselineArchiveIds({...manifest,package:{kind:'framework'}},proof,()=>null)],[]);
  for(const files of [{'/old/absent.html':hash},{'/old/old.html':'b'.repeat(64)}])
    assert.throws(()=>baselineArchiveIds(manifest,proof,()=>({files})),/differs from checked intake/);
});
