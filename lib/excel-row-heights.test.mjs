import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
// Alleen de echte meting en het inkorten; het werkboekontwerp zelf speelt hier niet.
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(context.parentURL?.endsWith('/excel-detail-sections.mjs')&&specifier==='./excel-template-style.mjs')
   return {url:'data:text/javascript,'+encodeURIComponent('export const readingStyles={};'),shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {shortenToHeight} = await import('./excel-detail-sections.mjs');
const {fittedRowHeight} = await import('./excel-text-height.mjs');

test('de rijhoogte volgt de tekst: een alinea van 1400 tekens over de volle breedte is geen 250 punten', () => {
  const text = 'Stel eerst vast of het gewone ICT-risicobeheerkader of het vereenvoudigde kader geldt. '.repeat(16);
  const height = fittedRowHeight(text, 130);
  assert.ok(height < 200, `hoogte ${height}`);
  assert.ok(height > 100, `hoogte ${height}`);
});

test('een te lange tekst wordt op hele regels ingekort, met een verwijzing, en past dan', () => {
  const text = Array.from({length: 200}, (_, i) => `Regel ${i} met wat tekst die doorloopt.`).join('\n');
  const short = shortenToHeight(text, 300, 140);
  assert.ok(fittedRowHeight(short, 140) <= 300);
  assert.match(short, /^Regel 0 met/u);
  assert.match(short, /Ingekort in deze weergave; de volledige tekst staat in Omnibus bij dit toetspunt\.$/u);
  assert.ok(!short.includes('Regel 199'));
});
