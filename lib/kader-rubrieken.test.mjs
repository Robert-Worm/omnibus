import test from 'node:test';
import assert from 'node:assert/strict';
import {deel, bekendeKop, regelTekst, RUBRIEKEN, VASTE_REGEL} from './kader-rubrieken.mjs';
import {register} from 'node:module';
// Het echte versieblad en de echte kaderbrede uitleg; werkboek- en catalogusinvoer die hier niet speelt, is leeg.
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(!context.parentURL?.endsWith('/excel-template-design.mjs'))return next(specifier,context);
  const sources={
   './research-plan.mjs':'export const questionNumbers=()=>({});',
   './wwke-law-data.mjs':'export const wwkeLabels={};',
   './excel-template-style.mjs':'export const readingStyles={};export const templateDesign=()=>{};',
   './excel-template-viewer.mjs':'export const detailSheetName="Detail",templateDetailViewer=()=>{};',
   './export-design.mjs':'export const fitExportTypography=x=>x;',
   './excel-template-execution.mjs':'export const executionSheet=()=>{};',
   './excel-applicability.mjs':'export const appendSavedApplicability=()=>{};',
   './research-goal.mjs':'export const researchGoalText=()=>"";',
   './research-approach.mjs':'export const researchApproachText=()=>"";',
   './topical-content.mjs':'export const topicalSpanLocation=()=>{};export const topicalSpanPage=()=>{};export const topicalPrimarySpans=(d,s)=>s;export const zonderAfbreking=t=>t;'
  };
  if(specifier==='./excel-template-assets.json')return {url:'data:application/json,{}',shortCircuit:true};
  return sources[specifier]?{url:'data:text/javascript,'+encodeURIComponent(sources[specifier]),shortCircuit:true}:next(specifier,context);
 }
`),import.meta.url);
const {versionSheet}=await import('./excel-template-design.mjs');

test('een bekende kop krijgt een vaste rubriek en een leesbare kop; niet uitgewerkt zegt dat met zoveel woorden', () => {
  assert.deepEqual(deel('Wat staat in een ander kader', 'Het toezicht staat elders.'), {rubriek: 'wie', kop: 'Andere kaders in Omnibus', tekst: 'Het toezicht staat elders.'});
  const open = deel('Niet uitgewerkte bepalingen', 'Enkele bepalingen zijn niet uitgewerkt.');
  assert.equal(open.rubriek, 'open');
  assert.equal(regelTekst(open), 'Artikel 12, lid 2, onder b, en artikel 21, tweede alinea (niet uitgewerkt): Enkele bepalingen zijn niet uitgewerkt.');
  assert.match(regelTekst(deel('Verwijzing naar EMIR bij transactieregisters', 'Beide versies verwijzen naar EMIR.')), /naar EMIR \(uitleg van Omnibus\): Beide/u);
  assert.equal(RUBRIEKEN.length, 4);
});

test('standaardzinnen over voorstellen vallen weg; blijft er niets over, dan vervalt de alinea', () => {
  const zin = 'Doelen, risico’s, beheersmaatregelen, toetsaanpak en vragen zijn voorstellen van Omnibus op basis van de regelgeving.';
  assert.equal(deel('Voorstellen van Omnibus', zin + ' Een toetspunt kiezen betekent niet dat de regel op jouw organisatie van toepassing is; dat stel je zelf per onderzoek vast.'), null);
  assert.deepEqual(deel('Voorstellen van Omnibus', zin + ' De voorstellen voegen geen verplichting toe.'), {rubriek: 'zelf', kop: '', tekst: 'De voorstellen voegen geen verplichting toe.'});
  assert.equal(deel('Voorstellen van Omnibus', zin + ' Dat geldt ook voor de vraag of een vrijstelling geldt.').tekst, 'Stel ook zelf vast of een vrijstelling geldt.');
});

test('een onbekende kop valt in het vangnet en is niet bekend', () => {
  assert.equal(bekendeKop('Iets nieuws'), false);
  assert.equal(deel('Artikel 99, lid 1', 'Onduidelijk.').rubriek, 'open');
  assert.equal(deel('Iets nieuws', 'Tekst.').rubriek, 'zelf');
});

const material = id => ({topicalTrace: '{}', foundationId: 'X', sourceTitle: 'Kader X', sourceMethodology: 'Geldt voor kleine instellingen.', sourceLicense: 'Europese publicatie.',
  sourceContext: 'Niet uitgewerkte bepalingen\nEnkele bepalingen zijn niet uitgewerkt.\n\nVoorstellen van Omnibus\nDoelen, risico’s, beheersmaatregelen, toetsaanpak en vragen zijn voorstellen van Omnibus op basis van de regelgeving.\n\nPunt ' + id + '\nAlleen bij dit punt.'});
const records = [{material: material(1)}, {material: material(2)}];
const model = {title: 'Kader', meta: {version: '0.1', exportedAt: '2026-11-19T12:00:00Z', author: 'A', change: 'Eerste opzet', team: ''}};
const text = sheet => sheet.rows.flat().filter(value => typeof value === 'string').join('\n');

test('op het versieblad staat altijd de vaste regel; de uitleg per kader alleen met het vinkje', () => {
  const zonder = text(versionSheet(model, records, undefined));
  assert.match(zonder, /Over de uitwerking/u);
  assert.ok(zonder.includes(VASTE_REGEL));
  assert.match(zonder, /Niet alles is uitgewerkt bij: Kader X\./u);
  assert.doesNotMatch(zonder, /Uitleg per kader|Enkele bepalingen/u);
  const met = text(versionSheet(model, records, undefined, {kaderUitleg: true}));
  assert.match(met, /Uitleg per kader/u);
  assert.match(met, /Voor wie en wanneer\n+Geldt voor kleine instellingen\./u);
  assert.match(met, /Niet uitgewerkt of eigen uitleg\n+Hier is de bron onduidelijk[^\n]*\n+Artikel 12, lid 2, onder b, en artikel 21, tweede alinea \(niet uitgewerkt\): Enkele/u);
  assert.doesNotMatch(met, /voorstellen van Omnibus op basis/u);
  assert.doesNotMatch(met, /Wat je zelf vaststelt/u);
  assert.match(met, /Rechten bij alle kaders hierboven: Europese publicatie\./u);
});
