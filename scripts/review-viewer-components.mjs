// Synthetic browser checks of the actual shared components, without a database.
// No screen reader or human audit is represented by these DOM/keyboard assertions.
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,preview} from 'vite';
import react from '@vitejs/plugin-react';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'work/viewer-components');
mkdirSync(out,{recursive:true});
const run=mkdtempSync(resolve(out,'run-'));
const fixture=relative(root,run).split(sep).join('/');
writeFileSync(resolve(run,'index.html'),'<!doctype html><html lang="nl"><meta charset="utf-8"><title>Synthetic viewer test</title><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>');
writeFileSync(resolve(run,'fixture.tsx'),`
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import CriterionSourceLayout from '/app/criterion-source-layout.tsx';
import ScrollablePreview from '/app/scrollable-preview.tsx';
function Fixture(){
 const [active,setActive]=useState<'criterion'|'source'>('criterion');
 const [child,setChild]=useState(0),[wide,setWide]=useState(false);
 return <><button id="outside">Buiten de vergelijking</button>
 <CriterionSourceLayout active={active} onActive={setActive}
 criterion={<><p>Fictieve norm</p><button onClick={()=>setActive('source')}>Bekijk de bron</button></>}
 source={<><p>Fictieve bron</p><input aria-label="Bronnotitie" defaultValue="behouden"/></>}/>
 <button onClick={()=>setChild(n=>n+1)}>Vervang voorbeeld</button>
 <button onClick={()=>setWide(v=>!v)}>Wissel breedte</button>
 <style>{'.test-preview{width:200px;height:60px;overflow:auto}'}</style>
 <ScrollablePreview className="test-preview"><div key={child} style={{width:wide?600:80,height:30}}>Fictieve cellen</div></ScrollablePreview>
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
`);
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
assert(process.env.BROWSER_EXECUTABLE,'Set BROWSER_EXECUTABLE to a local test browser');
const config={configFile:false,root,plugins:[react()],logLevel:'error',
 build:{outDir:resolve(run,'web'),rollupOptions:{input:resolve(run,'index.html')}},
 preview:{host:'127.0.0.1',port:4366,strictPort:true}};
await build(config);
const server=await preview(config);
const results=[],errors=[];
let context;
try {
 context=await chromium.launchPersistentContext(resolve(run,'profile'),{headless:true,chromiumSandbox:true,
  executablePath:process.env.BROWSER_EXECUTABLE,viewport:{width:1440,height:900}});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:4366/${fixture}/index.html`);
 const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 const focused=locator=>locator.evaluate(el=>el===document.activeElement);
 const settle=()=>page.waitForTimeout(100); // Let focus/ResizeObserver delivery settle.
 await check('resize moves focus from the hidden source to the selected narrow tab',async()=>{
  await page.getByRole('textbox',{name:'Bronnotitie'}).focus();
  await page.setViewportSize({width:390,height:844});await settle();
  assert(await focused(page.getByRole('tab',{name:'Norm',exact:true})));
 });
 await check('narrow tabs expose matching panels, roving focus and all four navigation keys',async()=>{
  const norm=page.getByRole('tab',{name:'Norm',exact:true}),source=page.getByRole('tab',{name:'Bronpassage',exact:true});
  for(const [tab,key,next] of [[norm,'ArrowRight',source],[source,'Home',norm],[norm,'End',source],[source,'ArrowLeft',norm]]) {
   await tab.focus();await page.keyboard.press(key);
   assert(await focused(next));assert.equal(await next.getAttribute('aria-selected'),'true');
   assert.equal(await next.getAttribute('tabindex'),'0');
   const controlled=await next.getAttribute('aria-controls');
   assert(await page.locator(`[id="${controlled}"]`).isVisible());
   assert.equal(await page.locator(`[id="${controlled}"]`).getAttribute('aria-labelledby'),await next.getAttribute('id'));
  }
  assert.equal(await page.locator('.comparison-source').isVisible(),false);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[hidden]')),false);
 });
 await check('source action cannot leave focus in the panel it hides',async()=>{
  await page.getByRole('button',{name:'Bekijk de bron'}).focus();await page.keyboard.press('Enter');await settle();
  assert(await focused(page.getByRole('tab',{name:'Bronpassage',exact:true})));
  assert.equal(await page.getByRole('textbox',{name:'Bronnotitie'}).inputValue(),'behouden');
 });
 await check('expanding a focused narrow tab moves focus to its surviving panel',async()=>{
  await page.getByRole('tab',{name:'Bronpassage',exact:true}).focus();
  await page.setViewportSize({width:1440,height:900});await settle();
  assert(await focused(page.getByRole('region',{name:'Gemarkeerde bron en context'})));
 });
 await check('resize never steals focus from another control',async()=>{
  await page.locator('#outside').focus();await page.setViewportSize({width:390,height:844});await settle();
  assert(await focused(page.locator('#outside')));
 });
 await check('replacement preview content remains keyboard-scrollable only while overflowing',async()=>{
  const preview=page.getByRole('region',{name:'Voorbeeld van je werkblad'});
  assert.equal(await preview.getAttribute('tabindex'),'-1');
  await page.getByRole('button',{name:'Vervang voorbeeld'}).click();await settle();
  await page.getByRole('button',{name:'Wissel breedte'}).click();await settle();
  assert.equal(await preview.getAttribute('tabindex'),'0');
  await preview.focus();await page.keyboard.press('ArrowRight');await settle();
  assert(await preview.evaluate(el=>el.scrollLeft>0));
  await page.getByRole('button',{name:'Wissel breedte'}).click();await settle();
  assert.equal(await preview.getAttribute('tabindex'),'-1');
 });
 assert.deepEqual(errors,[]);
} finally {
 await context?.close();await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));
 writeFileSync(resolve(run,'results.json'),JSON.stringify({results,errors},null,2));
 for(const result of results)console.log(`${result.pass?'PASS':'FAIL'} ${result.name}`);
 console.log('Evidence: '+relative(root,run));
}
assert(results.length===6&&results.every(r=>r.pass),'Viewer component review failed; inspect local results.json');
