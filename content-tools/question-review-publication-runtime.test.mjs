import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { sourceRuntimeFixture } from './test-support/local-source-runtime-fixture.mjs';
import { prepareQuestionReviewPublication } from './question-review-publication.mjs';
import { readQuestionReview } from '../lib/question-quality-review.mjs';
import { CatalogueRepository } from '../local-data/repository.mjs';
import { readRuntimePublication } from '../local-data/runtime-publication.mjs';
import { webResource } from '../local-data/web-resources.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { checkRuntimeDatabase } from '../scripts/check-runtime-database.mjs';
import { projectReportDelivery } from '../scripts/report-delivery-projection.mjs';
import { applyCatalogueEdits } from '../lib/catalogue-runtime.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Deliberately fictitious source authoring BEFORE the existing simulated source,
// custody, practical review and owner-admission gates. No real reviewer claims.
function author(f, revised) {
  const app = f.read('APP-FINAL.json'), line = app.framework.lines[0], report = app.framework.report;
  const reuse = f.read('REUSE-CANDIDATE.json'), projection = f.read('REUSE-VIEWER-PROJECTION.json');
  const locators = f.read('POINT-SOURCE-LOCATORS.json');
  const questions = [
    { id: 'auditQuestion', kind: 'toetsvraag', text: line.auditQuestion.text },
    { ...reuse.interview_questions[0], kind: 'interview' },
    { ...reuse.interview_questions[0], id: 'FICTIEF-Q2', kind: 'interview', text: 'Hoe verliep de fictieve overdracht?' },
  ];
  const input = { sourceId: report.id, itemId: line.id, sourceEdition: String(report.year), sourceHash: report.source_hash,
    inventoryComplete: true, item: structuredClone(line),
    context: { limitations: app.framework.limitations, evidence: app.framework.evidence, source: app.source },
    questions, reviews: [] };
  const receipt = (q, version, decision = 'behouden') => ({ sourceId: input.sourceId, itemId: input.itemId, questionId: q.id,
    sourceEdition: input.sourceEdition, sourceHash: input.sourceHash, itemHash: sha(input.item), contextHash: sha(input.context),
    questionHash: sha({ id: q.id, kind: q.kind, text: q.text }), decision, reviewId: `synthetic-${version}-${q.id}`,
    reviewer: 'synthetic-reviewer-only', reviewDate: '2026-10-26', basis: 'Fictieve softwaretest; geen echte review.' });
  input.reviews = questions.map(q => receipt(q, 'before'));
  const prior = prepareQuestionReviewPublication(input);
  // Historical rejection is retained as evidence; current inventory explicitly
  // removes that source question instead of creating a replacement question.
  const rejected = structuredClone(input);
  rejected.reviews.find(r => r.questionId === 'FICTIEF-Q1').decision = 'schrappen';
  const rejectedPublication = prepareQuestionReviewPublication(rejected).publication;
  if (revised) {
    input.questions = questions.filter(q => q.id !== 'FICTIEF-Q1').map(q =>
      q.id === 'FICTIEF-Q2' ? { ...q, text: 'Hoe registreerde u de fictieve overdracht?' } : q);
    input.reviews = input.reviews.filter(r => r.questionId !== 'FICTIEF-Q1');
    assert.throws(() => prepareQuestionReviewPublication(input), /stale or incomplete/);
    input.reviews = input.questions.map(q => receipt(q, 'after'));
  }
  const prepared = prepareQuestionReviewPublication(input);
  line.questionReview = prepared.publication;
  const offered = prepared.offeredQuestions.filter(q => q.id !== 'auditQuestion');
  reuse.interview_questions = offered;
  projection.interview_questions = offered;
  projection.blocks[0].line = structuredClone(line);
  locators.locators[0].question_ids = offered.map(q => q.id);
  f.set('APP-FINAL.json', app); f.set('REUSE-CANDIDATE.json', reuse);
  f.set('REUSE-VIEWER-PROJECTION.json', projection); f.set('POINT-SOURCE-LOCATORS.json', locators);
  f.set('question-review-history.json', { synthetic: true, prior: prior.publication, rejected: rejectedPublication });
  // Include the history in the ordinary review-basis inventory too.
  const basis = f.read('REVIEW-BASIS.json');
  basis.files['question-review-history.json'] = f.paths.get('question-review-history.json').sha256;
  f.set('REVIEW-BASIS.json', basis);
}

