import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyTopicalTextRevisions, validateTopicalTextRevisions} from './topical-text-revisions.mjs';
import {acceptsReviewedCompactTrace, acceptsReviewedTopicalTrace, compactTopicalTrace, topicalTrace, topicalTraceHash} from './topical-source-trace.mjs';
import {prepareTopicalRevision, REVISION_REQUEST_FORMAT, REVISION_REVIEW_FORMAT} from '../content-tools/topical-revision.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const phase = status => ({status, action: status === 'APPLICABLE' ? 'Doe iets.' : '', expected_evidence: status === 'APPLICABLE' ? 'Bewijs.' : '',
  interpretation_boundary: '', reason: 'Fictief.'});
function packet() {
  return {id: 'FICTIEF-KADER', reviewBasis: 'a'.repeat(64),
    context: {title: 'Fictief kader voor oversight', limitations: [{title: 'Grens', text: 'Fictief.'}]},
    status: {official_url: 'https://example.invalid/kader'},
    manifest: {documents: [{id: 'doc', first_package_page: 1, last_package_page: 2}]},
    bank: {records: [{id: 'R1', locator: 'artikel 1', source_spans: [{page: 1, quote: 'Fictieve brontekst.'}]},
      {id: 'R2', locator: 'artikel 2', source_spans: [{page: 2, quote: 'Fictieve drempel.'}]}]},
    catalogue: {
      criteria: [{id: 'N1', title: 'Norm', text: 'Onder het gewone kader geldt iets.', source_record_ids: ['R1'], objective_ids: ['O1']}],
      objectives: [{id: 'O1', title: 'Doel', text: 'Doel.', risk: 'Risico.', control_measure: 'Gebruik alerttools.', goal_ids: ['G1'], source_record_ids: ['R1']}],
      goals: [{id: 'G1', title: 'Doel', text: 'Doel.', source_record_ids: ['R1']}],
      points: [
        {id: 'N1-P01', criterion_id: 'N1', objective_ids: ['O1'], selection_status: 'SELECTABLE', title: 'Punt', text: 'De entiteit zorgt ervoor dat iets gebeurt.',
          scope: 'Geldt voor: entiteiten onder het gewone kader.', conditions: ['Voorwaarde.'], exceptions: [], interpretation_notes: [],
          phase_plans: {opzet: phase('APPLICABLE'), bestaan: phase('APPLICABLE'), werking: phase('NOT_SELECTED')},
          source_links: [{record_id: 'R1', contribution: 'PRIMARY'}, {record_id: 'R2', contribution: 'DEFINITION'}]},
        {id: 'N1-P02', criterion_id: 'N1', objective_ids: ['O1'], selection_status: 'SELECTABLE', title: 'Ander punt', text: 'Iets anders.',
          scope: 'Geldt voor: iedereen.', conditions: [], exceptions: [], interpretation_notes: [],
          phase_plans: {opzet: phase('APPLICABLE'), bestaan: phase('APPLICABLE'), werking: phase('NOT_SELECTED')},
          source_links: [{record_id: 'R1', contribution: 'PRIMARY'}]}]},
    reviewedTraceTransitions: []};
}
const request = items => JSON.stringify({format: REVISION_REQUEST_FORMAT, edition: '20261120.03', summary: 'Fictief', items});
const review = (raw, decisions) => JSON.stringify({format: REVISION_REVIEW_FORMAT, requestSha256: sha(raw), reviewer: 'Fictieve reviewer', date: '2026-11-20', decisions});
const accept = raw => review(raw, JSON.parse(raw).items.map(item => ({key: item.key, decision: 'ACCEPT'})));
const items = [
  {key: 'A', sourceId: 'FICTIEF-KADER', collection: 'points', id: 'N1-P01', field: 'text', value: 'De entiteit stelt vast dat iets gebeurt.', reason: 'Bron zegt vaststellen.'},
  {key: 'B', sourceId: 'FICTIEF-KADER', collection: 'points', id: 'N1-P01', field: 'scope', replace: [['gewone kader', 'volledige kader']], reason: 'Eén term.'},
  {key: 'C', sourceId: 'FICTIEF-KADER', collection: 'points', id: 'N1-P01', field: 'source_links[R2].contribution', value: 'PRIMARY', reason: 'Drempel is hoofdbron.'},
  {key: 'D', sourceId: 'FICTIEF-KADER', collection: 'points', id: 'N1-P01', field: 'phase_plans.werking', value: phase('APPLICABLE'), reason: 'Doorlopende eis.'},
  {key: 'E', sourceId: 'FICTIEF-KADER', collection: 'context', field: 'title', replace: [['oversight', 'toezicht']], reason: 'Nederlandse titel.'}];

