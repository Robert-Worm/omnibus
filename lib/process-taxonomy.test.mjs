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

test('de hoofdklasse is de eerste klasse uit de indeling en elk ingedeeld model heeft een herkomst', async () => {
  const {processMainClass} = await import('./process-taxonomy.mjs');
  const {modelOrigin, modelKinds, originModelIds} = await import('./model-origins.mjs');
  assert.equal(processMainClass('contract-obligations'), 'inkoop');
  assert.equal(processMainClass('report-PR12'), processMainClass('PR12'));
  assert.equal(processMainClass('onbekend'), '');
  for (const id of classifiedCategoryIds) assert.ok(processClassesOf(id).includes(processMainClass(id)), id);
  for (const id of classifiedModelIds) assert.ok(modelOrigin(id), `${id}: herkomst ontbreekt`);
  for (const id of originModelIds) { const o = modelOrigin(id); assert.ok(Object.hasOwn(modelKinds, o.kind) && o.authors && o.year > 1900 && o.year < 2100, id); }
  assert.equal(modelOrigin('ONBEKEND'), null);
});

test('elk thema en proces heeft een eigen, vaste korte ID', async () => {
  const {processCode} = await import('./process-taxonomy.mjs');
  // Een vast proces (PR03) en zijn rapportvariant (report-PR03) zijn hetzelfde proces en delen dus één ID.
  const ids = classifiedCategoryIds.map(id => /^PR\d+$/.test(id) ? 'report-' + id : id);
  const codes = ids.map(processCode);
  assert.ok(codes.every(c => /^(TH|PR)-\d{2}$/.test(c)), 'vorm TH-nn of PR-nn');
  assert.equal(new Set(codes).size, codes.length, 'geen dubbele ID');
  assert.equal(processCode('policy'), 'TH-01');
  assert.equal(processCode('PR03'), 'PR-03');
  assert.equal(processCode('report-PR03'), 'PR-03');
  assert.equal(processCode('onbekend'), '');
});

test('een ID vind je ook als je het anders schrijft', async () => {
  const {codeMatches} = await import('./process-taxonomy.mjs');
  for (const term of ['PR-80', 'pr80', 'PR 80', 'pr-8']) assert.ok(codeMatches('PR-80', term), term);
  assert.ok(codeMatches('MOD-KAD', 'kad'));
  assert.ok(!codeMatches('PR-80', 'p'));
  assert.ok(!codeMatches('PR-80', 'TH-80'));
});
