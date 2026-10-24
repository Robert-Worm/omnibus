import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {claimsUit, leesOpties, rapport, scan, scanDatabase} from './check-certainty.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
const work = join(root,'work');
mkdirSync(work,{recursive:true});
const tijdelijkeMap = () => mkdtempSync(join(work,'certainty-test-'));
const release = 'a'.repeat(64), andereRelease = 'b'.repeat(64);
const rec = (kind,id,data) => ({kind,id,payload:{data}});
const bewijs = rec('evidence','E1',{quote:'De bewaartermijn bedraagt 30 dagen.'});
const norm = rec('norm','N1',{criterion:{text:'De bewaartermijn bedraagt 7 dagen.', evidence_ids:['E1']}});

function databaseFixture(dir) {
  const bestand = join(dir,'synthetic.sqlite');
  const db = new DatabaseSync(bestand);
  db.exec(`CREATE TABLE releases(id TEXT PRIMARY KEY);
    CREATE TABLE packages(version TEXT PRIMARY KEY,source_id TEXT,kind TEXT);
    CREATE TABLE release_packages(release_id TEXT,version TEXT);
    CREATE TABLE records(version TEXT,kind TEXT,id TEXT,position INTEGER,payload TEXT);`);
  db.exec('BEGIN');
  for (const r of [release,andereRelease]) db.prepare('INSERT INTO releases VALUES(?)').run(r);
  for (const [version,source,r,rows] of [
    ['v1','SYNTHETIC',release,[norm,bewijs]],
    ['v2','SYNTHETIC',andereRelease,[rec('norm','N-OLD',{criterion:{text:'PRIVATE_OLD_SENTINEL 99 dagen.', evidence_ids:['E1']}}),bewijs]],
  ]) {
    db.prepare('INSERT INTO packages VALUES(?,?,?)').run(version,source,'report');
    db.prepare('INSERT INTO release_packages VALUES(?,?)').run(r,version);
    rows.forEach((row,i) => db.prepare('INSERT INTO records VALUES(?,?,?,?,?)').run(version,row.kind,row.id,i,JSON.stringify(row.payload)));
  }
  db.exec('COMMIT');
  db.close();
  return bestand;
}
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');

test('verplicht expliciete pins en verwerpt onbekende, dubbele of ontbrekende opties', () => {
  assert.deepEqual(leesOpties(['--database','x.sqlite','--release',release,'--uit','work/x.md']), {database:'x.sqlite',release,uit:'work/x.md'});
  for (const args of [[],['--database','x'],['--release','latest'],['--met-tekst'],['--database','x','--database','y']]) assert.throws(() => leesOpties(args));
});

test('bindt rapportnormen en varianten, kaderpunten en inline snapshots zonder een brede fallback', () => {
  const records = [norm,bewijs,
    rec('source-link','M1',{quote:'De reactietermijn bedraagt 4 dagen.'}),
    rec('point','P1',{text:'De reactietermijn bedraagt 4 dagen.', source_links:[{material_id:'M1',evidence_id:'E1'}], generic_variant:{text:'De reactietermijn bedraagt 5 dagen.'}}),
    rec('source-link','S1',{source_spans:[{quote:'De termijn bedraagt 6 dagen.'}]}),
    rec('norm','N2',{text:'De termijn bedraagt 6 dagen.',source_record_ids:['S1']}),
    rec('point','P2',{text:'De termijn bedraagt 6 dagen.',source_links:[{record_id:'S1'}]}),
    rec('norm','N3',{auditNorm:'De termijn bedraagt 9 dagen.',sourceText:'De termijn bedraagt 9 dagen.',sourceHash:'hash',sourceControlId:'C1'}),
    rec('norm','N4',{criterion:{text:'De termijn bedraagt 9 dagen.',evidence_ids:['MISSING']}}),
  ];
  const {claims,ongedekteRecords} = claimsUit(records);
  assert.equal(ongedekteRecords,0);
  assert.equal(claims.length,7);
  assert.deepEqual(claims[1].passages.map(p => p.id),['M1']);
  assert.deepEqual(claims[2].passages,claims[1].passages);
  assert.deepEqual(claims[3].passages.map(p => p.id),['S1/span-1']);
  assert.deepEqual(claims[5].passages.map(p => p.id),['C1']);
  assert.equal(claims[6].ontbrekendeBinding,true);
  assert.deepEqual(claims[6].passages,[]);
});

