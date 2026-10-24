import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openAgentService} from './service.mjs';
import {createIndex, insertEntry, sha256} from './index-store.mjs';
import {fixture} from './test-fixture.mjs';
import {parseProjectText} from '../lib/project-codec.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, 'work/mcp-output-safety');
const fixedId = '11111111-1111-4111-8111-111111111111';
const key = 'synthetic|point';
const call = profile => ({...fixture([key], profile), consent: true});
const exportCall = draft => ({draftId: draft.draftId, consent: true});

// Exercise the real service and read-only index without loading private modules.
// Only domain selection/export is a double: fixed sentinel bytes are NOT an XLSX
// implementation or Excel acceptance evidence. The real project codec is reused.
async function setup(t, {open = true, entryKey = key} = {}) {
  fs.mkdirSync(scratch, {recursive: true});
  const directory = fs.mkdtempSync(join(scratch, 'fixture-'));
  const build = join(directory, 'build'), output = join(directory, 'output');
  fs.mkdirSync(build);
  const release = 'a'.repeat(64), database = join(build, 'catalogue.sqlite');
  const db = new DatabaseSync(database);
  try {
    createIndex(db, release);
    insertEntry(db, {key: entryKey, kind: 'report', sourceId: 'synthetic', sourceTitle: 'Synthetic only',
      pointId: 'point', material: {title: 'Synthetic point', sourceText: 'Synthetic source 🧭'}});
  } finally { db.close(); }
  const sourceHash = sha256(fs.readFileSync(database));
  fs.writeFileSync(join(build, 'omnibus-release.json'), JSON.stringify({release, publication: 'b'.repeat(64)}));
  fs.writeFileSync(join(build, 'workflow.mjs'), `
    export {serializeProject, parseProjectText} from ${JSON.stringify(pathToFileURL(join(root, 'lib/project-codec.mjs')).href)};
    export function configureCatalogueReader() {}
    export async function initialize() {}
    export function options() { return {sectors: []}; }
    export const calls = {prepare: 0, export: 0};
    let beforeExport = () => {};
    export function setBeforeExport(fn) { beforeExport = fn; }
    export async function prepareProject(spec) {
      calls.prepare++;
      return {project: {format: 'rijksmap-project', version: 1,
        draft: {title: spec.title, exportSettings: spec.export, investigation: {materials: []}}},
        lines: {synthetic: 'point'}, questions: {central: 'q'}};
    }
    export async function exportProject(project) {
      calls.export++;
      await beforeExport(project);
      return new TextEncoder().encode('SYNTHETIC OUTPUT ONLY: ' + project.draft.exportSettings.profile);
    }
  `);
  const workflow = await import(pathToFileURL(join(build, 'workflow.mjs')).href);
  const services = [];
  const start = async (target = output) => {
    const service = await openAgentService({buildDirectory: build, outputDirectory: target});
    services.push(service); return service;
  };
  t.after(() => {
    for (const service of services) service.close();
    assert.equal(sha256(fs.readFileSync(database)), sourceHash, 'Synthetic source database stays byte-identical');
    // Only this fresh fixture tree, whose links also target this tree. Never
    // accept a caller-provided cleanup directory or recurse into agent-output.
    const actual = fs.realpathSync(directory), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel) && !fs.lstatSync(directory).isSymbolicLink());
    fs.rmSync(actual, {recursive: true});
  });
  return {directory, build, output, workflow, start, service: open ? await start() : null};
}

function patch(t, object, name, replacement) {
  const mocked = t.mock.method(object, name, replacement);
  syncBuiltinESMExports();
  return () => { mocked.mock.restore(); syncBuiltinESMExports(); };
}

test('new artifacts, all profile filenames and repeated exports preserve previous bytes', async t => {
  const {service, output} = await setup(t);
  for (const profile of ['testing', 'risk', 'interview']) {
    const draft = await service.prepare(call(profile));
    assert.equal(JSON.parse(fs.readFileSync(draft.projectPath, 'utf8')).format, 'rijksmap-project-compressed');
    const project = parseProjectText(fs.readFileSync(draft.projectPath, 'utf8'));
    assert.equal(project.draft.exportSettings.profile, profile);
    const first = await service.export(exportCall(draft)), before = fs.readFileSync(first.path);
    const second = await service.export(exportCall(draft));
    assert.notEqual(first.path, second.path);
    assert.equal(relative(join(output, draft.draftId), first.path).startsWith(profile + '-'), true);
    assert.deepEqual(fs.readFileSync(first.path), before);
    assert.equal(first.sha256, sha256(before));
    assert.equal(first.bytes, before.length);
    // Old uncompressed saved projects remain usable with a fresh call consent.
    fs.writeFileSync(draft.projectPath, JSON.stringify(project));
    const review = JSON.parse(fs.readFileSync(draft.reviewPath, 'utf8'));
    review.projectSha256 = sha256(fs.readFileSync(draft.projectPath));
    fs.writeFileSync(draft.reviewPath, JSON.stringify(review));
    await service.export(exportCall(draft));
  }
});

