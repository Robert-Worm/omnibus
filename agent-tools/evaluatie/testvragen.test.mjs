// Zonder echte database: vaste vragen en releaseblokkade met fictieve gegevens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {TESTVRAGEN} from './testvragen.mjs';
import {controleer,vraagpakket} from './controleer-testvragen.mjs';
import {createIndex, insertEntry} from '../index-store.mjs';
import {evaluationIdentity, assertEvaluationIdentity, digest} from './basis.mjs';
import {workflowGuide} from '../guidance.mjs';

test('tien vragen, elk met hulpmiddelen, antwoord en controle', () => {
  assert.equal(TESTVRAGEN.length, 10);
  assert.equal(new Set(TESTVRAGEN.map(v => v.id)).size, 10);
  const tools = ['get_workflow_guide', 'list_sources', 'search_building_blocks', 'get_building_block', 'prepare_research_draft', 'export_research_draft'];
  for (const v of TESTVRAGEN) {
    assert.ok(v.vraag.endsWith('?') && v.antwoord && typeof v.controle === 'function', v.id);
    assert.ok(v.hulpmiddelen.length && v.hulpmiddelen.every(h => tools.includes(h)), v.id);
  }
});

test('the evaluator prompt exposes questions and tools, never answers or check functions',()=>{
  const input=[{id:'F01',vraag:'Welke fictieve waarde?',hulpmiddelen:['list_sources'],antwoord:'SECRET_EXPECTATION',controle:()=>true}];
  const value=vraagpakket(input);
  assert.deepEqual(value,[{id:'F01',vraag:'Welke fictieve waarde?',hulpmiddelen:['list_sources']}]);
  value[0].hulpmiddelen.push('get_building_block');
  assert.equal(input[0].hulpmiddelen.length,1);
  assert(!JSON.stringify(vraagpakket(input)).includes('SECRET_EXPECTATION'));
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
    for (const file of ['agent-tools/evaluatie/controleer-testvragen.mjs', 'agent-tools/evaluatie/basis.mjs', 'agent-tools/index-store.mjs', 'agent-tools/guidance.mjs'])
      fs.copyFileSync(join(root, file), join(directory, file));
    fs.writeFileSync(join(directory, 'agent-tools/evaluatie/testvragen.mjs'), `
      export const RELEASE = '${'a'.repeat(64)}';
      export const TESTVRAGEN = [
        {id: 'F01', vraag: 'Hoeveel fictieve punten?', hulpmiddelen: ['list_sources'], antwoord: 'ONLY_FOR_REVIEWER', controle: i => i.aantal('FICTIEF') === 1},
        {id: 'F02', vraag: 'Welke fictieve titel?', hulpmiddelen: ['get_building_block'], antwoord: 'ONLY_FOR_REVIEWER', controle: i => i.bouwsteen('FICTIEF|P1').material.title === 'Oefening'}
      ];
    `);
    for (const release of ['a'.repeat(64), 'b'.repeat(64)]) {
      const build = join(directory, 'agent-build', release);
      fs.mkdirSync(build);
      const db = new DatabaseSync(join(build, 'catalogue.sqlite'));
      let publication;
      try {
        createIndex(db, release);
        insertEntry(db, {key: 'FICTIEF|P1', kind: 'report', sourceId: 'FICTIEF', sourceTitle: 'Fictief rapport', material: {title: 'Oefening', body: 'Fictief feit.'}});
        publication = addSyntheticPublication(db,release);
        if(release.startsWith('a')) fs.writeFileSync(join(directory,'agent-tools/evaluatie/testbasis.mjs'),
          'export default '+JSON.stringify(evaluationIdentity({db,release},{release,publication},
            fs.readFileSync(join(directory,'agent-tools/evaluatie/testvragen.mjs')),workflowGuide))+';');
      } finally { db.close(); }
      fs.writeFileSync(join(directory, 'agent-build/current.json'), JSON.stringify({release, publication, directory: build}));
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
      const prompt=spawnSync(process.execPath,[join(directory,'agent-tools/evaluatie/controleer-testvragen.mjs'),'--vragen'],{encoding:'utf8',timeout:10000});
      assert.ifError(prompt.error);
      if(release.startsWith('a')) {
        assert.equal(prompt.status,0,prompt.stderr);
        assert.equal(JSON.parse(prompt.stdout).vragen.length,2);
        assert(!prompt.stdout.includes('ONLY_FOR_REVIEWER'));
      } else {
        assert.equal(prompt.status,2,prompt.stderr);
        assert.equal(prompt.stdout,'','No stale question packet');
      }
    }
  } finally {
    const actual = fs.realpathSync(directory), rel = relative(fs.realpathSync(scratch), actual);
    assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Alleen eigen testmap opruimen');
    fs.rmSync(actual, {recursive: true});
  }
});

