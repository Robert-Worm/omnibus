#!/usr/bin/env node
// Onderwerppakket controleren en in een kopie van de database zetten (B-079). Zie docs/beheer/onderwerpen-publiceren.md.
//
//   npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --check
//   npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --dossiers <nieuwe map>
//   npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --out <nieuwe map>
//
// --check     controleert alleen; schrijft niets.
// --dossiers  maakt per plan een reviewdossier (vóór of na een wijziging); reviewbesluiten zijn dan nog niet nodig.
// --out       controleert alles, ook de reviews, en maakt een nieuwe database met de familie en haar vraagplannen.
// De invoerdatabase blijft onveranderd; de nieuwe database wordt niet automatisch in gebruik genomen.
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {publishRuntime} from '../local-data/runtime-publication.mjs';
import {checkRuntimeDatabase} from './check-runtime-database.mjs';
import {applyTopicPackageToPublication, checkTopicPackage, publishableTopicPlans, readTopicRuntime, topicDossier, topicHash} from '../content-tools/topic-package.mjs';

const usage = 'Gebruik: npm run content:topics -- --settings <local-build.json> --package <pakket.json> (--check | --dossiers <nieuwe map> | --out <nieuwe map>)';

export function parseTopicArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--check') { options.check = true; continue; }
    if (!['--settings', '--package', '--dossiers', '--out'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) throw Error(usage);
    options[flag.slice(2)] = args[++i];
  }
  const modes = ['check', 'dossiers', 'out'].filter(key => options[key]);
  if (!options.settings || !options.package || modes.length !== 1) throw Error(usage);
  return options;
}

export function readSettings(file) {
  const settings = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/u, ''));
  if (!/^[a-f0-9]{64}$/u.test(settings.release || '') || !/^[a-f0-9]{64}$/u.test(settings.publication || '') || !settings.database) throw Error('Ongeldige instellingen: database, release en publication zijn nodig.');
  return {database: resolve(dirname(file), settings.database), release: settings.release, publication: settings.publication};
}

export function runTopicPackage(options) {
  const settings = readSettings(options.settings), raw = readFileSync(options.package, 'utf8'), pkg = JSON.parse(raw);
  const runtime = readTopicRuntime(settings.database, settings, (pkg.family?.sources ?? []).map(source => source.id));
  const checked = checkTopicPackage(pkg, runtime, {reviews: !options.dossiers});
  if (checked.problems.length) return {status: 'HOLD', problems: checked.problems};
  if (options.check) return {status: 'CHECKED', family: pkg.family.id, plans: checked.plans.length, normen: Object.keys(pkg.family.index.norms).length};
  const target = resolve(options.dossiers || options.out);
  if (existsSync(target)) throw Error(`De uitvoermap bestaat al: ${target}. Kies een nieuwe map.`);
  mkdirSync(target, {recursive: true});
  if (options.dossiers) {
    for (const built of checked.plans) writeFileSync(join(target, `dossier-${built.entry.id}.json`), JSON.stringify(topicDossier(built, built.inventory, built.design), null, 1));
    return {status: 'DOSSIERS', folder: target, plans: checked.plans.map(built => ({id: built.entry.id, itemHash: built.itemHash, vragen: built.questions.length}))};
  }
  const published = publishableTopicPlans(checked), database = join(target, 'catalogue.sqlite');
  copyFileSync(settings.database, database);
  const repository = new CatalogueRepository(database);
  let publication;
  try {
    const row = repository.db.prepare('SELECT payload FROM runtime_publications WHERE release_id = ? AND hash = ?').get(settings.release, settings.publication);
    const value = applyTopicPackageToPublication(JSON.parse(String(row.payload)), pkg.family, published);
    publication = publishRuntime(repository, value, {release: value.release, contract: value.contract});
    repository.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } finally { repository.close(); }
  const verified = checkRuntimeDatabase({database, release: settings.release, publication});
  writeFileSync(join(target, 'local-build.json'), JSON.stringify({database: 'catalogue.sqlite', release: settings.release, publication}, null, 2) + '\n');
  const receipt = {status: 'TOPICS_PUBLISHED', family: pkg.family.id, edition: pkg.edition, planEdition: pkg.planEdition ?? pkg.edition, packageSha256: topicHash(raw),
    from: {release: settings.release, publication: settings.publication}, to: {release: settings.release, publication, contract: verified.contract},
    plans: checked.plans.map(built => ({id: built.entry.id, itemHash: built.itemHash, reviewer: built.review.reviewer, reviewDate: built.review.reviewDate})),
    note: 'Lokaal gemaakt; niet in gebruik genomen. Vergelijk met data:compare-runtime en test in een aparte build.'};
  writeFileSync(join(target, 'topic-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runTopicPackage(parseTopicArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 1));
    process.exit(result.status === 'HOLD' ? 1 : 0);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(2); }
}
