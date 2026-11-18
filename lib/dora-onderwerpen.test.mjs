import test from 'node:test';
import assert from 'node:assert/strict';
import {doraOnderwerpIndeling} from './dora-onderwerpen-indeling.mjs';
import {doraTopicFamily as family} from './dora-onderwerpen.mjs';
import {topicFamilies, topicFamilyOfSource, topicFamilyOfChoice, topicFamilyOfFilters, requestViewerTopic, takeViewerTopic, rememberListTopic, takeListTopic} from './topic-families.mjs';
import {createTopicFamily} from './family-topics.mjs';

const doraTopics = family.topics, doraTopicSources = family.sources, doraOutsideSources = family.outside, doraUnassigned = family.unassigned;
const isDoraTopicSource = family.isSource, doraChoiceNormIds = family.normIds, doraChoiceMatches = family.matches, doraChoiceLabel = family.label;
const doraChoiceSources = family.choiceSources, doraChoiceCounts = family.counts, encodeDoraChoice = family.encode, decodeDoraChoice = family.decode;
const doraSourceHasRegimes = family.sourceHasRegimes, doraTopicHasSector = family.topicHasSector, doraOtherRegimeNormIds = family.otherRegimeNormIds, doraChoiceBasis = family.basis;

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
    for (const topic of doraTopics) for (const id of all({topic: topic.id, sub: '', regime, related: false, sector: true})) {
      assert.ok(!seen.has(id), `${id} staat in ${seen.get(id)} en ${topic.id}`);
      seen.set(id, topic.id);
    }
    const expected = norms.filter(n => n.main !== 'buiten' && (!n.regime || n.regime === (regime === 'vereenvoudigd' ? 'vereenvoudigd' : 'gewoon'))).length;
    assert.equal(seen.size, expected);
  }
  assert.equal(doraUnassigned.length, norms.filter(n => n.main === 'buiten').length);
});

test('volledig en vereenvoudigd kader sluiten elkaar uit; standaard is volledig', () => {
  const ids = regime => new Set(doraTopics.flatMap(t => all({topic: t.id, sub: '', regime, related: true, sector: true})));
  const volledig = ids('volledig'), vereenvoudigd = ids('vereenvoudigd');
  for (const norm of norms) {
    if (norm.regime === 'gewoon') assert.ok(!vereenvoudigd.has(norm.id), norm.id);
    if (norm.regime === 'vereenvoudigd') assert.ok(!volledig.has(norm.id), norm.id);
  }
  for (const topic of doraTopics) assert.deepEqual(all(topic.id), all({topic: topic.id, sub: '', regime: 'volledig', related: false, sector: false}));
  assert.ok(doraSourceHasRegimes('DORA-2024-1774'));
  assert.ok(!doraSourceHasRegimes('DORA-2025-301'));
});

