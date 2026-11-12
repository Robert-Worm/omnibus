import assert from 'node:assert/strict';
import test from 'node:test';
import {frameworkRelations} from './framework-relations.mjs';

test('DORA noemt elke uitvoeringsregeling één keer, met de reden', () => {
  const r = frameworkRelations('DORA-2022-2554');
  assert.equal(new Set(r.map(x => x.id)).size, r.length);
  const rts = r.find(x => x.id === 'DORA-2024-1774');
  assert.match(rts.reason, /6 groepen verder uit \(artikel 15 en artikel 16, lid 3\)/u);
});

test('een uitvoeringsregeling verwijst terug naar DORA en naar NOREA', () => {
  const r = frameworkRelations('DORA-2024-1773');
  assert.deepEqual(r.map(x => x.id), ['DORA-2022-2554', 'NOREA-DORA-3-2']);
  assert.match(r[0].reason, /De verplichting zelf staat in DORA/u);
});

test('een kader zonder samenhang levert niets op', () => {
  assert.deepEqual(frameworkRelations('ONBEKEND'), []);
});
