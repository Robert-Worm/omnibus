import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCorrections, CORRECTION_FORMAT} from './content-correction.mjs';

const publication = () => ({modules: {'lib/x.json': {packages: {0: {status: {rights: 'English text.'}}}}}});
const file = (items) => ({format: CORRECTION_FORMAT, edition: '20261119.01', items});
const item = (from, to = 'Nederlandse tekst.') => ({module: 'lib/x.json', path: ['packages', '0', 'status', 'rights'], from, to, reason: 'vertaling'});

test('een correctie vervangt alleen als de oude tekst precies klopt', () => {
  const value = publication();
  assert.deepEqual(applyCorrections(value, file([item('English text.')])), []);
  assert.equal(value.modules['lib/x.json'].packages[0].status.rights, 'Nederlandse tekst.');
  assert.deepEqual(applyCorrections(value, file([item('English text.')])), [], 'nog een keer toepassen verandert niets');
  assert.match(applyCorrections(publication(), file([item('Iets anders.')])).join(), /oude tekst klopt niet/u);
});

test('een onbekend veld, een correctie zonder reden of een ongeldig bestand gaat niet door', () => {
  assert.match(applyCorrections(publication(), file([{...item('English text.'), path: ['packages', '9', 'status', 'rights']}])).join(), /bestaat niet/u);
  assert.match(applyCorrections(publication(), file([{...item('English text.'), reason: ''}])).join(), /reason/u);
  assert.match(applyCorrections(publication(), {format: 'iets'}).join(), /Geen correctiebestand/u);
});
