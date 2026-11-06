import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {sourceScope,sourceScopes,scopeRoleLabels} from './source-scope.mjs';
import {frameworkBackgrounds} from './framework-backgrounds.mjs';
import {additionalSourceDomains} from './foundation-navigation-domains.mjs';
import {frameworkDocumentTitle} from './framework-source-labels.mjs';

const guidanceIds=[...readFileSync(new URL('./framework-about-guidance.mjs',import.meta.url),'utf8').matchAll(/"sourceId": "([^"]+)"/gu)].map(m=>m[1]);
const known=[...new Set([...Object.keys(frameworkBackgrounds),...guidanceIds,
  ...Object.values(additionalSourceDomains).flatMap(d=>d.ids),'CIO2026-REEXTRACT-1','WWKE-20260815-ASTRA-R1'])];

test('elke bekende wet en elk kader heeft een toepassingsgebied onder de titel', () => {
  const missing=known.filter(id=>!sourceScope(id));
  assert.deepEqual(missing,[],'Voeg een regel toe in lib/source-scope.mjs voor: '+missing.join(', '));
});

test('het toepassingsgebied is kort en noemt een rol', () => {
  for(const [id,scope] of Object.entries(sourceScopes)){
    assert.ok(Object.hasOwn(scopeRoleLabels,scope.role),`${id}: onbekende rol ${scope.role}`);
    assert.ok(scope.text.length>3&&scope.text.length<=80,`${id}: houd het toepassingsgebied kort (max. 80 tekens)`);
    assert.doesNotMatch(scope.text,/^Voor\b|\.$/u,`${id}: zonder 'Voor' en zonder punt; de catalogus zet 'Voor:' ervoor`);
  }
});

test('een nieuwe bronversie houdt het toepassingsgebied van haar familie', () => {
  assert.equal(sourceScope('CIO2026-REEXTRACT-2'),sourceScopes.CIO2026);
  assert.equal(sourceScope('ONBEKEND'),undefined);
});

test('een bestandsnaam wordt geen brontitel', () => {
  assert.equal(frameworkDocumentTitle('dora-official-nl.pdf','original-publication'),'Oorspronkelijke publicatie');
  assert.equal(frameworkDocumentTitle('corrigendum-2023-nl.pdf','corrigendum'),'Officiële rectificatie van de publicatie (2023)');
  assert.equal(frameworkDocumentTitle('NOREA DORA in Control: gids','x'),'NOREA DORA in Control: gids');
});
