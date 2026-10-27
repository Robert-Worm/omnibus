import test from "node:test";
import assert from "node:assert/strict";
import { sourceMethodFixture } from "./test-support/local-source-method-fixture.mjs";
import { checkLocalSourceReview, localSourceSnapshot } from "./local-source-review.mjs";
import { checkLocalSourceMethod } from "./local-source-method.mjs";
import { sourceEvidenceReader } from "./source-evidence-reader.mjs";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { recordStage } from "../skills/omnibus-add-report/scripts/stage-receipts.mjs";

const check = f => checkLocalSourceReview(f.manifest, f.files, f.authorIds, f.proof);
const context = f => ({ ...localSourceSnapshot(f.manifest, f.files), manifest: f.manifest, files: f.files,
  dependencies: f.read("REVIEW-BASIS.json")[f.manifest.package.kind === "report" ? "files" : "target_hashes"],
  reviews: (f.manifest.package.kind === "report" ? ["SOURCE", "PRACTICAL"] : ["SOURCE", "LEGAL", "PRACTICAL"]).map(role => f.read(`reviews/${role}.json`)), authorIds: f.authorIds });

// Deliberately rebind *fictitious* envelopes to exercise content rules beyond
// hash rejection. This helper must never be used on a genuine review dossier.
function changeSynthetic(f, name, change) {
  const replacements = new Map(), value = f.read(name), old = f.hash(name);
  change(value); f.set(name, value); replacements.set(old, f.hash(name));
  const rewrite = value => {
    if (typeof value === "string") return replacements.get(value) ?? value;
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child)]));
    return value;
  };
  for (let round = 0; round < 40; round++) {
    let changed = false;
    for (const [path] of f.paths) {
      let before; try { before = f.read(path); } catch { continue; }
      const after = rewrite(before);
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      const previous = f.hash(path); f.set(path, after); replacements.set(previous, f.hash(path)); changed = true;
    }
    Object.assign(f.proof, rewrite(f.proof));
    if (!changed) return;
  }
  throw Error("Synthetic evidence graph did not settle");
}

for (const kind of ["report", "framework"]) {
  test(`${kind}: complete retained method evidence is checked without changing files or granting admission`, () => {
    const f = sourceMethodFixture(kind), before = [...f.files].map(([key, bytes]) => [key, Buffer.from(bytes)]);
    const result = check(f);
    assert.equal(result.sourceMethodValidated, true); assert.equal(result.method.completeReadings, 4);
    assert.equal(result.method.pages, 3); assert.equal(result.method.actualReading, "COORDINATOR_ATTESTATION");
    assert.equal(result.reviewValidated, false); assert.equal(result.newContentApproval, false); assert.equal(result.publishable, false);
    assert.deepEqual([...f.files], before);
  });
  for (const receipt of ["firstReceipt", "finalReceipt"]) test(`${kind}: separately retained ${receipt} hash cannot be replaced by packet metadata`, () => {
    const f = sourceMethodFixture(kind); f.proof[receipt].sha256 = "0".repeat(64);
    assert.throws(() => check(f), /externally retained evidence hash/);
  });
  test(`${kind}: no external file is read through historical path labels`, () => {
    const f = sourceMethodFixture(kind), reader = sourceEvidenceReader(context(f), f.proof);
    assert.throws(() => reader.digest("https://example.invalid/secret", "a".repeat(64)), /no explicit intake mapping/);
    assert.throws(() => reader.digest("../../outside.json", "a".repeat(64)), /no explicit intake mapping/);
    f.proof.paths.push({ original: "REVIEW-BASIS.json", fileId: f.proof.firstReceipt.fileId });
    assert.throws(() => sourceEvidenceReader(context(f), f.proof).find("REVIEW-BASIS.json"), /cannot be redirected/);
  });
  test(`${kind}: duplicate mapped paths and unexpected proof fields fail closed`, () => {
    const f = sourceMethodFixture(kind);
    f.proof.paths = [{ original: "/example/one", fileId: f.proof.firstReceipt.fileId }, { original: "\\example\\one", fileId: f.proof.finalReceipt.fileId }];
    assert.throws(() => check(f), /duplicate\/unknown/);
    f.proof.paths = []; f.proof.skipReading = true;
    assert.throws(() => check(f), /unexpected fields/);
  });
}