test('een beoordeelde correctie zet de nieuwe tekst en laat oude bewaarde herleidingen toe', () => {
  const data = {packages: [packet()]}, raw = request(items);
  const savedFull = topicalTrace(data.packages[0], data.packages[0].catalogue.points[0]), savedCompact = compactTopicalTrace(savedFull);
  const savedOther = topicalTrace(data.packages[0], data.packages[0].catalogue.points[1]);
  const result = prepareTopicalRevision(data, raw, accept(raw));
  assert.equal(result.status, 'READY');
  assert.deepEqual(result.changedPoints, ['FICTIEF-KADER:N1-P01']);
  const live = {...structuredClone(data), textRevisions: result.textRevisions};
  assert.equal(applyTopicalTextRevisions(live, sha), 5);
  assert.equal(applyTopicalTextRevisions(live, sha), 0, 'tweede keer verandert niets');
  const [p] = live.packages, point = p.catalogue.points[0];
  assert.equal(point.text, 'De entiteit stelt vast dat iets gebeurt.');
  assert.equal(point.scope, 'Geldt voor: entiteiten onder het volledige kader.');
  assert.equal(point.source_links[1].contribution, 'PRIMARY');
  assert.equal(point.phase_plans.werking.status, 'APPLICABLE');
  assert.equal(p.context.title, 'Fictief kader voor toezicht');
  const current = topicalTrace(p, point);
  assert.equal(acceptsReviewedTopicalTrace(p, savedFull, current, sha), true);
  assert.equal(acceptsReviewedCompactTrace(p, savedCompact, current, sha), true);
  // Een ongewijzigd punt hoeft geen overgang: zijn herleiding is gelijk gebleven.
  assert.equal(topicalTraceHash(topicalTrace(p, p.catalogue.points[1]), sha), topicalTraceHash(savedOther, sha));
  // Een andere oude versie komt er niet door.
  const other = structuredClone(savedFull); other.point.title = 'Verzonnen';
  assert.equal(acceptsReviewedTopicalTrace(p, other, current, sha), false);
});

test('een project van vóór een eerdere overgang komt via de keten bij de gecorrigeerde versie', () => {
  const data = {packages: [packet()]}, older = structuredClone(data.packages[0]);
  older.catalogue.points[0].title = 'Oudere titel';
  const oldest = topicalTrace(older, older.catalogue.points[0]);
  const before = topicalTrace(data.packages[0], data.packages[0].catalogue.points[0]);
  data.packages[0].reviewedTraceTransitions.push({format: 'omnibus-reviewed-trace-transition/1', sourceId: 'FICTIEF-KADER', pointId: 'N1-P01',
    previousTraceHash: topicalTraceHash(oldest, sha), currentTraceHash: topicalTraceHash(before, sha), review: {decision: 'ACCEPT', basisSha256: 'b'.repeat(64), reviewer: 'Eerdere ronde'}});
  const raw = request(items.slice(0, 1)), result = prepareTopicalRevision(data, raw, accept(raw));
  const live = {...structuredClone(data), textRevisions: result.textRevisions};
  applyTopicalTextRevisions(live, sha);
  const [p] = live.packages;
  assert.equal(acceptsReviewedTopicalTrace(p, oldest, topicalTrace(p, p.catalogue.points[0]), sha), true);
});

