import { createBrotliCompress, createGzip, constants } from 'node:zlib';

// Compress transport only: publication hashes and decoded size limits stay intact.
// Prefer Brotli on equal quality, but preserve gzip and uncompressed clients.
export function responseEncoding(header, bytes) {
  const qualities = new Map();
  for (const part of (typeof header === 'string' ? header : '').split(',')) {
    const name = part.split(';')[0].trim().toLowerCase();
    if (!['br', 'gzip', 'identity', '*'].includes(name)) continue;
    const match = part.trim().match(/^(?:br|gzip|identity|\*)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i);
    const quality = match ? Number(match[1] ?? 1) : 0;
    // An explicit exclusion wins over contradictory duplicates or a wildcard.
    qualities.set(name, Math.min(qualities.get(name) ?? 1, quality));
  }
  const identity = qualities.get('identity') ?? (qualities.get('*') === 0 ? 0 : 1);
  // Tiny errors can be returned before admission. Never let a caller start a
  // compressor there and bypass the server's active-response ceiling.
  if (bytes <= 1024) return identity > 0 ? 'identity' : null;
  let selected = identity > 0 ? 'identity' : null;
  let quality = qualities.get('identity') ?? 0;
  for (const encoding of ['br', 'gzip']) {
    const offered = qualities.get(encoding) ?? qualities.get('*') ?? 0;
    if (offered > 0 && (offered > quality || (offered === quality && selected === 'identity'))) {
      selected = encoding;
      quality = offered;
    }
  }
  return selected;
}

export function createResponseCompressor(encoding, bytes) {
  if (encoding === 'gzip') return createGzip();
  if (encoding !== 'br') throw new TypeError('Unsupported response encoding');
  return createBrotliCompress({ params: {
    // Deliberately avoid expensive default quality 11. Fixed settings bound work;
    // the 1 MiB dictionary captures repeated evidence across larger JSON batches.
    [constants.BROTLI_PARAM_QUALITY]: 5,
    [constants.BROTLI_PARAM_LGWIN]: 20,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_SIZE_HINT]: bytes,
  } });
}
