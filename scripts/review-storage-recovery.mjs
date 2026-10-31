// EP06: real React/browser interactions with deterministic Storage failures.
// Explicit loopback preview, fresh profiles, fictional projects, ignored output only.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseProjectText,serializeProject} from '../lib/project-codec.mjs';

const target=new URL(process.env.REVIEW_URL || 'http://127.0.0.1:4363/');
assert(target.protocol==='http:' && target.hostname==='127.0.0.1' && ['4363','4364'].includes(target.port), 'Use an isolated preview on port 4363 or 4364');
assert(process.env.PLAYWRIGHT_MODULE && process.env.BROWSER_EXECUTABLE, 'Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE to installed local tools');
const out=resolve(process.env.REVIEW_OUT || 'work/storage-recovery/browser');
const child=relative(resolve('work'),out);
assert(child && !child.startsWith('..') && !isAbsolute(child), 'Output must be a new child of work/');
mkdirSync(out); // Never reuse a profile or overwrite earlier evidence.
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
const host=await chromium.launchPersistentContext(join(out,'profile'),{
  headless:true,executablePath:process.env.BROWSER_EXECUTABLE,downloadsPath:join(out,'downloads'),
});
const browser=host.browser(),results=[],errors=[];
const KEY='rijksmap-project-v1';
const saved=page=>page.locator('.project-save-indicator[data-state="saved"]').waitFor();
const blocked=page=>page.locator('.project-save-indicator[data-state="unsaved"]').waitFor();
const go=(page,hash)=>page.evaluate(h=>{location.hash='#'+h;},hash);
const raw=page=>page.evaluate(()=>window.__storageProof.raw('rijksmap-project-v1'));
const read=async page=>parseProjectText(await raw(page));
const setMode=(page,mode)=>page.evaluate(v=>window.__storageProof.mode=v,mode);
async function upload(page,value) {
  await page.getByLabel('Open lokaal project of oud concept').setInputFiles({
    name:'fictional-project.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:serializeProject(value)),
  });
  await page.waitForFunction(()=>document.querySelector('input[type="file"]').value==='');
}
async function downloaded(page,name,file) {
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name,exact:true}).click();
  const item=await pending;
  await item.saveAs(join(out,file));
  return readFileSync(join(out,file),'utf8');
}
async function help(page) {
  await page.locator('.project-save-indicator').click();
  await page.getByRole('dialog').filter({has:page.getByText('Automatisch bewaren staat uit',{exact:true})}).waitFor();
}
async function resume(page) {
  await page.getByRole('checkbox',{name:'Ik heb de benodigde projectbestanden veilig bewaard.'}).click();
  await page.getByRole('button',{name:'Huidige werk opslaan en doorgaan',exact:true}).click();
}
async function fresh(seed=null,mode='none') {
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.addInitScript(({seed,mode,KEY,origin})=>{
    if(location.origin!==origin)return;
    // Faults affect the native Storage boundary, never React state or save results.
    const get=Object.getOwnPropertyDescriptor(Storage.prototype,'getItem').value;
    const set=Object.getOwnPropertyDescriptor(Storage.prototype,'setItem').value;
    if(!sessionStorage.getItem('storage-proof-seeded')) {
      if(seed!==null && get.call(localStorage,KEY)===null)set.call(localStorage,KEY,seed);
      sessionStorage.setItem('storage-proof-seeded','yes');
    }
    const control={mode,raw:key=>get.call(localStorage,key)};
    window.__storageProof=control;
    Storage.prototype.getItem=function(key) {
      if(this===localStorage && control.mode==='read-denied')throw new DOMException('Synthetic storage denial','SecurityError');
      return get.call(this,key);
    };
    Storage.prototype.setItem=function(key,value) {
      if(this===localStorage && control.mode==='quota')throw new DOMException('Synthetic full storage','QuotaExceededError');
      if(this===localStorage && control.mode==='write-denied')throw new DOMException('Synthetic storage denial','SecurityError');
      return set.call(this,key,value);
    };
  },{seed,mode,KEY,origin:target.origin});
  context.on('page',page=>{
    page.setDefaultTimeout(10000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss());
  });
  const page=await context.newPage();
  await page.goto(target.href);
  return {context,page};
}
async function scenario(name,run) {
  if(process.env.REVIEW_CASE && !name.includes(process.env.REVIEW_CASE))return;
  const start=errors.length;
  try {await run();assert.equal(errors.length,start,'Unexpected browser error');results.push({name,status:'pass'});}
  catch(error) {results.push({name,status:'fail',message:error.message});process.exitCode=1;}
  console.log(name+': '+results.at(-1).status);
}
let fixture;
try {
  // Reuse the established CIO selection + question-composer journey to obtain
  // a current valid fixture. Original source data remain only in ignored output.
  const {context,page}=await fresh();
  try {
    await saved(page);await go(page,'grondslagen');
    await page.getByRole('group',{name:'Bronnen verkennen',exact:true}).getByRole('button',{name:/^Wetten/}).click();
    const all=page.getByRole('button',{name:'Toon alle bronnen',exact:true});
    const open=page.getByRole('button',{name:'Open in viewer: Besluit CIO-stelsel Rijksdienst 2026',exact:true}).first();
    await Promise.race([all.waitFor(),open.waitFor()]);if(await all.isVisible())await all.click();
    await open.click();await page.locator('.point-choice-button').first().click();
    await page.locator('.law-detail .law-choice-card').first().getByRole('checkbox').click();
    await page.keyboard.press('Escape');await go(page,'mijn-kader');
    await page.getByRole('button',{name:'Bekijk mijn vraagopzet',exact:true}).click();
    await page.locator('.composer-subquestions [role=checkbox]').first().click();
    await page.getByRole('button',{name:'Gebruik deze opzet',exact:true}).click();await saved(page);
    fixture=parseProjectText(await downloaded(page,'Bewaar project','fixture-ui.json'));
    assert.equal(fixture.draft.included.length,1);assert(fixture.draft.research.links.length);
    fixture.draft.title='Fictieve opslagproef';
    fixture.draft.overrides[fixture.draft.included[0]]={...fixture.draft.overrides[fixture.draft.included[0]],objective:'Fictief eigen doel'};
    fixture.draft.notes[fixture.draft.included[0]]='Fictieve eigen notitie 🧭';
    fixture.draft.research.questions[0].text='Hoe werkt het fictieve team samen?';
    await upload(page,fixture);await saved(page);
    // Assert normalization has not discarded our own content, then use the
    // restored version as the exact comparison basis for every storage scenario.
    const restored=parseProjectText(await downloaded(page,'Bewaar project','fixture.json'));
    assert.equal(restored.draft.overrides[restored.draft.included[0]].objective,'Fictief eigen doel');
    assert.equal(restored.draft.notes[restored.draft.included[0]],'Fictieve eigen notitie 🧭');
    assert.equal(restored.draft.research.questions[0].text,'Hoe werkt het fictieve team samen?');
    fixture=restored;
  } finally {await context.close();}
  const seed=serializeProject(fixture);
  const altered=title=>({...structuredClone(fixture),draft:{...structuredClone(fixture.draft),title}});

  for(const mode of ['quota','write-denied'])await scenario(mode+' preserves work and explicit resume',async()=>{
    const {context,page}=await fresh(seed);
    try {
      await saved(page);const before=await raw(page);await setMode(page,mode);
      await go(page,'start');await blocked(page);assert.equal(await raw(page),before);
      const changed=altered('Fictief onbewaard werk '+mode);
      await upload(page,changed);await blocked(page);
      assert.equal(await raw(page),before);
      await help(page);
      await page.screenshot({path:join(out,mode+'-recovery.png')});
      if(mode==='quota') {
        await page.setViewportSize({width:390,height:844});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        await page.screenshot({path:join(out,'quota-narrow.png'),animations:'disabled'});
        const bounds=await page.getByRole('dialog').boundingBox();
        assert(bounds.x>=0 && bounds.x+bounds.width<=391,'Storage dialog must fit the narrow viewport');
      }
      assert.equal(await page.getByRole('button',{name:'Huidige werk opslaan en doorgaan',exact:true}).isEnabled(),false);
      const current=parseProjectText(await downloaded(page,'Bewaar huidige werk',mode+'-current.json'));
      assert.deepEqual(current.draft,changed.draft);
      assert.equal(await downloaded(page,'Bewaar oorspronkelijke versie',mode+'-original.json'),before);
      await resume(page);await blocked(page);assert.equal(await raw(page),before);
      await setMode(page,'none');
      await page.getByRole('button',{name:'Huidige werk opslaan en doorgaan',exact:true}).click();
      await saved(page);assert.deepEqual((await read(page)).draft,current.draft);
      await page.reload();await saved(page);assert.deepEqual((await read(page)).draft,current.draft);
    } finally {await context.close();}
  });

  await scenario('read denial stays usable and explains unavailable storage',async()=>{
    const {context,page}=await fresh(seed,'read-denied');
    try {
      await blocked(page);assert.equal(await raw(page),seed);await help(page);
      const explanation=await page.getByRole('dialog').innerText();
      assert.equal(await page.getByRole('button',{name:'Huidige werk opslaan en doorgaan',exact:true}).isEnabled(),false);
      await downloaded(page,'Bewaar huidige werk','denied-session.json');
      await page.getByRole('button',{name:'Sluiten',exact:true}).click();
      await setMode(page,'none');await help(page);
      assert.equal(await downloaded(page,'Bewaar oorspronkelijke versie','denied-original.json'),seed);
      assert.match(explanation,/browseropslag.*(niet|geblokkeerd)|geen toegang/i);
    } finally {await context.close();}
  });

  await scenario('corrupt imports preserve current project and save status',async()=>{
    const {context,page}=await fresh(seed);
    try {
      await saved(page);const before=await raw(page);
      for(const value of ['{broken', JSON.stringify({format:'rijksmap-project-compressed',version:1,encoding:'zlib-base64',expandedBytes:12,data:'!!!'}), {...fixture,version:999}, {...fixture,workspace:{openIds:42}}]) {
        await upload(page,value);
        await page.getByText(/Je huidige onderzoek is behouden\./).first().waitFor();
        await saved(page);assert.equal(await raw(page),before);
        const current=parseProjectText(await downloaded(page,'Bewaar project','rejected-import.json'));
        assert.deepEqual(current.draft,fixture.draft);
      }
    } finally {await context.close();}
  });

  await scenario('corrupt stored original is downloadable and checkpointed on valid import',async()=>{
    const corrupt='{broken original bytes 🧭';
    const {context,page}=await fresh(corrupt);
    try {
      await blocked(page);await help(page);
      assert.equal(await downloaded(page,'Bewaar oorspronkelijke versie','corrupt-original.json'),corrupt);
      await page.getByRole('button',{name:'Sluiten',exact:true}).click();
      await upload(page,fixture);await saved(page);
      assert.deepEqual((await read(page)).draft,fixture.draft);
      assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('rijksmap-project-v1-recovery-')).map(k=>localStorage.getItem(k))), [corrupt]);
    } finally {await context.close();}
  });

  await scenario('real cross-tab conflict preserves both revisions and rejects stale recovery',async()=>{
    const {context,page}=await fresh(seed);
    try {
      await saved(page);const original=await raw(page);
      const other=await context.newPage();await other.goto(target.href);await saved(other);
      const changed=altered('Fictief ander tabblad');await upload(other,changed);await saved(other);await blocked(page);
      await help(page);
      assert.deepEqual(parseProjectText(await downloaded(page,'Bewaar huidige werk','conflict-current.json')).draft,fixture.draft);
      assert.deepEqual(parseProjectText(await downloaded(page,'Bewaar oorspronkelijke versie','conflict-stored.json')).draft,changed.draft);
      const latest=altered('Fictief tweede wijziging');await upload(other,latest);await saved(other);
      await resume(page);await blocked(page);assert.deepEqual((await read(page)).draft,latest.draft);
      assert.notEqual(await raw(page),original);
    } finally {await context.close();}
  });

  await scenario('clearing storage in another tab immediately invalidates saved indicator',async()=>{
    const {context,page}=await fresh(seed);
    try {
      await saved(page);const other=await context.newPage();await other.goto(target.href);await saved(other);
      await other.evaluate(()=>localStorage.clear());await blocked(page);
      assert.equal(await raw(page),null);
      await help(page);
      assert.deepEqual(parseProjectText(await downloaded(page,'Bewaar huidige werk','cleared-current.json')).draft,fixture.draft);
      assert.equal(await page.getByRole('button',{name:'Bewaar oorspronkelijke versie',exact:true}).count(),0);
      assert.doesNotMatch(await page.getByRole('dialog').innerText(),/Bij verversen verschijnt de eerder opgeslagen versie\./);
    } finally {await context.close();}
  });

  await scenario('new project clears active work, retains recovery copies and explains complete clearing',async()=>{
    const {context,page}=await fresh();
    try {
      await saved(page);await upload(page,fixture);await saved(page);
      await page.evaluate(seed=>{
        localStorage.setItem('rijksmap-project-v1-before-open',seed);
        localStorage.setItem('rijksmap-project-v1-recovery-123',seed);
        localStorage.setItem('rijksmap-model-library-v1','fictional legacy value');
        sessionStorage.setItem('rijksmap-view-matrix-test','fictional preference');
      },seed);
      await page.getByRole('button',{name:'Nieuw project',exact:true}).click();
      const explanation=await page.getByRole('alertdialog').innerText();
      await page.getByRole('button',{name:'Wis project en begin opnieuw',exact:true}).click();await saved(page);
      const empty=await read(page);assert.equal(empty.draft.included.length,0);assert.equal(empty.draft.research.questions.length,0);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('rijksmap-view-matrix-test')),null);
      assert.equal(await page.evaluate(()=>localStorage.getItem('rijksmap-project-v1-recovery-123')),seed);
      assert.equal(await page.evaluate(()=>localStorage.getItem('rijksmap-project-v1-before-open')),seed);
      assert.equal(await page.evaluate(()=>localStorage.getItem('rijksmap-model-library-v1')),'fictional legacy value');
      await page.getByRole('button',{name:'Ongedaan maken',exact:true}).click();await saved(page);
      assert.deepEqual((await read(page)).draft,fixture.draft);
      await page.getByText('Lokale opslag en privacy',{exact:true}).click();
      const privacy=await page.locator('.product-footer').innerText();
      // Browser site-data removal, only in this fresh fictional context. Closing
      // every app tab prevents a running editor from recreating a project.
      await page.close();
      const cleaner=await context.newPage();
      const cdp=await context.newCDPSession(cleaner);
      await cdp.send('Storage.clearDataForOrigin',{origin:target.origin,storageTypes:'all'});
      await cleaner.goto(target.href);await saved(cleaner);
      assert.equal((await read(cleaner)).draft.included.length,0);
      assert.equal((await read(cleaner)).draft.research?.questions.length ?? 0,0);
      assert.deepEqual(await cleaner.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('rijksmap-project-v1-') || k==='rijksmap-model-library-v1')),[]);
      assert.match(explanation,/herstelkopie/i);assert.match(privacy,/sitegegevens/i);
    } finally {await context.close();}
  });

  // #277: een projectbestand van iemand anders kan HTML, script of extreem lange tekst
  // bevatten. Die tekst moet overal als tekst verschijnen en mag niets uitvoeren.
  await scenario('hostile project text stays text and runs nothing',async()=>{
    const kwaad=['<img src="x-kwaad" onerror="window.__kwaad=1">','<script>window.__kwaad=2</script>',
      '"><svg onload="window.__kwaad=3">','javascript:window.__kwaad=4','{{constructor.constructor("window.__kwaad=5")()}}','=HYPERLINK("https://example.invalid")'];
    const project=structuredClone(fixture),id=project.draft.included[0];
    project.draft.title='Kwaadaardige proef '+kwaad[0];
    project.draft.overrides[id]={...project.draft.overrides[id],objective:'Doel '+kwaad.join(' ')};
    project.draft.notes[id]=('Notitie '+kwaad.join(' ')+' ').repeat(20);
    project.draft.research.questions[0].text='Hoe '+kwaad[2]+' werkt dit?';
    const {context,page}=await fresh();
    let dialogs=0;page.on('dialog',()=>dialogs++);
    try {
      await saved(page);await upload(page,project);await saved(page);
      const restored=await read(page);
      assert.equal(restored.draft.title,project.draft.title);
      assert.equal(restored.draft.notes[id],project.draft.notes[id]);
      const seen=[];
      for(const hash of ['start','mijn-kader','kaderexport']) {
        await go(page,hash);await page.waitForTimeout(500);
        const check=await page.evaluate(()=>({ran:window.__kwaad,
          injected:document.querySelectorAll('img[src="x-kwaad"],svg[onload],script:not([src]):not([type])').length,
          handlers:[...document.querySelectorAll('*')].filter(e=>[...e.attributes].some(a=>/^on/i.test(a.name)&&/kwaad/.test(a.value))).length,
          links:[...document.querySelectorAll('a[href^="javascript:"]')].length,text:document.body.innerText}));
        assert.equal(check.ran,undefined,'Script uit projecttekst is uitgevoerd op #'+hash);
        assert.equal(check.injected+check.handlers+check.links,0,'Projecttekst werd HTML op #'+hash);
        seen.push(...[project.draft.title,'Doel '+kwaad.join(' '),project.draft.research.questions[0].text].filter(t=>check.text.includes(t)));
      }
      assert(seen.includes(project.draft.title),'De projecttitel moet letterlijk zichtbaar zijn');
      // Te lange tekst (boven de grens van 20.000 tekens per notitie) wordt geweigerd;
      // het huidige project blijft dan ongewijzigd.
      const before=await raw(page),lang=structuredClone(project);
      lang.draft.notes[id]=(kwaad[0]+' ').repeat(500);
      await upload(page,lang);
      await page.getByText(/Je huidige onderzoek is behouden\./).first().waitFor();
      await saved(page);assert.equal(await raw(page),before);
      assert.equal(await page.evaluate(()=>window.__kwaad),undefined);
      assert.equal(dialogs,0,'Projecttekst opende een dialoog');
    } finally {await context.close();}
  });
} finally {
  writeFileSync(join(out,'result.json'),JSON.stringify({url:target.href,browser:browser.version(),results,errors},null,2));
  await host.close();
}
assert(results.length>0,'No matching storage UI scenario');
assert.deepEqual(errors,[],'Unexpected browser error, including fixture setup');
assert.equal(results.filter(r=>r.status==='fail').length,0,'Storage UI regression failed; inspect ignored result.json');
