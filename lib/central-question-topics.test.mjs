import test from 'node:test';
import assert from 'node:assert/strict';
import {focusedCentral} from './central-question-topics.mjs';

const vraag = 'Hoe zijn de geselecteerde aanvullende DORA-eisen voor incidenten, tests, externe ICT-diensten of cyberdreigingsuitwisseling bij de entiteit ingevuld?';
const q = (key, n) => ({key: 'source:DORA-2022-2554:route:m:' + key, ids: Array.from({length: n}, (_, i) => 'm' + i)});

test('de centrale vraag noemt alleen onderwerpen met gekozen toetspunten', () => {
  assert.equal(focusedCentral('DORA-2022-2554', vraag, [q('DORA-Q-M-S01', 2), q('DORA-Q-M-S06', 0)]),
    'Hoe zijn de geselecteerde DORA-eisen voor incidenten bij de entiteit ingevuld?');
  assert.equal(focusedCentral('DORA-2022-2554', vraag, [q('DORA-Q-M-S04', 1), q('DORA-Q-M-S10', 1), q('DORA-Q-M-S18', 1)]),
    'Hoe zijn de geselecteerde DORA-eisen voor incidenten, tests of cyberdreigingsuitwisseling bij de entiteit ingevuld?');
});
test('zonder keuze, met alle onderwerpen of bij een andere bron blijft de opsomming gelijk', () => {
  const kort = vraag.replace('aanvullende ', '');
  assert.equal(focusedCentral('DORA-2022-2554', vraag, []), kort);
  assert.equal(focusedCentral('DORA-2022-2554', vraag, [q('DORA-Q-M-S01', 1), q('DORA-Q-M-S06', 1), q('DORA-Q-M-S12', 1), q('DORA-Q-M-S18', 1)]), kort);
  assert.equal(focusedCentral('NOREA-DORA-3-2', vraag, [q('DORA-Q-M-S01', 1)]), vraag);
});
