import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {projectReportDelivery} from './report-delivery-projection.mjs';
import {deferredCatalogueMetadata} from './deferred-catalogue-metadata.mjs';
import {applyCatalogueEdits, registerCatalogueResource, ensureCatalogue} from '../lib/catalogue-runtime.mjs';

const lines = Array.from({length: 200}, (_, n) => ({id: 'R-' + String(n).padStart(3, '0'), text: 'Exact norm 🧭 ' + n}));
const points = lines.map(l => ({id: l.id + '/P', legacy_line_id: l.id, source_links: [{material_id: 'source-' + l.id}], context_source_links: []}));
const modules = {lines: {lines: [], snapshots: {}}, points: {points: [], sources: [], questions: [], unknownEvidence: []}};
const values = {
  lines: [{path: ['lines'], value: lines}, {path: ['snapshots'], value: Object.fromEntries(lines.map(l => [l.id, {line: JSON.stringify(l), sourceHash: 'verified'}]))}],
  points: [{path: ['points'], value: points}, {path: ['sources'], value: lines.map(l => ({id: 'source-' + l.id, quote: 'Exact source '+l.id, linked_line_ids: []}))},
    {path: ['questions'], value: [{id: 'shared-question', point_ids: [points[0].id, points[199].id], text: 'Original question'}]},
    {path: ['unknownEvidence'], value: [{id: 'future-evidence-layout', exact: 'Never silently discarded'}]}],
};
const content = {modules, routing: {reports: Object.fromEntries(lines.map(l => [l.id, 'R']))},
  registrations: {lines: ['report:R:lines'], points: ['report:R:points']}, refs: {'report:R:lines': {hash: 'lines'}, 'report:R:points': {hash: 'points'}}};
