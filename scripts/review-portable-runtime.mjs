// Optional integration proof with private content. Uses fresh browser contexts;
// never reads or replaces the user's browser profile. Outputs stay under work/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {parseProjectText,serializeProject} from '../lib/project-codec.mjs';
import {unzipSync,strFromU8} from 'fflate';
import {assertImportedDraft} from './review-project-comparison.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const target=process.env.REVIEW_URL||'http://127.0.0.1:4319/';
const baseline=process.env.BASELINE_URL;
for(const url of [target,baseline].filter(Boolean)) {
  const parsed=new URL(url);
  assert(parsed.protocol==='http:'&&parsed.hostname==='127.0.0.1','Local previews only');
}
assert(baseline,'Set BASELINE_URL to a read-only preview of the previous build');
assert(process.env.BROWSER_EXECUTABLE,'Set BROWSER_EXECUTABLE to the test browser');
// A pilot can include one additional framework without hardcoding source IDs.
const pilotFramework=process.env.REVIEW_FRAMEWORK_TITLE;
const pilotContentHash=process.env.REVIEW_CONTENT_HASH;
if(pilotContentHash!==undefined)assert.match(pilotContentHash,/^[a-f0-9]{64}$/);
const frameworkCases=[['cio','Besluit CIO-stelsel Rijksdienst 2026','laws'],['wwke','Wet weerbaarheid kritieke entiteiten','laws'],
  ...(pilotFramework?[['pilot',pilotFramework,'frameworks']]:[])];