function addSyntheticPublication(db, release) {
  const payload=JSON.stringify({format:'omnibus-runtime-publication',schemaVersion:1,release,
    contentGate:'VERIFIED_APPLICATION_RELEASE',refs:{}});
  db.exec('CREATE TABLE runtime_publications(release_id TEXT,hash TEXT,payload TEXT)');
  db.prepare('INSERT INTO runtime_publications VALUES(?,?,?)').run(release,digest(payload),payload);
  return digest(payload);
}

test('the binding covers source context, lookup columns, search text, publication, questions and guide',()=>{
  const db=new DatabaseSync(':memory:'),release='a'.repeat(64);
  try {
    createIndex(db,release);
    insertEntry(db,{key:'FICTIEF|P1',kind:'report',sourceId:'FICTIEF',sourceTitle:'Fictief',
      material:{title:'Oefening',body:'Gelijk antwoord',sourceText:'Fictief bewijs',sourceContext:'Fictieve beperking'}});
    const pointer={release,publication:addSyntheticPublication(db,release)},index={db,release};
    const capture=(questions='question\n',guide={consent:true})=>evaluationIdentity(index,pointer,questions,guide);
    const expected=capture();
    assertEvaluationIdentity(expected,capture());
    assertEvaluationIdentity(expected,capture('question\r\n'));
    for(const mutate of [
      ()=>{const row=db.prepare('SELECT payload FROM agent_items').get();const entry=JSON.parse(row.payload);
        entry.material.sourceContext='Andere beperking';const payload=JSON.stringify(entry);
        db.prepare('UPDATE agent_items SET payload=?,sha256=?').run(payload,digest(payload));},
      ()=>db.exec("UPDATE agent_items SET source_title='Andere bron'"),
      ()=>db.exec("UPDATE agent_search SET text='Ander zoekresultaat'"),
      ()=>insertEntry(db,{key:'FICTIEF|P2',kind:'report',sourceId:'FICTIEF',sourceTitle:'Fictief',material:{title:'Nieuw'}}),
    ]) {
      db.exec('BEGIN');
      try {mutate();assert.throws(()=>assertEvaluationIdentity(expected,capture()),/HOLD:.*(items|indexSha256)/);}
      finally {db.exec('ROLLBACK');}
    }
    assert.throws(()=>assertEvaluationIdentity(expected,capture('other question')),/HOLD:.*questionsSha256/);
    assert.throws(()=>assertEvaluationIdentity(expected,capture('question\n',{consent:false})),/HOLD:.*guideSha256/);
    assert.throws(()=>evaluationIdentity(index,{...pointer,publication:'b'.repeat(64)},'question\n',{}),/HOLD:.*publicatie/);
    assert.throws(()=>assertEvaluationIdentity({},expected),/HOLD:.*onvolledige basis/);
    db.exec("UPDATE agent_items SET payload='{}'");
    assert.throws(()=>capture(),/HOLD:.*integriteit/);
  } finally {db.close();}
});

test('modified publication bytes and missing delivery resources cannot pass a binding',()=>{
  const db=new DatabaseSync(':memory:'),release='c'.repeat(64);
  try {
    createIndex(db,release);
    const pointer={release,publication:addSyntheticPublication(db,release)};
    db.exec("UPDATE runtime_publications SET payload='{}'");
    assert.throws(()=>evaluationIdentity({db,release},pointer,'questions',{}),/HOLD:.*publicatie/);
    const payload=JSON.stringify({format:'omnibus-runtime-publication',schemaVersion:1,release,
      contentGate:'VERIFIED_APPLICATION_RELEASE',refs:{missing:{release,hash:'d'.repeat(64),bytes:3}}});
    db.prepare('UPDATE runtime_publications SET payload=?,hash=?').run(payload,digest(payload));
    pointer.publication=digest(payload);
    assert.throws(()=>evaluationIdentity({db,release,content:()=>{throw Error('missing delivery resource');}},pointer,'questions',{}),/missing delivery/);
  } finally {db.close();}
});