function build(f) {
  const run = spawnSync(process.execPath, ['scripts/build-local-database.mjs', '--plan', f.options.plan,
    '--base', f.options.base, '--out', f.options.out], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.ifError(run.error); assert.equal(run.status, 0, run.stderr);
  const built = JSON.parse(run.stdout);
  assert.equal(built.runtime.status, 'LOCAL_READY');
  assert.equal(checkRuntimeDatabase(built).status, 'VERIFIED_RUNTIME_DATABASE');
  return built;
}

function inspect(built) {
  const reader = new CatalogueRepository(built.database, { readOnly: true });
  try {
    const content = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
    const read = ref => webResource(reader, built.release, ref.hash), id = 'app/report-additions.json';
    const data = structuredClone(content.modules[id]), projection = projectReportDelivery(content, read);
    for (const part of [...projection.registrations[id]].reverse()) applyCatalogueEdits(data, part.bundle[id]);
    return { data, bundle: reader.exportRelease(built.release) };
  } finally { reader.close(); }
}

test('ordinary CLI publishes a new synthetic inventory with deletion, fresh rewrite review and exact retained evidence', async t => {
  const parent = join(root, 'work', 'question-publication-tests'); mkdirSync(parent, { recursive: true });
  const scratch = mkdtempSync(join(parent, 'case-'));
  t.after(() => { assert.equal(dirname(scratch), parent); rmSync(scratch, { recursive: true, force: true }); });
  const oldEnv = Object.fromEntries(['TEMP', 'TMP', 'TMPDIR'].map(key => [key, process.env[key]]));
  let before, after;
  try {
    for (const key of Object.keys(oldEnv)) process.env[key] = scratch;
    before = await sourceRuntimeFixture(t, 'report', f => author(f, false));
    after = await sourceRuntimeFixture(t, 'report', f => author(f, true));
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  const baseBytes = readFileSync(before.baseline.databasePath), builtBefore = build(before);
  const oldBytes = readFileSync(builtBefore.database), old = inspect(builtBefore);
  const builtAfter = build(after), next = inspect(builtAfter);
  const oldQuestions = old.data.interview_questions, newQuestions = next.data.interview_questions;
  assert.deepEqual(oldQuestions.map(q => q.id), ['FICTIEF-Q1', 'FICTIEF-Q2']);
  assert.deepEqual(newQuestions.map(q => q.id), ['FICTIEF-Q2']);
  assert.notEqual(oldQuestions[1].text, newQuestions[0].text);
  const line = next.data.corpus[0].framework.lines[0], capsule = line.questionReview;
  const state = question => readQuestionReview({ sourceId: line.report_id, itemId: line.id, publication: capsule, question });
  assert.equal(state(newQuestions[0]).approved, true);
  assert.equal(state(oldQuestions[0]).approved, false);
  assert.equal(state(oldQuestions[1]).status, 'stale');
  assert.equal(state(newQuestions[0]).reviewId, 'synthetic-after-FICTIEF-Q2');
  assert.deepEqual(next.data.locators[0].question_ids, ['FICTIEF-Q2']);
  assert.deepEqual(next.bundle.documents, old.bundle.documents, 'source pages and document identity remain exact');
  const fileId = after.paths.get('question-review-history.json').id;
  const history = next.bundle.artifacts.find(a => a.name === `FICTIEF/files/${fileId}`).data;
  assert.deepEqual(Buffer.from(history.content, 'base64'), after.files.get(fileId));
  assert.equal(JSON.parse(Buffer.from(history.content, 'base64')).rejected.reviews.find(r => r.questionId === 'FICTIEF-Q1').decision, 'schrappen');
  assert.deepEqual(readFileSync(before.baseline.databasePath), baseBytes);
  assert.deepEqual(readFileSync(builtBefore.database), oldBytes, 'old published DB is byte-identical');
});
