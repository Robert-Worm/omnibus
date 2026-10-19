// Synthetic transport + real React reader proof, not a human screen-reader audit.
// Actual source hashing/validation is exercised through browser fetch interception.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,preview} from 'vite';
import react from '@vitejs/plugin-react';

const root=fileURLToPath(new URL('../',import.meta.url));
mkdirSync(resolve(root,'work/database-reader-review'),{recursive:true});
const out=mkdtempSync(resolve(root,'work/database-reader-review/run-'));
const fixture=relative(root,out).split(sep).join('/');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pages=['Fictieve bron één 😀 AAAAA.','Fictieve bron twee 🧭 BBBBB.','Fictieve bron drie CCCCC.']
 .map((text,i)=>({page:i+1,text}));
let offset=0;
const bodies=pages.map(page=>{
 const start=offset;offset+=Array.from(page.text).length;
 return {page,start,end:offset,sha256:hash(page)};
});
const version=hash('synthetic version'),release=hash('synthetic release'),sourceHash=hash(pages);
const index={version,metadata:{id:'SYNTHETIC',source_sha256:sourceHash},
 pages:bodies.map(({page,...metadata})=>({...metadata,page:page.page})),contents:[]};
const passages=bodies.map(({page,start})=>{
 const quote=['AAAAA','BBBBB','CCCCC'][page.page-1];
 const from=start+Array.from(page.text.split(quote)[0]).length;
 return {page:page.page,start:from,end:from+5,quote,label:'Fictieve passage '+page.page};
});
const source={source_sha256:sourceHash,pages:[],databaseSource:{schema:1,release,version,indexHash:hash(index)}};
writeFileSync(resolve(out,'index.html'),'<!doctype html><html lang="nl"><meta charset="utf-8"><title>Synthetic reader test</title><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>');
writeFileSync(resolve(out,'fixture.tsx'),`
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import DatabaseReportLibrary from '/app/database-report-library.tsx';
const source=${JSON.stringify(source)},passages=${JSON.stringify(passages)};
const readerDocument={id:'SYNTHETIC',title:'Fictief brondocument'};
function Fixture(){
 const [page,setPage]=useState(1),[evidence,setEvidence]=useState(0);
 return <><button id="outside">Andere bediening</button>
 {passages.map((p,i)=><button key={i} onClick={()=>{setEvidence(i);setPage(p.page);}}>Bronbijdrage {i+1}</button>)}
 <DatabaseReportLibrary document={readerDocument} source={source} page={page} onPage={setPage}
 sourcePassages={[passages[evidence]]} sourceTarget={passages[evidence].start} sourceFocusRequest={evidence}
 reportThemes={[]} onTopic={()=>{}} onClearEvidence={()=>{}} onReturn={()=>{}}/>
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
`);
// Only private-report-only entry points are excluded. Fail if a test uses one.
// All rendering blocks, marking, display transforms and transport validation stay real.
writeFileSync(resolve(out,'reader-adapter.mjs'),`
export {rawUnits,markedSegments,readingBlocks} from '/lib/source-text-blocks.mjs';
export function referenceLabel(){throw Error('Synthetic document has no report evidence labels');}
`);
writeFileSync(resolve(out,'display-adapter.mjs'),`
export function reportDisplaySource(reportId,source){
 if(reportId!==undefined)throw Error('Private report presentation is outside this synthetic test');
 return source;
}
`);
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
assert(process.env.BROWSER_EXECUTABLE,'Set BROWSER_EXECUTABLE to a local test browser');
const config={configFile:false,root,plugins:[react()],logLevel:'error',resolve:{alias:[
 {find:'@/lib/report-reader.mjs',replacement:resolve(out,'reader-adapter.mjs')},
 {find:'@/lib/report-display-context.mjs',replacement:resolve(out,'display-adapter.mjs')},
 {find:'@',replacement:root}]},
 build:{outDir:resolve(out,'web'),rollupOptions:{input:resolve(out,'index.html')}},
 preview:{host:'127.0.0.1',port:4366,strictPort:true}};
await build(config);const server=await preview(config);
const results=[],errors=[];let context;
const response=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)});
const frame=page=>page.locator('.report-library').evaluate(el=>({text:el.querySelector('pre.report-page-text')?.textContent,
 marks:[...el.querySelectorAll('pre.report-page-text mark')].map(mark=>({start:Number(mark.dataset.passageStart),end:Number(mark.dataset.passageEnd),text:mark.textContent}))}));