const out=resolve(process.env.REVIEW_OUT||'work/portable-runtime-review');
fs.mkdirSync(out,{recursive:!process.env.REVIEW_OUT});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
const errors=[],results=[],snapshots={},initialLoads={};
const saved=page=>page.locator('.project-save-indicator[data-state="saved"]').waitFor();
const read=async page=>{await page.waitForTimeout(350);await saved(page);return parseProjectText(await page.evaluate(()=>localStorage.getItem('rijksmap-project-v1')));};
const go=(page,hash)=>page.evaluate(h=>{location.hash='#'+h;},hash);
const fixtures={};
async function sourceAndSelection(page,title,{select=true,category='laws'}={}) {
  console.log('Checking framework: '+title);
  await go(page,'grondslagen');
  await page.getByRole('group',{name:'Bronnen verkennen',exact:true})
    .getByRole('button',{name:category==='frameworks'?/^Kaders/:/^Wetten/}).click();
  const all=page.getByRole('button',{name:'Toon alle bronnen',exact:true});
  const open=page.getByRole('button',{name:'Open in viewer: '+title,exact:true}).first();
  try {
    await Promise.race([all.waitFor(),open.waitFor()]);
    if(await all.isVisible())await all.click();
    await open.click();
  }
  catch(error){
    fs.writeFileSync(resolve(out,'framework-navigation-failure.txt'),await page.locator('body').innerText());
    await page.screenshot({path:resolve(out,'framework-navigation-failure.png')});throw error;
  }
  await page.locator('.point-choice-button').first().click();
  const dialog=page.locator('.law-detail');await dialog.waitFor();
  const point=dialog.locator('.law-choice-card').first();
  if(select){
    const checkbox=point.getByRole('checkbox');
    await checkbox.click();assert.equal(await checkbox.getAttribute('aria-checked'),'true');
    await checkbox.click();assert.equal(await checkbox.getAttribute('aria-checked'),'false');
    await checkbox.click();assert.equal(await checkbox.getAttribute('aria-checked'),'true');
  }
  await point.getByRole('button',{name:/^Bronpassage/}).click();
  await dialog.locator('.report-library mark').first().waitFor();
  const marks=await dialog.locator('.report-library mark').allTextContents();
  assert(marks.some(v=>v.trim()));
  await page.setViewportSize({width:900,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.setViewportSize({width:1920,height:1080});
  await page.keyboard.press('Escape');return marks;
}
try {
  // Create a current project through the established UI, not an obsolete fixture.
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  try {
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(baseline+'#begin');await saved(page);
    for(const [key,title,category] of frameworkCases)fixtures[key]=await sourceAndSelection(page,title,{category});
    await go(page,'rapporten');await page.getByRole('textbox',{name:'Zoek rapport',exact:true}).fill('CIBGBIO24-K01');
    await page.getByRole('button',{name:'Bekijk normen en toetspunten →',exact:true}).click();
    await page.getByRole('button',{name:'Kies toetspunten voor CIBGBIO24-K01',exact:true}).first().click();
    const detail=page.locator('.bd-pilot-detail'),point=detail.locator('.bd-point').first();
    await point.getByRole('checkbox').click();
    await point.getByRole('button',{name:'Bronpassage',exact:true}).click();
    await detail.locator('.report-library mark').first().waitFor();
    fixtures.report=await detail.locator('.report-library mark').allTextContents();
    await page.keyboard.press('Escape');
    await go(page,'modellen');await page.getByRole('button',{name:'Toon alle modellen',exact:true}).click();
    await page.getByRole('button',{name:/^Open in viewer:/}).first().click();
    await page.locator('.cev-question [role=checkbox]').first().click();
    assert.equal((await read(page)).draft.included.length,frameworkCases.length+2);
    await go(page,'mijn-kader');
    await page.getByRole('button',{name:'Bekijk mijn vraagopzet',exact:true}).click();
    await page.locator('.composer-subquestions [role=checkbox]').first().click();
    await page.getByRole('button',{name:'Gebruik deze opzet',exact:true}).click();
    const project=await read(page);
    assert(project.draft.research.questions.length>0);assert(project.draft.research.links.length>0);
    fixtures.project=project;
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Bewaar project',exact:true}).click();
    await(await pending).saveAs(resolve(out,'current-project.json'));
    // The UI composer links the chosen proposal. Supplement this private test
    // fixture with a cross-source question to exercise every selected source in Excel.
    project.draft.research.questions.push({id:'q-3',parent_id:null,origin:'user',
      text:'Migratietest: blijven de gekozen bronverwijzingen en bouwstenen behouden?'});
    project.draft.research.links.push(...project.draft.included.map(line_id=>({question_id:'q-3',line_id})));
    fs.writeFileSync(resolve(out,'current-project.json'),serializeProject(project));
    results.push('Current mixed project created in previous UI, including question links');
    console.log(results.at(-1));
  } finally {await context.close();}

  for(const [edition,url] of [['baseline',baseline],['separated',target]]) {
    const context=await browser.newContext({viewport:{width:1920,height:1080}});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(edition+': '+e.message));
    const calls=[];page.on('request',r=>{if(r.url().includes('/api/'))calls.push({method:r.method(),body:r.postData()});});
    try {
      await page.goto(url+'#begin');await saved(page);
      assert.equal(calls.length,0,'Empty start must not load the catalogue');
      initialLoads[edition]=await page.evaluate(()=>{
        const scripts=performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname.endsWith('.js'));
        return {
          scripts:scripts.length,
          decodedBytes:scripts.reduce((total,entry)=>total+entry.decodedBodySize,0),
          encodedBytes:scripts.reduce((total,entry)=>total+entry.encodedBodySize,0),
          sourceReaderLoaded:scripts.some(entry=>new URL(entry.name).pathname.includes('/foundation-source-reader-')),
        };
      });
      assert(initialLoads[edition].decodedBytes>0,'Initial script sizes must be measurable');
      if(edition==='separated')assert.equal(initialLoads[edition].sourceReaderLoaded,false,'An empty start must not download the deferred framework source reader');
      console.log(edition+' initial scripts: '+JSON.stringify(initialLoads[edition]));
      // Install the export clock only after native performance entries have been read.
      await page.clock.setFixedTime(new Date('2026-10-17T12:00:00Z'));
      await page.getByLabel('Open lokaal project of oud concept').setInputFiles(resolve(out,'current-project.json'));
      await page.getByText('Project geopend, inclusief modellen en werkplek.',{exact:false}).waitFor();
      let project=await read(page);
      assertImportedDraft(project.draft,fixtures.project.draft,edition==='separated'?pilotContentHash:undefined);
      assert.deepEqual(project.modelLibrary,fixtures.project.modelLibrary);
      await page.reload();await saved(page);project=await read(page);
      assertImportedDraft(project.draft,fixtures.project.draft,edition==='separated'?pilotContentHash:undefined);
      assert.deepEqual(project.modelLibrary,fixtures.project.modelLibrary);
      await go(page,'mijn-kader');
      const options=page.getByRole('button',{name:/^Vraagopties voor /}).first();
      await options.click();
      await page.getByRole('menuitem',{name:'Vraag bewerken',exact:true}).click();
      const editor=page.locator('textarea[data-question-id]').first();
      await editor.waitFor();
      await page.waitForFunction(()=>document.activeElement?.matches('textarea[data-question-id]'));
      await page.locator('.question-edit').getByRole('button',{name:'Gereed',exact:true}).click();
      await options.click();
      await page.getByRole('menuitem',{name:'Vraag verwijderen…',exact:true}).click();
      await page.getByRole('alertdialog').getByRole('button',{name:'Annuleren',exact:true}).click();
      await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('Vraagopties voor '));
      assertImportedDraft((await read(page)).draft,fixtures.project.draft,edition==='separated'?pilotContentHash:undefined);
      results.push(edition+': question menu moves focus to editing and restores it after cancellation');
      for(const [key,title,category] of frameworkCases) {
        assert.deepEqual(await sourceAndSelection(page,title,{select:false,category}),fixtures[key]);
      }
      assert.deepEqual((await read(page)).draft.included,fixtures.project.draft.included);
      await go(page,'open-themas');
      await page.getByRole('button',{name:'Kies toetspunten voor CIBGBIO24-K01',exact:true}).first().click();
      const report=page.locator('.bd-pilot-detail');
      await report.locator('.bd-point').first().getByRole('button',{name:'Bronpassage',exact:true}).click();
      await report.locator('.report-library mark').first().waitFor();
      assert.deepEqual(await report.locator('.report-library mark').allTextContents(),fixtures.report);
      await page.keyboard.press('Escape');
      await go(page,'kaderexport');await page.getByRole('group',{name:'Werkvorm',exact:true}).waitFor();
      snapshots[edition]={};
      for(const [index,name] of ['testing','matrix','interview'].entries()) {
        await page.getByRole('group',{name:'Werkvorm',exact:true}).getByRole('button').nth(index).click();
        if(name==='testing') {
          for(const id of ['testing-aspect-opzet','testing-aspect-bestaan']) {
            const checkbox=page.locator('#'+id).locator('..').getByRole('checkbox');
            if(await checkbox.getAttribute('aria-checked')!=='true')await checkbox.click();
          }
        }
        if(name==='interview') {
          const checkbox=page.locator('#interview-level-operational').locator('..').getByRole('checkbox');
          if(await checkbox.getAttribute('aria-checked')!=='true')await checkbox.click();
        }
        fs.writeFileSync(resolve(out,edition+'-before-export.txt'),await page.locator('body').innerText());
        const [download]=await Promise.all([page.waitForEvent('download'),
          page.getByRole('button',{name:'Download Excel (.xlsx)',exact:true}).click()]);
        const path=resolve(out,edition+'-'+name+'.xlsx');await download.saveAs(path);
        const files=unzipSync(fs.readFileSync(path));assert(files['xl/workbook.xml']);
        snapshots[edition][name]=Object.fromEntries(Object.keys(files).sort().map(key=>[key,strFromU8(files[key])]));
        console.log(edition+' export '+name);
      }
      await page.screenshot({path:resolve(out,edition+'-export.png')});
      if(edition==='separated') {
        await page.locator('.creator-sheet-list button').filter({hasText:'02 Onderzoeksvragen'}).click();
        const scroll=page.getByRole('region',{name:'Voorbeeld van je werkblad',exact:true});
        await scroll.waitFor();
        // Exercise both ResizeObserver branches without changing project data.
        await scroll.evaluate(el=>{el.style.width='240px';el.querySelector('table').style.minWidth='1200px';});
        await page.waitForFunction(()=>document.querySelector('.creator-table-scroll')?.tabIndex===0);
        await scroll.focus();await page.keyboard.press('ArrowRight');
        await page.waitForFunction(()=>document.querySelector('.creator-table-scroll')?.scrollLeft>0);
        await scroll.evaluate(el=>{el.style.width='3000px';el.style.maxWidth='none';el.style.maxHeight='none';el.querySelector('table').style.minWidth='0';});
        await page.waitForFunction(()=>document.querySelector('.creator-table-scroll')?.tabIndex===-1);
        results.push('separated: overflowing preview is keyboard-scrollable; fitting preview adds no tab stop');
      }
      assert(calls.every(c=>c.method==='GET'&&c.body===null),'Only read-only API requests');
      results.push(edition+': project, selections, source markings, questions, reload and three exports');
      // A conflicting tab must still guard against accidental navigation. The
      // conflict is simulated in this disposable context, not in user storage.
      assert.equal(await page.evaluate(()=>{
        const event=new Event('beforeunload',{cancelable:true});
        window.dispatchEvent(event);return event.defaultPrevented;
      }),false,'Saved project does not block leaving');
      await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{
        key:'rijksmap-project-v1',newValue:'synthetic-conflict',storageArea:localStorage,url:location.href,
      })));
      await page.getByText('Het project is in een ander tabblad gewijzigd.',{exact:false}).waitFor();
      const dialogPromise=page.waitForEvent('dialog');
      const navigation=page.goto(new URL('?storage-warning-probe=1',page.url()).href).catch(error=>error);
      const dialog=await dialogPromise;
      assert.equal(dialog.type(),'beforeunload');
      await dialog.dismiss();
      const cancelled=await navigation;
      assert(cancelled instanceof Error&&/ERR_ABORTED/.test(cancelled.message),'Declining the warning cancels navigation');
      assert(!page.url().includes('storage-warning-probe'));
      results.push(edition+': storage conflict still triggers a cancellable browser warning');
    } catch(error) {
      fs.writeFileSync(resolve(out,edition+'-failure.txt'),await page.locator('body').innerText());
      await page.screenshot({path:resolve(out,edition+'-failure.png')});throw error;
    } finally {await context.close();}
  }
  assert.deepEqual(snapshots.separated,snapshots.baseline,'All workbook parts must retain their exact content');
  assert.deepEqual(errors,[]);results.push('Exact Excel content equivalence across all three workforms');
  console.log(results.join('\n'));
} finally {
  await browser.close();fs.writeFileSync(resolve(out,'results.json'),JSON.stringify({results,errors,initialLoads},null,2));
}
