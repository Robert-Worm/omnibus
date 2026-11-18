import test from 'node:test';
import assert from 'node:assert/strict';
import {doraOnderwerpIndeling} from './dora-onderwerpen-indeling.mjs';
import {doraTopics, doraTopicSources, doraOutsideSources, doraTopicSelection, doraTopicCounts, doraFilterMatches, doraFilterLabel,
  encodeDoraFilter, decodeDoraFilter, doraSourceFilterOptions, doraUnassigned, isDoraTopicSource, requestDoraViewerFilter, takeDoraViewerFilter} from './dora-onderwerpen.mjs';

const norms = Object.entries(doraOnderwerpIndeling.norms).map(([id, [sourceId, main, sub, also, regime, sector]]) => ({id, sourceId, main, sub, also, regime, sector}));
const topicIds = new Set(doraTopics.map(t => t.id));

test('er zijn acht onderwerpen, elk met een afbakening', () => {
  assert.equal(doraTopics.length, 8);
  for (const topic of doraTopics) assert.ok(topic.title && topic.includes && topic.excludes, topic.id);
});

test('elke norm heeft één geldig hoofdonderwerp en hoogstens twee nevenonderwerpen', () => {
  assert.equal(norms.length, doraOnderwerpIndeling.review.normen);
  for (const norm of norms) {
    assert.ok(isDoraTopicSource(norm.sourceId), norm.id);
    assert.ok(norm.main === 'buiten' || topicIds.has(norm.main), norm.id);
    const subs = doraTopics.find(t => t.id === norm.main)?.subs?.map(s => s.id) ?? [];
    assert.ok(norm.sub ? subs.includes(norm.sub) : true, norm.id);
    assert.ok(norm.also.length <= 2 && norm.also.every(id => topicIds.has(id) && id !== norm.main), norm.id);
    assert.ok(['', 'gewoon', 'vereenvoudigd'].includes(norm.regime), norm.id);
  }
});

test('een norm staat als kern in precies één onderwerp: geen dubbelingen tussen onderwerpen', () => {
  for (const vereenvoudigd of [false, true]) {
    const seen = new Map();
    for (const topic of doraTopics) for (const row of doraTopicSelection(topic.id, {norea: true, vereenvoudigd})) for (const id of row.kern) {
      assert.ok(!seen.has(id), `${id} staat in ${seen.get(id)} en ${topic.id}`);
      seen.set(id, topic.id);
    }
    const expected = norms.filter(n => n.main !== 'buiten' && (!n.regime || n.regime === (vereenvoudigd ? 'vereenvoudigd' : 'gewoon'))).length;
    assert.equal(seen.size, expected);
  }
  assert.equal(doraUnassigned.length, norms.filter(n => n.main === 'buiten').length);
});

test('gewoon en vereenvoudigd raamwerk sluiten elkaar uit', () => {
  const ids = vereenvoudigd => new Set(doraTopics.flatMap(t => doraTopicSelection(t.id, {vereenvoudigd, raaktOok: true}).flatMap(r => r.normIds)));
  const gewoon = ids(false), vereenvoudigd = ids(true);
  for (const norm of norms) {
    if (norm.regime === 'gewoon') assert.ok(!vereenvoudigd.has(norm.id), norm.id);
    if (norm.regime === 'vereenvoudigd') assert.ok(!gewoon.has(norm.id), norm.id);
  }
});

test('NOREA staat standaard uit en is een aparte laag', () => {
  for (const topic of doraTopics) {
    assert.ok(doraTopicSelection(topic.id).every(row => row.laag === 'wet'));
    const counts = doraTopicCounts(topic.id);
    assert.ok(counts.wet > 0 && counts.praktijk > 0 && counts.bronnen > 0, topic.id);
  }
});

test('incidentmanagement: de kern komt uit de verordening en de regelingen voor classificatie en melden', () => {
  const rows = doraTopicSelection('T5');
  assert.ok(rows.some(row => row.id === 'DORA-2022-2554'));
  assert.ok(rows.length >= 4);
  const melden = doraTopicSelection('T5', {sub: '5c'});
  assert.ok(melden.length > 0 && melden.every(row => row.raakt.length === 0));
  assert.ok(melden.reduce((n, r) => n + r.normIds.length, 0) < rows.reduce((n, r) => n + r.normIds.length, 0));
});

test('het filter in de viewer toont dezelfde normen als de onderwerppagina telt', () => {
  for (const topic of doraTopics) for (const vereenvoudigd of [false, true]) for (const sub of ['', ...(topic.subs ?? []).map(s => s.id)])
    for (const row of doraTopicSelection(topic.id, {sub, norea: true, vereenvoudigd})) {
      const shown = norms.filter(n => n.sourceId === row.id && doraFilterMatches(n.id, row.filter)).map(n => n.id);
      assert.deepEqual(shown.sort(), [...row.kern].sort(), `${topic.id} ${sub} ${row.id}`);
    }
});

test('filter coderen, lezen en benoemen', () => {
  assert.equal(encodeDoraFilter({topic: 'T5'}), 'T5');
  assert.equal(encodeDoraFilter({topic: 'T5', sub: '5c', regime: 'gewoon'}), 'T5|5c|gewoon');
  assert.deepEqual(decodeDoraFilter('T5||gewoon'), {topic: 'T5', sub: '', regime: 'gewoon'});
  assert.equal(decodeDoraFilter('onzin'), null);
  assert.equal(doraFilterMatches('bestaat-niet', 'onzin'), true);
  assert.equal(doraFilterMatches('bestaat-niet', 'T5'), false);
  assert.match(doraFilterLabel('T5|5c|gewoon'), /Melden · gewoon raamwerk/u);
  for (const source of doraTopicSources) {
    const options = doraSourceFilterOptions(source.id);
    assert.ok(options.length > 0, source.id);
    assert.equal(new Set(options.map(o => o.value)).size, options.length);
  }
  assert.deepEqual(doraSourceFilterOptions('BIO2'), []);
});

test('bronnen buiten de onderwerpen zijn benoemd en overlappen niet met de onderwerpbronnen', () => {
  assert.equal(doraOutsideSources.length, 7);
  for (const source of doraOutsideSources) assert.ok(source.reason && !isDoraTopicSource(source.id), source.id);
});

test('een gevraagd filter wordt één keer overgenomen', () => {
  requestDoraViewerFilter('DORA-2022-2554', 'T5');
  assert.equal(takeDoraViewerFilter('DORA-2022-2554'), 'T5');
  assert.equal(takeDoraViewerFilter('DORA-2022-2554'), undefined);
});
