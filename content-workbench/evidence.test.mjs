import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { WorkbenchStore } from "./store.mjs";
import {
  collectEvidence,
  matchReports,
  readEvidencePlan,
  reviewBindings,
  historicalReportBinding,
} from "./evidence.mjs";
import { saveEvidence } from "./evidence-store.mjs";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceId = "a".repeat(64);
const source = { id: sourceId, title: "Test report", date: "2026-01-01" };
function plan(publications = [], intakes = []) {
  return { format: "omnibus-workbench-evidence", version: 1, publications, intakes };
}
function intakeFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-evidence-"));
  const cleanup = [];
  t.after(() => {
    for (const close of cleanup) close();
    rmSync(dir, { recursive: true, force: true });
  });
  const files = [],
    targets = {};
  const write = (path, value, roles) => {
    const bytes = Buffer.from(JSON.stringify(value));
    writeFileSync(join(dir, path), bytes);
    const entry = { id: "f" + files.length, path, sha256: hash(bytes), bytes: bytes.length, roles };
    const old = files.findIndex((f) => f.path === path);
    if (old < 0) files.push(entry);
    else files[old] = { ...entry, id: files[old].id };
    return entry.sha256;
  };
  for (const path of [
    "APP-FINAL.json",
    "CATALOGUE.json",
    "RECONCILED-SOURCE.json",
    "INCLUSION-DECISIONS.json",
    "APP-SOURCE-LINKS.json",
  ])
    targets[path] = write(path, { synthetic: true }, ["supporting"]);
  targets["REVIEW-BASIS.json"] = write("REVIEW-BASIS.json", { files: { ...targets } }, [
    "review-basis",
  ]);
  const makeReview = (kind, reviewer, decision = "APPROVE") => ({
    review_kind: kind,
    reviewer_agent: reviewer,
    decision,
    human_validation: false,
    item_reviews: [{ id: "TEST-1", decision: "APPROVE" }],
    unresolved_issues: [],
    target_hashes: targets,
  });
  write("source-review.json", makeReview("SOURCE", "test-source"), ["review"]);
  write("practical-review.json", makeReview("PRACTICAL", "test-practical"), ["review"]);
  write("dummy.json", { synthetic: true }, [
    "contract",
    "source",
    "source-text",
    "limitations",
    "source-bank",
    "viewer-content",
    "catalogue",
    "source-links",
    "context",
    "receipt",
  ]);
  const manifest = {
    format: "omnibus-intake",
    schemaVersion: 1,
    package: { id: "TEST", kind: "report", version: "test-1", title: "Test report" },
    contract: "report-kit-1.1",
    files,
  };
  const pin = () => {
    const bytes = Buffer.from(JSON.stringify(manifest));
    writeFileSync(join(dir, "intake.json"), bytes);
    return hash(bytes);
  };
  const entry = {
    label: "Intake test",
    manifest: "intake.json",
    manifestSha256: pin(),
    historicalReport: false,
    packageId: "TEST",
    packageVersion: "test-1",
    sourceId,
    reason: "Explicit synthetic match",
    reviews: ["source-review.json", "practical-review.json"],
  };
  const input = () => ({ plan: plan([], [entry]), base: dir, hash: hash("plan") });
  return { dir, entry, input, manifest, targets, write, pin, makeReview, cleanup };
}

test("matching is exact and unique; ambiguity and changed explicit versions cannot be promoted", () => {
  const report = { id: "R", version: "v1", title: "TEST   report", date: source.date };
  assert.equal(matchReports([report], [source]).results.length, 1);
  assert.equal(
    matchReports([report], [source, { ...source, id: "b".repeat(64) }]).unmatched.length,
    1,
  );
  assert.equal(matchReports([{ ...report, date: "2025" }], [source]).results.length, 0);
  assert.equal(matchReports([{ ...report, title: "Test report!" }], [source]).results.length, 0);
  assert.throws(() =>
    matchReports(
      [report],
      [source],
      [{ packageId: "R", packageVersion: "changed", sourceId, reason: "No" }],
    ),
  );
});

