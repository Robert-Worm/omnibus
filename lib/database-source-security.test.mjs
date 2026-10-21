import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDatabaseSourceClient} from './database-source-client.mjs';

// Self-contained transport tests: no private catalogue, listener or browser.
// Native Response/ReadableStream exercise the production reader and cache.
const hash = text => createHash('sha256').update(text).digest('hex');
const release = hash('synthetic release');
const json = value => new Response(JSON.stringify(value), {
  headers: {'Content-Type': 'application/json; charset=utf-8'},
});
const refFor = value => ({release, hash: hash(JSON.stringify(value))});
const emptyCache = {entries: 0, retainedBytes: 0};

test('source requests reject malformed identities before fetch and use confined request options', async () => {
  const value = {text: 'Synthetic source'}, ref = refFor(value), calls = [];
  const client = createDatabaseSourceClient({fetchImpl: async (url, options) => {
    calls.push({url, options}); return json(value);
  }});
  for (const invalid of ['', '../private', 'https://example.invalid', 'a'.repeat(63), 'A'.repeat(64)]) {
    assert.throws(() => client.content({...ref, hash: invalid}), /catalogusversie/);
    assert.throws(() => client.content({...ref, release: invalid}), /catalogusversie/);
    assert.throws(() => client.index({schema: 1, release, version: invalid, indexHash: ref.hash}), /bronverwijzing/);
  }
  assert.equal(calls.length, 0);
  assert.deepEqual(await client.content(ref), value);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `/api/v1/content/${ref.hash}?release=${release}`);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers.Accept, 'application/json');
  assert(calls[0].options.signal instanceof AbortSignal);
});

test('bad status, MIME, JSON, UTF-8 or content hash never enters the cache; retry succeeds', async () => {
  const value = {text: 'Original source 😀'}, ref = refFor(value);
  const responses = [
    () => new Response('missing', {status: 404}),
    () => new Response(JSON.stringify(value), {headers: {'Content-Type': 'text/html'}}),
    () => new Response('{', {headers: {'Content-Type': 'application/json'}}),
    () => new Response(new Uint8Array([0xc3, 0x28]), {headers: {'Content-Type': 'application/json'}}),
    () => json({text: 'Changed source'}),
    () => json(value),
  ];
  let calls = 0;
  const client = createDatabaseSourceClient({fetchImpl: async () => responses[calls++]()});
  for (let i = 0; i < responses.length - 1; i++) {
    await assert.rejects(client.content(ref));
    assert.deepEqual(client.stats(), emptyCache);
  }
  assert.deepEqual(await client.content(ref), value);
  assert.deepEqual(await client.content(ref), value);
  assert.equal(calls, responses.length, 'Only a verified response is reused');
  assert.equal(client.stats().retainedBytes, Buffer.byteLength(JSON.stringify(value)));
});

test('response budget counts streamed bytes without trusting Content-Length; overflow is cancelled', async () => {
  const limit = 2 * 1024 * 1024;
  let cancelled = false, releasedStream;
  const client = createDatabaseSourceClient({fetchImpl: async () => {
    let count = 0;
    releasedStream = new ReadableStream({
      pull(controller) {
        // The final byte exceeds the limit; no complete JSON or huge allocation is needed.
        // Stay finite even if a regression removes the production size guard.
        if (count === 3) { controller.close(); return; }
        controller.enqueue(new Uint8Array(++count <= 2 ? limit / 2 : 1));
      },
      cancel() { cancelled = true; },
    }, {highWaterMark: 0});
    return new Response(releasedStream, {
      headers: {'Content-Type': 'application/json', 'Content-Length': '1'},
    });
  }});
  await assert.rejects(client.content(refFor({})), /onverwacht groot/);
  assert.equal(cancelled, true);
  assert.equal(releasedStream.locked, false);
  assert.deepEqual(client.stats(), emptyCache);

  const exact = {text: 'x'.repeat(limit - Buffer.byteLength(JSON.stringify({text: ''})))};
  assert.equal(Buffer.byteLength(JSON.stringify(exact)), limit);
  const atLimit = createDatabaseSourceClient({fetchImpl: async () => json(exact)});
  assert.equal((await atLimit.content(refFor(exact))).text.length, exact.text.length);
  assert.deepEqual(atLimit.stats(), {entries: 1, retainedBytes: limit});
});

test('source index and Unicode page must match the pinned hash and coordinates', async () => {
  const version = hash('synthetic document'), page = {page: 1, text: '<script>literal</script> 😀é'};
  const end = Array.from(page.text).length, pageHash = hash(JSON.stringify(page));
  const index = {version, pages: [{page: 1, start: 0, end, sha256: pageHash}]};
  const ref = {schema: 1, release, version, indexHash: hash(JSON.stringify(index))};
  let response = {...index, version: hash('other document')};
  const client = createDatabaseSourceClient({fetchImpl: async () => json(response)});
  await assert.rejects(client.index(ref), /bronindex/);
  assert.deepEqual(client.stats(), emptyCache);
  response = index;
  const verifiedIndex = await client.index(ref);
  const indexCache = client.stats();
  const original = {page, start: 0, end, sha256: pageHash};
  for (const bad of [
    {...original, page: {...page, text: 'Different source'}},
    {...original, start: 1}, {...original, end: end + 1},
    {...original, sha256: hash('other page')}, {...original, page: {...page, page: 2}},
  ]) {
    response = bad;
    await assert.rejects(client.page(ref, verifiedIndex, 1), /bronpagina/);
    assert.deepEqual(client.stats(), indexCache);
  }
  response = original;
  assert.deepEqual(await client.page(ref, verifiedIndex, 1), original);
  assert.throws(() => client.page(ref, verifiedIndex, 2), /bestaat niet/);
  assert.equal(client.stats().entries, 2);
});