test('zonder passende review, met een afwijkende tekst of op een bronpassage gaat het niet door', () => {
  const data = {packages: [packet()]}, raw = request(items);
  assert.equal(prepareTopicalRevision(data, raw, review(raw + ' ', [])).status, 'HOLD');
  const rejected = review(raw, JSON.parse(raw).items.map(item => ({key: item.key, decision: item.key === 'C' ? 'REJECT' : 'ACCEPT'})));
  assert.match(prepareTopicalRevision(data, raw, rejected).problems.join(' '), /C: geen aanvaarding/u);
  const missing = request([{...items[1], replace: [['bestaat niet', 'x']]}]);
  assert.equal(prepareTopicalRevision(data, missing, accept(missing)).status, 'HOLD');
  const result = prepareTopicalRevision(data, raw, accept(raw));
  const stale = {packages: [packet()], textRevisions: result.textRevisions};
  stale.packages[0].catalogue.points[0].text = 'Iemand heeft de bron intussen veranderd.';
  assert.throws(() => applyTopicalTextRevisions(stale, sha), /andere versie/u);
  assert.throws(() => validateTopicalTextRevisions({...result.textRevisions, edits: [{...result.textRevisions.edits[0], collection: 'bank', field: 'records'}]}), /Ongeldige/u);
});

test('zonder geleverde voorgeschiedenis telt het meegeleverde controlegetal van de volledige herleiding', async () => {
  const {currentTopicalTraceHash} = await import('./topical-source-trace.mjs');
  const full = packet();
  full.catalogue.points[0].editorial_context = {originalPoint: {text: 'Oude concepttekst.'}};
  const saved = topicalTrace(full, full.catalogue.points[0]);
  const shipped = structuredClone(full);
  shipped.catalogue.points[0].editorial_context = {};
  shipped.fullTraceHashes = {'N1-P01': topicalTraceHash(saved, sha)};
  const current = topicalTrace(shipped, shipped.catalogue.points[0]);
  assert.equal(currentTopicalTraceHash(shipped, current, sha), topicalTraceHash(saved, sha));
  assert.equal(JSON.stringify(compactTopicalTrace(current)), JSON.stringify(compactTopicalTrace(saved)));
  // Zonder meegeleverd controlegetal geldt gewoon de herleiding zelf.
  delete shipped.fullTraceHashes;
  assert.notEqual(currentTopicalTraceHash(shipped, current, sha), topicalTraceHash(saved, sha));
});

test('een al gezette correctie wordt niet opnieuw gehasht, een vervangen object wel opnieuw gecontroleerd',()=>{
 const data={packages:[packet()]},raw=request(items),result=prepareTopicalRevision(data,raw,accept(raw));
 const live={...structuredClone(data),textRevisions:result.textRevisions};
 let hashes=0;const counting=text=>{hashes++;return sha(text);};
 assert.equal(applyTopicalTextRevisions(live,counting),5);
 hashes=0;assert.equal(applyTopicalTextRevisions(live,counting),0);assert.equal(hashes,0,'niets opnieuw gehasht');
 // Een opnieuw geladen (nieuw) object krijgt de volledige controle en de correctie opnieuw.
 const points=live.packages[0].catalogue.points;points[0]=structuredClone(data.packages[0].catalogue.points[0]);
 hashes=0;assert.equal(applyTopicalTextRevisions(live,counting),4);assert.ok(hashes>0);
 assert.equal(points[0].text,'De entiteit stelt vast dat iets gebeurt.');
 // Iemand die de waarde stil verandert, valt nog steeds op.
 points[0].scope='Iets anders.';
 assert.throws(()=>applyTopicalTextRevisions(live,counting),/andere versie/u);
});
