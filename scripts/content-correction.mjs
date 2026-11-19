#!/usr/bin/env node
// Inhoudscorrectie in een kopie van de database (B-083). Een correctiebestand buiten Git noemt per wijziging de module
// van de publicatie, het pad naar het veld, de oude tekst, de nieuwe tekst en de reden. Het hulpmiddel weigert als de oude
// tekst niet precies klopt, zodat een correctie nooit stil iets anders overschrijft. De invoerdatabase blijft onveranderd.
//
//   npm run content:correct -- --settings <map>/local-build.json --corrections <correcties.json> --out <nieuwe map>
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {publishRuntime} from '../local-data/runtime-publication.mjs';
import {checkRuntimeDatabase} from './check-runtime-database.mjs';
import {readSettings} from './topic-package.mjs';
import {topicHash} from '../content-tools/topic-package.mjs';

export const CORRECTION_FORMAT = 'omnibus-content-correction';

/** Past de correcties toe op een publicatie (in het geheugen). Geeft de problemen terug; zonder problemen is value aangepast. */
export function applyCorrections(value, corrections) {
  const problems = [];
  if (corrections?.format !== CORRECTION_FORMAT || !/^\d{8}\.\d{2}$/u.test(corrections.edition || '') || !Array.isArray(corrections.items) || !corrections.items.length)
    return [`Geen correctiebestand (format ${CORRECTION_FORMAT}, edition zoals 20261119.01, items).`];
  for (const [index, item] of corrections.items.entries()) {
    const where = `Correctie ${index + 1}`;
    if (!item || typeof item.module !== 'string' || !Array.isArray(item.path) || !item.path.length || typeof item.from !== 'string' || typeof item.to !== 'string' || !String(item.reason || '').trim()) {
      problems.push(`${where}: module, path, from, to en reason zijn nodig.`); continue;
    }
    let parent = value.modules?.[item.module];
    for (const key of item.path.slice(0, -1)) parent = parent?.[key];
    const key = item.path.at(-1);
    if (!parent || typeof parent !== 'object' || !Object.hasOwn(parent, key)) { problems.push(`${where}: het veld ${item.module} › ${item.path.join(' › ')} bestaat niet.`); continue; }
    if (parent[key] === item.to) continue;
    if (parent[key] !== item.from) { problems.push(`${where}: de oude tekst klopt niet met de database.`); continue; }
    parent[key] = item.to;
  }
  return problems;
}

export function runCorrection({settings: settingsFile, corrections: file, out}) {
  const settings = readSettings(settingsFile), raw = readFileSync(file, 'utf8'), corrections = JSON.parse(raw);
  const target = resolve(out);
  if (existsSync(target)) throw Error(`De uitvoermap bestaat al: ${target}. Kies een nieuwe map.`);
  const source = new CatalogueRepository(settings.database);
  let value;
  try { value = JSON.parse(String(source.db.prepare('SELECT payload FROM runtime_publications WHERE release_id = ? AND hash = ?').get(settings.release, settings.publication).payload)); }
  finally { source.close(); }
  const problems = applyCorrections(value, corrections);
  if (problems.length) return {status: 'HOLD', problems};
  mkdirSync(target, {recursive: true});
  const database = join(target, 'catalogue.sqlite');
  copyFileSync(settings.database, database);
  const repository = new CatalogueRepository(database);
  let publication;
  try { publication = publishRuntime(repository, value, {release: value.release, contract: value.contract}); repository.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); }
  finally { repository.close(); }
  const verified = checkRuntimeDatabase({database, release: settings.release, publication});
  writeFileSync(join(target, 'local-build.json'), JSON.stringify({database: 'catalogue.sqlite', release: settings.release, publication}, null, 2) + '\n');
  const receipt = {status: 'CORRECTED', edition: corrections.edition, correctionSha256: topicHash(raw), items: corrections.items.length,
    from: {release: settings.release, publication: settings.publication}, to: {release: settings.release, publication, contract: verified.contract},
    note: 'Lokaal gemaakt; niet in gebruik genomen. Test in een aparte build.'};
  writeFileSync(join(target, 'correction-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), get = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
  const options = {settings: get('--settings'), corrections: get('--corrections'), out: get('--out')};
  if (!options.settings || !options.corrections || !options.out) { console.error('Gebruik: npm run content:correct -- --settings <local-build.json> --corrections <correcties.json> --out <nieuwe map>'); process.exit(2); }
  try { const result = runCorrection(options); console.log(JSON.stringify(result, null, 1)); process.exit(result.status === 'HOLD' ? 1 : 0); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(2); }
}
