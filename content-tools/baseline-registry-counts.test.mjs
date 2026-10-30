import test from "node:test";
import assert from "node:assert/strict";
import { baselineRegistryCounts } from "./baseline-registry-counts.mjs";
import { checkReportSelection } from "../skills/omnibus-add-report/scripts/check-selection.mjs";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const count = text => baselineRegistryCounts(Buffer.from(text));

test("early selection check uses pinned full registry, refuses active reports and writes no evidence", async t => {
  const dir = await mkdtemp(join(tmpdir(), "omnibus-selection-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "registry.json");
  const bytes = Buffer.from(JSON.stringify({ corpus: ["FIRST", "LAST"].map(id => ({ framework: { report: { id }, lines: [] } })) }));
  const hash = createHash("sha256").update(bytes).digest("hex");
  await writeFile(path, bytes);
  const result = await checkReportSelection(path, hash, "NEW");
  assert.equal(result.status, "REPORT_NOT_ACTIVE_NOT_APPROVED");
  assert.deepEqual(result.counts, { reports: 2, lines: 0 });
  assert.equal(result.publishable, false);
  assert.equal(result.reviewValidated, false);
  assert.equal(result.contentValidated, false);
  await assert.rejects(checkReportSelection(path, hash, "LAST"), /already active/);
  await assert.rejects(checkReportSelection(path, "0".repeat(64), "NEW"), /SHA-256 mismatch/);
  await assert.rejects(checkReportSelection(path, "", "NEW"), /independently supplied/);
  for (const id of ["", " LAST", "LAST "]) await assert.rejects(checkReportSelection(path, hash, id), /Exact report identity/);
  const script = resolve("skills/omnibus-add-report/scripts/check-selection.mjs");
  const args = [script, "--registry", path, "--expect-sha256", hash, "--report"];
  const ok = spawnSync(process.execPath, [...args, "NEW"], { encoding: "utf8", cwd: dir });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).status, result.status);
  const denied = spawnSync(process.execPath, [...args, "LAST"], { encoding: "utf8", cwd: dir });
  assert.equal(denied.status, 1);
  assert.equal(JSON.parse(denied.stderr).status, "HOLD");
  const incomplete = spawnSync(process.execPath, [script, "--registry", path], { encoding: "utf8", cwd: dir });
  assert.equal(incomplete.status, 1);
  assert.deepEqual(await readFile(path), bytes);
  assert.deepEqual(await readdir(dir), ["registry.json"]);
});

test("selection counts require unique actual report identities and reject an already active candidate", () => {
  const check = corpus => baselineRegistryCounts(Buffer.from(JSON.stringify({ corpus })), "NEW");
  const row = id => ({ framework: { report: { id }, lines: [{ id: "line" }] } });
  assert.deepEqual(check([row("OLD")]), { reports: 1, lines: 1 });
  assert.deepEqual(check([]), { reports: 0, lines: 0 });
  assert.throws(() => check([row("NEW")]), /already active/);
  for (const corpus of [[row("OLD"), row("OLD")], [row("")], [row(null)], [{ framework: { lines: [] } }], [row(undefined)]])
    assert.throws(() => check(corpus), /identity|object key|missing id/);
});
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