test('lege, onbekende en dubbelzinnige bindingen worden niet groen verklaard', () => {
  const result = scan([{bron:'X',versie:'v',records:[
    rec('norm','unsupported',{body:'Niet ondersteund'}),
    rec('norm','no-source',{text:'De registratie is volledig.'}),
    rec('norm','ambiguous',{criterion:{text:'De registratie is volledig.',evidence_ids:['D']}}),
    rec('evidence','D',{quote:'Eerste versie'}),rec('source-link','D',{quote:'Andere versie'}),
  ]}])[0];
  assert.equal(result.ongedekteRecords,1);
  assert.deepEqual(result.claims.map(c => c.uitkomst),['NIET_BEOORDEELD','HOLD']);
});

test('pin-isolatie, alleen lezen en tekstvrije rapportage via echte SQLite-invoer', async () => {
  const dir = tijdelijkeMap(), bestand = databaseFixture(dir), before = digest(bestand);
  const result = await scanDatabase(bestand,release);
  assert.equal(digest(bestand),before);
  assert.equal(result.length,1);
  assert.equal(result[0].claims.length,1);
  assert.equal(result[0].claims[0].uitkomst,'HOLD');
  const report = rapport(result,release);
  assert.match(report,/## SYNTHETIC/);
  assert.match(report,/tegenstrijdige-getallen/);
  assert.doesNotMatch(report,/bewaartermijn|PRIVATE_OLD_SENTINEL|\.sqlite|30 dagen|7 dagen/);
  await assert.rejects(scanDatabase(bestand,'c'.repeat(64)),/Onbekende release/);
});

test('CLI schrijft uitsluitend nieuw privaat rapport en overschrijft niets', () => {
  const dir = tijdelijkeMap(), database = databaseFixture(dir), before = digest(database);
  const uit = join(dir,'report.md');
  const run = target => spawnSync(process.execPath,['scripts/check-certainty.mjs','--database',database,'--release',release,'--uit',target],{cwd:root,encoding:'utf8'});
  const first = run(uit);
  assert.equal(first.status,2,first.stderr);
  const saved = digest(uit);
  assert.equal(run(uit).status,1);
  assert.equal(digest(uit),saved);
  assert.equal(run(database).status,1);
  assert.equal(run(resolve(root,'certainty-public.md')).status,1);
  assert.equal(digest(database),before);
});

test('fouten en onbetrouwbare ID-velden lekken geen payload of uitvoerbare markup', () => {
  const result = scan([{bron:'<script>PRIVATE_ID</script>',versie:'C:/PRIVATE_LOCATION',records:[
    rec('norm','<b>PRIVATE_RECORD</b>',{text:'PRIVATE_CLAIM_SENTINEL 17 dagen.',source_record_ids:['not-found']}),
  ]}]);
  assert.doesNotMatch(rapport(result,release),/PRIVATE_|<script>|<b>/);
  const dir = tijdelijkeMap(), bestand = databaseFixture(dir);
  const db = new DatabaseSync(bestand);
  db.prepare('UPDATE records SET payload=? WHERE version=? AND kind=?').run('PRIVATE_BROKEN_JSON','v1','norm');
  db.close();
  const run = spawnSync(process.execPath,['scripts/check-certainty.mjs','--database',bestand,'--release',release,'--uit',join(dir,'error.md')],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,1);
  assert.doesNotMatch(run.stderr + run.stdout,/PRIVATE_BROKEN_JSON/);
});

test('pakketcode blijft onuitgevoerde invoer en variantbinding heeft voorrang', async () => {
  const dir = tijdelijkeMap(), bestand = databaseFixture(dir), marker = join(dir,'executed.txt');
  const db = new DatabaseSync(bestand);
  const payload = {...norm.payload, code:`require('node:fs').writeFileSync(${JSON.stringify(marker)},'executed')`};
  db.prepare('UPDATE records SET payload=? WHERE version=? AND kind=?').run(JSON.stringify(payload),'v1','norm');
  db.close();
  await scanDatabase(bestand,release);
  assert.equal(existsSync(marker),false);
  const {claims} = claimsUit([bewijs, rec('source-link','M1',{quote:'Andere passage'}),
    rec('point','P',{text:'Punt',source_links:[{material_id:'M1'}],generic_variant:{text:'Variant',evidence_ids:['E1']}})]);
  assert.deepEqual(claims[1].passages.map(p => p.id),['E1']);
});

test('uitvoermap kan niet via een junction of symlink uit work ontsnappen', t => {
  const dir = tijdelijkeMap(), bestand = databaseFixture(dir), junction = join(dir,'outside');
  try { symlinkSync(root,junction,process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM','EACCES'].includes(error.code)) return t.skip('Geen rechten om directorylink voor negatieve test te maken.'); throw error; }
  const run = spawnSync(process.execPath,['scripts/check-certainty.mjs','--database',bestand,'--release',release,'--uit',join(junction,'certainty-escape.md')],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,1);
  assert.equal(existsSync(join(root,'certainty-escape.md')),false);
});
