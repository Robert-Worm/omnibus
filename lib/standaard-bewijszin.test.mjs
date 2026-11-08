import test from 'node:test';
import assert from 'node:assert/strict';
import {zonderStandaardBewijszin} from './standaard-bewijszin.mjs';

test('de algemene bewijszin verdwijnt per cel; eigen tekst blijft exact', () => {
  assert.equal(zonderStandaardBewijszin('Beleid en besluiten. Geen verplicht apart bewijsdocument, vaste steekproef of fictieve toetsperiode.\n\nConcrete gevallen.'), 'Beleid en besluiten.\n\nConcrete gevallen.');
  assert.equal(zonderStandaardBewijszin('Geen verplicht apart bewijsdocument, vaste steekproef of bewijs van duurzame werking.'), '');
  assert.equal(zonderStandaardBewijszin('Geen vaste steekproef van 25 gevallen.'), 'Geen vaste steekproef van 25 gevallen.');
});
