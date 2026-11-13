import assert from 'node:assert/strict';
import {test} from 'node:test';
import {processClasses,processKinds,processClassesOf,classifiedCategoryIds} from './process-taxonomy.mjs';
import {organisations,reportOrganisations,organisationsOf} from './report-organisations.mjs';
import {modelUses,modelUsesOf,classifiedModelIds} from './model-uses.mjs';

test('elke indeling gebruikt bestaande klassen en elke klasse hoort bij primair of ondersteunend', () => {
  for (const [id, cls] of Object.entries(processClasses)) assert.ok(Object.hasOwn(processKinds, cls.kind), id);
  for (const id of classifiedCategoryIds) assert.ok(processClassesOf(id).length >= 1 && processClassesOf(id).length <= 2, `${id}: één of twee klassen`);
});

test('de klassen komen in vaste volgorde terug en een rapportproces deelt de indeling van het vaste proces', () => {
  assert.deepEqual(processClassesOf('risk-control'), ['toezicht', 'sturing']);
  assert.deepEqual(processClassesOf('report-PR12'), processClassesOf('PR12'));
  assert.deepEqual(processClassesOf('onbekend'), []);
});

test('elk rapport verwijst naar bekende ministeries; rijksbreed staat vooraan', () => {
  for (const [id, r] of Object.entries(reportOrganisations)) { assert.ok(r.at, id); for (const m of r.ministries) assert.ok(Object.hasOwn(organisations, m), `${id}: ${m}`); }
  const found = organisationsOf(['OCW26', 'OCWCO224', 'ERP25', 'CIBGBIO24', 'ONBEKEND']);
  assert.deepEqual(found.map(o => o.id), ['RIJK', 'OCW', 'VWS']);
  assert.deepEqual(found[1].reports, ['OCW26', 'OCWCO224']);
});

test('elk ingedeeld model heeft één of twee bekende doelen, in vaste volgorde', () => {
  for (const id of classifiedModelIds) { const found = modelUsesOf(id); assert.ok(found.length >= 1 && found.length <= 2, id); for (const use of found) assert.ok(Object.hasOwn(modelUses, use)); }
  assert.deepEqual(modelUsesOf('ADKAR'), ['gedrag', 'verandering']);
  assert.deepEqual(modelUsesOf('ONBEKEND'), []);
});
