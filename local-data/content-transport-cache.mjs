import {brotliCompress, gzip, constants} from 'node:zlib';

// Inhoud op release en controlegetal verandert nooit. Het comprimeren van een antwoord kostte bij elk verzoek opnieuw
// rekentijd (een onderwerp kiezen: tientallen megabytes); dat is voor elke bezoeker hetzelfde werk. Deze cache bewaart
// het gecomprimeerde antwoord, zodat een volgend verzoek geen databaselezing, JSON of compressie meer kost.
// Alleen transport: wat erin komt is het antwoord dat de server toch al zou sturen, na alle toegangscontroles.
export const contentTransportLimits = Object.freeze({
  // Harde bovengrens. De container draait met een kleine heap (200 MB); deze buffers staan daarbuiten, dus bewust
  // bescheiden: ruim genoeg voor de onderwerpen die het meest gekozen worden.
  bytes: 48 * 1024 * 1024,
  // Een enkel antwoord groter dan dit (gecomprimeerd) wordt niet bewaard.
  entryBytes: 8 * 1024 * 1024,
});

const compressors = {
  // Dezelfde instellingen als createResponseCompressor (vaste kwaliteit, begrensd werk).
  br: (raw, done) => brotliCompress(raw, {params: {
    [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_LGWIN]: 20,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
  }}, done),
  gzip: (raw, done) => gzip(raw, done),
};

export function createContentTransportCache(limits = contentTransportLimits) {
  // Map houdt invoegvolgorde bij: het oudste (minst recent gebruikte) staat vooraan.
  const entries = new Map(), pending = new Map();
  let bytes = 0, hits = 0, misses = 0;
  const touch = (key, entry) => { entries.delete(key); entries.set(key, entry); };
  function store(key, buffer, rawBytes) {
    if (buffer.length > limits.entryBytes || entries.has(key)) return;
    entries.set(key, {buffer, rawBytes}); bytes += buffer.length;
    for (const [oldest, entry] of entries) {
      if (bytes <= limits.bytes) break;
      entries.delete(oldest); bytes -= entry.buffer.length;
    }
  }
  return {
    /** Het bewaarde antwoord voor deze sleutel en codering, of undefined. */
    get(key, encoding) {
      const entry = entries.get(encoding + '|' + key);
      if (!entry) return undefined;
      hits++; touch(encoding + '|' + key, entry);
      return entry.buffer;
    },
    /** De ongecomprimeerde grootte van een bewaard antwoord (voor de keuze van de codering), of undefined. */
    rawBytes(key) {
      for (const encoding of ['br', 'gzip']) { const entry = entries.get(encoding + '|' + key); if (entry) return entry.rawBytes; }
      return undefined;
    },
    /** Comprimeer en bewaar; gelijktijdige verzoeken om hetzelfde delen één compressie. */
    compress(key, encoding, raw) {
      const id = encoding + '|' + key, cached = entries.get(id);
      if (cached) return Promise.resolve(cached.buffer);
      let job = pending.get(id);
      if (!job) {
        misses++;
        job = new Promise((resolve, reject) => compressors[encoding](raw, (error, buffer) => error ? reject(error) : resolve(buffer)))
          .then(buffer => { store(id, buffer, raw.length); return buffer; })
          .finally(() => pending.delete(id));
        pending.set(id, job);
      }
      return job;
    },
    /** Alles weg (de database is veranderd: eerst opnieuw lezen en controleren). */
    clear() { entries.clear(); bytes = 0; },
    stats: () => ({entries: entries.size, bytes, hits, misses}),
  };
}
