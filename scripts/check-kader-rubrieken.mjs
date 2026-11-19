#!/usr/bin/env node
// Heeft elke kaderbrede kop een plek in de vaste rubrieken van de Excel-uitleg per kader (B-082)? Leest de koppen van
// context.limitations van alle bronpakketten in de publicatie. Een nieuwe kop zonder plek laat deze controle falen,
// zodat de redactie in lib/kader-rubrieken.mjs bewust een rubriek en een leesbare kop kiest.
//
//   npm run check:kaderuitleg -- --settings <map>/local-build.json
import {DatabaseSync} from 'node:sqlite';
import {bekendeKop} from '../lib/kader-rubrieken.mjs';
import {readSettings} from './topic-package.mjs';

const at = process.argv.indexOf('--settings'), settingsFile = at > 0 ? process.argv[at + 1] : '';
if (!settingsFile) { console.error('Gebruik: npm run check:kaderuitleg -- --settings <map>/local-build.json'); process.exit(2); }
const settings = readSettings(settingsFile);
const database = new DatabaseSync(settings.database, {readOnly: true});
const publication = JSON.parse(String(database.prepare('select payload from runtime_publications where release_id = ? and hash = ?').get(settings.release, settings.publication)?.payload ?? 'null'));
if (!publication) { console.error('De publicatie uit de instellingen staat niet in deze database.'); process.exit(2); }
const packages = Object.values(publication.modules['lib/topical-reviewed.json']?.packages ?? {});
const unknown = new Map();
let count = 0;
for (const pkg of packages) for (const item of pkg?.context?.limitations ?? []) {
  count++;
  if (!bekendeKop(item.title)) unknown.set(item.title, pkg.context.title || pkg.context.framework_id);
}
for (const [title, source] of unknown) console.error(`Kop zonder rubriek: "${title}" (${source})`);
console.log(`${packages.length} bronpakketten, ${count} kaderbrede alinea's; ${unknown.size ? unknown.size + ' koppen zonder rubriek.' : 'elke kop heeft een rubriek.'}`);
process.exit(unknown.size ? 1 : 0);
