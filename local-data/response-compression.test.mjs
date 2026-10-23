import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { responseEncoding, createResponseCompressor } from './response-compression.mjs';

test('response compression respects preferences, exclusions and unsupported clients', () => {
  for (const [header, expected] of [
    [undefined, 'identity'], ['', 'identity'], ['deflate, zstd', 'identity'],
    ['gzip, deflate, br, zstd', 'br'], ['GZIP, BR', 'br'], ['gzip', 'gzip'],
    ['br;q=0.5,gzip;q=0.8', 'gzip'], ['gzip;q=0.5,br;q=0.8', 'br'],
    ['br;q=0,gzip', 'gzip'], ['br;q=0,gzip;q=0', 'identity'],
    ['br;q=1.001,gzip;q=0.5', 'gzip'], ['br;q=2', 'identity'],
    ['br;q=NaN', 'identity'], ['br;q=.5', 'identity'], ['br;q=0.0001', 'identity'],
    ['br;foo=1', 'identity'], ['br;q=1;q=0', 'identity'],
    ['*', 'br'], ['*;q=0.8,br;q=0', 'gzip'], ['*;q=0,br', 'br'],
    ['br,br;q=0,gzip', 'gzip'], ['br;q=0,br,gzip', 'gzip'],
    ['br;q=0.5,identity;q=0.8', 'identity'], ['br,identity', 'br'],
    ['identity;q=0,gzip', 'gzip'], ['identity;q=0', null], ['*;q=0', null],
    ['*;q=0,identity', 'identity'],
  ]) assert.equal(responseEncoding(header, 2048), expected, String(header));
});

test('small responses never start a compressor before server admission', () => {
  assert.equal(responseEncoding('br,gzip', 1024), 'identity');
  assert.equal(responseEncoding('br,gzip', 1025), 'br');
  assert.equal(responseEncoding('br,identity;q=0', 30), null);
  assert.equal(responseEncoding('*;q=0', 30), null);
});

test('streamed encodings retain every byte of growing Unicode source collections', async () => {
  // Generated fixture, not a snapshot or an allowlist of current report IDs.
  const raw = Buffer.from(JSON.stringify(Array.from({ length: 200 }, (_, i) => ({
    id: `synthetic-${i}`, text: 'Bronpassage 😀é 漢字 '.repeat(150),
    control: 'Bewijs en broncontrole blijven ongewijzigd', selection_status: i % 3 ? 'SELECTABLE' : 'HOLD',
  }))));
  for (const [encoding, decode] of [['br', brotliDecompressSync], ['gzip', gunzipSync]]) {
    const chunks = [];
    await pipeline(Readable.from([raw.subarray(0, 1001), raw.subarray(1001)]),
      createResponseCompressor(encoding, raw.length), async source => {
        for await (const chunk of source) chunks.push(chunk);
      });
    const encoded = Buffer.concat(chunks);
    assert(encoded.length < raw.length);
    assert.deepEqual(decode(encoded), raw);
  }
  assert.throws(() => createResponseCompressor('identity', raw.length), /Unsupported response encoding/);
});
