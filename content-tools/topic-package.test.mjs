import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTopicPackageToPublication, buildTopicPlan, checkTopicDesign, checkTopicPackage, checkTopicReview, topicInventory, TOPIC_PACKAGE_FORMAT} from './topic-package.mjs';
import {createTopicFamily} from '../lib/family-topics.mjs';
import {fixtureDefinition} from '../lib/test-support/topic-family-fixture.mjs';

// Wat de database zou leveren: per bron de normen en de selecteerbare toetspunten (een gesplitst punt eindigt op -S2).
const runtime = () => {
  const norms = Object.entries(fixtureDefinition().index.norms), sources = {};
  for (const source of fixtureDefinition().sources) {
    const own = norms.filter(([, [sourceId]]) => sourceId === source.id).map(([id]) => id);
    sources[source.id] = {packageVersion: '1', norms: own.map(id => ({id, title: 'Titel ' + id, text: 'Tekst ' + id})),
      points: own.flatMap(id => [{id: id + '-P01', normId: id, title: 'Punt 1 van ' + id}, {id: id + '-P02', normId: id, title: 'Punt 2 van ' + id}]).concat(source.id === 'WET' ? [{id: 'WET-N2-P01-S2', normId: 'WET-N2', title: 'Gesplitst'}] : [])};
  }
  return {sources};
};
const definition = fixtureDefinition(), family = createTopicFamily(definition);
const entry = id => family.questionPlans.find(plan => plan.id === id);
// Een ontwerp voor onderwerp C (hoofd: REG-N1, REG-N2, PRAKTIJK-N2; verwant: WET-N2).
const designC = () => ({central: 'Hoe heeft de entiteit het herstel van haar dienstverlening voorbereid?', scope: 'Herstel.',
  specific: [{key: 'plannen', text: 'Hoe worden herstelplannen opgesteld en bijgehouden?', normIds: ['REG-N1', 'PRAKTIJK-N2']},
    {key: 'testen', text: 'Hoe worden de herstelplannen getest en verbeterd?', normIds: ['REG-N2']},
    {key: 'signalen', text: 'Hoe worden afwijkingen die herstel vragen tijdig herkend?', normIds: ['WET-N2']}],
  broad: [{key: 'voorbereiding', text: 'Hoe is het herstel voorbereid en vastgelegd?', specificKeys: ['plannen', 'signalen']},
    {key: 'toetsing', text: 'Hoe wordt het herstel getoetst en verbeterd?', specificKeys: ['testen']}],
  verplaatstePunten: [{pointId: 'REG-N1-P02', naar: 'testen', reden: 'gaat over testen'}, {pointId: 'WET-N2-P01', naar: null, reden: 'hoort bij B'}]});

test('de inventaris van een plan: hoofdnormen en, bij een heel onderwerp, de verwante', () => {
  assert.deepEqual(topicInventory(definition, entry('TOPIC-proef-C'), runtime()).map(norm => [norm.id, norm.rol]),
    [['WET-N2', 'verwant'], ['REG-N1', 'hoofd'], ['REG-N2', 'hoofd'], ['PRAKTIJK-N2', 'hoofd']]);
  assert.deepEqual(topicInventory(definition, entry('TOPIC-proef-B-b1'), runtime()).map(norm => norm.id), ['WET-N2', 'PRAKTIJK-N1']);
});

test('ontwerpcontrole: elke norm één plek, geen onbekende sleutels, vormcontrole', () => {
  const inventory = topicInventory(definition, entry('TOPIC-proef-C'), runtime());
  assert.deepEqual(checkTopicDesign(designC(), inventory), []);
  const broken = designC();
  broken.specific[1].normIds = ['REG-N2', 'REG-N1'];
  broken.specific[2].normIds = [];
  broken.broad[1].specificKeys = ['testen', 'onbekend'];
  broken.central = 'Voldoet de entiteit en/of is alles goed geregeld? En is het voldoende?';
  const problems = checkTopicDesign(broken, inventory).join('\n');
  for (const part of ['Norm REG-N1 staat bij plannen en testen', 'zonder normen: signalen', 'Norm zonder plek: WET-N2', 'onbekende vraag onbekend', 'vormcontrole'])
    assert.match(problems, new RegExp(part, 'u'), part);
});

