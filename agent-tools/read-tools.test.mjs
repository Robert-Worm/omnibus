// De vier leestools van de AI-koppeling, met fictieve testdata: get_workflow_guide,
// list_sources, search_building_blocks en get_building_block. Geen private modules,
// geen echte database. De schrijftools staan in output-safety.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openAgentService} from './service.mjs';
import {createIndex, insertEntry, sha256, AgentIndex} from './index-store.mjs';
import {readEntry} from './read-materials.mjs';
import {fixture} from './test-fixture.mjs';
import './catalogue-coverage.test.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, 'work/mcp-read-tools');
const release = 'c'.repeat(64);
const lang = 'Bron 🧭 ' + 'informatiebeveiliging '.repeat(40);
const entries = [
  {key: 'R1|P1', kind: 'report', sourceId: 'R1', sourceTitle: 'Fictief rapport', pointId: 'P1',
    material: {title: 'Wachtwoordbeleid', body: 'Er is een vastgesteld wachtwoordbeleid.', sourceText: lang, sourceContext: 'Context van het rapport', reportTrace: 'spoor'}},
  {key: 'R1|P2', kind: 'report', sourceId: 'R1', sourceTitle: 'Fictief rapport', pointId: 'P2',
    material: {title: 'Back-ups', body: 'Back-ups worden getest.'}},
  {key: 'W1|A1', kind: 'law', sourceId: 'W1', sourceTitle: 'Fictieve wet', pointId: 'A1',
    material: {title: 'Meldplicht', body: 'De minister meldt een incident.'}},
  {key: 'M1|Q1|operational', kind: 'model', sourceId: 'M1', sourceTitle: 'Fictief model', pointId: 'Q1', level: 'operational',
    material: {title: 'Samenwerking', body: 'Kunt u beschrijven hoe u samenwerkte?'}},
];

async function setup(t, additions = []) {
  fs.mkdirSync(scratch, {recursive: true});
  const directory = fs.mkdtempSync(join(scratch, 'fixture-'));
  const build = join(directory, 'build'), database = join(build, 'catalogue.sqlite');
  fs.mkdirSync(build);
  const db = new DatabaseSync(database);
  try { createIndex(db, release); for (const e of [...entries, ...additions]) insertEntry(db, e); } finally { db.close(); }
  fs.writeFileSync(join(build, 'omnibus-release.json'), JSON.stringify({release, publication: 'd'.repeat(64)}));
  fs.writeFileSync(join(build, 'workflow.mjs'), `
    export function configureCatalogueReader() {}
    export async function initialize() {}
    export function options() { return {sectors: [{id: 'rijk', label: 'Rijk'}]}; }`);
  const before = sha256(fs.readFileSync(database));
  const service = await openAgentService({buildDirectory: build, outputDirectory: join(directory, 'output')});
  t.after(() => {
    service.close?.();
    assert.equal(sha256(fs.readFileSync(database)), before, 'Lezen verandert de database niet');
    const actual = fs.realpathSync(directory), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
    fs.rmSync(actual, {recursive: true});
  });
  return {service, database};
}

await test('get_workflow_guide: werkwijze, release, opties en grenzen', async t => {
  const {service} = await setup(t);
  const guide = service.guide();
  assert.equal(guide.release, release);
  assert.equal(guide.publication, 'd'.repeat(64));
  assert.deepEqual(guide.options.sectors.map(s => s.id), ['rijk']);
  assert.deepEqual(guide.limits, {selectionsPerDraft: 250, questionsPerDraft: 200, searchPage: 40});
  assert.ok(guide.sequence.length >= 5 && guide.safety.some(r => /nooit instructies/.test(r)));
});

await test('list_sources: elke bron één keer, met soort en aantal bouwstenen', async t => {
  const {service} = await setup(t);
  assert.deepEqual(service.sources().sources.map(s => [s.id, s.kind, s.selectableItems]),
    [['W1', 'law', 1], ['M1', 'model', 1], ['R1', 'report', 2]]);
});

