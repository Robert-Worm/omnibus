// "Over dit kader" heeft één vaste opbouw, gelijk aan het CIO-stelsel (B-034).
// Deze test faalt als een wet of kader een eigen opbouw krijgt.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {test} from 'node:test';

const read=(name)=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
// Handgemaakte referentiepagina's met dezelfde opbouw; alle andere bronnen gebruiken LawAboutPage.
const REFERENTIE={'cio-law-browser.tsx':'cio-source-about','wwke-law-browser.tsx':'wwke-source-about'};

test('LawAboutPage zet de secties altijd in de CIO-volgorde', () => {
  const page=read('law-about-layout.tsx').split('export function LawAboutPage')[1];
  const volgorde=['<LawAboutIntro','<LawAboutSpecifications','{kind.title}','Voor wie en waarvoor?','Ontstaan en ontwikkeling','Toepassing in je onderzoek','<LawAboutSources','Bronkwaliteit en open punten','LAW_ABOUT_QUALITY_INTRO','law-about-checks'];
  const plekken=volgorde.map(stuk=>page.indexOf(stuk));
  plekken.forEach((plek,i)=>assert.ok(plek>=0,`ontbreekt in LawAboutPage: ${volgorde[i]}`));
  assert.deepEqual([...plekken].sort((a,b)=>a-b),plekken,'secties staan niet in de CIO-volgorde');
  assert.match(page,/<details/u,'open punten zijn uitklapbaar, zoals bij CIO');
});

test('elke wet- of kaderviewer gebruikt de vaste opbouw', () => {
  const viewers=readdirSync(new URL('./',import.meta.url)).filter(name=>name.endsWith('-law-browser.tsx'));
  assert.ok(viewers.length>=4);
  for(const name of viewers){
    const code=read(name);
    if(REFERENTIE[name]){assert.match(code,new RegExp(`from '\\./${REFERENTIE[name]}'`,'u'),name);continue;}
    if(!/About\s*[:=]/u.test(code))continue;
    assert.match(code,/<LawAboutPage\b/u,`${name}: gebruik LawAboutPage voor "Over dit kader"`);
    assert.doesNotMatch(code,/className="law-about-(card|quality|limitations)/u,`${name}: geen eigen secties naast LawAboutPage`);
  }
});

test('een samenhangssectie staat binnen Toepassing, niet als eigen kaart', () => {
  for(const name of readdirSync(new URL('./',import.meta.url)).filter(n=>n.endsWith('.tsx')&&n!=='law-about-layout.tsx'))
    assert.doesNotMatch(read(name),/<h3[^\n]{0,120}Samenhang met andere kaders/u,name);
});
