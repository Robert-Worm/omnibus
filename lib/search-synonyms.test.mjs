import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAlternatives, matchesTerm} from './search-synonyms.mjs';
import {criterionIndex, searchCriteria} from './criterion-search.mjs';

test('gangbare auditortermen vinden de woorden van de bron', () => {
  assert.ok(matchesTerm('sterke authenticatiemechanismen voor toegang op afstand', 'mfa'));
  assert.ok(matchesTerm('beleid voor encryptie en cryptografische sleutels', 'versleuteling'));
  assert.ok(matchesTerm('beleid voor encryptie', 'versleutelen'));
  assert.ok(!matchesTerm('beleid voor encryptie', 'netwerk'));
  assert.deepEqual(searchAlternatives('ab'), ['ab']);
  assert.equal(searchAlternatives('netwerksegmentatie').length, 1);
});

test('de normzoeker gebruikt de synoniemen, en een letterlijke treffer komt eerst', () => {
  const sources = [{id: 'RTS', title: 'RTS ICT-risicobeheer'}];
  const items = [
    {id: 'A', sourceId: 'RTS', title: 'Sterke authenticatie', auditNorm: 'Gebruik sterke authenticatiemechanismen.'},
    {id: 'B', sourceId: 'RTS', title: 'MFA', auditNorm: 'MFA voor beheerders.'},
    {id: 'C', sourceId: 'RTS', title: 'Netwerk', auditNorm: 'Segmenteer het netwerk.'},
  ];
  const found = searchCriteria(criterionIndex(items, sources), 'MFA', ['RTS']).map(row => row.item.id);
  assert.deepEqual(found, ['B', 'A']);
});
