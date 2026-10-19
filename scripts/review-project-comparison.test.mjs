import assert from 'node:assert/strict';
import test from 'node:test';
import {assertImportedDraft} from './review-project-comparison.mjs';
const before='a'.repeat(64),after='b'.repeat(64);
const draft={source_hash:before,baseline_id:'trial:'+before,included:['point-1'],
  overrides:{'point-1':{text:'Own wording'}},research:{questions:['question'],links:['point-1']}};
const migrated={...draft,source_hash:after,baseline_id:'trial:'+after};

test('ordinary browser comparisons require exact project identity and contents',()=>{
  assertImportedDraft(structuredClone(draft),draft);
  assert.throws(()=>assertImportedDraft(migrated,draft));
});
test('content pilots permit only the explicitly pinned new catalogue identity',()=>{
  const original=structuredClone(draft);
  assertImportedDraft(migrated,draft,after);
  assert.deepEqual(draft,original);
  for(const value of [undefined,'bad','c'.repeat(64)])assert.throws(()=>assertImportedDraft(migrated,draft,value));
  assert.throws(()=>assertImportedDraft({...migrated,baseline_id:'other:'+after},draft,after));
});
test('a known new release does not excuse changed selections, own text or question links',()=>{
  for(const change of [{included:[]},{overrides:{}},{research:{questions:['question'],links:[]}}])
    assert.throws(()=>assertImportedDraft({...migrated,...change},draft,after));
});