const project = () => projectReportDelivery(content, ref => structuredClone(values[ref.hash]), {partBytes: 4096});
const plan = project();
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(specifier,context,next){
 if(context.parentURL.endsWith('/report-loading.mjs')&&specifier.endsWith('/report-resource-routing.mjs'))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify('export default '+JSON.stringify(plan.routing))}),shortCircuit:true};
 return next(specifier,context);
}`), import.meta.url);
const {reportContentKeys} = await import('../lib/report-loading.mjs');

await test('future reports with 200 norms partition losslessly in reverse order without mutating sources', () => {
  const before = JSON.stringify({content, values}), p = project(), actual = structuredClone(modules), expected = structuredClone(modules);
  for (const [module, edits] of Object.entries(values)) applyCatalogueEdits(expected[module], edits);
  for (const [module, entries] of Object.entries(p.registrations)) for (const entry of [...entries].reverse()) applyCatalogueEdits(actual[module], entry.bundle[module]);
  assert.deepEqual(actual, expected); assert.equal(JSON.stringify({content, values}), before);
  assert.equal(Object.keys(p.routing).length, 200);
});

await test('one late norm loads its snapshot, source and shared question; later loads retain original order', async () => {
  const actual = structuredClone(modules), loads = []; let fail = true;
  const late = reportContentKeys(['R-199'], content.routing.reports);
  for (const [module, entries] of Object.entries(plan.registrations)) for (const entry of entries) registerCatalogueResource(entry.key, async () => {
    loads.push(entry.key);
    if (fail && entry.bundle[module].some(edit => edit.path[0] === 'questions')) throw Error('Retryable asset error');
    return structuredClone(entry.bundle[module]);
  }, edits => applyCatalogueEdits(actual[module], edits));
  await assert.rejects(ensureCatalogue(late), /Retryable/); assert.deepEqual(actual, modules);
  fail = false; await ensureCatalogue(late);
  assert(actual.lines.lines.some(l => l.id === 'R-199')); assert(actual.lines.lines.length < 50);
  assert.deepEqual(actual.lines.snapshots['R-199'], {line: JSON.stringify(lines[199]), sourceHash: 'verified'});
  assert(actual.points.sources.some(s => s.id === 'source-R-199'));
  assert.deepEqual(actual.points.questions, values.points[2].value);
  assert.deepEqual(actual.points.unknownEvidence, values.points[3].value);
  await ensureCatalogue(reportContentKeys(['R-000'], content.routing.reports));
  assert.deepEqual(actual.lines.lines.map(l => l.id), actual.lines.lines.map(l => l.id).sort((a, b) => a < b ? -1 : a > b ? 1 : 0));
  await ensureCatalogue(['report:R']);
  const expected = structuredClone(modules);
  for (const [module, edits] of Object.entries(values)) applyCatalogueEdits(expected[module], edits);
  assert.deepEqual(actual, expected);
  const count = loads.length; await ensureCatalogue(late); assert.equal(loads.length, count);
});

await test('ordered edits roll back atomically and reject overlapping, unsafe or corrupt positions', () => {
  const target = {items: []}, identity = target.items;
  const undo = applyCatalogueEdits(target, [{path: ['items'], value: ['last'], positions: [5]}]);
  const earlier = applyCatalogueEdits(target, [{path: ['items'], value: ['first'], positions: [1]}]);
  assert.deepEqual(target.items, ['first', 'last']); earlier(); assert.deepEqual(target.items, ['last']);
  for (const positions of [[5], [-1], [0, 1], [1.5]]) assert.throws(() => applyCatalogueEdits(target, [{path: ['items'], value: ['bad'], positions}]));
  assert.throws(() => applyCatalogueEdits(target, [{path: ['items'], value: ['second'], positions: [2]}, {path: ['missing', 'bad'], value: []}]));
  assert.deepEqual(target.items, ['last']); assert.equal(target.items, identity); undo(); assert.deepEqual(target.items, []);
});

await test('unrecognized layouts remain shared or fail lossless verification; legacy readers keep full boundaries', () => {
  assert.deepEqual(reportContentKeys(['unknown'], {unknown: 'legacy'}), ['report:legacy']);
  assert.deepEqual(reportContentKeys(['own'], {}), []);
  assert.deepEqual(reportContentKeys(['constructor','toString','__proto__'], {}), []);
  assert.equal(projectReportDelivery({modules: {}, registrations: {}}, () => assert.fail()), null);
  assert.throws(() => projectReportDelivery(content, () => [{path: ['missing', 'path'], value: []}]), /cataloguspad/);
  const mixed=structuredClone(content);mixed.registrations.lines.push('another:boundary');
  assert.throws(()=>projectReportDelivery(mixed,()=>assert.fail()),/mixed report delivery boundary/);
  const edits = [{path: ['items'], value: {key: 'original'}}, {path: ['items'], value: {key: 'changed'}}];
  assert.throws(() => projectReportDelivery({modules: {m: {items: {}}}, registrations: {m: ['report:R:m']}, refs: {}}, () => edits, {partBytes: 0}), /size/);
});

await test('report admission metadata shares required parts, remains atomic and retains every original decision', async () => {
  const moduleId = 'app/reviewed-reports.json';
  const initial = {corpus: ['R','B'].map(id => ({framework: {
    report: {id, source_hash: 'verified-' + id}, lines: [],
    source_review: {reviewed: true, reason: 'Exact review 🧭 ' + id},
  }})), scopeDecisions: Object.fromEntries([...lines.map(l => [l.id, ['retain', 'Exact admission '+l.id]]), ['B-1', ['hold', 'Never admit']]])};
  const source = {modules: {[moduleId]: initial}, routing: {reports: {...content.routing.reports, 'B-1': 'B'}},
    registrations: {[moduleId]: ['report:R:lines', 'report:B:lines']}, refs: {'report:R:lines': {hash: 'R'}, 'report:B:lines': {hash: 'B'}}};
  const edits = {R: [{path: ['corpus',0,'framework','lines'],value: lines}], B: [{path: ['corpus',1,'framework','lines'],value: [{id:'B-1',text:'Held norm'}]}]};
  const before = JSON.stringify(source), metadata = deferredCatalogueMetadata(source);
  const plan = projectReportDelivery(source, ref=>edits[ref.hash], {metadata, partBytes:4096});
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(plan.bundledMetadata, new Set(metadata.registrations[moduleId]));
  const actual = structuredClone(metadata.modules[moduleId]), runtime = await import('../lib/catalogue-runtime.mjs?bundled-report-review');
  const decision = actual.scopeDecisions['R-199'], review = actual.corpus[0].framework.source_review;
  let fail = true;
  for (const entry of plan.registrations[moduleId]) runtime.registerCatalogueResource(entry.key, ()=> {
    if (fail && entry.key.includes(':shared:')) throw Error('Unavailable review bundle');
    return entry.bundle[moduleId];
  }, value=>applyCatalogueEdits(actual,value));
  const late = ['report:R:shared', ...plan.routing['R-199']];
  await assert.rejects(runtime.ensureCatalogue(late), /Unavailable review/);
  assert.deepEqual(actual, metadata.modules[moduleId], 'No admission or norm is exposed on partial failure');
  fail = false; await runtime.ensureCatalogue(late);
  assert.equal(actual.scopeDecisions['R-199'], decision);
  assert.deepEqual(decision, initial.scopeDecisions['R-199']);
  assert.equal(actual.corpus[0].framework.source_review, review);
  assert.deepEqual(review, initial.corpus[0].framework.source_review);
  assert(actual.corpus[0].framework.lines.some(l=>l.id==='R-199'));
  assert(actual.corpus[0].framework.lines.length < 200, 'Metadata must not turn partial loading into a whole-report load');
  assert.deepEqual(actual.scopeDecisions['B-1'], [], 'Unrequested report metadata stays deferred');
  assert.deepEqual(actual.corpus[1].framework.source_review, {});
  await runtime.ensureCatalogue(['report:B']); await runtime.ensureCatalogue(['report:R']);
  const expected = structuredClone(initial);
  for (const value of Object.values(edits)) applyCatalogueEdits(expected, value);
  assert.deepEqual(actual, expected, 'All source reviews and HOLD decisions are unchanged');
  const corrupted = deferredCatalogueMetadata(source);
  corrupted.resources.delete(corrupted.registrations[moduleId][0]);
  assert.throws(()=>projectReportDelivery(source, ref=>edits[ref.hash], {metadata:corrupted}), /metadata delivery boundary/);
});
