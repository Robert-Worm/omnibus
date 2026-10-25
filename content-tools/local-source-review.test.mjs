import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkLocalSourceReview } from "./local-source-review.mjs";
import { sourceReviewFixture, hashBytes } from "./test-support/local-source-review-fixture.mjs";
import { reportViewerFixture } from "./test-support/local-report-viewer-fixture.mjs";
import { prepareIntake } from "./intake.mjs";
import { buildLocalDatabase, checkLocalDatabase, localDatabaseFailure } from "./local-database.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const kind of ["report", "framework"]) {
  for (const prefix of ["", "payload", "transfer/reviewed"]) test(`${kind}: exact original review bindings work under prefix '${prefix}' without approval`, () => {
    const f = sourceReviewFixture(kind, prefix), before = [...f.files].map(([id, bytes]) => [id, Buffer.from(bytes)]);
    const result = checkLocalSourceReview(f.manifest, f.files, f.authorIds);
    const record = f.read("RECONCILED-SOURCE.json").records[0];
    assert.equal(record[kind === "report" ? "record_id" : "id"], "R1");
    assert.equal(Object.hasOwn(record, kind === "report" ? "id" : "record_id"), false);
    assert.equal(result.status, "REVIEW_BINDINGS_CHECKED");
    assert.equal(result.reviewBindingsValidated, true);
    assert.equal(result.sourcePassagesValidated, true);
    assert.equal(result.passages.pages, 3);
    for (const key of ["sourceMethodValidated", "reviewValidated", "viewerShapeValidated", "newContentApproval", "publishable"])
      assert.equal(result[key], false, key);
    assert.equal(result.reviewers, kind === "report" ? 2 : 3);
    assert.equal(result.sourceStructureValidated, true);
    assert.equal(result.contentObjects, kind === "report" ? 1 : 2); assert.equal(result.sourceRecords, 1);
    assert.deepEqual([...f.files], before);
  });

  const editReview = (f, edit) => { const value = f.read("reviews/SOURCE.json"); edit(value); f.set("reviews/SOURCE.json", value); };
  /** @type {[string, (fixture: ReturnType<typeof sourceReviewFixture>) => void, RegExp][]} */
  const negative = [
    ["changed checked bytes", f => f.files.set(f.paths.get("RECONCILED-SOURCE.json").id, Buffer.from("changed")), /snapshot differs/],
    ["rehashed intake but stale source review", f => f.set("RECONCILED-SOURCE.json", { author_agent: "synthetic-reconciler", records: [{ id: "CHANGED" }] }), /changed frozen dependency/],
    ["missing frozen dependency", f => f.files.delete(f.paths.get("RECONCILED-SOURCE.json").id), /missing frozen dependency/],
    ["missing review", f => { f.manifest.files = f.manifest.files.filter(file => file !== f.paths.get("reviews/SOURCE.json")); }, /each final reviewer/],
    ["author self-review", f => editReview(f, r => { r.reviewer_agent = "synthetic-author"; }), /reviewer is also/],
    ["source-bank self-review", f => editReview(f, r => { r.reviewer_agent = "synthetic-reconciler"; }), /reviewer is also/],
    ["one actor in two roles", f => editReview(f, r => { r.reviewer_agent = "synthetic-reviewer-PRACTICAL"; }), /reviewer is also/],
    ["duplicate role", f => editReview(f, r => { r[kind === "report" ? "review_kind" : "review_role"] = "PRACTICAL"; }), /missing or duplicate/],
    ["unclosed review", f => editReview(f, r => { r.decision = "REVISE"; }), /unclosed final/],
    ["unresolved review issue", f => editReview(f, r => { r.unresolved_issues = ["synthetic open issue"]; }), /unclosed final/],
    ["human approval claim", f => editReview(f, r => { r.human_validation = true; }), /unclosed final/],
    ["wrong exact final bytes", f => editReview(f, r => { r.target_hashes["CATALOGUE.json"] = "0".repeat(64); }), /final review targets/],
    ["missing target", f => editReview(f, r => { delete r.target_hashes["REVIEW-BASIS.json"]; }), /final review targets/],
    ["unreviewed extra source", f => f.set("extra.txt", "Unreviewed source", ["source"]), /outside the frozen review basis/],
    ["missing review object", f => editReview(f, r => { r[kind === "report" ? "item_reviews" : "object_reviews"].shift(); }), /coverage differs/],
    ["duplicate review object", f => editReview(f, r => { const rows = r[kind === "report" ? "item_reviews" : "object_reviews"]; rows.push(rows[0]); }), /duplicate identities/],
    ["missing review aspect", f => editReview(f, r => { const fields = r[kind === "report" ? "item_reviews" : "object_reviews"][0][kind === "report" ? "field_assessments" : "aspects"]; delete fields[Object.keys(fields)[0]]; }), /missing required review aspects/],
    ["invented dependency path", f => { const b = f.read("REVIEW-BASIS.json"); (kind === "report" ? b.files : b.target_hashes)["../source.pdf"] = "a".repeat(64); f.set("REVIEW-BASIS.json", b); }, /original relative/],
  ];
  if (kind === "framework") negative.push(["lost source-link review", f => editReview(f, r => { r.object_reviews[0].link_count = 0; }), /relationship count/]);
  for (const [label, edit, message] of negative) test(`${kind}: ${label} is rejected without rewriting evidence`, () => {
    const f = sourceReviewFixture(kind); edit(f);
    const before = [...f.files].map(([id, bytes]) => [id, Buffer.from(bytes)]);
    assert.throws(() => checkLocalSourceReview(f.manifest, f.files, f.authorIds), message);
    assert.deepEqual([...f.files], before);
  });

  for (const viewerReady of kind === "report" ? [false, true] : [false])
  test(`${kind}: real local CLI preserves source HOLD (viewer shape checked=${viewerReady})`, async t => {
    const scratch = join(root, "work", "local-source-review-tests"); mkdirSync(scratch, { recursive: true });
    const dir = mkdtempSync(join(scratch, "case-"));
    t.after(() => { assert.equal(dirname(dir), scratch); rmSync(dir, { recursive: true, force: true }); });
    const f = viewerReady ? reportViewerFixture() : sourceReviewFixture(kind);
    for (const file of f.manifest.files) { const path = join(dir, file.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, f.files.get(file.id)); }
    const intakePlan = join(dir, "plan.json"), intake = join(dir, "intake.json");
    writeFileSync(intakePlan, JSON.stringify({ format: "omnibus-intake-plan", schemaVersion: 1,
      package: f.manifest.package, contract: f.manifest.contract,
      files: f.manifest.files.map(({ id, path, roles }) => ({ id, path, roles })) }));
    const prepared = await prepareIntake(intakePlan, intake);
    const plan = join(dir, "packages.json"), out = join(dir, "unused-database");
    writeFileSync(plan, JSON.stringify({ format: "omnibus-local-database", schemaVersion: 1,
      packages: [{ intake: "intake.json", sha256: prepared.manifestSha256, authorIds: f.authorIds }] }));
    const before = readdirSync(dir, { recursive: true });
    const held = error => {
      const result = localDatabaseFailure(error);
      assert.equal(result.status, "HOLD"); assert.equal(result.code, "SOURCE_INTEGRATION_REQUIRED");
      assert.equal(result.reviewEvidence.reviewBindingsValidated, true);
      assert.equal(result.reviewEvidence.sourcePassagesValidated, true);
      assert.equal(result.reviewEvidence.sourceMethodValidated, false);
      assert.equal(result.reviewEvidence.viewerShapeValidated, viewerReady);
      assert.equal(result.newContentApproval, false); return true;
    };
    await assert.rejects(checkLocalDatabase({ plan }), held);
    await assert.rejects(buildLocalDatabase({ plan, out }), held);
    await assert.rejects(buildLocalDatabase({ plan, out, base: "must-not-be-read.json" }), held);
    assert.deepEqual(readdirSync(dir, { recursive: true }), before); assert.equal(existsSync(out), false);
    const child = spawnSync(process.execPath, [join(root, "scripts/build-local-database.mjs"), "--plan", plan, "--check"],
      { encoding: "utf8", timeout: 15000, windowsHide: true });
    assert.ifError(child.error); assert.equal(child.status, 1); assert.equal(child.stdout, "");
    const failure = JSON.parse(child.stderr.slice(child.stderr.indexOf("{"), child.stderr.lastIndexOf("}") + 1));
    assert.equal(failure.code, "SOURCE_INTEGRATION_REQUIRED");
    assert.equal(failure.reviewEvidence.kind, kind);
    assert.equal(hashBytes(readFileSync(intake)), prepared.manifestSha256);
  });
}