test('caller cancellation and request timeout do not retain a partial source', {timeout: 2000}, async () => {
  const ref = refFor({text: 'Synthetic source'});
  const controller = new AbortController();
  controller.abort(new DOMException('Caller cancelled', 'AbortError'));
  let fetched = false;
  const cancelledClient = createDatabaseSourceClient({fetchImpl: async () => {
    fetched = true; return json({});
  }});
  await assert.rejects(cancelledClient.content(ref, {signal: controller.signal}), {name: 'AbortError'});
  assert.equal(fetched, false);
  assert.deepEqual(cancelledClient.stats(), emptyCache);

  let timedOut = false, stream;
  const slowClient = createDatabaseSourceClient({timeoutMs: 20, fetchImpl: async (_url, {signal}) => {
    stream = new ReadableStream({start(body) {
      body.enqueue(new TextEncoder().encode('{"text":'));
      signal.addEventListener('abort', () => { timedOut = true; body.error(signal.reason); }, {once: true});
    }});
    return new Response(stream, {headers: {'Content-Type': 'application/json'}});
  }});
  await assert.rejects(slowClient.content(ref), /duurt te lang/);
  assert.equal(timedOut, true);
  assert.equal(stream.locked, false);
  assert.deepEqual(slowClient.stats(), emptyCache);
});

test('large restore bursts stay bounded until response bodies finish, preserving every verified result', async () => {
  const values = Array.from({length: 70}, (_, id) => ({id, text: 'Synthetic source ' + id}));
  const byHash = new Map(values.map(value => [refFor(value).hash, value]));
  let active = 0, peak = 0, calls = 0;
  const client = createDatabaseSourceClient({fetchImpl: async url => {
    calls++; peak = Math.max(peak, ++active);
    const value = byHash.get(new URL(url, 'https://example.invalid').pathname.split('/').at(-1));
    return new Response(new ReadableStream({start(body) {
      setTimeout(() => {
        body.enqueue(new TextEncoder().encode(JSON.stringify(value)));
        active--; body.close();
      }, 2);
    }}), {headers: {'Content-Type': 'application/json'}});
  }});
  assert.deepEqual(await Promise.all(values.map(value => client.content(refFor(value)))), values);
  assert.equal(calls, 70); assert.equal(peak, 6); assert.equal(active, 0);
});

test('queued cancellation never starts a fetch and cache hits bypass the queue', async () => {
  const values = Array.from({length: 10}, (_, id) => ({id})), releases = [];
  let calls = 0;
  const client = createDatabaseSourceClient({fetchImpl: async url => {
    calls++;
    const value = values.find(value => url.includes(refFor(value).hash));
    if (value.id !== 0) await new Promise(resolve => releases.push(resolve));
    return json(value);
  }});
  await client.content(refFor(values[0]));
  const running = values.slice(1, 7).map(value => client.content(refFor(value)));
  await new Promise(resolve => setImmediate(resolve));
  const controller = new AbortController();
  const cancelled = client.content(refFor(values[7]), {signal: controller.signal});
  const rejected = assert.rejects(cancelled, {name: 'AbortError'});
  controller.abort(); await rejected;
  assert.deepEqual(await client.content(refFor(values[0])), values[0]);
  assert.equal(calls, 7);
  for (const release of releases) release();
  await Promise.all(running);
  assert.equal(calls, 7);
});

test('failed responses release queue slots; timeout starts on admission, not while waiting', async () => {
  const values = Array.from({length: 7}, (_, id) => ({id}));
  let calls = 0, cancelledBodies = 0;
  const client = createDatabaseSourceClient({timeoutMs: 30, fetchImpl: async (_url, {signal}) => {
    const number = calls++;
    if (number < 6) return new Response(new ReadableStream({start(body) {
      signal.addEventListener('abort', () => body.error(signal.reason), {once: true});
    }}), {headers: {'Content-Type': 'application/json'}});
    return json(values[6]);
  }});
  const results = await Promise.allSettled(values.map(value => client.content(refFor(value))));
  assert(results.slice(0, 6).every(result => result.status === 'rejected'));
  assert.deepEqual(results[6], {status: 'fulfilled', value: values[6]});
  assert.equal(calls, 7);
  const refused = createDatabaseSourceClient({fetchImpl: async () => new Response(new ReadableStream({
    cancel() { cancelledBodies++; },
  }), {status: 503})});
  await assert.rejects(refused.content(refFor(values[0])), /niet bereikbaar/);
  assert.equal(cancelledBodies, 1);
});
