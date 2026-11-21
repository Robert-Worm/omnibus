import test from 'node:test';
import assert from 'node:assert/strict';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createContentTransportCache} from './content-transport-cache.mjs';

test('bewaart per codering, deelt gelijktijdig werk en geeft exact de oorspronkelijke bytes terug',async()=>{
  const cache=createContentTransportCache(),raw=Buffer.from(JSON.stringify({tekst:'Synthetisch 😀é '.repeat(500)}));
  assert.equal(cache.get('a','br'),undefined);assert.equal(cache.rawBytes('a'),undefined);
  const [one,two]=await Promise.all([cache.compress('a','br',raw),cache.compress('a','br',raw)]);
  assert.equal(one,two,'één compressie voor twee gelijktijdige verzoeken');assert.equal(cache.stats().misses,1);
  assert.deepEqual(brotliDecompressSync(cache.get('a','br')),raw);assert.equal(cache.rawBytes('a'),raw.length);
  assert.deepEqual(gunzipSync(await cache.compress('a','gzip',raw)),raw);
  assert.equal(cache.get('b','br'),undefined);
});

test('blijft binnen de grens: het minst recent gebruikte gaat eruit, te grote antwoorden worden niet bewaard',async()=>{
  const noise=n=>Buffer.from(Array.from({length:n},(_,i)=>String.fromCharCode(33+((i*7919)^(i>>3))%90)).join(''));
  const sample=(await createContentTransportCache().compress('x','br',noise(4000))).length;
  const cache=createContentTransportCache({bytes:sample*2+10,entryBytes:sample+10});
  await cache.compress('1','br',noise(4000));await cache.compress('2','br',noise(4000));
  assert.ok(cache.get('1','br'));                       // 1 is nu het recentst gebruikt
  await cache.compress('3','br',noise(4000));
  assert.equal(cache.get('2','br'),undefined,'2 was het langst ongebruikt');
  assert.ok(cache.get('1','br'));assert.ok(cache.get('3','br'));assert.ok(cache.stats().bytes<=sample*2+10);
  const big=await cache.compress('groot','br',noise(40000));
  assert.ok(big.length>sample+10);assert.equal(cache.get('groot','br'),undefined,'wel geleverd, niet bewaard');
});

test('a running compression can be joined and is gone once kept', async () => {
  const cache = createContentTransportCache(), raw = Buffer.from('gedeelde inhoud '.repeat(500));
  assert.equal(cache.pending('k', 'br'), undefined);
  const first = cache.compress('k', 'br', raw), joined = cache.pending('k', 'br');
  assert.equal(joined, first);
  assert.equal(cache.pending('k', 'gzip'), undefined, 'another encoding is another answer');
  assert.equal(await joined, await first);
  assert.equal(cache.pending('k', 'br'), undefined);
  assert.equal(cache.get('k', 'br'), await first);
  assert.deepEqual({hits: cache.stats().hits, misses: cache.stats().misses}, {hits: 1, misses: 1});
});