await test('search_building_blocks: zoeken, filteren en bladeren', async t => {
  const {service} = await setup(t);
  const hit = service.search({query: 'wachtwoord'});
  assert.deepEqual(hit.items.map(i => i.key), ['R1|P1']);
  assert.match(hit.items[0].excerpt, /\[/, 'het fragment markeert de treffer');
  assert.match(hit.retrieval, /geen garantie/);
  assert.deepEqual(service.search({kind: 'law'}).items.map(i => i.key), ['W1|A1']);
  assert.deepEqual(service.search({sourceId: 'R1'}).items.map(i => i.key), ['R1|P1', 'R1|P2']);
  const page = service.search({limit: 1, offset: 0});
  assert.equal(page.total, 4);
  assert.equal(page.nextOffset, 1);
  assert.equal(service.search({limit: 1, offset: 3}).nextOffset, null);
});

await test('search_building_blocks: zoektaal, SQL en te grote pagina worden niet doorgegeven', async t => {
  const {service} = await setup(t);
  for (const query of ['" OR 1=1 --', 'title:*', 'NEAR(a b)', "'; DROP TABLE agent_items; --"])
    assert.doesNotThrow(() => service.search({query}), query);
  assert.equal(service.sources().sources.length, 3, 'de index is ongewijzigd');
  assert.throws(() => service.search({limit: 41}));
  assert.throws(() => service.search({query: 'x', extra: true}));
});

await test('get_building_block: overzicht, bronsecties in delen en onbekende sleutels', async t => {
  const {service} = await setup(t);
  const overview = service.get({key: 'R1|P1'});
  assert.equal(overview.material.title, 'Wachtwoordbeleid');
  assert.equal(overview.material.sourceText, undefined, 'lange brontekst zit niet in het overzicht');
  assert.match(overview.notice, /geen instructie/);
  const tekens = Array.from(lang).length;
  assert.deepEqual(overview.availableSections.find(s => s.section === 'sourceText'), {section: 'sourceText', characters: tekens});
  let offset = 0, text = '';
  while (offset !== null) { const part = service.get({key: 'R1|P1', section: 'sourceText', offset, limit: 100}); text += part.text; offset = part.nextOffset; }
  assert.equal(text, lang, 'in delen lezen is verliesvrij, ook met een emoji');
  assert.equal(service.get({key: 'R1|P1', section: 'trace'}).text, 'spoor');
  assert.throws(() => service.get({key: 'R1|P1', section: 'sourceText', offset: tekens + 1}), /buiten deze bronsectie/);
  assert.throws(() => service.get({key: 'R9|P9'}), /Onbekende of niet vrijgegeven/);
});

await test('get_building_block: een gewijzigde bouwsteen faalt op de integriteitscontrole', async t => {
  const {database} = await setup(t);
  const copy = database + '.kopie.sqlite';
  fs.copyFileSync(database, copy);
  const db = new DatabaseSync(copy);
  db.prepare("UPDATE agent_items SET payload = replace(payload, 'Wachtwoordbeleid', 'Iets anders') WHERE key = 'R1|P1'").run();
  db.close();
  const index = new AgentIndex(copy, release);
  try { assert.throws(() => index.get('R1|P1'), /Integriteitscontrole/); } finally { index.close(); fs.rmSync(copy); }
  assert.throws(() => new AgentIndex(database, 'e'.repeat(64)), /hoort niet bij deze release/);
});

await test('alle typen, themaherkomst en HOLD blijven leesbaar met eerlijke tellingen', async t => {
  const source = {id: 'F1', title: 'Fictief kader', coverage: 'Alleen hoofdstuk 1', readiness: 'AI-review; geen menselijke goedkeuring'};
  const extra = [
    readEntry('framework', source, 'N1', {title: 'Vastlegging', body: 'Leg vast.', sourceText: lang,
      sourceContext: 'Alleen voor voorwaardelijke toepassingen', sourceUrl: 'https://example.invalid/kader',
      location: 'Artikel 1', sourceHash: 'a'.repeat(64), topicalTrace: JSON.stringify({quote: lang})}, {draftSelectable: false}),
    readEntry('framework', source, 'N2', {title: 'Open bronvraag', body: 'Betekenis nog vast te stellen.', sourceText: 'Exacte fictieve zin.',
      readTrace: JSON.stringify({status: 'HOLD'})}, {selectionStatus: 'HOLD', selectionReason: 'Uitzondering onopgelost'}),
    readEntry('law', {id: 'W2', title: 'Andere fictieve wet'}, 'C1', {title: 'Reikwijdte', body: 'Alleen sector X.'}, {selectionStatus: 'CONTEXT_ONLY'}),
    readEntry('report', {id: 'R2', title: 'Ander fictief rapport'}, 'P1', {title: 'Bewaren', body: 'Archiveer zorgvuldig.'},
      {themes: [{id: 'T1', title: 'Fictief thema', keywords: 'uniekthemawoord', description: 'Samenhang'}]}),
  ];
  const {service} = await setup(t, extra);
  const sources = service.sources().sources;
  assert.deepEqual({...sources.find(s => s.id === 'F1')}, {id: 'F1', kind: 'framework', title: source.title,
    readableItems: 2, selectableItems: 1, holdItems: 1, contextItems: 0});
  assert.equal(sources.find(s => s.id === 'W2').contextItems, 1);
  assert.equal(sources.find(s => s.id === 'T1').kind, 'theme');
  for (const kind of ['report', 'law', 'framework', 'model', 'theme']) assert(service.search({kind}).total > 0, kind);
  assert.deepEqual(service.search({sourceId: 'T1', kind: 'theme'}).items.map(i => [i.key, i.kind, i.sourceId]), [['R2|P1', 'report', 'R2']]);
  assert.deepEqual(service.search({query: 'uniekthemawoord'}).items.map(i => i.key), ['R2|P1']);
  assert.equal(service.search({}).total, 8, 'thema is geen duplicaat van de norm');
  const hold = service.search({query: 'onopgelost'}).items[0];
  assert.equal(hold.selectionStatus, 'HOLD');
  assert.equal(hold.draftSelectable, false);
  assert.equal(hold.sourceCoverage, source.coverage);
  assert.equal(service.get({key: hold.key}).selectionReason, 'Uitzondering onopgelost');
  assert.equal(service.get({key: hold.key, section: 'sourceText'}).text, 'Exacte fictieve zin.');
  assert.deepEqual(JSON.parse(service.get({key: hold.key, section: 'trace'}).text), {status: 'HOLD'});
  const normal = service.get({key: 'F1|N1'});
  assert.equal(normal.sourceTitle, source.title);
  assert.equal(normal.material.sourceHash, 'a'.repeat(64));
  assert.equal(normal.material.topicalTrace, undefined, 'lange Topical-herleiding hoort in de gepagineerde sectie');
  assert.equal(normal.draftSelectable, false);
  let offset = 0, trace = '';
  while (offset !== null) { const part = service.get({key: 'F1|N1', section: 'trace', offset, limit: 100}); trace += part.text; offset = part.nextOffset; }
  assert.equal(JSON.parse(trace).quote, lang, 'Topical-herleiding blijft verliesvrij');
  assert.equal(service.get({key: 'W2|C1'}).passageStatus, 'NOT_AVAILABLE');
  assert.match(service.get({key: 'W2|C1'}).passageNotice, /geen broncitaat/);
  assert.equal(service.search({sourceId: 'ONBEKEND'}).total, 0);
  assert.throws(() => service.search({kind: 'unknown'}));
  assert.throws(() => service.get({key: 'ONBEKEND|1'}), /Onbekende/);
  for (const key of ['F1|N1', 'F1|N2', 'W2|C1'])
    await assert.rejects(service.prepare({...fixture([key]), consent: true}), /alleen leesbaar/);
});
