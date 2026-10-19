import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize, localPreview, assetTotals} from './measure-loading.mjs';

test('local sample median and nearest-rank p95 retain outliers and do not mutate samples', () => {
  const values = [1000, 10, 30, 20];
  assert.deepEqual(summarize(values), {n: 4, median: 25, p95: 1000, min: 10, max: 1000});
  assert.deepEqual(values, [1000, 10, 30, 20]);
  assert.equal(summarize(Array.from({length: 20}, (_, i) => i + 1)).p95, 19);
  for (const invalid of [[], [NaN], [Infinity], [-1]]) assert.throws(() => summarize(invalid));
});

test('loading harness refuses external origins and implicit preview paths', () => {
  assert.equal(localPreview('http://127.0.0.1:4375'), 'http://127.0.0.1:4375/');
  for (const url of ['https://example.com/', 'http://localhost:4375/', 'http://127.0.0.1/',
    'http://user@127.0.0.1:4375/', 'http://127.0.0.1:4375/path', 'http://127.0.0.1:4375/?query',
    'http://127.0.0.1:4375/#route']) assert.throws(() => localPreview(url));
});

test('cached decoded bodies are not misreported as transferred bytes', () => {
  const entries = [
    {path: '/', transferSize: 400, encodedBodySize: 100, decodedBodySize: 200},
    {path: '/assets/main.js', transferSize: 0, encodedBodySize: 1000, decodedBodySize: 5000},
    {path: '/assets/main.css', transferSize: 500, encodedBodySize: 200, decodedBodySize: 400},
  ];
  assert.deepEqual(assetTotals(entries), {
    all: {transferSize: 900, encodedBodySize: 1300, decodedBodySize: 5600},
    javascript: {transferSize: 0, encodedBodySize: 1000, decodedBodySize: 5000},
    css: {transferSize: 500, encodedBodySize: 200, decodedBodySize: 400},
  });
});
