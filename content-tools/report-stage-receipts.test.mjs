import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { recordStage } from "../skills/omnibus-add-report/scripts/stage-receipts.mjs";
import { reportStages } from "./local-report-method.mjs";
import { installContentSkills } from "../scripts/install-content-skills.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const tool = "../skills/omnibus-add-report/scripts/";
// Every source, approval, actor and observation below is fictitious test data.
// No source reading or real helper-release approval is issued by these fixtures.
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "omnibus-stage-test-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const packet = join(root, "packet"); await mkdir(packet);
  const put = async (name, value) => {
    const path = join(packet, name); await mkdir(dirname(path), { recursive: true });
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
    await writeFile(path, bytes); return hash(bytes);
  };
  const read = async name => JSON.parse(await readFile(join(packet, name), "utf8"));
  const files = {};
  for (const name of ["stage-receipts.mjs", "report-stages.mjs", "baseline-registry-counts.mjs"])
    files["scripts/" + name] = await put("kit/scripts/" + name, await readFile(new URL(tool + name, import.meta.url)));
  const manifest = { author_agent: "synthetic-helper-author", files };
  const releaseSha256 = await put("kit/RELEASE-MANIFEST.json", manifest);
  const approvalSha256 = await put("kit/APPROVAL.json", { decision: "APPROVE", reviewer_agent: "synthetic-independent-reviewer", target_manifest_sha256: releaseSha256 });
  await put("RELEASE-BINDING.json", { kit_manifest_path: "kit/RELEASE-MANIFEST.json", kit_manifest_sha256: releaseSha256,
    kit_approval_path: "kit/APPROVAL.json", kit_approval_sha256: approvalSha256 });
  await put("INPUT-FREEZE.json", { synthetic: true });
  const options = { packet, releaseSha256, approvalSha256 };
  const run = extra => recordStage({ ...options, ...extra });
  const start = stage => run({ action: "start", stage, actor: "synthetic-" + stage });
  const output = async stage => { for (const name of reportStages[stage][0]) await put(name, { synthetic: true }); };
  const finish = (stage, startSha256) => run({ action: "finish", stage, startSha256, observation: "Synthetic test execution only" });
  return { root, packet, put, read, run, start, finish, output, options, manifest };
}

test("installed standalone helper records all eight stages, retains original receipts and grants no approval", async t => {
  const f = await fixture(t);
  await installContentSkills(join(f.root, "skills"), { names: ["omnibus-add-report"], checkOnly: false });
  const installed = await import(pathToFileURL(join(f.root, "skills/omnibus-add-report/scripts/stage-receipts.mjs")));
  const originals = new Map();
  for (const [stage, [outputs, inputs]] of Object.entries(reportStages)) {
    for (const name of inputs) {
      try { await readFile(join(f.packet, name)); }
      catch (error) { if (error.code !== "ENOENT") throw error; await f.put(name, { synthetic: true }); }
    }
    const before = await installed.recordStage({ ...f.options, action: "start", stage, actor: "synthetic-" + stage });
    originals.set(before.receipt.path, await readFile(join(f.packet, before.receipt.path)));
    for (const name of outputs) await f.put(name, { synthetic: true });
    const end = await f.finish(stage, before.receipt.sha256);
    originals.set(end.receipt.path, await readFile(join(f.packet, end.receipt.path)));
    const checked = await f.run({ action: "check", stage, endSha256: end.receipt.sha256 });
    assert.equal(before.status, "STAGE_STARTED");
    for (const result of [end, checked]) {
      assert.equal(result.status, "STAGE_RECORDED_NOT_APPROVED");
      assert.equal(result.publishable, false);
      assert.equal(result.reviewValidated, false);
      assert.equal(result.contentValidated, false);
    }
  }
  assert.equal(Object.keys(await f.read("STAGE-INDEX.json")).length, 8);
  assert.equal((await readdir(join(f.packet, "stage-receipts"))).filter(name => name.startsWith("index-")).length, 15);
  for (const [name, bytes] of originals) assert.deepEqual(await readFile(join(f.packet, name)), bytes);
  const index = await f.read("STAGE-INDEX.json");
  const { stdout } = await promisify(execFile)(process.execPath, [
    join(f.root, "skills/omnibus-add-report/scripts/stage-receipts.mjs"), "check", "--packet", f.packet,
    "--stage", "source_a", "--release-sha256", f.options.releaseSha256, "--approval-sha256", f.options.approvalSha256,
    "--end-sha256", index.source_a.end.sha256,
  ]);
  assert.equal(JSON.parse(stdout).status, "STAGE_RECORDED_NOT_APPROVED");
});