test('consent, path, profile and input bounds fail before creating files', async t => {
  const {service, output} = await setup(t);
  for (const changes of [{consent: false}, {consent: undefined}, {outputPath: '../escape'},
    {title: 'x'.repeat(501)}, {selections: Array(251).fill(call().selections[0])},
    {export: {...call().export, profile: '../escape'}}]) {
    await assert.rejects(service.prepare({...call(), ...changes}));
    assert.deepEqual(fs.readdirSync(output), []);
  }
  for (const draftId of ['../escape', '../' + fixedId, fixedId + ':stream', fixedId + '/child', 'C:/escape'])
    await assert.rejects(service.export({draftId, consent: true}));
  const draft = await service.prepare(call());
  await assert.rejects(service.export({draftId: draft.draftId}));
  assert.deepEqual(fs.readdirSync(join(output, draft.draftId)).sort(), ['ai-concept.json', 'omnibus-project.json']);
});

test('question refusals leave no partial draft and do not reach project creation or export', async t => {
  const {service, output, workflow} = await setup(t);
  const spec = call();
  for (const [field, text, rule] of [
    ['questions', 'Waarom ontbreekt het dossier?', 'sturend'],
    ['questions', 'Hoe verloopt de overdracht', 'geen-vraagteken'],
    ['questions', 'Vraag nog uit te werken', 'leeg'],
    ['interviewQuestions', 'Heeft u een dossier?', 'gesloten'],
    ['interviewQuestions', 'Hoe verloopt de overdracht en wie beslist?', 'samengesteld'],
  ]) {
    const input = structuredClone(spec);
    if (field === 'questions') input.questions[1].text = text;
    else input.interviewQuestions = [{selection: key, level: 'operational', text}];
    await assert.rejects(service.prepare(input), error => {
      assert.match(error.message, /Vraagvoorcontrole/);
      assert(error.issues.some(issue => issue.path[0] === field && issue.message.includes(rule)));
      return true;
    });
    assert.deepEqual(fs.readdirSync(output), [], 'No concept directory or files on refusal');
    assert.deepEqual(workflow.calls, {prepare: 0, export: 0});
  }
  // Recovery still needs fresh explicit consent and reserves a new directory.
  await assert.rejects(service.prepare({...spec, consent: undefined}));
  await assert.rejects(service.prepare({...spec, consent: false}));
  assert.deepEqual(fs.readdirSync(output), []);
  const first = await service.prepare(spec), original = fs.readFileSync(first.projectPath);
  const second = await service.prepare(spec);
  assert.notEqual(first.draftId, second.draftId);
  assert.deepEqual(fs.readFileSync(first.projectPath), original);
});

test('export preserves older saved questions and user text without applying the new proposal gate', async t => {
  const {service, workflow} = await setup(t), draft = await service.prepare(call());
  // A synthetic pre-existing snapshot, including wording that the new gate
  // would refuse. Updating its hash is fixture setup, never a production bypass.
  const project = parseProjectText(fs.readFileSync(draft.projectPath, 'utf8'));
  project.draft.research = {questions: [{id: 'kept-question', parent_id: null,
    text: 'Mijn eigen onderzoekstekst zonder vraagteken', origin: 'user'}],
    links: [{question_id: 'kept-question', line_id: 'kept-line'}]};
  project.draft.overrides = {'kept-line': {auditQuestion: 'Hoe goed werkt dit?'}};
  project.draft.included = ['kept-line'];
  fs.writeFileSync(draft.projectPath, workflow.serializeProject(project));
  const review = JSON.parse(fs.readFileSync(draft.reviewPath, 'utf8'));
  review.spec.questions[0].text = project.draft.research.questions[0].text;
  review.spec.interviewQuestions = [{selection: key, level: 'management', text: 'Heeft u een dossier?'}];
  review.projectSha256 = sha256(fs.readFileSync(draft.projectPath));
  fs.writeFileSync(draft.reviewPath, JSON.stringify(review));
  const before = [draft.projectPath, draft.reviewPath].map(path => fs.readFileSync(path));
  workflow.setBeforeExport(saved => assert.deepEqual(saved, project));
  await assert.rejects(service.export({draftId: draft.draftId, consent: false}));
  const first = await service.export(exportCall(draft)), second = await service.export(exportCall(draft));
  assert.notEqual(first.path, second.path);
  assert.deepEqual([draft.projectPath, draft.reviewPath].map(path => fs.readFileSync(path)), before);
});