test("publication evidence uses verified read-only snapshots; candidate does not mean active or reviewed", async (t) => {
  const f = runtimeFixture(t, {
    packages: [
      {
        id: "R",
        kind: "report",
        title: source.title,
        metadata: { publication_date: source.date },
        records: [],
      },
      { id: "MODEL", kind: "model", title: "Synthetic model", records: [] },
    ],
  });
  const path = join(f.dir, "settings.json");
  writeFileSync(
    path,
    JSON.stringify({ database: f.databasePath, release: f.release, publication: f.publication }),
  );
  const entry = {
    label: "Candidate",
    kind: "candidate",
    settings: path,
    release: f.release,
    publication: f.publication,
    mappings: [],
  };
  const input = { plan: plan([entry]), base: f.dir, hash: hash("plan") };
  const before = readFileSync(f.databasePath),
    result = await collectEvidence(input, [source]);
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].kind, "candidate");
  assert.equal(result.links[0].facts.newContentApproval, false);
  assert.equal(result.results[0].otherPackages[0].id, "MODEL");
  assert.equal(result.links[0].facts.otherPackages, undefined);
  assert.deepEqual(readFileSync(f.databasePath), before);
  entry.release = "f".repeat(64);
  assert.equal((await collectEvidence(input, [source])).links.length, 0);
  entry.release = f.release;
  const db = new DatabaseSync(f.databasePath);
  db.exec("UPDATE packages SET title='tampered'");
  db.close();
  const damaged = await collectEvidence(input, [source]);
  assert.equal(damaged.results[0].status, "failed");
  assert.equal(damaged.links.length, 0);
});

test("historical report reviews bind the retained receipt and full review basis without claiming intake", async (t) => {
  const f = intakeFixture(t);
  f.targets["APP-FINAL.json"] = f.write(
    "APP-FINAL.json",
    { framework: { report: { id: "TEST" } } },
    ["supporting"],
  );
  const targets = { ...f.targets };
  delete targets["REVIEW-BASIS.json"];
  f.targets["REVIEW-BASIS.json"] = f.write("REVIEW-BASIS.json", { files: targets }, [
    "review-basis",
  ]);
  f.write("source-final-review.json", f.makeReview("SOURCE", "reader"), ["review"]);
  f.write("audit-final-review.json", f.makeReview("PRACTICAL", "auditor"), ["review"]);
  const receipt = {
    report_id: "TEST",
    files: Object.fromEntries(f.manifest.files.map((p) => [p.path, p.sha256])),
  };
  const entry = {
    label: "Historical test",
    directory: ".",
    receipt: "receipt.json",
    packageId: "TEST",
    sourceId,
    reason: "Historical only",
  };
  const pin = () => (entry.receiptSha256 = f.write("receipt.json", receipt, ["receipt"]));
  pin();
  assert.equal(historicalReportBinding(entry, f.dir).reviews.length, 2);
  const input = { plan: { ...plan(), archives: [entry] }, base: f.dir, hash: hash("plan") };
  const result = await collectEvidence(input, [source]);
  assert.deepEqual(
    result.links.map((l) => l.kind),
    ["review"],
  );
  assert.equal(result.links[0].facts.evidenceScope, "historical-review");
  assert.equal(result.links[0].facts.package.version, f.targets["REVIEW-BASIS.json"]);
  assert.throws(() => historicalReportBinding({ ...entry, packageId: "OTHER" }, f.dir));
  assert.throws(() => historicalReportBinding({ ...entry, receiptSha256: "f".repeat(64) }, f.dir));
  receipt.files["../outside.json"] = "a".repeat(64);
  pin();
  assert.throws(() => historicalReportBinding(entry, f.dir), /Unsafe/);
  delete receipt.files["../outside.json"];
  pin();
  f.write("CATALOGUE.json", { changed: true }, ["supporting"]);
  const failed = await collectEvidence(input, [source]);
  assert.equal(failed.links.length, 0);
  assert.equal(failed.results[0].status, "failed");
});

test("intake and selected review bindings retain exact hashes and never infer human acceptance", async (t) => {
  const f = intakeFixture(t),
    result = await collectEvidence(f.input(), [source]);
  assert.deepEqual(
    result.links.map((r) => r.kind),
    ["intake", "review"],
  );
  const review = result.links[1].facts;
  assert.equal(review.bothApproved, true);
  assert.equal(review.newContentApproval, false);
  assert(review.reviews.every((r) => r.humanValidation === false && r.bindingVerified));
  f.write("source-review.json", f.makeReview("SOURCE", "test-source", "HOLD"), ["review"]);
  f.entry.manifestSha256 = f.pin();
  const hold = await collectEvidence(f.input(), [source]);
  assert.equal(hold.links[1].facts.bothApproved, false);
  assert.equal(hold.links[1].facts.reviews[0].decision, "HOLD");
});

