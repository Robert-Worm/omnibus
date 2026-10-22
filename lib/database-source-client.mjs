import {createContentTransferCache,MAX_CONTENT_TRANSFER_BYTES} from './content-transfer-cache.mjs';
import {createContentRequestBatch} from './content-request-batch.mjs';
const HASH = /^[a-f0-9]{64}$/;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
// Each page/preview worker shares its own client. Leave room under the server's
// response ceiling for both, static assets and other viewers; never burst all
// saved-project resources into the host at once.
const MAX_ACTIVE_REQUESTS = 6;

async function sourceBytesHash(bytes) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}
export async function sourceJsonHash(value) {
  return sourceBytesHash(new TextEncoder().encode(JSON.stringify(value)));
}

export function assertDatabaseSource(ref) {
  if (!ref || ref.schema !== 1 || ![ref.release, ref.version, ref.indexHash].every(x => HASH.test(x)))
    throw Error('Deze bronverwijzing heeft een onbekende of ongeldige indeling.');
}

// Transport only. It cannot change a selection, project, source edition or review status.
export function createDatabaseSourceClient({ fetchImpl = globalThis.fetch, maxEntries = 12,
  maxBytes = 4 * 1024 * 1024, timeoutMs = 10000, transferBytes = 0, batchContent = false } = {}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 0 || !Number.isSafeInteger(maxBytes) || maxBytes < 0 ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw Error('Ongeldige broncachegrens.');
  const cache = new Map();
  const retainedContent = createContentTransferCache(transferBytes);
  const incomingContent = createContentTransferCache();
  const readContentBatch = createContentRequestBatch(readBatchResponse);
  let retainedBytes = 0;
  let active = 0;
  const waiting = [];
  function acquire(signal) {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      const job = { start() {
        signal?.removeEventListener('abort', abort);
        active++;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true; active--;
          waiting.shift()?.start();
        });
      } };
      const abort = () => {
        const index = waiting.indexOf(job);
        if (index !== -1) waiting.splice(index, 1);
        reject(signal.reason);
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (active < MAX_ACTIVE_REQUESTS) job.start();
      else waiting.push(job);
    });
  }
  async function request(key, url, validate, signal, contentRef) {
    signal?.throwIfAborted();
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit.value; }
    // A batch occupies one bounded HTTP response slot, not a slot for each
    // member. Individual source hashes are still checked before admission.
    if(batchContent&&contentRef)return fetchVerified(key,url,validate,signal,contentRef);
    const release = await acquire(signal);
    try { return await fetchVerified(key, url, validate, signal, contentRef); }
    finally { release(); }
  }
  async function fetchVerified(key, url, validate, signal, contentRef) {
    signal?.throwIfAborted();
    // Another admitted request may have verified this key while we waited.
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit.value; }
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timer = batchContent&&contentRef?undefined:setTimeout(() => controller.abort(new DOMException('Bronaanvraag duurt te lang.', 'TimeoutError')), timeoutMs);
    try {
      // Transferred bytes are untrusted input, not an admitted catalogue value.
      // Consume once; failed validation stays visible and retry fetches anew.
      const incoming = contentRef && incomingContent.take(contentRef);
      const response = incoming ? {bytes:incoming} : batchContent&&contentRef
        ? await readContentBatch(contentRef,controller.signal)
        : {bytes:await readResponse(url,controller.signal)};
      const {bytes}=response;
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      // The internal batch decoder already serialized this JSON value for size
      // validation. Hash those canonical bytes once, not another serialization.
      // Raw network/worker bytes still take the full JSON hash path.
      await validate(value,response.canonical?bytes:undefined);
      controller.signal.throwIfAborted();
      if (contentRef && !incoming && transferBytes) retainedContent.remember(contentRef,bytes);
      const length = bytes.length;
      if (maxEntries && length <= maxBytes) {
        while (cache.size >= maxEntries || retainedBytes + length > maxBytes) {
          const oldest = cache.keys().next().value;
          retainedBytes -= cache.get(oldest).size;
          cache.delete(oldest);
        }
        // Concurrent requests may have completed the same key already.
        if (cache.has(key)) { retainedBytes -= cache.get(key).size; cache.delete(key); }
        cache.set(key, { value, size: length }); retainedBytes += length;
      }
      return value;
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      if (controller.signal.aborted) throw Error('Het ophalen duurt te lang. Probeer het opnieuw.');
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async function readBatchResponse(url,signal) {
    const release=await acquire(signal);
    const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{signal.throwIfAborted();return await readResponse(url,controller.signal);}
    catch(error){
      if(signal.aborted)throw signal.reason;
      if(controller.signal.aborted)throw Error('Het ophalen duurt te lang. Probeer het opnieuw.');
      throw error;
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);release();}
  }
  async function readResponse(url,signal) {
    const response = await fetchImpl(url, { signal, credentials: 'omit',
      redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const error=Error(response.status === 404
        ? 'Deze exacte bronversie is niet beschikbaar in de database.'
        : 'De brondienst is niet bereikbaar. Probeer het opnieuw.');
      error.status=response.status;throw error;
    }
    if (!response.headers.get('content-type')?.startsWith('application/json')) {
      await response.body?.cancel().catch(() => {});
      throw Error('De brondienst gaf geen geldige brongegevens terug.');
    }
    const reader = response.body.getReader();
    let length = 0;
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > MAX_RESPONSE_BYTES) throw Error('De bronaanvraag is onverwacht groot.');
        chunks.push(value);
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }
  return {
    content(ref, {signal} = {}) {
      if (!ref || !HASH.test(ref.release) || !HASH.test(ref.hash)) throw Error('Ongeldige catalogusversie.');
      return request('content:' + ref.release + ':' + ref.hash,
        `/api/v1/content/${ref.hash}?release=${ref.release}`, async (value,canonicalBytes) => {
          const hash=await (canonicalBytes?sourceBytesHash(canonicalBytes):sourceJsonHash(value));
          if (hash !== ref.hash) throw Error('De catalogusgegevens komen niet overeen met de vastgelegde versie.');
        }, signal, ref);
    },
    index(ref, { signal } = {}) {
      assertDatabaseSource(ref);
      return request('index:' + ref.release + ':' + ref.indexHash,
        `/api/v1/documents/${ref.version}/index?release=${ref.release}`, async value => {
          if (await sourceJsonHash(value) !== ref.indexHash || value.version !== ref.version ||
              !Array.isArray(value.pages) || !value.pages.length ||
              value.pages.some((p, i) => p.page !== i + 1 || !HASH.test(p.sha256) ||
                !Number.isSafeInteger(p.start) || p.start !== (i ? value.pages[i - 1].end : 0) ||
                !Number.isSafeInteger(p.end) || p.end < p.start))
            throw Error('De bronindex komt niet overeen met de vastgelegde bronversie.');
        }, signal);
    },
    page(ref, index, number, { signal } = {}) {
      assertDatabaseSource(ref);
      const expected = index.pages.find(p => p.page === number);
      if (!expected || index.version !== ref.version) throw Error('Deze bronpagina bestaat niet.');
      return request('page:' + ref.release + ':' + ref.version + ':' + number + ':' + expected.sha256,
        `/api/v1/documents/${ref.version}/pages/${number}`, async value => {
          if (typeof value?.page?.text !== 'string' || value.page.page !== number ||
              value.start !== expected.start || value.end !== expected.end || value.sha256 !== expected.sha256 ||
              await sourceJsonHash(value.page) !== expected.sha256 ||
              Array.from(value.page.text).length !== value.end - value.start)
            throw Error('De bronpagina komt niet overeen met de vastgelegde bronversie.');
        }, signal);
    },
    stats: () => ({ entries: cache.size, retainedBytes }),
    copyContentTransfers: (refs,known) => retainedContent.copy(refs,known),
    stageContentTransfers: values => incomingContent.stage(values),
    transferStats: () => retainedContent.stats(),
  };
}
// Only the document retains network bytes for its preview worker. A worker
// consumes transferred buffers once and keeps the existing small parsed cache.
export const databaseSourceClient = createDatabaseSourceClient({
  transferBytes: typeof document === 'undefined' ? 0 : MAX_CONTENT_TRANSFER_BYTES,
  batchContent:true,
});
