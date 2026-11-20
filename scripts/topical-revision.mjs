#!/usr/bin/env node
// Beoordeelde tekstcorrecties op de Topical-bronpakketten in een kopie van de database zetten (B-094).
// Zie docs/beheer/inhoud-corrigeren.md.
//
//   npm run content:revise -- --settings <map>/local-build.json --request <verzoek.json> --review <review.json> (--check | --out <nieuwe map>)
//
// De invoerdatabase blijft onveranderd; de nieuwe database wordt niet automatisch in gebruik genomen.
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {publishRuntime} from '../local-data/runtime-publication.mjs';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {checkRuntimeDatabase} from './check-runtime-database.mjs';
import {readSettings} from './topic-package.mjs';
import {prepareTopicalRevision, sha256} from '../content-tools/topical-revision.mjs';
import {packTopicalDelivery} from '../content-tools/topical-delivery.mjs';
import {digest} from '../content-tools/identity.mjs';

const MODULE = 'lib/topical-reviewed.json';
const usage = 'Gebruik: npm run content:revise -- --settings <local-build.json> --request <verzoek.json> --review <review.json> (--check | --out <nieuwe map>)\n       npm run content:revise -- --settings <local-build.json> --pack --out <nieuwe map>';

/** De publicatie en de Topical-pakketten met al hun geladen gegevens, zoals de app ze na het laden heeft. */
export function readHydratedTopical(settings) {
  const db = new DatabaseSync(settings.database, {readOnly: true});
  try {
    const row = db.prepare('select payload from runtime_publications where release_id = ? and hash = ?').get(settings.release, settings.publication);
    if (!row) throw Error('De publicatie uit de instellingen staat niet in deze database.');
    const value = JSON.parse(String(row.payload)), topical = structuredClone(value.modules[MODULE]);
    const resource = db.prepare('select payload from web_resources where release_id = ? and hash = ?');
    for (const key of value.registrations[MODULE] ?? []) {
      const edits = JSON.parse(String(resource.get(settings.release, value.refs[key].hash).payload)).filter(edit => edit.path[0] === 'packages' || edit.path[0] === 'textRevisions');
      applyCatalogueEdits(topical, edits);
    }
    return {value, topical};
  } finally { db.close(); }
}

/** Herverpak de Topical-module in deze database (nieuwe resources erbij; bestaande blijven). */
export function packWith(repository, value, textRevisions) {
  const select = repository.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?');
  const insert = repository.db.prepare('INSERT OR IGNORE INTO web_resources VALUES(?,?,?)');
  return packTopicalDelivery(value, {textRevisions,
    read: hash => String(select.get(value.release, hash).payload),
    write: payload => { const hash = digest(payload); insert.run(value.release, hash, payload); return hash; }});
}

/** Alleen herverpakken: dezelfde inhoud, een kleinere levering aan de browser. */
export function runTopicalPack({settings: file, out}) {
  const settings = readSettings(file), target = resolve(out);
  if (existsSync(target)) throw Error(`De uitvoermap bestaat al: ${target}. Kies een nieuwe map.`);
  mkdirSync(target, {recursive: true});
  const database = join(target, 'catalogue.sqlite');
  copyFileSync(settings.database, database);
  const repository = new CatalogueRepository(database);
  let publication, report;
  try {
    const value = JSON.parse(String(repository.db.prepare('SELECT payload FROM runtime_publications WHERE release_id = ? AND hash = ?').get(settings.release, settings.publication).payload));
    let packed; ({value: packed, report} = packWith(repository, value));
    publication = publishRuntime(repository, packed, {release: value.release, contract: value.contract}); repository.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } finally { repository.close(); }
  checkRuntimeDatabase({database, release: settings.release, publication});
  writeFileSync(join(target, 'local-build.json'), JSON.stringify({database: 'catalogue.sqlite', release: settings.release, publication}, null, 2) + '\n');
  return {status: 'PACKED', ...report, from: settings.publication, to: publication};
}

export function runTopicalRevision(options) {
  const settings = readSettings(options.settings);
  const requestRaw = readFileSync(options.request, 'utf8'), reviewRaw = readFileSync(options.review, 'utf8');
  const {value, topical} = readHydratedTopical(settings);
  const prepared = prepareTopicalRevision(topical, requestRaw, reviewRaw);
  if (prepared.status !== 'READY') return prepared;
  if (options.check) return {status: 'CHECKED', edits: prepared.edits, changedPoints: prepared.changedPoints.length, transitions: prepared.textRevisions.transitions.length};
  const target = resolve(options.out);
  if (existsSync(target)) throw Error(`De uitvoermap bestaat al: ${target}. Kies een nieuwe map.`);
  mkdirSync(target, {recursive: true});
  const database = join(target, 'catalogue.sqlite');
  copyFileSync(settings.database, database);
  const repository = new CatalogueRepository(database);
  let publication, delivery;
  try {
    ({value: delivery} = packWith(repository, value, prepared.textRevisions));
    publication = publishRuntime(repository, delivery, {release: value.release, contract: value.contract}); repository.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } finally { repository.close(); }
  const verified = checkRuntimeDatabase({database, release: settings.release, publication});
  writeFileSync(join(target, 'local-build.json'), JSON.stringify({database: 'catalogue.sqlite', release: settings.release, publication}, null, 2) + '\n');
  const receipt = {status: 'REVISED', edition: JSON.parse(requestRaw).edition, requestSha256: sha256(requestRaw), reviewSha256: sha256(reviewRaw),
    edits: prepared.edits, changedPoints: prepared.changedPoints, transitions: prepared.textRevisions.transitions.length,
    from: {release: settings.release, publication: settings.publication}, to: {release: settings.release, publication, contract: verified.contract},
    note: 'Lokaal gemaakt; niet in gebruik genomen. Test in een aparte build.'};
  writeFileSync(join(target, 'revision-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
  const options = {settings: get('--settings'), request: get('--request'), review: get('--review'), out: get('--out'), check: args.includes('--check'), pack: args.includes('--pack')};
  if (options.pack ? !options.settings || !options.out : !options.settings || !options.request || !options.review || (!options.out === !options.check)) { console.error(usage); process.exit(2); }
  try {
    const result = options.pack ? runTopicalPack(options) : runTopicalRevision(options);
    const shown = result.changedPoints ? {...result, changedPoints: result.changedPoints.length} : result;
    console.log(JSON.stringify(shown, null, 1)); process.exit(result.status === 'HOLD' ? 1 : 0);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(2); }
}