async function baselinePlan(f) {
  const registry = "baseline/viewer/app/reviewed-reports.json", release = "baseline/release.json", taxonomy = "baseline/taxonomy.mjs";
  const files = {
    [registry]: await f.put(registry, { corpus: [{ framework: { report: { id: "SYNTHETIC-OLD" }, lines: [{ id: "a" }, { id: "b" }] } }] }),
    [release]: await f.put(release, { synthetic: "existing data release" }),
    [taxonomy]: await f.put(taxonomy, Buffer.from("throw Error('Snapshot code must never execute');")),
  };
  const sourceHash = await f.put("source.pdf", Buffer.from("Synthetic source bytes; no PDF parsing in this step"));
  await f.put("SOURCE.json", { pdf_path: "source.pdf", pdf_sha256: sourceHash });
  const plan = { report_id: "SYNTHETIC-NEW", candidate: "synthetic-candidate", model: "gpt-6-astra", source_pdf_sha256: sourceHash,
    selection: { classification_evidence: "Synthetic classification only", verified_by: "synthetic-verifier", retained_detail: "Keep this exact value" },
    baseline_observation: "Synthetic current collection for software testing only", registry_path: registry, release_path: release, taxonomy_path: taxonomy, files };
  const options = { action: "freeze-baseline", plan: "selection-plan.json", planSha256: await f.put("selection-plan.json", plan),
    inputFreezeSha256: hash(await readFile(join(f.packet, "INPUT-FREEZE.json"))), coordinator: "synthetic-coordinator" };
  return { plan, options };
}

test("standalone baseline freeze retains actual snapshots and binds subsequent readings to the external pin", async t => {
  const f = await fixture(t), { plan, options } = await baselinePlan(f);
  await installContentSkills(join(f.root, "skills"), { names: ["omnibus-add-report"], checkOnly: false });
  const { stdout } = await promisify(execFile)(process.execPath, [join(f.root, "skills/omnibus-add-report/scripts/stage-receipts.mjs"),
    "freeze-baseline", "--packet", f.packet, "--plan", options.plan, "--plan-sha256", options.planSha256,
    "--input-freeze-sha256", options.inputFreezeSha256, "--coordinator", options.coordinator,
    "--release-sha256", f.options.releaseSha256, "--approval-sha256", f.options.approvalSha256]);
  const result = JSON.parse(stdout), baseline = await f.read("BASELINE-FREEZE.json");
  assert.equal(result.status, "SELECTION_AND_BASELINE_FROZEN_NOT_APPROVED");
  assert.equal(result.publishable || result.contentValidated || result.reviewValidated, false);
  assert.deepEqual([baseline.active_reports, baseline.active_items], [1, 2]);
  assert.deepEqual(await f.read("SELECTION.json"), plan.selection);
  const control = await f.read("PILOT-CONTROL.json");
  assert.deepEqual([control.packet_id, control.report_id, control.one_report_only, control.second_report_authorized], ["packet", plan.report_id, true, false]);
  for (const [name, expected] of Object.entries(baseline.files)) assert.equal(hash(await readFile(join(f.packet, name))), expected);
  await assert.rejects(f.start("source_a"), /Externally retained baseline/);
  f.options.baselineFreezeSha256 = result.receipt.sha256;
  await assert.rejects(f.run(options), /already exists/);
  const start = await f.start("source_a");
  assert.equal((await f.read(start.receipt.path)).inputs["BASELINE-FREEZE.json"], result.receipt.sha256);
  await f.output("source_a");
  await f.put(plan.taxonomy_path, { changed: true });
  await assert.rejects(f.finish("source_a", start.receipt.sha256), /input\/output changed/);
});