test('het plan koppelt per toetspunt; verplaatsen en een gesplitst punt dat zijn ouder volgt', () => {
  const inventory = topicInventory(definition, entry('TOPIC-proef-C'), runtime());
  const built = buildTopicPlan(definition, entry('TOPIC-proef-C'), designC(), inventory, runtime(), '20261119.01');
  const keys = Object.fromEntries(built.plan.subquestions.map(question => [question.key, question.originKeys]));
  assert.deepEqual(keys['specific:plannen'], ['REG:REG-N1-P01', 'PRAKTIJK:PRAKTIJK-N2-P01', 'PRAKTIJK:PRAKTIJK-N2-P02']);
  assert.deepEqual(keys['specific:testen'], ['REG:REG-N2-P01', 'REG:REG-N2-P02', 'REG:REG-N1-P02']);
  // WET-N2-P01 is niet gekoppeld; zijn gesplitste punt volgt hem.
  assert.deepEqual(keys['specific:signalen'], ['WET:WET-N2-P02']);
  assert.equal(built.process.topic.family, 'proef');
  assert.equal(built.plan.sourceEdition, 'TOPIC-proef-C-20261119.01');
  // Dezelfde invoer geeft dezelfde hash; een andere vraagtekst niet.
  assert.equal(buildTopicPlan(definition, entry('TOPIC-proef-C'), designC(), inventory, runtime(), '20261119.01').itemHash, built.itemHash);
  const changed = designC(); changed.specific[1].text = 'Hoe worden de herstelplannen beproefd?';
  assert.notEqual(buildTopicPlan(definition, entry('TOPIC-proef-C'), changed, inventory, runtime(), '20261119.01').itemHash, built.itemHash);
});

test('een review hoort bij precies deze versie, dekt elke vraag en behoudt alles', () => {
  const inventory = topicInventory(definition, entry('TOPIC-proef-C'), runtime());
  const built = buildTopicPlan(definition, entry('TOPIC-proef-C'), designC(), inventory, runtime(), '20261119.01');
  const review = {reviewer: 'reviewer-X', reviewDate: '2026-11-19', itemHash: built.itemHash, decisions: built.questions.map(question => ({questionId: question.id, decision: 'behouden', basis: 'gelezen'}))};
  assert.deepEqual(checkTopicReview(review, built), []);
  assert.match(checkTopicReview({...review, itemHash: 'oud'}, built).join(), /andere versie/u);
  assert.match(checkTopicReview({...review, decisions: review.decisions.slice(1)}, built).join(), /dekken de vragen niet/u);
  assert.match(checkTopicReview({...review, decisions: review.decisions.map((item, i) => (i ? item : {...item, decision: 'HOLD'}))}, built).join(), /niet behouden/u);
});

test('een pakket zonder plan per onderwerp of met een norm zonder plek gaat niet door', () => {
  const pkg = {format: TOPIC_PACKAGE_FORMAT, schemaVersion: 1, edition: '20261119.01', family: definition, plans: [{id: 'TOPIC-proef-C', design: designC()}]};
  const checked = checkTopicPackage(pkg, runtime(), {reviews: false});
  assert.match(checked.problems.join('\n'), /Geen vraagplan voor TOPIC-proef-A/u);
  const extra = runtime(); extra.sources.REG.norms.push({id: 'REG-NIEUW', title: '', text: ''});
  assert.match(checkTopicPackage(pkg, extra, {reviews: false}).problems.join('\n'), /Norm zonder plek in de indeling: REG-NIEUW/u);
  assert.match(checkTopicPackage({...pkg, format: 'iets'}, runtime()).problems[0], /Geen onderwerppakket/u);
});

test('de familie en haar plannen komen in de procescatalogus; andere families en processen blijven', () => {
  const value = {modules: {'lib/process-catalogue.mjs': {processes: [{id: 'P1'}, {id: 'TOPIC-proef-oud', topic: {family: 'proef'}}], questionPlans: {P1: {x: 1}, 'TOPIC-proef-oud': {x: 2}},
    topicFamilies: [{id: 'ander'}, {id: 'proef', oud: true}]}}};
  applyTopicPackageToPublication(value, definition, [{process: {id: 'TOPIC-proef-C', topic: {family: 'proef'}}, plan: {central: 'x'}}]);
  const module = value.modules['lib/process-catalogue.mjs'];
  assert.deepEqual(module.processes.map(process => process.id), ['P1', 'TOPIC-proef-C']);
  assert.deepEqual(Object.keys(module.questionPlans), ['P1', 'TOPIC-proef-C']);
  assert.deepEqual(module.topicFamilies.map(item => item.id), ['ander', 'proef']);
  assert.equal(module.topicFamilies[1].oud, undefined);
});

test('een nieuwe editie met dezelfde planEdition houdt de plannen gelijk; zonder planEdition verandert het plan', () => {
  const pkg = edition => ({format: TOPIC_PACKAGE_FORMAT, schemaVersion: 1, edition, family: definition, plans: [{id: 'TOPIC-proef-C', design: designC()}]});
  const hash = value => checkTopicPackage(value, runtime(), {reviews: false}).plans.find(built => built.entry.id === 'TOPIC-proef-C')?.itemHash;
  const before = hash(pkg('20261119.01'));
  assert.ok(before);
  assert.equal(hash({...pkg('20261120.01'), planEdition: '20261119.01'}), before);
  assert.notEqual(hash(pkg('20261120.01')), before);
  assert.match(checkTopicPackage({...pkg('20261120.01'), planEdition: 'morgen'}, runtime(), {reviews: false}).problems.join('\n'), /planEdition/u);
});
