#!/usr/bin/env node
// Zet één versienummer op alle plekken: lib/product-release.mjs, package.json en package-lock.json.
// Gebruik: node scripts/set-version.mjs 0.1.21
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versie = process.argv[2] ?? '';
const delen = versie.match(/^0\.(\d+)\.(\d{1,2})$/u);
if (!delen) { console.error('Geef een versie zoals 0.1.21 (laatste deel 0 tot en met 99).'); process.exit(1); }
const nummer = Number(delen[1]) * 100 + Number(delen[2]);
if (`0.${Math.floor(nummer / 100)}.${nummer % 100}` !== versie) { console.error('Schrijf de versie zonder voorloopnullen.'); process.exit(1); }

const vervang = (bestand, patroon, nieuw) => {
  const pad = path.join(root, bestand), tekst = readFileSync(pad, 'utf8');
  if (!patroon.test(tekst)) throw new Error(`Versie niet gevonden in ${bestand}.`);
  writeFileSync(pad, tekst.replace(patroon, nieuw));
};
vervang('lib/product-release.mjs', /PRODUCT_RELEASE_NUMBER = \d+/u, `PRODUCT_RELEASE_NUMBER = ${nummer}`);
vervang('package.json', /^(\{\s*"name": "[^"]+",\s*"version": ")[^"]+/u, `$1${versie}`);
vervang('package-lock.json', /^(\{\s*"name": "[^"]+",\s*"version": ")[^"]+/u, `$1${versie}`);
vervang('package-lock.json', /("packages": \{\s*"": \{\s*"name": "[^"]+",\s*"version": ")[^"]+/u, `$1${versie}`);
console.log(`Versie ${versie} gezet (releasenummer ${nummer}).`);
