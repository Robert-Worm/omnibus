import test from 'node:test';
import assert from 'node:assert/strict';
import {noreaVerwant, verwanteNormen} from './norea-verwant.mjs';

test('verwante normen werken in beide richtingen en hebben steeds een reden', () => {
  const [norea, , sourceId, , criterionId] = noreaVerwant[0];
  assert(verwanteNormen('NOREA-DORA-3-2', norea).some(l => l.id === sourceId && l.grondslag));
  assert(verwanteNormen(sourceId, criterionId).some(l => l.id === 'NOREA-DORA-3-2' && l.label.startsWith('NOREA ')));
  for (const r of noreaVerwant) assert(r.every(Boolean), 'lege waarde in ' + r.join(' | '));
  assert.deepEqual(verwanteNormen('ONBEKEND', 'X'), []);
});