test('lijst en viewer gebruiken dezelfde keuze: wat de lijst telt, toont de viewer', () => {
  for (const topic of doraTopics) for (const regime of ['volledig', 'vereenvoudigd']) for (const related of [false, true]) for (const sub of ['', ...(topic.subs ?? []).map(s => s.id)]) {
    const sector = related;
    const value = encodeDoraChoice({topic: topic.id, sub, regime, related, sector});
    assert.deepEqual(decodeDoraChoice(value), {topic: topic.id, sub, regime, related, sector, practice: false});
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

test('sectorspecifieke normen tellen alleen mee als de keuze dat zegt', () => {
  const sectorIds = norms.filter(n => n.sector).map(n => n.id);
  assert.ok(sectorIds.length > 0);
  for (const topic of doraTopics) for (const related of [false, true]) {
    const zonder = new Set(all({topic: topic.id, sub: '', regime: 'volledig', related, sector: false}));
    for (const id of sectorIds) assert.ok(!zonder.has(id), id);
  }
  assert.ok(all('T6||||s').includes('RTS1774-N163') && !all('T6').includes('RTS1774-N163'));
  assert.ok(doraTopicHasSector('T6') && doraTopicHasSector('T6', 'DORA-2024-1774') && !doraTopicHasSector('T8'));
});

test('kiezen onder het ene kader noemt de normen van het andere kader om los te laten', () => {
  const volledig = new Set(doraChoiceNormIds('DORA-2024-1774', 'T5')), anders = doraOtherRegimeNormIds('DORA-2024-1774', 'T5');
  assert.ok(anders.length > 0);
  for (const id of anders) { assert.ok(!volledig.has(id), id); assert.equal(norms.find(n => n.id === id).regime, 'vereenvoudigd'); }
  assert.deepEqual(doraOtherRegimeNormIds('DORA-2024-1774', 'T5||v').sort(), [...volledig].filter(id => norms.find(n => n.id === id).regime === 'gewoon').sort());
  assert.deepEqual(doraOtherRegimeNormIds('DORA-2025-301', 'T5'), []);
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
  assert.equal(encodeDoraChoice({topic: 'T5'}), 'dora:T5');
  assert.equal(encodeDoraChoice({topic: 'T5', sub: '5c', regime: 'vereenvoudigd', related: false}), 'dora:T5|5c|v');
  assert.equal(encodeDoraChoice({topic: 'T5', related: true}), 'dora:T5|||r');
  // Een filter dat versie 0.1.63 bewaarde ("T5||gewoon") blijft leesbaar en betekent het volledige kader.
  assert.deepEqual(decodeDoraChoice('T5||gewoon'), {topic: 'T5', sub: '', regime: 'volledig', related: false, sector: false, practice: false});
  assert.equal(decodeDoraChoice('onzin'), null);
  assert.equal(doraChoiceMatches('bestaat-niet', 'onzin'), true);
  assert.equal(doraChoiceMatches('bestaat-niet', 'T5'), false);
  assert.equal(doraChoiceLabel('T5|5c'), 'Melden');
  assert.match(doraChoiceLabel('T1||v|r'), /vereenvoudigd kader · met verwante normen/u);
});

test('NOREA als toetsgrondslag verandert de normen niet, alleen waarvoor "kies alles" geldt', () => {
  assert.equal(doraChoiceBasis('T5'), 'wet');
  assert.equal(doraChoiceBasis('T5|||||n'), 'praktijk');
  assert.deepEqual(all('T5|||||n'), all('T5'));
  assert.equal(decodeDoraChoice(encodeDoraChoice({topic: 'T5', practice: true})).practice, true);
});

test('bronnen buiten de onderwerpen zijn benoemd en overlappen niet met de onderwerpbronnen', () => {
  assert.equal(doraOutsideSources.length, 7);
  for (const source of doraOutsideSources) assert.ok(source.reason && !isDoraTopicSource(source.id), source.id);
});

test('een gevraagd filter wordt één keer overgenomen; de lijst volgt het onderwerp uit de viewer', () => {
  requestViewerTopic('DORA-2022-2554', 'dora:T5');
  assert.equal(takeViewerTopic('DORA-2022-2554'), 'dora:T5');
  assert.equal(takeViewerTopic('DORA-2022-2554'), undefined);
  rememberListTopic('dora:T3', family);
  assert.deepEqual(takeListTopic(), {value: 'dora:T3', family: 'dora'});
  assert.equal(takeListTopic(), undefined);
});

test('een keuze draagt haar familie; een keuze van een eerdere versie zonder familie blijft leesbaar', () => {
  assert.equal(family.decode('dora:T5|5c').sub, '5c');
  assert.equal(family.decode('T5|5c').sub, '5c');
  assert.equal(family.decode('avg:T5'), null);
  assert.equal(topicFamilyOfChoice('dora:T8'), family);
  assert.equal(topicFamilyOfChoice('T8'), family);
  assert.equal(topicFamilyOfChoice('avg:T8'), null);
  assert.equal(topicFamilyOfSource('NOREA-DORA-3-2'), family);
  assert.equal(topicFamilyOfSource('BIO2'), null);
  assert.equal(topicFamilyOfFilters({family: 'DORA'}), family);
  assert.equal(topicFamilyOfFilters({category: 'Financiële sector & DORA'}, id => (id === 'financial' ? 'Financiële sector & DORA' : '')), family);
  assert.equal(topicFamilyOfFilters({family: 'IIA-standaarden'}), null);
  assert.deepEqual(topicFamilies.map(item => item.id), ['dora']);
});

test('heeft alles een plek? De indeling wordt vergeleken met de normen van de database', () => {
  const database = Object.fromEntries(family.sources.map(source => [source.id, norms.filter(n => n.sourceId === source.id).map(n => n.id)]));
  assert.deepEqual(family.coverage(database), {ok: true, missing: [], stale: [], unknownSources: []});
  // Een nieuwe norm zonder regel valt stil uit elk onderwerp: dat moet opvallen. Buiten de onderwerpen staan mag wel.
  const first = family.sources[0].id, gone = database[first][0];
  const changed = {...database, [first]: [...database[first].slice(1), 'NIEUW-N99']};
  assert.deepEqual(family.coverage(changed), {ok: false, missing: ['NIEUW-N99'], stale: [gone], unknownSources: []});
  const {[first]: _removed, ...without} = database;
  assert.deepEqual(family.coverage(without).unknownSources, [first]);
  assert.ok(family.unassigned.length > 0);
});

test('een tweede familie werkt op dezelfde logica, zonder kader, sector of praktijkkader', () => {
  const second = createTopicFamily({id: 'proef', listFamily: 'Proef', topics: [{id: 'A', title: 'Eerste', includes: 'x', excludes: 'y'}, {id: 'B', title: 'Tweede', includes: 'x', excludes: 'y'}],
    sources: [{id: 'W', soort: 'Wet', laag: 'wet'}, {id: 'R', soort: 'Regeling', laag: 'wet'}], outside: [],
    index: {review: {status: 'proef', date: '2026-11-18', normen: 4, note: ''}, norms: {W1: ['W', 'A', '', [], '', 0], W2: ['W', 'B', '', ['A'], '', 0], R1: ['R', 'A', '', [], '', 1], R2: ['R', 'buiten', '', [], '', 0]}},
    labels: {lawNoun: ['wet', 'wetten'], law: 'de wet', related: {label: 'Ook verwante normen', title: ''}}});
  assert.equal(second.encode({topic: 'A'}), 'proef:A');
  assert.deepEqual(second.choiceSources('proef:A').map(source => [source.id, source.normIds]), [['W', ['W1']], ['R', ['R1']]]);
  assert.deepEqual(second.normIds('W', 'proef:A|||r'), ['W1', 'W2']);
  // Zonder tekst voor een optie bestaat die optie niet: de sectorvlag sluit dan niets uit en een kader wordt niet gelezen.
  assert.deepEqual(second.decode('proef:A||v||s|n'), {topic: 'A', sub: '', regime: 'volledig', related: false, sector: false, practice: false});
  assert.equal(second.decode('dora:T5'), null);
  assert.equal(family.decode('proef:A'), null);
  assert.deepEqual(second.unassigned, ['R2']);
});
