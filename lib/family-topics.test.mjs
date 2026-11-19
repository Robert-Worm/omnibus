import test from 'node:test';
import assert from 'node:assert/strict';
import {createTopicFamily, validateTopicDefinition} from './family-topics.mjs';
import {setTopicFamilies, topicFamilies, topicFamilyOfSource, topicFamilyOfChoice, topicFamilyOfFilters, requestViewerTopic, takeViewerTopic, rememberListTopic, takeListTopic, forgetTopicRequests} from './topic-families.mjs';
import {fixtureDefinition} from './test-support/topic-family-fixture.mjs';

const family = createTopicFamily(fixtureDefinition());
const all = value => family.choiceSources(value).flatMap(source => source.normIds);

test('een geldige familie heeft geen problemen; fouten in de indeling worden genoemd', () => {
  assert.deepEqual(validateTopicDefinition(fixtureDefinition()), []);
  const broken = fixtureDefinition();
  broken.index.norms['WET-N9'] = ['ONBEKEND', 'Z', 'x', ['A', 'B', 'C'], 'half', 2];
  broken.labels.groupNotes.push({pattern: '(', text: 'kapot'});
  const problems = validateTopicDefinition(broken).join('\n');
  for (const part of ['onbekende bron ONBEKEND', 'onbekend hoofdonderwerp Z', 'onbekend deelonderwerp x', 'hoogstens twee', 'kader moet', 'sectorvlag', 'ongeldig patroon', 'review.normen'])
    assert.match(problems, new RegExp(part.replace(/[()]/gu, '\\$&'), 'u'), part);
  assert.deepEqual(validateTopicDefinition(null), ['De familie ontbreekt.']);
});

test('zonder verwante normen staat een norm in precies één onderwerp; buiten staat nergens', () => {
  for (const regime of ['volledig', 'vereenvoudigd']) {
    const seen = new Map();
    for (const topic of family.topics) for (const id of all({topic: topic.id, sub: '', regime, related: false, sector: true})) {
      assert.ok(!seen.has(id), id); seen.set(id, topic.id);
    }
    assert.ok(!seen.has('WET-N5'));
  }
  assert.deepEqual(family.unassigned, ['WET-N5']);
});

test('kaders sluiten elkaar uit; sectornormen en verwante normen tellen alleen mee als de keuze dat zegt', () => {
  assert.ok(all('proef:B').includes('WET-N3') && !all('proef:B').includes('WET-N4'));
  assert.ok(all('proef:B||v').includes('WET-N4') && !all('proef:B||v').includes('WET-N3'));
  assert.deepEqual(family.otherRegimeNormIds('WET', 'proef:B'), ['WET-N4']);
  assert.ok(!all('proef:C').includes('REG-N2') && all('proef:C||||s').includes('REG-N2'));
  assert.ok(!all('proef:A').includes('REG-N1') && all('proef:A|||r').includes('REG-N1'));
  assert.ok(family.topicHasSector('C') && !family.topicHasSector('A') && family.sourceHasRegimes('WET') && !family.sourceHasRegimes('REG'));
});

test('lijst en viewer gebruiken dezelfde keuze; het praktijkkader is een aparte laag', () => {
  for (const value of ['proef:A', 'proef:B|b1', 'proef:B|b2|v', 'proef:C|||r|s'])
    for (const source of family.sources) {
      const shown = Object.entries(fixtureDefinition().index.norms).filter(([id, [sourceId]]) => sourceId === source.id && family.matches(id, value)).map(([id]) => id);
      assert.deepEqual(shown, family.normIds(source.id, value), `${value} ${source.id}`);
    }
  assert.deepEqual(family.counts('proef:B'), {normen: 2, bronnen: 1, praktijk: 1});
  assert.equal(family.basis('proef:B|||||n'), 'praktijk');
  assert.deepEqual(all('proef:B|||||n'), all('proef:B'));
});

test('keuzes coderen, lezen en benoemen; groepsnotities komen als tekst uit de database', () => {
  assert.equal(family.encode({topic: 'B', sub: 'b2', regime: 'vereenvoudigd'}), 'proef:B|b2|v');
  assert.deepEqual(family.decode('B|b1'), {topic: 'B', sub: 'b1', regime: 'volledig', related: false, sector: false, practice: false});
  assert.equal(family.decode('dora:B'), null);
  assert.equal(family.label('proef:B|b2'), 'Melden');
  assert.match(family.label('proef:A||v|r'), /vereenvoudigd kader · met verwante normen/u);
  assert.equal(family.groupNote('Gewoon raamwerk · x'), 'Volledig kader.');
  assert.deepEqual(family.questionPlans.map(plan => plan.id), ['TOPIC-proef-A', 'TOPIC-proef-B', 'TOPIC-proef-B-b1', 'TOPIC-proef-B-b2', 'TOPIC-proef-C']);
});

