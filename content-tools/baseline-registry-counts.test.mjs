import test from "node:test";
import assert from "node:assert/strict";
import { baselineRegistryCounts } from "./baseline-registry-counts.mjs";
const count = text => baselineRegistryCounts(Buffer.from(text));
test("large baseline retains exact counts without materialising the corpus", () => {
  const raw = JSON.stringify({ corpus: [{ framework: { lines: [{ id: "A" }, { id: "B" }] } },
    { framework: { lines: [{ id: "C" }] } }], unrelated: Array(10_000).fill('x'.repeat(1000)) });
  assert(Buffer.byteLength(raw) > 8 * 1024 * 1024);
  assert.deepEqual(count(raw), { reports: 2, lines: 3 });
  assert.throws(() => count(raw + "junk"), /trailing content/);
});
test("baseline reader validates all JSON, including ignored fields", () => {
  assert.deepEqual(count('{"corpus":[],"quoted\\\"key":"escaped\\\\value", "extra":[true,false,null,-1.2e3,{}]}'), { reports: 0, lines: 0 });
  for (const raw of ['{}', '{"corpus":{}}', '{"corpus":[null]}', '{"corpus":[{}]}',
    '{"corpus":[{"framework":{}}]}', '{"corpus":[{"framework":{"lines":null}}]}',
    '{"corpus":[],"corpus":[]}', '{"corpus":[],"ignored":{"a":1,"a":2}}',
    '{"corpus":[],"ignored":[1,]}', '{"corpus":[],}', '{"corpus":[],"ignored":01}',
    '{"corpus":[],"ignored":"bad\\q"}', '{"corpus":[],"ignored":"\n"}', '{"corpus":[],"ignored":',
    '{"corpus":[],"ignored":true false}', '{"corpus":[]} {"corpus":[]}'])
    assert.throws(() => count(raw), /Baseline registry:/, raw);
});
test("registry limits stay bounded and invalid encoding fails closed", () => {
  assert.throws(() => count('{"corpus":[],"x":' + '['.repeat(130) + '0' + ']'.repeat(130) + '}'), /complexity limit/);
  assert.throws(() => count(JSON.stringify({ corpus: [], x: 'x'.repeat(8 * 1024 * 1024) })), /token exceeds/);
  assert.throws(() => baselineRegistryCounts(Buffer.alloc(64 * 1024 * 1024 + 1)), /size exceeds/);
  assert.throws(() => baselineRegistryCounts(Buffer.from([0xff])), /invalid UTF-8/);
});
