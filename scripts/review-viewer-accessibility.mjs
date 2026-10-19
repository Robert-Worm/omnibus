// Optional read-only, pinned-content browser proof. This is DOM/keyboard evidence,
// not assistive-technology testing. Each run creates its own profile under work/.
// Usage: node scripts/review-viewer-accessibility.mjs --settings <file> --web-root <build> --port 4365
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startDatabasePreview,parsePreviewArgs} from './serve-database-web.mjs';
import {parseProjectText} from '../lib/project-codec.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const options=parsePreviewArgs(process.argv.slice(2));
assert([4365,4366].includes(options.port),'Use a reserved review port (4365 or 4366)');
assert(options.release&&options.publication&&options.webRoot,'Explicit settings and separate web build required');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
assert(process.env.BROWSER_EXECUTABLE,'Set BROWSER_EXECUTABLE to a local test browser');
mkdirSync(resolve(root,'work/viewer-accessibility'),{recursive:true});
const out=mkdtempSync(resolve(root,'work/viewer-accessibility/review-'));
const server=await startDatabasePreview(options);
const results=[],errors=[],requests=[],snapshots={};
let context,page;
async function check(name,fn){
 try{await fn();results.push({name,pass:true});}
 catch(error){
  results.push({name,pass:false,error:error.message});
  await page.screenshot({path:resolve(out,`failure-${results.length}.png`)});
 }
 console.log(`${results.at(-1).pass?'PASS':'FAIL'} ${name}`);
}
const focused=locator=>locator.evaluate(el=>el===document.activeElement);
const settle=()=>page.waitForTimeout(150);
const go=hash=>page.evaluate(h=>{location.hash='#'+h;},hash);
async function draft(){
 await settle();
 await page.locator('.project-save-indicator[data-state="saved"]').waitFor();
 return parseProjectText(await page.evaluate(()=>localStorage.getItem('rijksmap-project-v1'))).draft;
}
async function dialogChecks(dialog,key){
 const waitForContainedFocus=async()=>{
  // Base UI installs/returns focus asynchronously around its opening transition.
  // Wait for that actual result; never focus the dialog to make this check pass.
  const id=await dialog.getAttribute('id');assert(id);
  await page.waitForFunction(id=>document.getElementById(id)?.contains(document.activeElement),id,{timeout:2000});
 };
 await check(key+': modal semantics (dialog owner)',async()=>{
  assert.equal(await dialog.getAttribute('aria-modal'),'true');
 });
 await check(key+': dialog name, initial focus and contained forward/backward keyboard focus',async()=>{
  assert(await dialog.evaluate(el=>(el.getAttribute('aria-labelledby')||'').split(' ').some(id=>document.getElementById(id)?.textContent.trim())));
  await waitForContainedFocus();
  const close=dialog.getByRole('button',{name:'Sluiten',exact:true});
  await close.focus();await page.keyboard.press('Shift+Tab');
  await waitForContainedFocus();
  const done=dialog.getByRole('button',{name:'Gereed',exact:true});
  await done.focus();await page.keyboard.press('Tab');
  await waitForContainedFocus();
  assert.equal(await focused(done),false);
 });
}
async function rawSnapshot(lib){
 const raw=lib.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true});
 await raw.focus();await page.keyboard.press('Enter');await settle();
 const pre=lib.locator('pre.report-page-text');await pre.waitFor();
 const marks=await pre.locator('mark').evaluateAll(nodes=>nodes.map(el=>({start:Number(el.dataset.passageStart),end:Number(el.dataset.passageEnd),text:el.textContent})));
 assert(marks.length>0);
 for(const mark of marks)assert.equal(Array.from(mark.text).length,mark.end-mark.start,'Raw marks retain exact Unicode spans');
 return {text:await pre.textContent(),marks};
}
async function sourceChecks(dialog,key,isLaw){
 const lib=dialog.locator('.report-library');await lib.locator('mark').first().waitFor();
 snapshots[key]=await rawSnapshot(lib);
 await check(key+': reading tabs retain focus and exact raw source marks',async()=>{
  const reading=lib.getByRole('tab',{name:'Leesweergave',exact:true});
  const raw=lib.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true});
  await reading.focus();await page.keyboard.press('Enter');await settle();
  await page.keyboard.press('ArrowRight');assert(await focused(raw));
  await page.keyboard.press('Enter');await settle();
  assert.equal(await raw.getAttribute('aria-selected'),'true');assert(await focused(raw));
  assert.deepEqual(await rawSnapshot(lib),snapshots[key]);
 });
 if(isLaw)await check(key+': repeat passage action preserves raw mode and focuses its visible mark',async()=>{
  await dialog.locator('.cio-source-record-heading button').first().focus();await page.keyboard.press('Enter');await settle();
  assert.equal(await lib.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true}).getAttribute('aria-selected'),'true');
  assert(await page.evaluate(()=>document.activeElement.matches('mark')&&document.activeElement.getClientRects().length>0));
  assert.deepEqual(await rawSnapshot(lib),snapshots[key]);
 });
 await check(key+': narrow tabs expose named panels without hidden focus or page overflow',async()=>{
  // Force the next resize to hide the currently focused panel.
  // WWKE's passage action selects Source; normalize all cases before hiding it.
  await page.setViewportSize({width:900,height:900});
  await dialog.locator('.criterion-source-tabs').getByRole('tab',{name:'Norm',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await lib.getByRole('tab',{name:'Leesweergave',exact:true}).focus();
  await page.setViewportSize({width:390,height:844});await settle();
  const tabs=dialog.locator('.criterion-source-tabs');
  const norm=tabs.getByRole('tab',{name:'Norm',exact:true}),source=tabs.getByRole('tab',{name:'Bronpassage',exact:true});
  assert(await focused(norm));
  for(const [key,next] of [['End',source],['Home',norm],['ArrowRight',source],['ArrowLeft',norm]]){
   await page.keyboard.press(key);assert(await focused(next));assert.equal(await next.getAttribute('aria-selected'),'true');
   const id=await next.getAttribute('aria-controls');
   const panel=dialog.locator(`[id="${id}"]`);assert(await panel.isVisible());
   assert.equal(await panel.getAttribute('aria-labelledby'),await next.getAttribute('id'));
  }
  await page.keyboard.press('End');
  for(let i=0;i<10;i++){
   await page.keyboard.press('Tab');
   assert(await dialog.evaluate(el=>el.contains(document.activeElement)&&!document.activeElement.closest('[hidden]')));
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:resolve(out,key+'-narrow.png')});
 });
 await page.setViewportSize({width:1440,height:1000});
 let pageNavigation;
 await check(key+': page controls can leave and return to the exact marked page',async()=>{
  const input=lib.getByRole('spinbutton',{name:'Pagina',exact:true});
  const original=Number(await input.inputValue()),max=Number(await input.getAttribute('max'));
  const next=original<max?original+1:original-1;assert(next>=1);
  await input.fill(String(next));await page.keyboard.press('Enter');
  await lib.locator(`[aria-label="Leesweergave pagina ${next}"], [aria-label="Ongewijzigde brontekst pagina ${next}"]`).first().waitFor({state:'attached'});
  pageNavigation={raw:await lib.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true}).getAttribute('aria-selected'),
   focus:await page.evaluate(()=>({input:document.activeElement.matches('input[type=number]'),mark:document.activeElement.matches('mark')}))};
  await input.fill(String(original));await page.keyboard.press('Enter');
  await lib.locator(`[aria-label="Leesweergave pagina ${original}"], [aria-label="Ongewijzigde brontekst pagina ${original}"]`).first().waitFor({state:'attached'});
  assert.deepEqual(await rawSnapshot(lib),snapshots[key]);
 });
 if(!isLaw)await check('report: page loading preserves reader mode and focus (loader owner)',async()=>{
  assert.equal(pageNavigation?.raw,'true');
  assert(pageNavigation?.focus.input||pageNavigation?.focus.mark);
 });
 if(isLaw)await check(key+': source contributions switch and restore their exact marked text',async()=>{
  const links=dialog.locator('.cio-source-links button');assert(await links.count()>1);
  const firstId=await dialog.locator('.cio-source-link-card.is-active').getAttribute('data-record-id');
  await links.nth(1).click();await settle();
  const other=await rawSnapshot(lib);assert.notDeepEqual(other.marks,snapshots[key].marks);
  snapshots[key+'-contribution']=other;
  await dialog.locator(`[data-record-id="${firstId}"] button`).first().click();
  await lib.locator('mark').first().waitFor();
  assert.deepEqual(await rawSnapshot(lib),snapshots[key]);
 });
 if(!isLaw)await check('report: named source contribution control and narrow focus survive changing evidence',async()=>{
  await page.setViewportSize({width:390,height:844});
  const tabs=dialog.locator('.criterion-source-tabs');
  await tabs.getByRole('tab',{name:'Norm',exact:true}).click();
  const select=dialog.getByRole('combobox',{name:'Bronbijdrage',exact:true});
  assert(await select.locator('option').count()>1);
  await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await settle();
  assert.equal(await tabs.getByRole('tab',{name:'Bronpassage',exact:true}).getAttribute('aria-selected'),'true');
  assert(await dialog.evaluate(el=>el.contains(document.activeElement)&&document.activeElement!==el&&!document.activeElement.closest('[hidden]')));
  await lib.locator('mark').first().waitFor();
  snapshots['report-contribution']=await rawSnapshot(lib);
  await tabs.getByRole('tab',{name:'Norm',exact:true}).click();await select.selectOption('0');
  assert.deepEqual(await rawSnapshot(lib),snapshots[key]);
  await page.setViewportSize({width:1440,height:1000});
 });
 // Preserve a private semantic tree for inspection without printing source text.
 writeFileSync(resolve(out,key+'-semantics.txt'),await dialog.ariaSnapshot());
}
try{
 context=await chromium.launchPersistentContext(resolve(out,'profile'),{headless:true,chromiumSandbox:true,
  executablePath:process.env.BROWSER_EXECUTABLE,viewport:{width:1440,height:1000}});
 page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(request.url().includes('/api/'))requests.push({method:request.method(),body:request.postData()});});
 await page.goto(server.url+'#begin',{waitUntil:'domcontentloaded',timeout:45000});await draft();
 for(const [key,title] of [['cio','Besluit CIO-stelsel Rijksdienst 2026'],['wwke','Wet weerbaarheid kritieke entiteiten']]){
  await go('grondslagen');
  await page.getByRole('group',{name:'Bronnen verkennen',exact:true}).getByRole('button',{name:/^Wetten/}).click();
  const all=page.getByRole('button',{name:'Toon alle bronnen',exact:true});
  const open=page.getByRole('button',{name:'Open in viewer: '+title,exact:true}).first();
  await Promise.race([all.waitFor(),open.waitFor()]);if(await all.isVisible())await all.click();await open.click();
  const opener=page.locator('.point-choice-button').first();await opener.focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');await dialog.waitFor();await dialogChecks(dialog,key);
  const choice=dialog.locator('.law-choice-card').first();await choice.getByRole('checkbox').click();
  const before=await draft();
  await choice.getByRole('button',{name:/^Bronpassage/}).click();await sourceChecks(dialog,key,true);
  await check(key+': Escape restores the opener and source browsing leaves the project intact',async()=>{
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await settle();
   assert(await focused(opener));assert.deepEqual(await draft(),before);
  });
 }
 await go('rapporten');await page.getByRole('textbox',{name:'Zoek rapport',exact:true}).fill('CIBGBIO24-K01');
 await page.getByRole('button',{name:'Bekijk normen en toetspunten →',exact:true}).click();
 const opener=page.getByRole('button',{name:'Kies toetspunten voor CIBGBIO24-K01',exact:true}).first();
 await opener.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog');await dialog.waitFor();await dialogChecks(dialog,'report');
 const point=dialog.locator('.bd-point').first();await point.getByRole('checkbox').click();const before=await draft();
 await point.getByRole('button',{name:'Bronpassage',exact:true}).click();await sourceChecks(dialog,'report',false);
 await check('report: Escape restores the opener and browsing preserves the project',async()=>{
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await settle();
  assert(await focused(opener));assert.deepEqual(await draft(),before);
 });
 await check('read-only requests and no browser exceptions',async()=>{
  assert(requests.length>0&&requests.every(request=>request.method==='GET'&&request.body===null));assert.deepEqual(errors,[]);
 });
 if(process.env.VIEWER_BASELINE_RESULTS)await check('exact raw source equivalence with baseline',async()=>{
  const baseline=JSON.parse(readFileSync(process.env.VIEWER_BASELINE_RESULTS,'utf8'));
  assert.equal(baseline.release,options.release);assert.equal(baseline.publication,options.publication);
  assert(Object.keys(baseline.snapshots).length>=5,'Baseline must cover all three viewers and law contributions');
  for(const [key,snapshot] of Object.entries(baseline.snapshots))assert.deepEqual(snapshots[key],snapshot);
 });
}finally{
 await context?.close();await server.close();
 writeFileSync(resolve(out,'results.json'),JSON.stringify({release:options.release,publication:options.publication,results,errors,snapshots},null,2));
 console.log('Evidence: '+relative(root,out));
}
assert(results.length>=19&&results.every(r=>r.pass),'Viewer review failed; inspect local results.json');
