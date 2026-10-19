import test from 'node:test';
import assert from 'node:assert/strict';
import {zlibSync, strToU8} from 'fflate';
import {expandProject, serializeProject, parseProjectText, MAX_EXPANDED_PROJECT_BYTES} from './project-codec.mjs';

function packed({fragment = JSON.stringify('a'.repeat(4096)), references = 17000, materials = 1, key = 'items', title = ''} = {}) {
  return {format: 'rijksmap-project', version: 1, snapshotPool: [fragment],
    draft: {title, investigation: {materials: Array.from({length: materials}, () => ({
      lawTrace: {snapshotParts: [[key, Array(references).fill(0)]]},
    }))}}};
}

function envelope(project) {
  const bytes = strToU8(JSON.stringify(project));
  return {format: 'rijksmap-project-compressed', version: 1, encoding: 'zlib-base64',
    expandedBytes: bytes.length, data: Buffer.from(zlibSync(bytes)).toString('base64')};
}

// Trap the old amplification point without actually allocating the attack output.
// A rejection after entering this join is too late, even if the error looks right.
function checkPreflight(project, referenceCount, fits = false) {
  const input = envelope(project), originalJoin = Array.prototype.join;
  let reconstructionAttempted = false;
  Array.prototype.join = function (separator) {
    if (this.length === referenceCount && this[0] === project.snapshotPool[0]) {
      reconstructionAttempted = true;
      throw Error('Reconstruction reached before budget check');
    }
    return originalJoin.call(this, separator);
  };
  try {
    assert.throws(() => expandProject(input), /beschadigd of onvolledig/);
    assert.equal(reconstructionAttempted, fits, 'Only projects within budget may reach reconstruction');
  } finally { Array.prototype.join = originalJoin; }
}

test('SR01 rejects repeated fragment amplification before joining', () => {
  checkPreflight(packed(), 17000);
});

test('SR01 checks the complete project budget before assembling the first material', () => {
  checkPreflight(packed({references: 150, materials: 110}), 150);
});

test('SR01 counts UTF-8, JSON escaping and non-snapshot content', async t => {
  for (const [name, project, references] of [
    ['Unicode', packed({fragment: JSON.stringify('界🧭'.repeat(2000)), references: 50, materials: 100}), 50],
    ['escaping', packed({fragment: JSON.stringify('\\'.repeat(3000)), references: 50, materials: 110}), 50],
    ['other content', packed({references: 150, materials: 100, title: 'é'.repeat(2000000)}), 150],
    ['long keys', packed({references: 1, key: 'k'.repeat(700000)}), 1],
  ]) await t.test(name, () => checkPreflight(project, references));
});

test('the complete UTF-8 budget accepts the exact boundary and rejects one more byte before joining', () => {
  const fragment = JSON.stringify('é界🧭\u0000\b\t\n\f\r"\\\ud800'.repeat(80));
  const key = 'clé\n"\\🧭', references = 150, materials = 100;
  const project = packed({fragment, references, materials, key});
  const trace = '{' + JSON.stringify(key) + ':[' + Array(references).fill(fragment).join(',') + ']}';
  const baseline = {format: project.format, version: project.version,
    draft: {title: '', investigation: {materials: Array.from({length: materials}, () => ({lawTrace: ''}))}}};
  // Independent native byte count, not the implementation's size helper.
  const size = Buffer.byteLength(JSON.stringify(baseline)) + materials * (Buffer.byteLength(JSON.stringify(trace)) - 2);
  assert.ok(size < MAX_EXPANDED_PROJECT_BYTES);
  project.draft.title = 'a'.repeat(MAX_EXPANDED_PROJECT_BYTES - size);
  // The same join trap stops the valid-at-limit case before allocating 64 MB.
  checkPreflight(project, references, true);
  project.draft.title += 'a';
  checkPreflight(project, references);
});

test('pooled traces enforce the existing 700000-character domain limit at its boundary', () => {
  const trace = JSON.stringify({text: 'a'.repeat(700000 - JSON.stringify({text: ''}).length)});
  const project = {format: 'rijksmap-project', version: 1, draft: {investigation: {materials: [{lawTrace: trace}]}}};
  assert.equal(trace.length, 700000);
  assert.deepEqual(parseProjectText(serializeProject(project)), project);
  const input = packed({fragment: JSON.stringify('a'.repeat(700000)), references: 1});
  assert.throws(() => expandProject(envelope(input)), /beschadigd of onvolledig/);
});

test('malformed pooled structures fail closed without changing the input', () => {
  for (const mutate of [
    p => p.snapshotPool = {}, p => p.snapshotPool[0] = null,
    p => p.draft.investigation.materials = Array(1001).fill({}),
    p => p.draft.investigation.materials = {}, p => p.draft.investigation.materials[0] = null,
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = {},
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = ['ab'],
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = [[3, 0]],
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = [['x', 0, 'extra']],
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = [['x', [1]]],
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = [['x', [-1]]],
    p => p.draft.investigation.materials[0].lawTrace.snapshotParts = [['x', [0.5]]],
  ]) {
    const project = packed({references: 1}); mutate(project);
    const input = envelope(project), before = JSON.stringify(input);
    assert.throws(() => expandProject(input));
    assert.equal(JSON.stringify(input), before);
  }
});

test('pooling remains lossless for escaped keys, Unicode, empty arrays and original formatting', () => {
  const trace = JSON.stringify({'clé\n"\\🧭': ['é', '界', '🧭', '\ud800', '\udc00', '\u0000\b\t\n\f\r"\\', {}, [], null, true, 0], empty: []});
  const project = {format: 'rijksmap-project', version: 1, draft: {investigation: {materials: [
    {lawTrace: trace}, {lawTrace: trace}, {lawTrace: '{ "text": "original spacing" }'}, {reportTrace: 'unchanged'},
  ]}}, view: {page: 'framework'}, questions: [{id: 'Q1', text: 'Waarom?'}]};
  const before = JSON.stringify(project);
  assert.deepEqual(parseProjectText(serializeProject(project)), project);
  assert.equal(JSON.stringify(project), before);
});
