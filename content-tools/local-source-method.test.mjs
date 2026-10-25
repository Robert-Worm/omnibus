import test from "node:test";
import assert from "node:assert/strict";
import { sourceMethodFixture } from "./test-support/local-source-method-fixture.mjs";
import { checkLocalSourceReview, localSourceSnapshot } from "./local-source-review.mjs";
import { checkLocalSourceMethod } from "./local-source-method.mjs";
import { sourceEvidenceReader } from "./source-evidence-reader.mjs";

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
for (const [label, name, edit, error] of reportCases) test(`report: ${String(label)} rejected even with rehashed synthetic custody`, () => {
  const f = sourceMethodFixture("report"); changeSynthetic(f, name, edit);
  assert.throws(() => checkLocalSourceMethod("report", context(f), f.proof), error);
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