const reportCases = [
  ["missing visual page", "extractor/output/READ-LOG.json", v => { v.visual_pages_read.pop(); }, /reader visual_pages_read/],
  ["duplicate text page", "inventory/output/READ-LOG.json", v => { v.text_pages_read.push(1); }, /reader text_pages_read/],
  ["no reconciler observation", "RECONCILIATION-LOG.json", v => { delete v.all_page_read_log[0].observation; }, /reconciler observation/],
  ["no executed phase observation", "custody/repairs-end.json", v => { v.execution_observation = ""; }, /identity\/observation/],
  ["dependency completed too late", "custody/repairs-start.json", v => { v.started_at = "2026-01-01T00:01:00Z"; }, /before dependency completed/],
  ["stale dependency", "custody/repairs-start.json", v => { v.dependencies.practical_draft_review.sha256 = "0".repeat(64); }, /stale dependency/],
  ["stage inputs recreated", "custody/repairs-end.json", v => { delete v.inputs["RELEASE-BINDING.json"]; }, /inputs recreated/],
  ["first freeze after comparison", "FIRST-SUBMISSIONS.json", v => { v.frozen_at = "2026-01-01T01:00:00Z"; }, /comparison precedes/],
  ["comparison already started", "FIRST-SUBMISSIONS.json", v => { v.comparison_started = true; }, /before comparison/],
  ["missing independent observation", "custody/final.json", v => { v.actual_agent_separation_verified = false; }, /coordinator observation/],
  ["no identity observation", "custody/final.json", v => { v.identity_verification_basis = ""; }, /coordinator observation/],
  ["wrong original engine", "custody/final.json", v => { v.engine["gate.py"] = "0".repeat(64); }, /unreviewed extraction engine/],
  ["self-approved kit", "kit/APPROVAL.json", v => { v.reviewer_agent = "synthetic-kit-author"; }, /independent exact kit approval/],
  ["wrong baseline counts", "BASELINE-FREEZE.json", v => { v.active_reports = 1; }, /baseline registry counts/],
  ["missing draft review field", "audit-draft-review.json", v => { delete v.item_reviews[0].field_assessments.risk; }, /draft field assessment/],
  ["unresolved draft repair", "audit-draft-review.json", v => { v.required_changes = [{ id: "repair-1" }]; }, /repair dispositions incomplete/],
];
for (const standalone of [false, true]) for (const [label, name, edit, error] of reportCases) test(`report ${standalone ? "standalone" : "legacy"}: ${String(label)} rejected even with rehashed synthetic custody`, () => {
  const f = sourceMethodFixture("report", undefined, { standalone }); changeSynthetic(f, name, edit);
  assert.throws(() => checkLocalSourceMethod("report", context(f), f.proof), error);
});

test("standalone report: existing substantive review and source checks accept the new receipt format read-only", () => {
  const f = sourceMethodFixture("report", undefined, { standalone: true }), before = [...f.files].map(([id, bytes]) => [id, Buffer.from(bytes)]);
  const result = check(f);
  assert.equal(result.sourceMethodValidated, true);
  assert.equal(result.method.completeReadings, 4);
  assert.equal(result.sourcePassagesValidated, true);
  assert.equal(result.sourceStructureValidated, true);
  assert.equal(result.reviewValidated || result.newContentApproval || result.publishable, false);
  assert.deepEqual([...f.files], before);
});

test("standalone report: receipt produced by the shipped helper reaches the existing substantive gate unchanged", async t => {
  const f = sourceMethodFixture("report", undefined, { standalone: true });
  const packet = await mkdtemp(join(tmpdir(), "omnibus-report-receive-"));
  t.after(() => rm(packet, { recursive: true, force: true }));
  for (const [name, file] of f.paths) {
    if (["STAGES.json", "custody/final.json", "CUSTODY-FINAL.json"].includes(name)) continue;
    const target = join(packet, name); await mkdir(dirname(target), { recursive: true }); await writeFile(target, f.files.get(file.id));
  }
  const options = { packet, releaseSha256: f.proof.release.manifest.sha256, approvalSha256: f.proof.release.approval.sha256,
    inputFreezeSha256: f.hash("INPUT-FREEZE.json"), baselineFreezeSha256: f.hash("BASELINE-FREEZE.json"),
    firstReceiptSha256: f.proof.firstReceipt.sha256, reviewBasisSha256: f.hash("REVIEW-BASIS.json") };
  const recorded = await recordStage({ ...options, action: "record-final", attestation: "attestation.json", attestationSha256: f.hash("attestation.json") });
  const checked = await recordStage({ ...options, action: "check-final", finalReceiptSha256: recorded.receipt.sha256 });
  assert.equal(checked.status, "FINAL_CUSTODY_CHECKED_NOT_APPROVED");
  for (const name of ["STAGES.json", "CUSTODY-FINAL.json", recorded.receipt.path]) f.set(name, await readFile(join(packet, name), "utf8"));
  f.proof.finalReceipt = f.pin(recorded.receipt.path);
  assert.equal(f.proof.finalReceipt.sha256, recorded.receipt.sha256);
  const result = check(f);
  assert.equal(result.sourceMethodValidated, true);
  assert.equal(result.publishable || result.newContentApproval, false);
});

