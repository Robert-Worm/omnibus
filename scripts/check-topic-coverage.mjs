#!/usr/bin/env node
// Heeft alles een plek? Vergelijkt de onderwerpindeling van elke familie met de normen in een lokale database.
// Een norm hoeft niet in een onderwerp te passen ('buiten' is ook een plek), maar elke norm van een ingedeelde bron
// moet een regel hebben en elke regel een norm. Zo valt een nieuwe of hernoemde norm niet stil uit elk onderwerp.
//
//   node scripts/check-topic-coverage.mjs --database <catalogue.sqlite>
import {DatabaseSync} from 'node:sqlite';
import {topicFamilies} from '../lib/topic-families.mjs';

const at = process.argv.indexOf('--database'), file = at > 0 ? process.argv[at + 1] : '';
if (!file) { console.error('Gebruik: node scripts/check-topic-coverage.mjs --database <catalogue.sqlite>'); process.exit(2); }
const database = new DatabaseSync(file, {readOnly: true});
const version = database.prepare("select version from packages where source_id = ? and kind = 'foundation'");
const norms = database.prepare("select id from records where version = ? and kind = 'norm' order by position");
let failed = false;
for (const family of topicFamilies) {
  const found = {};
  for (const source of family.sources) {
    const row = version.get(source.id);
    if (row) found[source.id] = norms.all(row.version).map(record => record.id);
  }
  const result = family.coverage(found), total = Object.values(found).reduce((sum, ids) => sum + ids.length, 0);
  console.log(`${family.id}: ${total} normen in ${Object.keys(found).length} bronnen; ${total - family.unassigned.length} in een onderwerp, ${family.unassigned.length} bewust buiten de onderwerpen.`);
  for (const id of result.unknownSources) console.error(`  Bron ontbreekt in de database: ${id}`);
  for (const id of result.missing) console.error(`  Norm zonder plek in de indeling: ${id}`);
  for (const id of result.stale) console.error(`  Regel in de indeling zonder norm in de database: ${id}`);
  if (!result.ok) failed = true;
}
database.close();
if (failed) { console.error('De indeling dekt de database niet. Werk de indeling bij of zet de norm bewust buiten de onderwerpen.'); process.exit(1); }
console.log('Elke norm heeft een plek.');
