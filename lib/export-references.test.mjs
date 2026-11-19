import test from 'node:test';
import assert from 'node:assert/strict';
import {exportTopic,exportCategory,exportRelated,exportLocation} from './export-references.mjs';
import {setTopicFamilies} from './topic-families.mjs';
import {fixtureDefinition} from './test-support/topic-family-fixture.mjs';

const material = (foundationId, norm) => ({foundationId, topicalTrace: JSON.stringify({point: {criterion_id: norm}})});

test('een toetspunt uit een familie met onderwerpen krijgt het onderwerp voorop in de categorie', () => {
  // De families komen uit de database (B-079); hier een verzonnen familie.
  setTopicFamilies([fixtureDefinition()]);
  const m = material('WET', 'WET-N2');
  assert.equal(exportTopic(m), 'Detecteren');
  assert.ok(exportTopic(m));
  assert.equal(exportCategory(m, 'Hoofdstuk van de bron'), exportTopic(m) + '\nHoofdstuk van de bron');
  assert.equal(exportCategory(m, exportTopic(m)), exportTopic(m));
});

test('een praktijknorm noemt de verwante wetsnormen met het artikel, de wet noemt het praktijkkader', () => {
  const norea = exportRelated(material('NOREA-DORA-3-2', 'NOREA-DORA-C28-2'));
  assert.match(norea, /^Wet: RTS 2024\/1774 · Kwetsbaarheden in beeld brengen \(artikel 10, lid 2, onder b\)$/m);
  assert.match(exportRelated(material('DORA-2024-1774', 'RTS1774-N26')), /^Praktijk: NOREA 28\.2 · /m);
  assert.equal(exportLocation(material('DORA-2024-1774', 'RTS1774-N26'), 'Artikel 10').split('\n')[0], 'Artikel 10');
});

test('een bron zonder onderwerpen of zonder herleiding blijft ongewijzigd', () => {
  assert.equal(exportCategory({foundationId: 'CIO'}, 'Eigen indeling'), 'Eigen indeling');
  assert.equal(exportLocation({foundationId: 'CIO', topicalTrace: 'kapot'}, 'p. 3'), 'p. 3');
  assert.equal(exportLocation(undefined, 'p. 3'), 'p. 3');
});
