import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packTopicalDelivery, TOPICAL_MODULE} from './topical-delivery.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {applyTopicalTextRevisions, TOPICAL_TEXT_REVISION_FORMAT} from '../lib/topical-text-revisions.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const store = new Map();
const write = payload => { const hash = sha(payload); store.set(hash, payload); return hash; };
const read = hash => store.get(hash);

// Een bron in de oudere aflevervorm (geen …:local:…-delen), zoals de vier Topical Requirements tot november 2026.
function publication() {
  const point = {id: 'P1', scope: 'Op peildatum 1 is het kader nog niet van kracht.', selection_status: 'SELECTABLE', criterion_id: 'N1'};
  const edits = [{path: ['packages', 0, 'catalogue', 'points'], value: [point]}];
  const hash = write(JSON.stringify(edits));
  return {release: 'r', modules: {[TOPICAL_MODULE]: {packages: [{id: 'TR-X', catalogue: {}}]}},
    refs: {'foundation:TR-X:topical:0': {release: 'r', hash}}, registrations: {[TOPICAL_MODULE]: ['foundation:TR-X:topical:0']}};
}
const revision = {format: TOPICAL_TEXT_REVISION_FORMAT, batches: [{id: '20261121.01', reviewSha256: 'a'.repeat(64), reviewer: 'test', humanValidation: false}],
  edits: [{sourceId: 'TR-X', collection: 'points', id: 'P1', field: 'scope', batch: '20261121.01', reason: 'datum',
    before: sha(JSON.stringify('Op peildatum 1 is het kader nog niet van kracht.')), after: sha(JSON.stringify('Verplicht vanaf 2.')),
    replace: [['Op peildatum 1 is het kader nog niet van kracht.', 'Verplicht vanaf 2.']]}], transitions: []};

test('a correction for a source in the older delivery form travels in its own part and reaches the browser', () => {
  const value = publication();
  const {value: packed} = packTopicalDelivery(value, {read, write, textRevisions: revision});
  const keys = packed.registrations[TOPICAL_MODULE];
  assert.ok(keys.includes('foundation:TR-X:topical:0'), 'the existing part stays');
  const own = keys.filter(key => /^foundation:TR-X:local:/u.test(key));
  assert.ok(own.length >= 1, 'the correction has a part of its own under the source');
  // De browser laadt alles onder foundation:TR-X en past dan de correcties toe.
  const data = structuredClone(packed.modules[TOPICAL_MODULE]);
  for (const key of keys) applyCatalogueEdits(data, JSON.parse(read(packed.refs[key].hash)));
  assert.equal(applyTopicalTextRevisions(data, sha), 1);
  assert.equal(data.packages[0].catalogue.points[0].scope, 'Verplicht vanaf 2.');
  assert.deepEqual(data.packages[0].pointCounts, {N1: 1});
});

test('without corrections an unpacked source is left exactly as it was', () => {
  const value = publication();
  const {value: packed} = packTopicalDelivery(value, {read, write});
  assert.deepEqual(packed.registrations[TOPICAL_MODULE], ['foundation:TR-X:topical:0']);
  assert.equal(packed.modules[TOPICAL_MODULE].packages[0].pointCounts, undefined);
});
