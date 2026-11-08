import test from 'node:test';
import assert from 'node:assert/strict';
import {leesbareVindplaats} from './vindplaats.mjs';

test('vindplaats: artikelnummer uit het record-ID als de locator alleen een titel is', () => {
  assert.equal(leesbareVindplaats({id: 'RTS1773-NL-A03-6-A', locator: 'Afstemming ICT-risicokader'}), 'Artikel 3, lid 6, onder a · Afstemming ICT-risicokader');
  assert.equal(leesbareVindplaats({id: 'RTS1773-NL-A01-CHAPEAU', locator: 'Proportioneel beleid'}), 'Artikel 1, aanhef · Proportioneel beleid');
  assert.equal(leesbareVindplaats({id: 'RTS1773-NL-A03-1-IMPLEMENT', locator: 'Beleidswijzigingen doorvoeren'}), 'Artikel 3, lid 1 · Beleidswijzigingen doorvoeren');
  assert.equal(leesbareVindplaats({id: 'RTS1773-NL-A11-DIRECT-EFFECT', locator: 'Verbindend'}), 'Artikel 11 · Verbindend');
  assert.equal(leesbareVindplaats({id: 'RTS1773-NL-REC-11', locator: 'AVG onverlet'}), 'Overweging 11 · AVG onverlet');
});

test('vindplaats: "0" voor een artikel zonder leden verdwijnt; bestaande vindplaatsen blijven gelijk', () => {
  assert.equal(leesbareVindplaats({id: 'RTS532-NL-A01-A', locator: 'artikel 1, 0(a)'}), 'artikel 1, onder a');
  assert.equal(leesbareVindplaats({id: 'RTS532-NL-A01-CHAPEAU', locator: 'artikel 1, 0'}), 'artikel 1');
  assert.equal(leesbareVindplaats({id: 'X', locator: 'Artikel 19, lid 4, punt a'}), 'Artikel 19, lid 4, punt a');
  assert.equal(leesbareVindplaats({id: 'GL36-TITLE', locator: 'Titel'}), 'Titel');
  assert.equal(leesbareVindplaats({id: 'ONBEKEND', locator: 'Iets'}), 'Iets');
});
