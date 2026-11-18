import test from 'node:test';
import assert from 'node:assert/strict';
import {doraOnderwerpIndeling} from './dora-onderwerpen-indeling.mjs';
import {doraTopics, doraTopicSources, doraOutsideSources, doraChoiceNormIds, doraChoiceMatches, doraChoiceLabel, doraChoiceSources, doraChoiceCounts,
  encodeDoraChoice, decodeDoraChoice, doraSourceFilterOptions, doraSourceHasRegimes, doraUnassigned, isDoraTopicSource, requestDoraViewerFilter, takeDoraViewerFilter} from './dora-onderwerpen.mjs';

const norms = Object.entries(doraOnderwerpIndeling.norms).map(([id, [sourceId, main, sub, also, regime, sector]]) => ({id, sourceId, main, sub, also, regime, sector}));
const topicIds = new Set(doraTopics.map(t => t.id));
const all = value => doraChoiceSources(value).flatMap(source => source.normIds);

test('er zijn acht onderwerpen, elk met een afbakening', () => {
  assert.equal(doraTopics.length, 8);
  for (const topic of doraTopics) assert.ok(topic.title && topic.includes && topic.excludes, topic.id);
});

test('elke norm heeft één geldig hoofdonderwerp en hoogstens twee verwante onderwerpen', () => {
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

test('zonder verwante normen staat een norm in precies één onderwerp', () => {
  for (const regime of ['volledig', 'vereenvoudigd']) {
    const seen = new Map();
    for (const topic of doraTopics) for (const id of all({topic: topic.id, sub: '', regime, related: false})) {
      assert.ok(!seen.has(id), `${id} staat in ${seen.get(id)} en ${topic.id}`);
      seen.set(id, topic.id);
    }
    const expected = norms.filter(n => n.main !== 'buiten' && (!n.regime || n.regime === (regime === 'vereenvoudigd' ? 'vereenvoudigd' : 'gewoon'))).length;
    assert.equal(seen.size, expected);
  }
  assert.equal(doraUnassigned.length, norms.filter(n => n.main === 'buiten').length);
});

test('volledig en vereenvoudigd kader sluiten elkaar uit; standaard is volledig', () => {
  const ids = regime => new Set(doraTopics.flatMap(t => all({topic: t.id, sub: '', regime, related: true})));
  const volledig = ids('volledig'), vereenvoudigd = ids('vereenvoudigd');
  for (const norm of norms) {
    if (norm.regime === 'gewoon') assert.ok(!vereenvoudigd.has(norm.id), norm.id);
    if (norm.regime === 'vereenvoudigd') assert.ok(!volledig.has(norm.id), norm.id);
  }
  for (const topic of doraTopics) assert.deepEqual(all(topic.id), all({topic: topic.id, sub: '', regime: 'volledig', related: false}));
  assert.ok(doraSourceHasRegimes('DORA-2024-1774'));
  assert.ok(!doraSourceHasRegimes('DORA-2025-301'));
});

test('lijst en viewer gebruiken dezelfde keuze: wat de lijst telt, toont de viewer', () => {
  for (const topic of doraTopics) for (const regime of ['volledig', 'vereenvoudigd']) for (const related of [false, true]) for (const sub of ['', ...(topic.subs ?? []).map(s => s.id)]) {
    const value = encodeDoraChoice({topic: topic.id, sub, regime, related});
    assert.deepEqual(decodeDoraChoice(value), {topic: topic.id, sub, regime, related});
    for (const source of doraTopicSources) {
      const shown = norms.filter(n => n.sourceId === source.id && doraChoiceMatches(n.id, value)).map(n => n.id).sort();
      assert.deepEqual(shown, doraChoiceNormIds(source.id, value).sort(), `${value} ${source.id}`);
    }
  }
});

test('verwante normen komen erbij en horen bij een ander hoofdonderwerp', () => {
  for (const topic of doraTopics) {
    const kern = new Set(all(topic.id)), ruim = all({topic: topic.id, sub: '', regime: 'volledig', related: true});
    assert.ok(ruim.length >= kern.size);
    for (const id of ruim) if (!kern.has(id)) assert.notEqual(norms.find(n => n.id === id).main, topic.id);
  }
});

test('NOREA is een aparte laag en telt niet mee in de wetstelling', () => {
  for (const topic of doraTopics) {
    const counts = doraChoiceCounts(topic.id), sources = doraChoiceSources(topic.id);
    assert.ok(counts.normen > 0 && counts.bronnen > 0 && counts.praktijk > 0, topic.id);
    assert.equal(counts.normen, sources.filter(s => s.laag === 'wet').reduce((n, s) => n + s.normIds.length, 0));
    assert.ok(sources.some(s => s.laag === 'praktijk'));
  }
});

test('incidentmanagement: verordening en regelingen voor classificatie en melden; Melden is een deel', () => {
  const sources = doraChoiceSources('T5').filter(s => s.laag === 'wet');
  assert.ok(sources.some(s => s.id === 'DORA-2022-2554') && sources.length >= 4);
  assert.ok(doraChoiceCounts('T5|5c').normen > 0 && doraChoiceCounts('T5|5c').normen < doraChoiceCounts('T5').normen);
});

test('keuze coderen, lezen en benoemen', () => {
  assert.equal(encodeDoraChoice({topic: 'T5'}), 'T5');
  assert.equal(encodeDoraChoice({topic: 'T5', sub: '5c', regime: 'vereenvoudigd', related: false}), 'T5|5c|v');
  assert.equal(encodeDoraChoice({topic: 'T5', related: true}), 'T5|||r');
  // Een filter dat versie 0.1.63 bewaarde ("T5||gewoon") blijft leesbaar en betekent het volledige kader.
  assert.deepEqual(decodeDoraChoice('T5||gewoon'), {topic: 'T5', sub: '', regime: 'volledig', related: false});
  assert.equal(decodeDoraChoice('onzin'), null);
  assert.equal(doraChoiceMatches('bestaat-niet', 'onzin'), true);
  assert.equal(doraChoiceMatches('bestaat-niet', 'T5'), false);
  assert.equal(doraChoiceLabel('T5|5c'), 'Melden');
  assert.match(doraChoiceLabel('T1||v|r'), /vereenvoudigd kader · met verwante normen/u);
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
