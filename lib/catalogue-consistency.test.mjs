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

test('de export en het exportvoorbeeld laden altijd de interviewvragen van de gekozen bronnen (B-097)',()=>{
  // Een export zonder vragen viel eerder stil op "geen goedgekeurde vraag" terug (testronde 20-11).
  const keys=readFileSync(new URL('../lib/application-catalogue.mjs',import.meta.url),'utf8');
  assert.match(keys,/!value\?\.view \|\| \['framework','export'\]\.includes\(value\.view\.page\)/u);
  for(const file of ['preview-calculator.worker.ts','use-export-preview.ts']){
    const text=readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
    assert.match(text,/projectCatalogueKeys\(\{draft:/u,file+' vraagt de sleutels zonder scherm, dus met vragen');
  }
});

test('een knop die alles kiest of deselecteert schakelt bij een dubbelklik maar één keer (isRepeatClick)',()=>{
  // Zo'n knop wisselt van tekst (Kies alle … / Deselecteer); een dubbelklik zette eerder alles aan en meteen weer uit (20-11).
  const toggles=[];
  for(const file of files)for(const part of file.text.split('<Button').slice(1)){
    const button=part.split('</Button>')[0];
    if(!/Kies alle|Selecteer alle|Deselecteer/u.test(button))continue;
    // Een menu-item (DropdownMenuItem) sluit het menu bij de eerste klik; daar kan geen tweede klik op vallen.
    if(/<DropdownMenuItem/u.test(button))continue;
    const handler=/onClick=\{([^]{0,80})/u.exec(button)?.[1]??'(geen onClick)';
    toggles.push({name:file.name,handler});
  }
  assert(toggles.length>=3,'kies-alle-knoppen gevonden');
  for(const toggle of toggles)assert.match(toggle.handler,/^event ?=> ?\{? ?(?:if ?\()?isRepeatClick\(event\)/u,`${toggle.name}: begin met isRepeatClick(event) in ${toggle.handler}`);
});

test('wie vraagplannen leest, wacht tot ze geladen zijn (B-098)',()=>{
  const keys=readFileSync(new URL('../lib/application-catalogue.mjs',import.meta.url),'utf8');
  // Zonder scherm (export), bij vraagopzet/export en zodra er onderzoeksvragen zijn.
  assert.match(keys,/!value\?\.view \|\| \['framework','export'\]\.includes\(value\.view\.page\) \|\| \(draft\?\.research\?\.questions\?\.length \?\? 0\) > 0 \? \[QUESTION_PLANS_KEY\]/u);
  const editor=files.find(file=>file.name==='framework-editor.tsx').text;
  assert.match(editor,/<CatalogueContent resource=\{QUESTION_PLANS_KEY\}>\{\(\)=><ResearchBuilder/u,'de vraagopzet wacht op de plannen');
  assert.match(editor,/next==='framework'\|\|next==='export'\)keys\.push\([^)]*\),QUESTION_PLANS_KEY\)/u,'naar stap 3 of 4 gaan laadt de plannen');
  // Elk app-bestand dat vraagplannen gebruikt, zit achter die grens: alleen de vraagopzet (ResearchBuilder) en de
  // selectiesynchronisatie in de editor (die alleen werkt als er al vragen zijn).
  const users=files.filter(file=>/processQuestionPlan|adoptProcessQuestionPlan|rankedQuestionStarts|questionMenuChoices/u.test(file.text)).map(file=>file.name).sort();
  // process-catalogue.tsx wordt nergens geïmporteerd (geen scherm).
  assert.deepEqual(users.filter(name=>!['research-builder.tsx','process-catalogue.tsx'].includes(name)),[],'nieuwe gebruiker van vraagplannen: zorg dat die QUESTION_PLANS_KEY laadt en voeg hem hier toe');
});
