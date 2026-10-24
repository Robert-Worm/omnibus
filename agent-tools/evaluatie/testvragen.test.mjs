// Zonder database: de controle meldt een vraag die niet meer klopt, en elke vraag is compleet.
import test from 'node:test';
import assert from 'node:assert/strict';
import {TESTVRAGEN} from './testvragen.mjs';
import {controleer} from './controleer-testvragen.mjs';

test('tien vragen, elk met hulpmiddelen, antwoord en controle', () => {
  assert.equal(TESTVRAGEN.length, 10);
  assert.equal(new Set(TESTVRAGEN.map(v => v.id)).size, 10);
  const tools = ['get_workflow_guide', 'list_sources', 'search_building_blocks', 'get_building_block', 'prepare_research_draft', 'export_research_draft'];
  for (const v of TESTVRAGEN) {
    assert.ok(v.vraag.endsWith('?') && v.antwoord && typeof v.controle === 'function', v.id);
    assert.ok(v.hulpmiddelen.length && v.hulpmiddelen.every(h => tools.includes(h)), v.id);
  }
});

test('een database die niet meer past, geeft een melding in plaats van een fout', () => {
  const leeg = {bronnen: () => [], aantal: () => 0, bronTitel: () => '', bouwsteen: () => { throw Error('Onbekend'); }, bestaat: () => false, gids: () => ''};
  const uit = controleer(leeg);
  assert.equal(uit.length, 10);
  assert.deepEqual(uit.filter(r => r.ok).map(r => r.id), ['T08'], 'alleen de vraag over een niet-bestaand toetspunt klopt nog');
});
