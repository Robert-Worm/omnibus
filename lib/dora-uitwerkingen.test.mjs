import assert from 'node:assert/strict';
import test from 'node:test';
import {doraUitwerkingen, uitwerkingenBijGroep, uitgewerktVanuit} from './dora-uitwerkingen.mjs';

test('bij een DORA-groep staan de uitvoeringsregelingen met hun bevoegdheidsartikel (#312)', () => {
  assert.deepEqual(uitwerkingenBijGroep('DORA-2022-2554', 'Incidentbeheer, classificatie en rapportage').map((u) => u.id),
    ['DORA-2024-1772', 'DORA-2025-301', 'DORA-2025-302', 'DORA-INCIDENT-COSTS-GL34']);
  assert.equal(uitwerkingenBijGroep('DORA-2022-2554', 'Vereenvoudigd ICT-risicobeheerkader')[0].grondslag, 'artikel 16, lid 3');
  assert.deepEqual(uitwerkingenBijGroep('DORA-2022-2554', 'Beroepsgeheim en informatieverstrekking'), []);
  assert.deepEqual(uitwerkingenBijGroep('NOREA-DORA-3-2', 'Bestuur'), []);
});

test('andersom: een RTS weet welke DORA-groepen zij uitwerkt', () => {
  assert.equal(uitgewerktVanuit('DORA-2025-1190')[0].groep, 'Dreigingsgestuurde penetratietests (TLPT)');
  assert.ok(uitgewerktVanuit('DORA-2024-1774').length >= 6);
});

test('elke koppeling noemt een artikel en een leesbare naam', () => {
  for (const groepen of Object.values(doraUitwerkingen)) for (const lijst of Object.values(groepen))
    for (const u of lijst) { assert.match(u.grondslag, /^artikel \d+/); assert.ok(u.label.length > 5); }
});

test('de koppelingen staan bij de norm onder Verwant, niet in het hoofdscherm, en openen de bron in hetzelfde project', async () => {
  const {readFile} = await import('node:fs/promises');
  const viewer = await readFile(new URL('../app/cio-law-browser.tsx', import.meta.url), 'utf8');
  const topical = await readFile(new URL('../app/topical-law-browser.tsx', import.meta.url), 'utf8');
  const workspace = await readFile(new URL('../app/foundation-workspace.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(viewer, /lead="Uitgewerkt in"|lead="Werkt DORA uit"/);
  assert.match(viewer, /<RelatedNormsHelp links=\{verwantBij\(parent\.id,row\.groupId\)\}/);
  assert.match(topical, /groupLinks:\(t:string\)=>uitwerkingenBijGroep\(sourceId,t\)/);
  assert.match(workspace, /onOpenSource=\{[^}]*sourceIds:\[\.\.\.new Set\(\[\.\.\.wb\.sourceIds,id\]\)\]/);
});