test('heeft alles een plek? Een nieuwe norm zonder regel en een regel zonder norm vallen op', () => {
  const database = {WET: ['WET-N1', 'WET-N2', 'WET-N3', 'WET-N4', 'WET-N5'], REG: ['REG-N1', 'REG-N2', 'REG-N3'], PRAKTIJK: ['PRAKTIJK-N1', 'PRAKTIJK-N2']};
  assert.deepEqual(family.coverage(database), {ok: true, missing: [], stale: [], unknownSources: []});
  assert.deepEqual(family.coverage({...database, WET: ['WET-N1', 'WET-N2', 'WET-N3', 'WET-N4', 'NIEUW']}), {ok: false, missing: ['NIEUW'], stale: ['WET-N5'], unknownSources: []});
});

test('de families komen uit de database; een kapotte familie wordt overgeslagen en gemeld', () => {
  const broken = {...fixtureDefinition(), id: 'kapot', topics: []};
  assert.equal(setTopicFamilies([fixtureDefinition(), broken]).length, 1);
  assert.deepEqual(topicFamilies.map(item => item.id), ['proef']);
  const kept = topicFamilies;
  assert.equal(topicFamilyOfSource('PRAKTIJK')?.id, 'proef');
  assert.equal(topicFamilyOfSource('TOEZICHT'), null);
  assert.equal(topicFamilyOfChoice('proef:C')?.id, 'proef');
  assert.equal(topicFamilyOfFilters({family: 'Proef'})?.id, 'proef');
  setTopicFamilies([]);
  assert.equal(kept, topicFamilies);
  assert.equal(topicFamilies.length, 0);
});

test('een gevraagd filter wordt één keer overgenomen; een nieuw project vergeet alles', () => {
  requestViewerTopic('WET', 'proef:B');
  assert.equal(takeViewerTopic('WET'), 'proef:B');
  assert.equal(takeViewerTopic('WET'), undefined);
  rememberListTopic('proef:A', family);
  assert.deepEqual(takeListTopic(), {value: 'proef:A', family: 'proef'});
  requestViewerTopic('WET', 'proef:B'); rememberListTopic('proef:A', family); forgetTopicRequests();
  assert.equal(takeViewerTopic('WET'), undefined);
  assert.equal(takeListTopic(), undefined);
});

test('teksten voor Over dit onderwerp zijn optioneel; verwijzingen moeten naar een bestaand onderwerp wijzen', () => {
  const rich = fixtureDefinition();
  rich.topics[0].about = ['Wat dit onderwerp regelt.'];
  rich.topics[0].notIn = [{text: 'Toegang staat bij [[B]].'}];
  rich.about = {method: ['Zo is de indeling gemaakt.'], choose: ['Ga terug of kies [[C]].'], sourcesIntro: 'De normen komen uit deze bronnen.'};
  assert.deepEqual(validateTopicDefinition(rich), []);
  assert.deepEqual(createTopicFamily(rich).about.method, ['Zo is de indeling gemaakt.']);
  assert.deepEqual(createTopicFamily(fixtureDefinition()).about, {});
  rich.topics[0].notIn = [{text: 'Zie [[Z]].'}];
  rich.about.choose = 'geen lijst';
  const problems = validateTopicDefinition(rich);
  assert.ok(problems.some(problem => problem.includes('[[Z]]')));
  assert.ok(problems.some(problem => problem.includes('about.choose')));
});

test('de centrale vraag van een combinatie noemt de onderwerpen: A en B, of A, B en C', async () => {
  const {combinationQuestion} = await import('./family-topics.mjs');
  const combination = {template: 'Hoe geeft de entiteit vorm aan {onderwerpen}, in opzet en in de praktijk?', phrases: {A: 'het detecteren', B: 'het herstellen', C: 'het testen'}, join: 'en'};
  assert.equal(combinationQuestion(combination, ['A', 'B']), 'Hoe geeft de entiteit vorm aan het detecteren en het herstellen, in opzet en in de praktijk?');
  assert.equal(combinationQuestion(combination, ['A', 'B', 'C']), 'Hoe geeft de entiteit vorm aan het detecteren, het herstellen en het testen, in opzet en in de praktijk?');
  assert.equal(combinationQuestion({...combination, join: 'en aan'}, ['A', 'B']), 'Hoe geeft de entiteit vorm aan het detecteren en aan het herstellen, in opzet en in de praktijk?');
  assert.equal(combinationQuestion(combination, ['A']), '');
  assert.equal(combinationQuestion(combination, ['A', 'Z']), '');
  const rich = fixtureDefinition();
  rich.combination = {template: 'Hoe {x}?', phrases: {A: 'a'}, review: {reviewer: 'r', reviewDate: '2026-11-19', textHash: 'h'}};
  const problems = validateTopicDefinition(rich).join('\n');
  assert.match(problems, /\{onderwerpen\}/u);
});
