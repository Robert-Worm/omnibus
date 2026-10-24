// Integration test: requires an explicitly prepared local agent-build. No data
// fixture, alternate generator, global MCP registration or HTTP server is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, writeFileSync, renameSync} from 'node:fs';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {unzipSync, strFromU8} from 'fflate';
import {AgentIndex, sha256} from './index-store.mjs';
import {parseProjectText} from '../lib/project-codec.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {fixture} from './test-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'agent-output');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => sha256(readFileSync(path));
const outputFiles = () => readdirSync(output, {recursive: true}).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

await test('current pinned collection: fictitious intake through the real STDIO workflow', {timeout: 180000}, async t => {
  const pointer = json(resolve(root, 'agent-build/current.json'));
  const rel = relative(resolve(root, 'agent-build'), pointer.directory);
  assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Use this checkout\'s isolated build');
  const database = join(pointer.directory, 'catalogue.sqlite');
  const before = hash(database), index = new AgentIndex(database, pointer.release);
  const client = new Client({name: 'omnibus-local-protocol-test', version: '1.0.0'});
  const transport = new StdioClientTransport({command: process.execPath,
    args: [resolve(root, 'agent-tools/server.mjs')], cwd: root, stderr: 'pipe'});
  transport.stderr?.resume();
  const call = async (name, args = {}) => {
    const result = await client.callTool({name, arguments: args}, undefined, {timeout: 60000});
    assert(!result.isError, `${name}: ${result.content[0].text}`);
    return JSON.parse(result.content[0].text);
  };
  const rejected = async (name, args, pattern) => {
    const beforeFiles = outputFiles();
    const result = await client.callTool({name, arguments: args});
    assert.equal(result.isError, true, name + ' must reject');
    if (pattern) assert.match(result.content[0].text, pattern);
    assert.deepEqual(outputFiles(), beforeFiles, 'Rejected request must not publish a project or export');
    return result.content[0].text;
  };
  const artifacts = [];
  let failures = 0;
  const check = (name, run) => t.test(name, async () => {
    try { await run(); } catch (error) { failures++; throw error; }
  });
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools;
    const guide = await call('get_workflow_guide');
    const sources = await call('list_sources');
    await check('handshake, pinned identities, six tools and read/write annotations', () => {
      assert.equal(client.getServerVersion().version, '0.2.0');
      assert.equal(guide.release, pointer.release);
      assert.equal(guide.publication, pointer.publication);
      assert.equal(sources.release, pointer.release);
      assert.equal(tools.length, 6);
      for (const tool of tools) {
        const writes = ['prepare_research_draft', 'export_research_draft'].includes(tool.name);
        assert.equal(tool.annotations.readOnlyHint, !writes);
        assert.equal(tool.annotations.destructiveHint, false);
        assert.equal(tool.annotations.openWorldHint, false);
        if (writes) assert(tool.inputSchema.required.includes('consent'));
      }
      assert.throws(() => index.db.exec('DELETE FROM agent_items'), /readonly/i);
    });

    // These point IDs were chosen after reading the source contexts for this
    // demonstration. Never adopt the first lexical hit as an implicit selection.
    // Missing IDs fail visibly when the prepared collection changes.
    const choices = [
      {query: 'informatiebeveiliging', kind: 'report', pointId: 'OCW26-K08/TP01', reason: 'Meldafspraken voor beveiligingsincidenten onderzoeken. Het historische ervaringsonderzoek is niet representatief en bewijst geen huidig tekort bij Dienst Voorbeeld.'},
      {query: 'informatiebeveiliging', sourceId: 'CIO', kind: 'law', pointId: 'C26-P-007-j', reason: 'De verantwoordelijkheid voor coördinatie van beveiligingsactiviteiten onderzoeken; departementale toepasselijkheid apart beoordelen.'},
      {query: 'bedrijfscontinuïteit herstel', sourceId: 'WWKE', kind: 'law', pointId: 'WWA-P-0051', reason: 'Voorwaardelijke herstelmaatregelen voor kritieke entiteiten als vergelijkingspunt onderzoeken. Niet vastgesteld dat Dienst Voorbeeld onder de wet valt.'},
      {query: 'samenwerking', kind: 'model', pointId: 'CVF-COLLABORATE-Q03', level: 'operational', reason: 'Open reflectie op samenwerking bij keuzes in de uitvoering; geen compliance-eis of gevalideerde meetscore.'},
    ];
    const entries = [];
    for (const choice of choices) {
      const sourceId = choice.sourceId && sources.sources.find(s => s.id.startsWith(choice.sourceId))?.id;
      if (choice.sourceId) assert(sourceId, `Required ${choice.sourceId} source missing`);
      let chosen, offset = 0;
      do {
        const found = await call('search_building_blocks', {query: choice.query, kind: choice.kind, ...(sourceId ? {sourceId} : {}), limit: 40, offset});
        chosen = found.items.find(item => item.key.split('|')[1] === choice.pointId &&
          (!choice.level || item.key.split('|')[2] === choice.level));
        offset = found.nextOffset;
      } while (!chosen && offset !== null);
      assert(chosen, `Required explicit selection ${choice.pointId} missing from search`);
      const overview = await call('get_building_block', {key: chosen.key});
      const sections = {};
      for (const section of ['sourceContext', 'sourceText', 'trace']) {
        let offset = 0, text = '';
        do {
          const page = await call('get_building_block', {key: chosen.key, section, offset, limit: 12000});
          text += page.text;
          offset = page.nextOffset;
        } while (offset !== null);
        sections[section] = text;
      }
      const stored = index.get(chosen.key);
      assert.equal(sections.sourceText, stored.material.sourceText || '');
      assert.equal(sections.sourceContext, stored.material.sourceContext || '');
      const traces = Object.fromEntries(['cioTrace', 'lawTrace', 'reportTrace', 'topicalTrace', 'readTrace']
        .filter(field => stored.material[field]).map(field => [field, stored.material[field]]));
      assert.equal(sections.trace, Object.keys(traces).length > 1 ? JSON.stringify(traces) : Object.values(traces)[0] || '');
      entries.push({...stored, reason: choice.reason, overview});
    }
    const keys = entries.map(e => e.key);
    const spec = fixture(keys);
    spec.title = 'Fictieve demo — informatiebeveiliging en herstel bij Dienst Voorbeeld';
    spec.intake = {object: 'Informatiebeveiliging en herstel van de digitale werkplek bij de fictieve Dienst Voorbeeld',
      purpose: 'Inzicht krijgen in verantwoordelijkheden, vastgelegde herstelafspraken en samenwerking bij verstoringen.',
      scope: 'Fictieve technische demonstratie. Geen echte organisatie, bevinding of juridisch toepasselijkheidsoordeel.',
      period: 'Fictieve onderzoeksperiode: januari–juni 2026', roles: ['CIO', 'Continuïteitscoördinator', 'Uitvoering'],
      assumptions: ['Alleen fictieve intake; bronselecties en vragen vragen inhoudelijke beoordeling.', 'Wettelijke toepasselijkheid is niet vastgesteld.']};
    spec.selections = entries.map(e => ({key: e.key, reason: e.reason}));
    spec.sector = 'OVERHEID';
    spec.questions = [
      {key: 'central', text: 'Hoe zijn informatiebeveiliging en herstel van de digitale werkplek bij Dienst Voorbeeld ingericht?', selections: keys},
      {key: 'roles', parent: 'central', text: 'Hoe zijn de verantwoordelijkheden voor beveiligingsactiviteiten en incidentmeldingen vastgelegd?', selections: keys.slice(0, 2)},
      {key: 'recovery', parent: 'central', text: 'Welke herstelafspraken zijn vastgelegd voor verstoringen van de digitale werkplek?', selections: [keys[2]]},
      {key: 'learning', parent: 'central', text: 'Hoe beschrijven medewerkers de samenwerking bij verstoringen?', selections: [keys[3]]},
    ];
    spec.interviewQuestions = [{selection: keys[0], level: 'operational', text: 'Kunt u beschrijven hoe u bij een verstoring handelt?'}];
    spec.export = {...spec.export, testingAspects: ['opzet', 'bestaan'], testingTerminology: 'obw',
      fontFamily: 'Calibri', fontSize: 12, accent: 'teal', colorMode: 'uniform',
      meta: {author: 'Fictieve auditor', team: 'Demoteam', scope: spec.intake.scope, version: '0.1'},
      interview: {levels: ['operational', 'management'], starr: false, triangulation: true}};

    await check('expanded framework and theme reads retain exact provenance without new write access', async () => {
      for (const kind of ['report', 'law', 'framework', 'model', 'theme'])
        assert(sources.sources.some(source => source.kind === kind), kind + ' must be represented');
      for (const source of sources.sources.filter(source => source.kind === 'framework')) {
        const results = await call('search_building_blocks', {sourceId: source.id, kind: 'framework', limit: 1});
        assert.equal(results.total, source.readableItems);
        const key = results.items[0].key, stored = index.get(key);
        const overview = await call('get_building_block', {key});
        assert.equal(overview.sourceId, source.id);
        assert.equal(overview.draftSelectable, false, 'Reading a framework does not enable the draft writer');
        for (const section of ['sourceText', 'trace']) {
          let offset = 0, text = '';
          do {
            const part = await call('get_building_block', {key, section, offset, limit: 1000});
            text += part.text; offset = part.nextOffset;
          } while (offset !== null);
          assert.equal(text, section === 'sourceText' ? stored.material.sourceText || '' :
            stored.material.topicalTrace || stored.material.readTrace || '', source.id + ' ' + section);
        }
        await rejected('prepare_research_draft', {...fixture([key]), consent: true}, /alleen leesbaar/);
      }
      const theme = sources.sources.find(source => source.kind === 'theme');
      const result = await call('search_building_blocks', {sourceId: theme.id, kind: 'theme', limit: 1});
      assert.equal(result.total, theme.readableItems);
      assert.equal(result.items[0].kind, 'report');
      assert(result.items[0].themes.some(item => item.id === theme.id));
      assert.equal((await call('get_building_block', {key: result.items[0].key})).sourceId, result.items[0].sourceId);
    });

    await check('malformed IDs, bounds and missing/false consent fail without output', async () => {
      const first = await call('search_building_blocks', {limit: 1});
      const second = await call('search_building_blocks', {limit: 1, offset: first.nextOffset});
      const combined = await call('search_building_blocks', {limit: 2});
      assert.deepEqual([...first.items, ...second.items], combined.items);
      for (const args of [{query: 'x'.repeat(501)}, {limit: 41}, {offset: -1}, {path: '../private'}])
        await rejected('search_building_blocks', args);
      for (const key of ['../private', 'not-a-building-block', 'x'.repeat(301)])
        await rejected('get_building_block', {key});
      await rejected('get_building_block', {key: keys[0], section: 'sourceText', offset: 1000000});
      await rejected('prepare_research_draft', spec, /consent/);
      await rejected('prepare_research_draft', {...spec, consent: false}, /consent/);
      await rejected('prepare_research_draft', {...spec, consent: true, selections: Array.from({length: 251}, (_, i) => ({key: 'synthetic|' + i, reason: 'test'}))});
      await rejected('prepare_research_draft', {...spec, consent: true, questions: Array(201).fill(spec.questions[0])});
      await rejected('prepare_research_draft', {...spec, consent: true, selections: [{key: 'not-released', reason: 'test'}]});
      await rejected('prepare_research_draft', {...spec, consent: true, sector: 'NOT_A_SECTOR'}, /Onbekende sector/);
      await rejected('export_research_draft', {draftId: '../private', consent: true});
      const error = await rejected('export_research_draft', {draftId: randomUUID(), consent: true}, /Onbekend lokaal concept/);
      assert(!error.includes(root));
    });

    await check('question precheck explains rejected proposals without publishing files', async () => {
      await rejected('prepare_research_draft', {...spec, consent: true,
        questions: [{...spec.questions[0], text: 'Hoe goed werkt de overdracht?'}]}, /sturend/);
      await rejected('prepare_research_draft', {...spec, consent: true,
        questions: [{...spec.questions[0], text: 'Hoe verloopt de overdracht'}]}, /geen-vraagteken/);
      await rejected('prepare_research_draft', {...spec, consent: true,
        interviewQuestions: [{selection: keys[0], level: 'operational', text: 'Heeft u een dossier?'}]}, /gesloten/);
    });

    await check('inconsistent questions, duplicate selections and model rewrites fail', async () => {
      await rejected('prepare_research_draft', {...spec, consent: true, selections: [...spec.selections, spec.selections[0]]});
      await rejected('prepare_research_draft', {...spec, consent: true, questions: [{key: 'central', text: 'Fictieve vraag?', selections: []}]}, /Koppel elke/);
      await rejected('prepare_research_draft', {...spec, consent: true, questions: [...spec.questions].reverse()}, /centrale vraag/);
      await rejected('prepare_research_draft', {...spec, consent: true, questions: [...spec.questions, {...spec.questions[0]}]}, /Dubbele/);
      await rejected('prepare_research_draft', {...spec, consent: true, questions: [{key: 'central', text: 'Fictieve vraag?', selections: ['not-selected']}]}, /niet gekozen bouwsteen/);
      await rejected('prepare_research_draft', {...spec, consent: true, interviewQuestions: [{selection: keys[3], level: entries[3].level, text: 'Overschreven modelvraag?'}]}, /Behoud de beoordeelde modelvraag/);
    });

    await check('real HOLD points and excluded WWKE sectors remain unselectable', async () => {
      const publication = JSON.parse(index.db.prepare('SELECT payload FROM runtime_publications WHERE release_id=? AND hash=?').get(pointer.release, pointer.publication).payload);
      const content = structuredClone(publication.modules['lib/wwke-content.mjs']);
      const filters = structuredClone(publication.modules['lib/wwke-reviewed/filters.json']);
      // Registered resource edits use the existing module data shape.
      for (const [id, target] of [['lib/wwke-content.mjs', content], ['lib/wwke-reviewed/filters.json', filters]])
        for (const key of publication.registrations[id] || [])
          applyCatalogueEdits(target, index.content(publication.refs[key]));
      const held = content.points.filter(p => p.selection_status === 'HOLD');
      assert(held.length, 'This collection must expose real HOLD evidence');
      const sourceId = entries[2].sourceId;
      for (const point of held) {
        const key = sourceId + '|' + point.id;
        const overview = await call('get_building_block', {key});
        assert.equal(overview.selectionStatus, 'HOLD');
        assert.equal(overview.selectionReason, point.selection_reason);
        assert.equal(overview.draftSelectable, false);
        await rejected('prepare_research_draft', {...fixture([key]), consent: true}, /alleen leesbaar/);
      }
      const excluded = filters.point_mappings.find(p => p.known_article23_excluded_sectors.length &&
        content.points.some(point => point.id === p.point_id && point.selection_status === 'SELECTABLE'));
      assert(excluded, 'This collection must expose a real sector exclusion');
      await rejected('prepare_research_draft', {...fixture([sourceId + '|' + excluded.point_id]),
        sector: excluded.known_article23_excluded_sectors[0], consent: true}, /Selectie niet toegestaan/);
    });

    for (const profile of ['testing', 'risk', 'interview']) await check(`${profile}: recover after errors; preserve project, links, source snapshots and Excel settings`, async () => {
      const input = {...spec, export: {...spec.export, profile}, consent: true};
      const prepared = await call('prepare_research_draft', input);
      const project = parseProjectText(readFileSync(prepared.projectPath, 'utf8'));
      const review = json(prepared.reviewPath);
      assert.equal(prepared.selectedItems, keys.length);
      assert.equal(project.draft.included.length, keys.length);
      assert.equal(project.draft.research.questions.length, spec.questions.length);
      assert.equal(project.draft.research.questions.filter(q => q.parent_id === null).length, 1);
      assert.equal(review.release, pointer.release);
      assert(!Object.hasOwn(review.spec, 'consent'), 'Old and new stored concept specs use the same format');
      for (const question of spec.questions) {
        const saved = project.draft.research.questions.find(q => q.id === review.questionMapping[question.key]);
        assert.equal(saved.text, question.text);
        assert.equal(saved.parent_id, question.parent ? review.questionMapping[question.parent] : null);
        for (const key of question.selections) assert(project.draft.research.links.some(link =>
          link.line_id === review.lineMapping[key] && link.question_id === saved.id));
      }
      for (const entry of entries) {
        const id = review.lineMapping[entry.key];
        const material = project.draft.investigation.materials.find(m => m.id === id);
        assert(project.draft.included.includes(id));
        assert(project.draft.notes[id].includes(entry.reason));
        for (const field of ['sourceText', 'sourceHash', 'edition', 'reportTrace'])
          assert.equal(material[field] || '', entry.material[field] || '', field + ' must preserve source evidence');
        if (entry.sourceId.startsWith('WWKE')) {
          const trace = JSON.parse(material.lawTrace);
          assert.equal(trace.assessment.mode, 'SELECTION');
          assert.equal(trace.assessment.scopeConfirmed, false);
          assert.equal(trace.assessment.sector, spec.sector);
          assert.deepEqual(trace.point, JSON.parse(entry.material.lawTrace).point);
        }
      }
      const settings = project.draft.exportSettings;
      for (const field of ['profile', 'fontFamily', 'fontSize', 'accent', 'colorMode', 'testingTerminology'])
        assert.equal(settings[field], input.export[field]);
      assert.deepEqual(settings.testingAspects, input.export.testingAspects);
      assert.deepEqual(settings.interview.levels, input.export.interview.levels);
      assert.equal(settings.meta.author, 'Fictieve auditor');
      const projectHash = hash(prepared.projectPath);
      await rejected('export_research_draft', {draftId: prepared.draftId}, /consent/);
      await rejected('export_research_draft', {draftId: prepared.draftId, consent: false}, /consent/);
      const exported = await call('export_research_draft', {draftId: prepared.draftId, consent: true});
      const workbook = unzipSync(readFileSync(exported.path));
      assert(workbook['xl/workbook.xml']);
      const styles = strFromU8(workbook['xl/styles.xml']);
      assert(styles.includes('Calibri'));
      assert(styles.includes('087B76'));
      assert(styles.includes('val="12"'));
      const xml = Object.entries(workbook).filter(([name]) => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
        .map(([, bytes]) => strFromU8(bytes)).join('\n');
      for (const question of spec.questions) assert(xml.includes(question.text), 'Question text must reach workbook');
      assert(xml.includes('Fictieve auditor'));
      assert(xml.includes('Demoteam'));
      const repeated = await call('export_research_draft', {draftId: prepared.draftId, consent: true});
      assert.notEqual(repeated.path, exported.path);
      assert.equal(hash(exported.path), exported.sha256);
      assert.equal(hash(prepared.projectPath), projectHash);
      artifacts.push({profile, ...prepared, excelPath: exported.path, projectSha256: projectHash});
    });

    await check('modified/missing concept files fail safely and recover without overwriting', async () => {
      assert.equal(artifacts.length, 3);
      const item = artifacts[0], original = readFileSync(item.projectPath, 'utf8');
      try {
        writeFileSync(item.projectPath, original + ' ');
        await rejected('export_research_draft', {draftId: item.draftId, consent: true}, /projectbestand is gewijzigd/);
      } finally { writeFileSync(item.projectPath, original); }
      const heldPath = item.reviewPath + '.test-held';
      renameSync(item.reviewPath, heldPath);
      try {
        const error = await rejected('export_research_draft', {draftId: item.draftId, consent: true}, /Lokale bestandsactie mislukt/);
        assert(!error.includes(root));
      } finally { renameSync(heldPath, item.reviewPath); }
      await call('export_research_draft', {draftId: item.draftId, consent: true});
      assert.equal(hash(item.projectPath), item.projectSha256);
      assert.equal(new Set(artifacts.map(a => a.draftId)).size, artifacts.length);
      assert.equal(new Set(artifacts.map(a => a.projectPath)).size, artifacts.length);
    });
    assert.equal(failures, 0, 'Do not publish an evidence summary when any protocol check failed');
    const evidence = {createdAt: new Date().toISOString(), transport: 'stdio', server: 'omnibus-local/0.2.0', release: guide.release,
      publication: guide.publication, sourceCount: sources.sources.length,
      reportCount: sources.sources.filter(s => s.kind === 'report').length,
      selectableItems: sources.sources.filter(s => s.kind !== 'theme').reduce((n, s) => n + s.selectableItems, 0),
      selectedKeys: keys, questions: spec.questions.length, artifacts};
    writeFileSync(join(output, 'protocol-demo-' + randomUUID() + '.json'), JSON.stringify(evidence, null, 2), {flag: 'wx'});
  } finally {
    await client.close();
    index.close();
    assert.equal(hash(database), before, 'The pinned source/index database must remain byte-identical');
  }
});