test("selection freeze rejects wrong identity, unverified decisions and changed baseline before writing anchors", async t => {
  const cases = [
    ["active report", p => { p.report_id = "SYNTHETIC-OLD"; }, /already active/],
    ["classification", p => { p.selection.classification_evidence = ""; }, /Actual classification/],
    ["baseline observation", p => { p.baseline_observation = ""; }, /baseline observation/],
    ["source", p => { p.source_pdf_sha256 = "0".repeat(64); }, /different source/],
    ["changed snapshot", p => { p.files[p.registry_path] = "0".repeat(64); }, /input\/output changed/],
    ["missing release", p => { delete p.files[p.release_path]; }, /Baseline snapshots/],
    ["scope", p => { p.model = "unverified-method"; }, /Existing single-report method/],
    ["path", p => { p.files["baseline/../../outside"] = "0".repeat(64); }, /Unsafe packet path/],
  ];
  for (const [name, change, message] of cases) await t.test(name, async t => {
    const f = await fixture(t), { plan, options } = await baselinePlan(f);
    change(plan); options.planSha256 = await f.put(options.plan, plan);
    await assert.rejects(f.run(options), message);
    for (const name of ["SELECTION.json", "PILOT-CONTROL.json", "BASELINE-FREEZE.json"])
      await assert.rejects(readFile(join(f.packet, name)), /ENOENT/);
  });
});

test("selection freeze cannot reconstruct earlier execution, replace anchors or ignore externally retained hashes", async t => {
  const f = await fixture(t), { options } = await baselinePlan(f);
  await assert.rejects(f.run({ ...options, planSha256: "0".repeat(64) }), /Receipt changed/);
  await assert.rejects(f.run({ ...options, inputFreezeSha256: undefined }), /Externally retained input/);
  await f.put("inventory/output/READ-LOG.json", { alreadyRead: true });
  await assert.rejects(f.run(options), /already exists/);
  await assert.rejects(readFile(join(f.packet, "SELECTION.json")), /ENOENT/);
  const other = await fixture(t), second = await baselinePlan(other);
  await other.start("source_a");
  await assert.rejects(other.run(second.options), /precede every reading/);
  const partial = await fixture(t), third = await baselinePlan(partial);
  const original = await partial.put("SELECTION.json", { original: true });
  await assert.rejects(partial.run(third.options), /already exists/);
  assert.equal(hash(await readFile(join(partial.packet, "SELECTION.json"))), original);
});

test("baseline pins and observed plan cannot be removed or rewritten after freezing", async t => {
  const f = await fixture(t), { options } = await baselinePlan(f);
  const frozen = await f.run(options);
  f.options.baselineFreezeSha256 = frozen.receipt.sha256;
  await assert.rejects(f.run({ action: "start", stage: "source_a", actor: "test", baselineFreezeSha256: "0".repeat(64) }), /baseline freeze hash/);
  await f.put(options.plan, { changed: true });
  await assert.rejects(f.start("source_a"), /Receipt changed/);
  await assert.rejects(readFile(join(f.packet, "STAGE-INDEX.json")), /ENOENT/);
});

test("release must be independently approved and bound to actual executing helper bytes", async t => {
  const f = await fixture(t);
  await assert.rejects(f.run({ action: "start", stage: "source_a", actor: "test", releaseSha256: "0".repeat(64) }), /external pins/);
  await f.put("kit/scripts/stage-receipts.mjs", { changed: true });
  await assert.rejects(f.start("source_a"), /Released file changed/);
  f.manifest.files["scripts/stage-receipts.mjs"] = hash(await readFile(join(f.packet, "kit/scripts/stage-receipts.mjs")));
  f.options.releaseSha256 = await f.put("kit/RELEASE-MANIFEST.json", f.manifest);
  f.options.approvalSha256 = await f.put("kit/APPROVAL.json", { decision: "APPROVE", reviewer_agent: "synthetic-helper-author", target_manifest_sha256: f.options.releaseSha256 });
  const binding = await f.read("RELEASE-BINDING.json");
  binding.kit_manifest_sha256 = f.options.releaseSha256; binding.kit_approval_sha256 = f.options.approvalSha256;
  await f.put("RELEASE-BINDING.json", binding);
  await assert.rejects(f.start("source_a"), /Independent exact/);
  f.options.approvalSha256 = await f.put("kit/APPROVAL.json", { decision: "APPROVE", reviewer_agent: "synthetic-reviewer", target_manifest_sha256: f.options.releaseSha256 });
  binding.kit_approval_sha256 = f.options.approvalSha256; await f.put("RELEASE-BINDING.json", binding);
  await assert.rejects(f.start("source_a"), /Executing helper/);
});

