import assert from 'node:assert/strict';
import test from 'node:test';
import {relatedFoundationKeys, relatedPassages, relatedSourceIds, registerRelatedLookup} from './related-passages.mjs';

const point = {related_passages: [{source_id: 'KADER-A', record_ids: ['R1']}, {source_id: 'KADER-A', record_ids: ['R2']}, {source_id: 'KADER-B', record_ids: []}]};

test('een toetspunt noemt elk verwezen kader één keer', () => {
  assert.deepEqual(relatedSourceIds(point), ['KADER-A', 'KADER-B']);
  assert.deepEqual(relatedSourceIds({}), []);
});

test('een kader dat niet beschikbaar is, levert geen passages op', () => {
  assert.deepEqual(relatedPassages(point), []);
  assert.deepEqual(relatedPassages({}), []);
});

test('een export laadt ook het kader waarnaar een toetspunt verwijst', () => {
  assert.deepEqual(relatedFoundationKeys(JSON.stringify({point})), ['foundation:KADER-A', 'foundation:KADER-B']);
  assert.deepEqual(relatedFoundationKeys(JSON.stringify({point: {}})), []);
  assert.deepEqual(relatedFoundationKeys(undefined), []);
});

test('een geladen kader levert de passage met vindplaats en tekst', () => {
  registerRelatedLookup(id => id === 'KADER-A' ? {id, context: {title: 'Kader A'}, status: {official_url: 'https://example.test/a'}, manifest: {documents: []},
    bank: {records: [{id: 'R1', title: 'Termijn', locator: 'artikel 5, 1(a)', source_spans: []}]}} : undefined);
  const [groep] = relatedPassages(point);
  assert.equal(groep.sourceTitle, 'Kader A');
  assert.deepEqual(groep.passages.map(p => [p.id, p.location]), [['R1', 'Artikel 5, lid 1, onder a']]);
  registerRelatedLookup(() => undefined);
});