const expected=n=>({text:pages[n-1].text,marks:[{start:passages[n-1].start,end:passages[n-1].end,text:passages[n-1].quote}]});
const focused=locator=>locator.evaluate(el=>el===document.activeElement);
async function check(name,run){
 const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',error=>errors.push(error.message));
 const pending=new Map();let fail=false,corrupt=false;
 await page.route('**/api/v1/documents/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/index'))return route.fulfill(response(index));
  const number=Number(url.pathname.split('/').at(-1));
  assert(number>=1&&number<=3,'Unexpected synthetic page request');
  if(number===1)return route.fulfill(response(bodies[0]));
  if(fail){fail=false;return route.fulfill({status:503,body:'Synthetic temporary failure'});}
  if(corrupt){corrupt=false;return route.fulfill(response({...bodies[number-1],start:0}));}
  pending.set(number,route);
 });
 const release=async n=>{assert(pending.has(n));await pending.get(n).fulfill(response(bodies[n-1]));pending.delete(n);};
 const waitPending=async n=>{
  for(let i=0;i<100&&!pending.has(n);i++)await page.waitForTimeout(20);
  assert(pending.has(n),'Expected held page request');
 };
 try{
  await page.goto(`http://127.0.0.1:4366/${fixture}/index.html`,{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true}).click();
  assert.deepEqual(await frame(page),expected(1));
  await page.evaluate(()=>{window.originalReader=document.querySelector('.report-library');});
  await run({page,release,waitPending,fail:()=>{fail=true;},corrupt:()=>{corrupt=true;}});
  assert.equal(await page.evaluate(()=>window.originalReader===document.querySelector('.report-library')),true,'Reader identity stays stable');
  results.push({name,pass:true});
 }catch(error){results.push({name,pass:false,error:error.message});await page.screenshot({path:resolve(out,`failure-${results.length}.png`)});}
 finally{await page.close();}
 console.log(`${results.at(-1).pass?'PASS':'FAIL'} ${name}`);
}
async function hiddenOldFrame(page){
 assert.equal(await page.locator('.report-library').isVisible(),false);
 assert.equal(await page.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true}).count(),0,'Hidden reader is absent from accessible controls');
 assert.deepEqual(await frame(page),expected(1),'Old text retains its old offsets and marks, even in hidden DOM');
}
async function ready(page,n){
 await page.locator(`pre[aria-label="Ongewijzigde brontekst pagina ${n}"]`).waitFor();
 assert.equal(await page.getByRole('tab',{name:'Ongewijzigde brontekst',exact:true}).getAttribute('aria-selected'),'true');
}
try{
 context=await chromium.launchPersistentContext(resolve(out,'profile'),{headless:true,chromiumSandbox:true,
  executablePath:process.env.BROWSER_EXECUTABLE,viewport:{width:1200,height:900}});
 await check('delayed page navigation retains raw mode, input focus and the reader instance',async({page,waitPending,release})=>{
  const input=page.getByRole('spinbutton',{name:'Pagina',exact:true});
  await input.fill('2');await page.keyboard.press('Enter');await waitPending(2);
  await hiddenOldFrame(page);assert(await focused(page.getByRole('status')));
  await release(2);await ready(page,2);
  assert(await focused(input));assert.deepEqual(await frame(page),{text:pages[1].text,marks:[]});
 });
 await check('delayed evidence change cannot put new offsets on old text',async({page,waitPending,release})=>{
  await page.getByRole('button',{name:'Bronbijdrage 2',exact:true}).click();await waitPending(2);
  await hiddenOldFrame(page);
  await release(2);await ready(page,2);assert.deepEqual(await frame(page),expected(2));
  assert(await focused(page.locator('pre.report-page-text mark')));
 });
 await check('failed fetch and delayed retry keep a coherent hidden frame and restore focus',async({page,waitPending,release,fail})=>{
  fail();await page.getByRole('button',{name:'Bronbijdrage 2',exact:true}).click();
  await page.getByRole('alert').waitFor();await hiddenOldFrame(page);
  const retry=page.getByRole('button',{name:'Opnieuw proberen',exact:true});await retry.focus();await page.keyboard.press('Enter');
  await waitPending(2);await hiddenOldFrame(page);assert(await focused(page.getByRole('status')));
  await release(2);await ready(page,2);assert.deepEqual(await frame(page),expected(2));
  assert(await focused(page.locator('pre.report-page-text mark')));
 });
 await check('wrong response coordinates are rejected before display and correct retry succeeds',async({page,waitPending,release,corrupt})=>{
  corrupt();await page.getByRole('button',{name:'Bronbijdrage 2',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'De bronpagina komt niet overeen'}).waitFor();await hiddenOldFrame(page);
  await page.getByRole('button',{name:'Opnieuw proberen',exact:true}).click();await waitPending(2);
  await release(2);await ready(page,2);assert.deepEqual(await frame(page),expected(2));
 });
 await check('aborted slow response cannot replace a later verified source page',async({page,waitPending,release})=>{
  await page.getByRole('button',{name:'Bronbijdrage 2',exact:true}).click();await waitPending(2);await hiddenOldFrame(page);
  await page.getByRole('button',{name:'Bronbijdrage 3',exact:true}).click();await waitPending(3);await hiddenOldFrame(page);
  await release(3);await ready(page,3);assert.deepEqual(await frame(page),expected(3));
  await release(2);await page.waitForTimeout(150);assert.deepEqual(await frame(page),expected(3));
 });
 await check('unmarked delayed navigation does not steal focus from another control',async({page,waitPending,release})=>{
  const input=page.getByRole('spinbutton',{name:'Pagina',exact:true});
  await input.fill('2');await page.keyboard.press('Enter');await waitPending(2);
  await page.locator('#outside').focus();await release(2);await ready(page,2);
  assert(await focused(page.locator('#outside')));
 });
 assert.deepEqual(errors,[]);
}finally{
 await context?.close();await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));
 writeFileSync(resolve(out,'results.json'),JSON.stringify({results,errors},null,2));
 console.log('Evidence: '+relative(root,out));
}
assert(results.length===6&&results.every(result=>result.pass),'Synthetic database reader review failed');
