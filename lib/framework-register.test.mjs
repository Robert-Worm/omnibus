import test from 'node:test';
import assert from 'node:assert/strict';
import {frameworkRegister,frameworkFamilies,frameworkRecord,isoFromDutchDate,shortDate} from './framework-register.mjs';
import {sourceScopes} from './source-scope.mjs';

test('elke bron met een toepassingsgebied staat in het register met familie, werk-ID, versie, uitgever en datums', () => {
  for (const key of Object.keys(sourceScopes)) {
    // Het toepassingsgebied gebruikt bij twee bronnen een korte sleutel (CIO2026, WWKE); de database-ID begint daarmee.
    const id = Object.keys(frameworkRegister).find(candidate => candidate === key || candidate.startsWith(key + '-'));
    assert.ok(id, 'register mist ' + key);
    const r = frameworkRecord(id);
    assert.ok(Object.hasOwn(frameworkFamilies, r.family), 'familie ' + id);
    for (const field of ['work', 'instrument', 'issuer', 'published', 'reference']) assert.ok(r[field], field + ' ontbreekt bij ' + id);
    assert.match(r.published, /^\d{4}(-\d{2}(-\d{2})?)?$/, 'publicatiedatum ' + id);
    if (r.effective) assert.match(r.effective, /^\d{4}-\d{2}-\d{2}$/, 'inwerkingtreding ' + id);
  }
});

test('werk-ID en versie zijn samen uniek, zodat een latere versie naast de oude kan staan', () => {
  const keys = Object.keys(frameworkRegister).map(id => { const r = frameworkRecord(id); return r.work + ' · ' + r.version; });
  // Wetgeving heeft geen versie: het nummer is dan zelf uniek.
  assert.equal(new Set(keys).size, keys.length);
});

test('datums: Nederlandse tekst wordt sorteerbaar en weer kort leesbaar', () => {
  assert.equal(isoFromDutchDate('27 december 2022'), '2022-12-27');
  assert.equal(isoFromDutchDate('december 2025'), '2025-12');
  assert.equal(isoFromDutchDate('2025'), '2025');
  assert.equal(isoFromDutchDate('onbekend'), '');
  assert.equal(shortDate('2022-12-27'), '27 dec 2022');
  assert.equal(shortDate('2025-12'), 'dec 2025');
  assert.equal(shortDate(''), '');
});