test('existing files, hardlinks and UUID collisions are never overwritten or cleaned up', async t => {
  const {service, output, directory} = await setup(t);
  const draft = await service.prepare(call());
  const existing = join(output, draft.draftId, 'testing-' + fixedId + '.xlsx');
  const canary = join(directory, 'canary');
  fs.writeFileSync(canary, 'DO NOT REPLACE'); fs.linkSync(canary, existing);
  const restore = patch(t, crypto, 'randomUUID', () => fixedId);
  try {
    await assert.rejects(service.export(exportCall(draft)), /EEXIST/);
    fs.mkdirSync(join(output, fixedId));
    await assert.rejects(service.prepare(call()));
    assert.deepEqual(fs.readdirSync(join(output, fixedId)), []);
    assert.equal(fs.readFileSync(canary, 'utf8'), 'DO NOT REPLACE');
    assert.equal(fs.readFileSync(existing, 'utf8'), 'DO NOT REPLACE');
  } finally { restore(); }
});

for (const linkedParent of [false, true]) test(`linked output ${linkedParent ? 'ancestor' : 'root'} is refused at startup`, async t => {
  const {directory, output, start} = await setup(t, {open: false});
  const target = join(directory, 'outside'); fs.mkdirSync(target);
  fs.symlinkSync(target, output, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(start(linkedParent ? join(output, 'child') : output), /uitvoer|map/i);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('linked draft directories and hardlinked saved artifacts cannot be exported', async t => {
  const {service, output, directory} = await setup(t);
  const draft = await service.prepare(call());
  const alias = join(output, fixedId);
  fs.symlinkSync(join(output, draft.draftId), alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(service.export({draftId: fixedId, consent: true}), /conceptmap/);
  for (const name of ['omnibus-project.json', 'ai-concept.json']) {
    const path = join(output, draft.draftId, name), original = fs.readFileSync(path);
    const target = join(directory, name);
    fs.writeFileSync(target, original); fs.unlinkSync(path); fs.linkSync(target, path);
    await assert.rejects(service.export(exportCall(draft)), /conceptbestand/);
    assert.deepEqual(fs.readFileSync(target), original);
    fs.unlinkSync(path); fs.writeFileSync(path, original);
  }
});

test('file symlinks are refused for both reads and exclusive output creation', async t => {
  const {service, output, directory} = await setup(t), draft = await service.prepare(call());
  const target = join(directory, 'target'); fs.writeFileSync(target, 'KEEP TARGET');
  for (const name of ['ai-concept.json', 'omnibus-project.json']) {
    const path = join(output, draft.draftId, name), original = fs.readFileSync(path);
    fs.unlinkSync(path); fs.symlinkSync(target, path, 'file');
    await assert.rejects(service.export(exportCall(draft)), /conceptbestand/);
    fs.unlinkSync(path); fs.writeFileSync(path, original);
  }
  const existing = join(output, draft.draftId, 'testing-' + fixedId + '.xlsx');
  fs.symlinkSync(target, existing, 'file');
  const restore = patch(t, crypto, 'randomUUID', () => fixedId);
  try { await assert.rejects(service.export(exportCall(draft)), /EEXIST/); }
  finally { restore(); }
  assert(fs.lstatSync(existing).isSymbolicLink());
  assert.equal(fs.readFileSync(target, 'utf8'), 'KEEP TARGET');
});

test('directory changes while the workflow is awaited cannot redirect writes', async t => {
  const {service, workflow, directory, output} = await setup(t);
  const draft = await service.prepare(call());
  const original = join(output, draft.draftId), moved = join(directory, 'moved-draft');
  const target = join(directory, 'redirected'); fs.mkdirSync(target);
  workflow.setBeforeExport(() => {
    fs.renameSync(original, moved);
    fs.symlinkSync(target, original, process.platform === 'win32' ? 'junction' : 'dir');
  });
  await assert.rejects(service.export(exportCall(draft)), /conceptmap|uitvoer/);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('output root replacement is refused before preparing another artifact', async t => {
  const {service, workflow, directory, output} = await setup(t);
  workflow.setBeforeExport(() => {
    fs.renameSync(output, join(directory, 'original-output'));
    fs.mkdirSync(output);
  });
  await assert.rejects(service.prepare(call()), /uitvoer/);
  assert.deepEqual(fs.readdirSync(output), []);
});

for (const operation of ['prepare', 'export']) test(`partial ${operation} failure leaves no new artifact and retry works`, async t => {
  const {service, output} = await setup(t);
  const draft = operation === 'export' ? await service.prepare(call()) : null;
  const directory = draft ? join(output, draft.draftId) : output;
  const before = fs.readdirSync(directory), original = fs.writeFileSync;
  let calls = 0;
  const restore = patch(t, fs, 'writeFileSync', (path, data, options) => {
    if (++calls === (draft ? 1 : 2)) {
      original(path, typeof data === 'string' ? data.slice(0, 5) : data.subarray(0, 5), options);
      throw Object.assign(Error('Synthetic disk full'), {code: 'ENOSPC'});
    }
    return original(path, data, options);
  });
  try { await assert.rejects(draft ? service.export(exportCall(draft)) : service.prepare(call()), /Synthetic disk full/); }
  finally { restore(); }
  assert.deepEqual(fs.readdirSync(directory), before);
  await (draft ? service.export(exportCall(draft)) : service.prepare(call()));
});

test('rollback preserves a colliding file created by another writer in the new directory', async t => {
  const {service, output} = await setup(t), write = fs.writeFileSync;
  let occupied;
  const restore = patch(t, fs, 'writeFileSync', (path, bytes, options) => {
    write(path, bytes, options);
    occupied = join(output, fs.readdirSync(output)[0], 'ai-concept.json');
    write(occupied, 'KEEP OTHER WRITER', {flag: 'wx'});
  });
  try { await assert.rejects(service.prepare(call()), /EEXIST/); }
  finally { restore(); }
  assert.equal(fs.readFileSync(occupied, 'utf8'), 'KEEP OTHER WRITER');
  assert.deepEqual(fs.readdirSync(resolve(occupied, '..')), ['ai-concept.json']);
});

test('oversized saved files and corrupt review JSON fail safely, without export output', async t => {
  const {service, output} = await setup(t), draft = await service.prepare(call());
  const review = fs.readFileSync(draft.reviewPath), before = fs.readdirSync(join(output, draft.draftId));
  fs.writeFileSync(draft.reviewPath, 'PRIVATE_REVIEW_CONTENT');
  await assert.rejects(service.export(exportCall(draft)), error => !error.message.includes('PRIVATE'));
  fs.writeFileSync(draft.reviewPath, review);
  fs.truncateSync(draft.projectPath, 24_000_001);
  await assert.rejects(service.export(exportCall(draft)), /conceptbestand/);
  assert.deepEqual(fs.readdirSync(join(output, draft.draftId)), before);
});

test('schema-valid multibyte input cannot publish a review exceeding the existing read limit', async t => {
  const entryKey = '界'.repeat(300), {service, output} = await setup(t, {entryKey});
  const spec = {...fixture([entryKey]), consent: true};
  spec.questions = Array.from({length: 200}, (_, i) => ({key: 'q' + i, text: 'Synthetic question?',
    selections: Array(250).fill(entryKey)}));
  await assert.rejects(service.prepare(spec), /groot conceptbestand/);
  assert.deepEqual(fs.readdirSync(output), []);
});

test('a saved file growing after stat is read with a bound and rejected', async t => {
  const {service, output} = await setup(t), draft = await service.prepare(call());
  const before = fs.readdirSync(join(output, draft.draftId));
  const read = fs.readSync;
  let changed = false, largestRead = 0;
  const restore = patch(t, fs, 'readSync', (fd, buffer, offset, length, position) => {
    if (!changed) { changed = true; fs.truncateSync(draft.reviewPath, 24_000_001); }
    largestRead = Math.max(largestRead, length);
    return read(fd, buffer, offset, length, position);
  });
  try { await assert.rejects(service.export(exportCall(draft)), /conceptbestand/); }
  finally { restore(); }
  assert(changed && largestRead < 24_000_001);
  assert.deepEqual(fs.readdirSync(join(output, draft.draftId)), before);
});