for (const [label, edit, error] of [
  ["item coverage", v => { v.item_reviews = []; }, /coverage differs/],
  ["full source assessment", v => { delete v.source_assessments.completeness; }, /missing full source review/],
]) test(`standalone report: ordinary ${String(label)} checks remain mandatory beyond custody`, () => {
  const f = sourceMethodFixture("report", undefined, { standalone: true });
  for (const name of ["reviews/SOURCE.json", "source-final-review.json"]) changeSynthetic(f, name, edit);
  assert.throws(() => check(f), error);
});

for (const [label, name, edit, error] of [
  ["unknown format", "custody/final.json", v => { v.receipt_kind = "future-unchecked"; }, /unknown report receipt/],
  ["claims approval", "custody/final.json", v => { v.contentValidated = true; }, /cannot grant content approval/],
  ["missing helper", "kit/RELEASE-MANIFEST.json", v => { delete v.files["scripts/prepare-source.py"]; }, /omits required/],
  ["wrong observed actor", "attestation.json", v => { v.actors.source_a = "someone-else"; }, /attestation differs/],
  ["wrong observed phase", "attestation.json", v => { v.stage_end_hashes.source_a = "0".repeat(64); }, /stage end differs/],
  ["unapproved reader instructions", "INPUT-FREEZE.json", v => { v.preparation.resource_hashes["QUALITY.md"] = "0".repeat(64); }, /reader instructions/],
  ["omitted page image", "INPUT-FREEZE.json", v => { delete v.packet_hashes["visual/page-2.png"]; }, /page images incomplete/],
  ["changed taxonomy definition", "TAXONOMY-SNAPSHOT.json", v => { Object.values(v.processes)[0].title = "Another definition"; }, /taxonomy differs/],
  ["different selection", "selection-plan.json", v => { v.report_id = "OTHER"; }, /selection plan differs/],
  ["missing item review", "source-final-review.json", v => { v.item_reviews = []; }, /review differs/],
  ["missing full reading assessment", "source-final-review.json", v => { delete v.source_assessments.completeness; }, /review differs/],
]) test(`standalone report: ${String(label)} remains blocked with consistent synthetic hashes`, () => {
  const f = sourceMethodFixture("report", undefined, { standalone: true }); changeSynthetic(f, name, edit);
  assert.throws(() => check(f), error);
});

const frameworkCases = [
  ["missing image observation", "reader-a/READ-LOG.json", v => { v.image_pages_viewed[0].observation = ""; }, /substantive page observation/],
  ["missing physical blank page", "reader-b/READ-LOG.json", v => { v.text_pages_read.splice(1, 1); }, /incomplete or duplicated/],
  ["changed reading contract", "reconciliation/READ-LOG.json", v => { v.contract_sha256 = "0".repeat(64); }, /source or contract changed/],
  ["early reconciliation", "reconciliation/STAGE-START.json", v => { v.started_at_utc = "2026-01-01T00:00:00Z"; }, /before first freeze/],
  ["early practical authoring", "authoring/STAGE-START.json", v => { v.started_at = "2026-01-01T00:00:00Z"; }, /before stable source/],
  ["unobserved source completion", "custody/STABLE-SOURCE.json", v => { v.author_completion_observed = false; }, /stable source receipt/],
  ["early repair", "authoring/REPAIRS.json", v => { v.created_at_utc = "2026-01-01T00:00:00Z"; }, /repair precedes/],
  ["draft self-review", "authoring/DRAFT-REVIEW.json", v => { v.reviewer_agent = "synthetic-author"; }, /draft reviewer independence/],
  ["unobserved role separation", "custody/FINAL-RECEIPT.json", v => { v.actual_role_separation_verified = false; }, /actual final review observation/],
  ["wrong observed reconciler", "custody/FINAL-RECEIPT.json", v => { v.role_separation.reconciler = "someone-else"; }, /role observation differs/],
  ["unsafe project migration", "MIGRATION.json", v => { v.automatic_migration = true; }, /unsafe migration/],
];
test("framework: retained blind_scope and structured omission audit need no rewritten historical receipt", () => {
  const f = sourceMethodFixture("framework");
  changeSynthetic(f, "reader-b/STAGE-START.json", value => { value.blind_scope = value.independence; delete value.independence; });
  changeSynthetic(f, "RECONCILIATION.json", value => { value.omission_audit = { method: "Fictieve omissiecontrole.", page_assessments: [] }; });
  assert.equal(check(f).sourceMethodValidated, true);
});
for (const [label, name, edit, error] of frameworkCases) test(`framework: ${String(label)} rejected even with rehashed synthetic custody`, () => {
  const f = sourceMethodFixture("framework"); changeSynthetic(f, name, edit);
  assert.throws(() => checkLocalSourceMethod("framework", context(f), f.proof), error);
});
