import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';

// Catalogi gedragen zich gelijk (B-096). Een eigen kopie van de tegelfilters liep eerder uit de pas (modellen, 20-11):
// de tegels telden het totaal terwijl de lijst al gefilterd was.
const app=new URL('../app/',import.meta.url);
const files=readdirSync(app).filter(name=>name.endsWith('.tsx')).map(name=>({name,text:readFileSync(new URL(name,app),'utf8')}));
// Bronnen (wetten en kaders) hebben vervolgfilters die de lijst vragen (Onderwerp); die catalogus heeft een eigen, geteste uitwerking.
const ownRule=new Set(['investigation-workspace.tsx']);

test('elke catalogus met filters boven de tegels gebruikt de gedeelde tegelfilters',()=>{
  const withFilters=files.filter(file=>file.text.includes('<CatalogueFilterBar')&&file.text.includes('onFiltersChange='));
  assert(withFilters.length>=3,'catalogi met filters gevonden');
  for(const file of withFilters){
    if(ownRule.has(file.name))continue;
    assert.match(file.text,/useTileFilters\(/u,file.name+' gebruikt useTileFilters');
    assert.doesNotMatch(file.text,/Object\.entries\(tileFilters\)/u,file.name+' heeft geen eigen kopie van de filterregel');
  }
});

test('tegels verdwijnen bij een actief filter, in elke catalogus',()=>{
  for(const file of files)for(const tag of file.text.match(/<CatalogueGroups\b[\s\S]*?\/>/gu)??[])
    assert.match(tag,/\bfiltered=\{/u,file.name+': CatalogueGroups krijgt de filterstand mee');
});
