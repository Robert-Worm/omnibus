import test from 'node:test';
import assert from 'node:assert/strict';
import {createReportAssetLoader} from './report-asset-loader.mjs';

await test('future large selections deduplicate modules, bound transfers and retry failed assets', async () => {
  let active=0,peak=0,fail=true;const calls=[],release=[];
  const loader=createReportAssetLoader(url=>{
    calls.push(url);active++;peak=Math.max(peak,active);
    return new Promise((resolve,reject)=>release.push(()=>{active--;if(url==='part-0'&&fail)reject(Error('Unavailable'));else resolve({default:url});}));
  });
  const entries=Array.from({length:200},(_,i)=>loader('part-'+i));
  assert.equal(loader('part-0'),entries[0]);
  const first=entries[0]();assert.equal(entries[0](),first);
  const pending=Promise.allSettled([first,...entries.slice(1).map(load=>load())]);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,6);
  while(calls.length<200||release.length){for(const done of release.splice(0))done();await new Promise(resolve=>setImmediate(resolve));}
  const result=await pending;assert.equal(peak,6);assert.equal(calls.length,200);assert.equal(result[0].status,'rejected');
  assert(result.slice(1).every(r=>r.status==='fulfilled'));
  fail=false;const retried=entries[0]();await new Promise(resolve=>setImmediate(resolve));release.shift()();
  assert.deepEqual(await retried,{default:'part-0?retry=1'});assert.equal(calls.length,201);
  await entries[1]();assert.equal(calls.length,201,'Successful immutable parts are reused');
});
