import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createModelSkillTrial} from './test-support/local-model-skill-trial.mjs';
import {checkModelReviews, prepareModelReview} from './model-quality.mjs';

test('cold trial creates reproducible source-bound drafts but never approval evidence', t => {
  const work = fileURLToPath(new URL('../work', import.meta.url));
  const drafts = [createModelSkillTrial(), createModelSkillTrial(), createModelSkillTrial({revised:true})];
  for (const draft of drafts) t.after(() => {
    assert.equal(dirname(draft.folder), work);
    rmSync(draft.folder, {recursive:true, force:true});
  });
  const read = (draft, name) => JSON.parse(readFileSync(join(draft.folder, name), 'utf8'));
  assert.equal(drafts[0].basisHash, drafts[1].basisHash);
  assert.notEqual(drafts[0].basisHash, drafts[2].basisHash);
  assert.deepEqual(readFileSync(join(drafts[0].folder, 'source.txt')), readFileSync(join(drafts[2].folder, 'source.txt')));
  for (const draft of drafts) {
    const basis = read(draft, 'basis.json'), input = read(draft, 'run-input.json'), model = read(draft, 'model.json');
    assert.deepEqual(prepareModelReview(model, {sourceEvidence:basis.sourceEvidence}), basis);
    assert.equal(checkModelReviews(basis, [], {authorIds:input.authorIds}).status, 'HOLD');
    assert.equal(input.status, 'PENDING_INDEPENDENT_REVIEW');
    assert.equal(input.reviewsCreated, false);
    assert.equal(input.ownerAdmissionCreated, false);
    assert.equal(input.synthetic, true);
    assert.equal(model.selected, false);
    assert(model.items.every(i => !i.included && i.questions.every(q => !q.included)));
    const precheck = read(draft, 'question-precheck.json');
    assert.equal(precheck.length, 8);
    assert(precheck.every(row => row.uitkomst === 'door'));
    assert(!readdirSync(draft.folder).some(name => /reviews|admission|intake|sqlite/.test(name)));
  }
});