test("completion requires externally retained start, observed work and every required output", async t => {
  const f = await fixture(t), begin = await f.start("source_a");
  await assert.rejects(f.finish("source_a", "0".repeat(64)), /Externally retained/);
  await assert.rejects(f.run({ action: "finish", stage: "source_a", startSha256: begin.receipt.sha256 }), /observation/);
  await assert.rejects(f.finish("source_a", begin.receipt.sha256), /ENOENT/);
  await f.output("source_a");
  const end = await f.finish("source_a", begin.receipt.sha256);
  await assert.rejects(f.run({ action: "check", stage: "source_a", endSha256: "0".repeat(64) }), /Externally retained/);
  await f.put("extractor/output/READ-LOG.json", { changed: true });
  await assert.rejects(f.run({ action: "check", stage: "source_a", endSha256: end.receipt.sha256 }), /input\/output changed/);
});

test("changed inputs or receipts cannot be silently regenerated", async t => {
  const f = await fixture(t), begin = await f.start("source_a");
  await f.output("source_a");
  await f.put("INPUT-FREEZE.json", { changed: true });
  await assert.rejects(f.finish("source_a", begin.receipt.sha256), /input\/output changed/);
  await f.put(begin.receipt.path, { changed: true });
  await assert.rejects(f.finish("source_a", begin.receipt.sha256), /Receipt changed/);
});

test("a start cannot be recorded retrospectively over existing work", async t => {
  const f = await fixture(t);
  await f.put("extractor/output/result.json", { alreadyWritten: true });
  await assert.rejects(f.start("source_a"), /output already exists/);
  await assert.rejects(readFile(join(f.packet, "STAGE-INDEX.json")), /ENOENT/);
});

test("existing stages, frozen first readings and unfinished dependencies cannot be overwritten or skipped", async t => {
  const f = await fixture(t), start = await f.start("source_a");
  await assert.rejects(f.start("source_a"), /already recorded/);
  await f.put("FIRST-SUBMISSIONS.json", { synthetic: true });
  await f.put("SOURCE.json", { synthetic: true });
  await assert.rejects(f.start("source_b"), /already frozen/);
  await assert.rejects(f.start("reconciliation"), /not complete/);
  await f.output("source_a"); await f.finish("source_a", start.receipt.sha256);
  await assert.rejects(f.finish("source_a", start.receipt.sha256), /already completed/);
  await mkdir(join(f.packet, ".stage-receipts.lock"));
  await assert.rejects(f.start("source_b"), /EEXIST/);
});

test("dependency output changes invalidate a later phase", async t => {
  const f = await fixture(t);
  for (const stage of ["source_a", "source_b"]) {
    const start = await f.start(stage); await f.output(stage); await f.finish(stage, start.receipt.sha256);
  }
  await f.put("FIRST-SUBMISSIONS.json", { synthetic: true }); await f.put("SOURCE.json", { synthetic: true });
  const begin = await f.start("reconciliation"); await f.output("reconciliation");
  await f.put("inventory/output/result.json", { changed: true });
  await assert.rejects(f.finish("reconciliation", begin.receipt.sha256), /input\/output changed/);
});

test("path traversal, absolute paths, symlinks and oversized receipt JSON are rejected", async t => {
  const f = await fixture(t), original = await f.read("RELEASE-BINDING.json");
  for (const path of ["../outside.json", "/outside.json", "C:/outside.json", "file:///outside.json", "kit/CON.json"]) {
    await f.put("RELEASE-BINDING.json", { ...original, kit_manifest_path: path });
    await assert.rejects(f.start("source_a"), /Unsafe packet path/);
  }
  await f.put("RELEASE-BINDING.json", Buffer.alloc(8 * 1024 * 1024 + 1));
  await assert.rejects(f.start("source_a"), /exceeds/);
  await f.put("RELEASE-BINDING.json", original);
  await mkdir(join(f.root, "outside"));
  await symlink(join(f.root, "outside"), join(f.packet, "stage-receipts"), "junction");
  await assert.rejects(f.start("source_a"), /Unsupported packet entry/);
  assert.deepEqual(await readdir(join(f.root, "outside")), []);
});
