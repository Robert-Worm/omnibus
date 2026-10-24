// Zonder echte database: vaste vragen en releaseblokkade met fictieve gegevens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {TESTVRAGEN} from './testvragen.mjs';
import {controleer} from './controleer-testvragen.mjs';
import {createIndex, insertEntry} from '../index-store.mjs';

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

test('CLI: gelijke aantallen en feiten geven bij een andere release toch HOLD', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const scratch = resolve(root, 'work/evaluation-release');
  fs.mkdirSync(scratch, {recursive: true});
  const directory = fs.mkdtempSync(join(scratch, 'fixture-'));
  try {
    for (const part of ['agent-tools/evaluatie', 'agent-build']) fs.mkdirSync(join(directory, part), {recursive: true});
    for (const file of ['agent-tools/evaluatie/controleer-testvragen.mjs', 'agent-tools/index-store.mjs', 'agent-tools/guidance.mjs'])
      fs.copyFileSync(join(root, file), join(directory, file));
    fs.writeFileSync(join(directory, 'agent-tools/evaluatie/testvragen.mjs'), `
      export const RELEASE = '${'a'.repeat(64)}';
      export const TESTVRAGEN = [
        {id: 'F01', controle: i => i.aantal('FICTIEF') === 1},
        {id: 'F02', controle: i => i.bouwsteen('FICTIEF|P1').material.title === 'Oefening'}
      ];
    `);
    for (const release of ['a'.repeat(64), 'b'.repeat(64)]) {
      const build = join(directory, 'agent-build', release);
      fs.mkdirSync(build);
      const db = new DatabaseSync(join(build, 'catalogue.sqlite'));
      try {
        createIndex(db, release);
        insertEntry(db, {key: 'FICTIEF|P1', kind: 'report', sourceId: 'FICTIEF', sourceTitle: 'Fictief rapport', material: {title: 'Oefening', body: 'Fictief feit.'}});
      } finally { db.close(); }
      fs.writeFileSync(join(directory, 'agent-build/current.json'), JSON.stringify({release, directory: build}));
      const run = spawnSync(process.execPath, [join(directory, 'agent-tools/evaluatie/controleer-testvragen.mjs')], {encoding: 'utf8', timeout: 10000});
      assert.ifError(run.error);
      if (release.startsWith('a')) {
        assert.equal(run.status, 0, run.stderr);
        assert.match(run.stdout, /Alle testvragen kloppen/);
      } else {
        assert.equal(run.status, 2, run.stderr);
        assert.match(run.stderr, /HOLD:.*release/);
        assert.equal(run.stdout, '', 'Geen vraaguitslagen of succesmelding voor een andere release');
      }
    }
  } finally {
    const actual = fs.realpathSync(directory), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Alleen eigen testmap opruimen');
    fs.rmSync(actual, {recursive: true});
  }
});
