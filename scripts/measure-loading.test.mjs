import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize, summarizeInputPaint, localPreview, assetTotals, sessionDeltas, measureWarmSession, measureLoading} from './measure-loading.mjs';

test('trusted input paint percentiles require a complete observed population', () => {
  const samples = Array.from({length: 30}, (_, i) => ({trusted: true, inputToPaintMs: (i + 1) * 8}));
  const before = structuredClone(samples);
  assert.deepEqual(summarizeInputPaint(samples), {
    n: 30, observed: 30, missing: 0, complete: true, median: 124, p95: 232, maxObserved: 240,
  });
  assert.equal(summarizeInputPaint(samples.slice(0, 19)).p95, null);
  // Even 29 observed events cannot give the full distribution's p95 when one
  // event was omitted. Do not bias results by silently dropping that event.
  assert.deepEqual(summarizeInputPaint([...samples.slice(1), {trusted: true, inputToPaintMs: null}]), {
    n: 30, observed: 29, missing: 1, complete: false, median: null, p95: null, maxObserved: 240,
  });
  assert.deepEqual(summarizeInputPaint([{trusted: true, inputToPaintMs: null}]), {
    n: 1, observed: 0, missing: 1, complete: false, median: null, p95: null, maxObserved: null,
  });
  assert.deepEqual(samples, before);
  const sparse = []; sparse.length = 2;
  for (const invalid of [[], sparse, [{}], [{trusted: false, inputToPaintMs: 20}],
    [{trusted: true, inputToPaintMs: undefined}], [{trusted: true, inputToPaintMs: NaN}],
    [{trusted: true, inputToPaintMs: Infinity}], [{trusted: true, inputToPaintMs: -1}]])
    assert.throws(() => summarizeInputPaint(invalid), /trusted input/);
});

test('local sample median and nearest-rank p95 retain outliers and do not mutate samples', () => {
  const values = [1000, 10, 30, 20];
  assert.deepEqual(summarize(values), {n: 4, median: 25, p95: null, min: 10, max: 1000});
  assert.deepEqual(values, [1000, 10, 30, 20]);
  assert.equal(summarize(Array.from({length: 20}, (_, i) => i + 1)).p95, 19);
  assert.equal(summarize(Array.from({length: 30}, (_, i) => i + 1)).p95, 29);
  assert.equal(summarize([10, 30, 20]).median, 20);
  for (const invalid of [[], [NaN], [Infinity], [-1]]) assert.throws(() => summarize(invalid));
});

test('settled session checkpoints retain transient growth and every signed delta without declaring a leak', () => {
  const baseline = {documents: 1, nodes: 100, listeners: 20, heapBytes: 1000, renderedNodes: 80, requests: 12};
  const points = [baseline, {...baseline, heapBytes: 1500, nodes: 140, requests: 13},
    {...baseline, heapBytes: 950, nodes: 105, listeners: 22, requests: 14}];
  const before = structuredClone(points), result = sessionDeltas(points);
  assert.deepEqual(result.heapBytes, {first: 1000, last: 950, delta: -50, min: 950, max: 1500});
  assert.deepEqual(result.nodes, {first: 100, last: 105, delta: 5, min: 100, max: 140});
  assert.deepEqual(result.listeners, {first: 20, last: 22, delta: 2, min: 20, max: 22});
  assert.equal(result.renderedNodes.delta, 0);
  assert.equal(result.requests.delta, 2);
  assert.equal(Object.hasOwn(result, 'passed'), false);
  assert.deepEqual(points, before);
  for (const invalid of [[], [baseline], [baseline, {}], [baseline, {...baseline, heapBytes: NaN}],
    [baseline, {...baseline, nodes: -1}], [baseline, {...baseline, listeners: Infinity}]])
    assert.throws(() => sessionDeltas(invalid));
});

test('short sessions and unsupported browser profiles fail before opening a browser or writing evidence', async () => {
  for (const rounds of [0, 20, 29, 61, NaN, 30.5])
    await assert.rejects(measureWarmSession(null, null, {rounds}), /30–60/);
  const base = {url: 'http://127.0.0.1:4375/', out: 'unused', executablePath: 'unused'};
  for (const options of [{warmRounds: 20}, {warmRounds: 61}, {cpuRate: 2}, {viewport: 'phone'}])
    await assert.rejects(measureLoading({...base, ...options}), /warm rounds|desktop\/narrow/);
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
    {path: '/assets/regular.woff2', transferSize: 1300, encodedBodySize: 1000, decodedBodySize: 1000},
    {path: '/assets/bold.woff2', transferSize: 0, encodedBodySize: 800, decodedBodySize: 800},
  ];
  assert.deepEqual(assetTotals(entries), {
    all: {transferSize: 2200, encodedBodySize: 3100, decodedBodySize: 7400},
    javascript: {transferSize: 0, encodedBodySize: 1000, decodedBodySize: 5000},
    css: {transferSize: 500, encodedBodySize: 200, decodedBodySize: 400},
    fonts: {transferSize: 1300, encodedBodySize: 1800, decodedBodySize: 1800},
  });
});
