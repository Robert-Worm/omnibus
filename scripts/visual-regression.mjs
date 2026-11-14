// Visuele regressie: legt vaste schermtoestanden vast (licht en donker, 1440 en 1024 breed) als PNG.
// Bedoeld om een wijziging in de opmaak te controleren: het uiterlijk moet gelijk blijven (besluit B-063).
//
// Gebruik (de app moet lokaal draaien, bijvoorbeeld met scripts/serve-database-web.mjs):
//   node scripts/visual-regression.mjs vastleggen <map> [url]     legt alle toestanden vast in <map>
//   node scripts/visual-regression.mjs vergelijken <mapA> <mapB>  meldt elk beeld dat niet byte-gelijk is
// Werkwijze: leg de toestand vóór de wijziging vast, bouw de wijziging, leg opnieuw vast en vergelijk.
// Eén beeld (donker, 1440, open modellen) kan een paar pixels verschillen door afronding in de browser.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [OPDRACHT,A,B]=process.argv.slice(2);
if(OPDRACHT==='vergelijken'){
  const namen=[...new Set([...fs.readdirSync(A),...fs.readdirSync(B)])].filter(n=>n.endsWith('.png')).sort();let anders=0;
  const som=f=>fs.existsSync(f)?createHash('sha256').update(fs.readFileSync(f)).digest('hex'):'';
  for(const n of namen){const a=som(A+'/'+n),b=som(B+'/'+n);if(a!==b){anders++;console.log((a&&b?'VERSCHIL ':'ONTBREEKT ')+n);}}
  console.log(`${namen.length} beelden, ${anders} niet gelijk`);process.exit(anders?1:0);
}
if(OPDRACHT!=='vastleggen'||!A){console.error('Gebruik: vastleggen <map> [url] | vergelijken <mapA> <mapB>');process.exit(2);}
const UIT=A,BASE=B||'http://127.0.0.1:4319',PROJ=fileURLToPath(new URL('./fixtures/visual-regression-project.json',import.meta.url));
const BREEDTES=process.env.BREEDTES?process.env.BREEDTES.split(',').map(Number):[1440,1024];
fs.mkdirSync(UIT,{recursive:true});
// Playwright is geen vaste afhankelijkheid van de app; wijs hem zo nodig aan met PLAYWRIGHT_MODULE (zoals de andere reviewscripts).
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const STIL='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';
(async()=>{const b=await chromium.launch();const log=[];
for(const mode of ['licht','donker'])for(const width of BREEDTES){
 const ctx=await b.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await ctx.addInitScript(m=>{try{localStorage.setItem('omnibus-appearance',m)}catch{}},mode==='donker'?'dark':'light');
 const p=await ctx.newPage();p.setDefaultTimeout(20000);let n=0;
 const rust=async()=>{await p.addStyleTag({content:STIL}).catch(()=>{});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(450);};
 const shot=async(naam,opt={})=>{await rust();const f=`${UIT}/${mode}-${width}-${String(++n).padStart(2,'0')}-${naam}.png`;await p.screenshot({path:f,fullPage:opt.full!==false,...(opt.clip?{clip:opt.clip,fullPage:false}:{})});};
 const stap=async(naam,f)=>{try{await f();}catch(e){log.push(`${mode}-${width} ${naam}: ${e.message.split('\n')[0].slice(0,120)}`);}};
 const go=async h=>{await p.goto(BASE+'/#'+h,{waitUntil:'networkidle'});await p.waitForTimeout(1300);};
 const weergave=async w=>{const t=p.locator('.catalogue-view-toggle button',{hasText:w});if(await t.count()){await t.first().click();await p.waitForTimeout(700);}};
 await go('begin');await shot('begin-leeg');
 await stap('project',async()=>{const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.locator('.project-actions button',{hasText:'Open project'}).click()]);await fc.setFiles(PROJ);await p.waitForTimeout(4500);});
 for(const h of ['begin','start','risicoverkenning'])await stap(h,async()=>{await go(h);await shot(h);});
 for(const h of ['grondslagen','modellen','themas','processen'])await stap(h,async()=>{await go(h);await weergave('Tegels');await shot(h+'-tegels');await weergave('Lijst');await shot(h+'-lijst');});
 await stap('rapporten',async()=>{await go('rapporten');await shot('rapporten');await p.locator('.report-context-trigger').first().click();await p.waitForTimeout(400);await shot('rapporten-menu',{full:false});await p.keyboard.press('Escape');});
 await stap('zoek',async()=>{await go('grondslagen');await weergave('Lijst');await p.locator('#foundation-search').fill('zzzqqq');await p.waitForTimeout(800);await shot('wetten-geen-resultaat',{full:false});await p.locator('#foundation-search').fill('');});
 await stap('groepen',async()=>{await go('grondslagen');await weergave('Lijst');await p.locator('.catalogue-table-grouping .catalogue-tool').first().click();await p.waitForTimeout(300);await shot('wetten-groepmenu',{full:false});await p.keyboard.press('Escape');});
 for(const h of ['open-grondslagen','open-modellen','open-themas'])await stap(h,async()=>{await go(h);await p.waitForTimeout(2500);await shot(h);});
 await stap('viewer-over',async()=>{await go('open-grondslagen');await p.waitForTimeout(2000);await p.locator('.law-overview-tabs button',{hasText:'Over dit kader'}).first().click();await p.waitForTimeout(1500);await shot('viewer-over');await p.locator('.law-overview-tabs button',{hasText:'Normen'}).first().click();await p.waitForTimeout(800);
   await p.locator('.law-browse-filters .catalogue-tool',{hasText:'Tekst'}).first().click();await p.waitForTimeout(300);await p.locator('.catalogue-tool-option',{hasText:'Volledige tekst'}).first().click();await p.waitForTimeout(1500);await shot('viewer-volledige-tekst');
   await p.locator('.law-browse-filters .catalogue-tool',{hasText:'Tekst'}).first().click();await p.waitForTimeout(300);await p.locator('.catalogue-tool-option',{hasText:'Compact'}).first().click();await p.waitForTimeout(800);
   const sel=p.locator('button',{hasText:/^Selectie/}).first();if(await sel.count()){await sel.click();await p.waitForTimeout(300);await shot('viewer-selectiemenu',{full:false});await p.keyboard.press('Escape');}});
 await stap('stap3',async()=>{await go('mijn-kader');await p.waitForTimeout(1500);await shot('stap3');});
 await stap('stap4',async()=>{await go('kaderexport');await p.waitForTimeout(3500);for(const w of ['Normtoetsing','Risico-controlmatrix','Interviewleidraad']){await p.locator('.creator-preset',{hasText:w}).first().click();await p.waitForTimeout(2800);await shot('stap4-'+w.slice(0,5).toLowerCase());
    const tabs=p.locator('.creator-preview-tabs button');const k=await tabs.count();for(let i=1;i<k;i++){await tabs.nth(i).click();await p.waitForTimeout(700);await shot(`stap4-${w.slice(0,5).toLowerCase()}-tab${i}`,{full:false});}if(k)await tabs.first().click();}});
 await stap('rapport-lezen',async()=>{await go('rapporten');await p.locator('.report-table .catalogue-table-name button').first().click();await p.waitForTimeout(3000);await shot('rapport-lezen',{full:false});});
 await stap('toetspunten',async()=>{await go('open-grondslagen');await p.waitForTimeout(2500);const c=p.locator('.matrix-point-chip, button:has-text("Bekijk toetspunten")').first();await c.click();await p.waitForTimeout(1500);await shot('toetspunten-detail',{full:false});await p.keyboard.press('Escape');await p.waitForTimeout(400);});
 await stap('model-binnen',async()=>{await go('open-modellen');await p.waitForTimeout(2500);const d=p.locator('.cev-dimensions button');if(await d.count()>1){await d.nth(1).click();await p.waitForTimeout(900);await shot('model-onderdeel2',{full:false});}
   const o=p.locator('button,[role=tab]',{hasText:'Over dit model'}).first();if(await o.count()){await o.click();await p.waitForTimeout(1200);await shot('model-over');}
   const bg=p.locator('.model-information-trigger').first();if(await bg.count()){await p.locator('button,[role=tab]',{hasText:/^Vragen|^Model/}).first().click().catch(()=>{});await bg.click().catch(()=>{});await p.waitForTimeout(700);await shot('model-begrippen',{full:false});await p.keyboard.press('Escape');}});
 await stap('thema-over',async()=>{await go('open-themas');await p.waitForTimeout(2500);const o=p.locator('.law-overview-tabs button, [role=tab]',{hasText:/^Over/}).first();if(await o.count()){await o.click();await p.waitForTimeout(1500);await shot('thema-over');}});
 await stap('risico-familie',async()=>{await go('risicoverkenning');const c=p.locator('.directory-family-card').first();if(await c.count()){await c.click();await p.waitForTimeout(1500);await shot('risico-familie');}});
 await stap('stap3-zelf',async()=>{await go('mijn-kader');await p.waitForTimeout(1200);const z=p.locator('button',{hasText:'Zelf een vraag maken'}).first();if(await z.count()){await z.click();await p.waitForTimeout(900);await shot('stap3-zelf');const insp=p.locator('summary,button',{hasText:'Inspiratie nodig'}).first();if(await insp.count()){await insp.click();await p.waitForTimeout(500);await shot('stap3-inspiratie',{full:false});}}});
 await stap('stap4-details',async()=>{await go('kaderexport');await p.waitForTimeout(3000);for(const t of ['Vormgeving','Over de werkvormen']){const d=p.locator('.export-creator summary',{hasText:t}).first();if(await d.count()){await d.click();await p.waitForTimeout(400);}}await shot('stap4-uitgeklapt');});
 if(width===1440){
  await go('grondslagen');
  for(const m of ['Nieuw project','Delen','AI koppelen','Wegwijzer'])await stap('menu '+m,async()=>{await p.locator('.project-actions button',{hasText:m}).first().click();await p.waitForTimeout(600);await shot('menu-'+m.replace(/\s/g,'').toLowerCase(),{full:false});await p.keyboard.press('Escape');await p.waitForTimeout(300);});
  await stap('opslag',async()=>{await p.locator('.project-save-indicator').first().click();await p.waitForTimeout(600);await shot('menu-opslag',{full:false});await p.keyboard.press('Escape');await p.waitForTimeout(300);});
  for(const m of ['Begrippen','Gebruik en bronnen','Lokale opslag en privacy','Over & contact'])await stap('voet '+m,async()=>{const el=p.locator('.product-footer button',{hasText:m}).first();await el.scrollIntoViewIfNeeded();await el.click();await p.waitForTimeout(600);await shot('voet-'+m.slice(0,6).toLowerCase().replace(/\W/g,''),{full:false});await p.keyboard.press('Escape');await p.waitForTimeout(300);});
  // aanwijzen en focus
  const hover=async(naam,sel,h)=>stap('hover '+naam,async()=>{if(h){await go(h);if(h==='grondslagen')await weergave('Lijst');}const el=p.locator(sel).first();await el.scrollIntoViewIfNeeded();await el.hover();await p.waitForTimeout(350);await shot('hover-'+naam,{full:false});await p.mouse.move(2,2);});
  await hover('staptab','.investigation-steps a:not([aria-current])','grondslagen');await hover('tab','.collection-navigation a:not([aria-current])');
  await hover('kolomkop','.catalogue-table thead th button');await hover('rij','.catalogue-table tbody tr[data-row]');await hover('groep','.catalogue-table-group th button');
  await hover('filter','.catalogue-table .catalogue-tool');await hover('kopknop','.project-actions button');await hover('volgende','.workflow-next, .workflow-heading a, .workflow-heading button');
  await stap('tegel',async()=>{await weergave('Tegels');await hover('tegel','.directory-family-card');});
  await hover('rapportrij','.report-table tbody tr','rapporten');await hover('voetlink','.product-footer .footer-glossary-trigger');
  await hover('preset','.creator-preset:not([aria-pressed=true])','kaderexport');await hover('download','button.creator-download');
  await stap('focus',async()=>{await go('grondslagen');await weergave('Lijst');await p.locator('.catalogue-table-search input').focus();for(let i=0;i<6;i++){await p.keyboard.press('Tab');await p.waitForTimeout(120);await shot('focus-'+i,{full:false});}});
  await stap('begin-voet',async()=>{await go('begin');await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await shot('begin-voet',{full:false});});
 }
 await ctx.close();}
console.log(log.length?'OVERGESLAGEN:\n'+log.join('\n'):'alle toestanden vastgelegd');await b.close();})().catch(e=>{console.error('FOUT',e.message.slice(0,400));process.exit(1)});
