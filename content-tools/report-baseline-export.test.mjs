import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication, publishRuntime } from "../local-data/runtime-publication.mjs";
import { prepareWebResources } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { additionalProcesses } from "../lib/additional-processes.mjs";
import { exportReportBaseline } from "./export-report-baseline.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const report = (id, lines = []) => ({ framework: { report: { id, title: "Synthetic report only" }, lines } });
const line = { id: "SYN-1", source: "Exact synthetic text 😀\r\n", criterion: "No actual norm" };
const testProcess = { id: "SYN", title: "Synthetic process", definition: "Preserve this exact definition.", keywords: ["test"] };
const additions = "app/report-additions.json";
function fixture(t, edit = () => {}) {
  const f = runtimeFixture(t), writer = new CatalogueRepository(f.databasePath);
  try {
    const content = readRuntimePublication(writer, { ...f, contract: runtimeContractHash });
    content.modules["app/trial-corpus.json"] = { corpus: [report("SYN-A", [line]), report("H01")] };
    content.modules["app/reviewed-reports.json"] = { corpus: [report("SYN-B")] };
    content.modules[additions] = { corpus: [report("SYN-C")] };
    content.refs = prepareWebResources(writer, f.release, { "report:synthetic": [
      { path: ["corpus", 0, "framework", "lines"], value: [line] },
    ] });
    content.registrations[additions] = ["report:synthetic"];
    content.modules["lib/process-catalogue.mjs"] = { processes: [testProcess,
      { id: "SYN-RETIRED", title: "Retired", themeId: "beleidsevaluatie" }], processResearchTopics: {}, sourceDomains: {} };
    edit(content);
    f.publication = publishRuntime(writer, content, { release: f.release, contract: runtimeContractHash });
  } finally { writer.close(); }
  f.settings = join(f.dir, "settings.json");
  writeFileSync(f.settings, JSON.stringify({ database: f.databasePath, release: f.release, publication: f.publication }));
  f.out = join(f.dir, "baseline");
  return f;
}

test("baseline delivery includes deferred records and active processes without changing database bytes", t => {
  const f = fixture(t), before = readFileSync(f.databasePath);
  const result = exportReportBaseline(f);
  assert.equal(result.status, "BASELINE_DELIVERED_NOT_APPROVED");
  assert.equal(result.publishable || result.contentValidated || result.reviewValidated, false);
  assert.deepEqual(result.source, { release: f.release, publication: f.publication });
  assert.deepEqual(result.counts, { reports: 3, lines: 2 });
  const read = path => JSON.parse(readFileSync(join(f.dir, path)));
  assert.deepEqual(read(result.registry_path).corpus, [report("SYN-A", [line]), report("SYN-B"), report("SYN-C", [line])]);
  assert.deepEqual(read(result.taxonomy_path).processes, [testProcess, ...additionalProcesses]);
  assert.deepEqual(result.derivation.excluded_report_ids, ["H01"]);
  assert.equal(Object.keys(result.derivation.report_modules).length, 3);
  for (const [path, expected] of Object.entries(result.files)) assert.equal(hash(readFileSync(join(f.dir, path))), expected);
  assert.equal(hash(readFileSync(join(f.dir, result.receipt.path))), result.receipt.sha256);
  assert.equal(JSON.stringify(result).includes(f.dir), false, "no local machine paths in delivery receipt");
  assert.deepEqual(readFileSync(f.databasePath), before);
  const original = readFileSync(join(f.dir, result.receipt.path));
  assert.throws(() => exportReportBaseline(f), /NEW directory/);
  assert.deepEqual(readFileSync(join(f.dir, result.receipt.path)), original);
});

test("baseline exporter CLI uses explicit pins and writes its receipt last", t => {
  const f = fixture(t);
  const run = spawnSync(process.execPath, ["content-tools/export-report-baseline.mjs", "--settings", f.settings, "--out", f.out], { encoding: "utf8" });
  assert.ifError(run.error); assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(hash(readFileSync(join(f.dir, result.receipt.path))), result.receipt.sha256);
});

test("wrong pins, incomplete data, duplicate reports and unsafe taxonomy stop before creating output", async t => {
  for (const [name, edit, expected] of [
    ["missing corpus", c => { c.modules[additions] = {}; c.registrations[additions] = []; }, /complete report modules/],
    ["duplicate report", c => { c.modules[additions].corpus[0].framework.report.id = "SYN-A"; }, /Dubbel bronrapport/],
    ["invalid process", c => { c.modules["lib/process-catalogue.mjs"].processes[0] = { ...testProcess, id: "constructor" }; }, /process definition/],
    ["changed source reference", c => { c.modules[additions].source = { databaseSource: { schema: 1, release: c.release, version: "f".repeat(64), indexHash: "f".repeat(64) } }; }, /source reference/],
  ]) await t.test(name, t => {
    const f = fixture(t, edit), before = readFileSync(f.databasePath);
    assert.throws(() => exportReportBaseline(f), expected);
    assert.equal(existsSync(f.out), false);
    assert.deepEqual(readFileSync(f.databasePath), before);
  });
  const f = fixture(t);
  writeFileSync(f.settings, JSON.stringify({ database: f.databasePath, release: f.release, publication: "f".repeat(64) }));
  assert.throws(() => exportReportBaseline(f), /missing or changed publication/);
  assert.equal(existsSync(f.out), false);
});

test("baseline output cannot follow a directory link or replace existing output", t => {
  const f = fixture(t), outside = join(f.dir, "outside"), link = join(f.dir, "link");
  mkdirSync(outside); symlinkSync(outside, link, "junction");
  assert.throws(() => exportReportBaseline({ ...f, out: join(link, "baseline") }), /must not use links/);
  assert.deepEqual(readdirSync(outside), []);
  mkdirSync(f.out); writeFileSync(join(f.out, "keep.txt"), "original");
  assert.throws(() => exportReportBaseline(f), /NEW directory/);
  assert.equal(readFileSync(join(f.out, "keep.txt"), "utf8"), "original");
});