test("stale review targets, missing bytes and foreign paths fail closed without laundering intake into approval", async (t) => {
  const f = intakeFixture(t);
  f.write("APP-FINAL.json", { changed: true }, ["supporting"]);
  f.entry.manifestSha256 = f.pin();
  const stale = await collectEvidence(f.input(), [source]);
  assert.deepEqual(
    stale.links.map((r) => r.kind),
    ["intake"],
  );
  assert.equal(stale.results.at(-1).status, "failed");
  assert.equal(stale.results.at(-1).type, "review");
  writeFileSync(join(f.dir, "dummy.json"), "changed outside envelope");
  const corrupt = await collectEvidence(f.input(), [source]);
  assert.equal(corrupt.links.length, 0);
  assert.throws(() => reviewBindings(f.manifest, f.dir, ["../outside.json"]));
});

test("independent review selection requires distinct reviewers and exact common basis", (t) => {
  const f = intakeFixture(t);
  f.write("practical-review.json", f.makeReview("PRACTICAL", "test-source"), ["review"]);
  assert.throws(() => reviewBindings(f.manifest, f.dir, f.entry.reviews), /distinct/);
  assert.throws(
    () => reviewBindings(f.manifest, f.dir, ["source-review.json", "source-review.json"]),
    /Duplicate/,
  );
  const contradictory = f.makeReview("SOURCE", "test-source");
  contradictory.unresolved_issues = ["Open repair"];
  f.write("source-review.json", contradictory, ["review"]);
  assert.throws(() => reviewBindings(f.manifest, f.dir, ["source-review.json"]), /conflicts/);
});

test("evidence refresh is atomic, preserves manual history and retires stale positive badges after failure", (t) => {
  const f = intakeFixture(t),
    store = new WorkbenchStore(join(f.dir, "workbench.sqlite"));
  f.cleanup.push(() => store.close());
  store.importCsv(Buffer.from("titel;url\nTest;https://example.invalid"), {
    label: "Test",
    path: "test.csv",
  });
  const id = store.list({}).rows[0].id;
  store.change(id, {
    revision: 0,
    stage: "queued",
    disposition: "blocked",
    priority: "high",
    note: "Keep HOLD",
    reference: "",
  });
  const facts = {
    type: "active",
    label: "Active",
    status: "verified",
    package: { id: "R", version: "v1" },
  };
  saveEvidence(store.db, {
    planHash: hash("p"),
    results: [facts],
    links: [{ sourceId: id, kind: "active", facts }],
  });
  assert.equal(store.list({ evidence: "active" }).total, 1);
  assert.equal(store.list({ evidence: "none" }).total, 0);
  assert.equal(store.overview().publicationLinked, true);
  assert.throws(() =>
    saveEvidence(store.db, {
      planHash: hash("p"),
      results: [],
      links: [{ sourceId, kind: "active", facts }],
    }),
  );
  assert.equal(store.list({ evidence: "active" }).total, 1);
  saveEvidence(store.db, {
    planHash: hash("p"),
    results: [{ type: "active", status: "failed" }],
    links: [],
  });
  assert.equal(store.list({ evidence: "active" }).total, 0);
  assert.equal(store.overview().publicationLinked, false);
  assert.equal(store.detail(id).disposition, "blocked");
  assert.equal(store.detail(id).history.length, 1);
  assert.equal(store.db.prepare("SELECT count(*) n FROM evidence_runs").get().n, 2);
});

test("private plans reject unknown fields and multiple active targets", (t) => {
  const f = intakeFixture(t),
    path = join(f.dir, "plan.json");
  writeFileSync(path, JSON.stringify(f.input().plan));
  assert.equal(readEvidencePlan(path).plan.intakes.length, 1);
  writeFileSync(path, JSON.stringify({ ...f.input().plan, skipChecks: true }));
  assert.throws(() => readEvidencePlan(path));
  const entry = {
    label: "Active",
    kind: "active",
    settings: "settings.json",
    release: hash("r"),
    publication: hash("p"),
  };
  writeFileSync(path, JSON.stringify(plan([entry, { ...entry, label: "Other" }])));
  assert.throws(() => readEvidencePlan(path));
});
