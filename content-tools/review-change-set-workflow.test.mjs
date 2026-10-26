import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { correctionWorkflowFixture } from "./test-support/correction-workflow-fixture.mjs";
import { prepareSourceCheckedCorrection } from "./review-change-set-workflow.mjs";
import { createReviewManifest } from "./review-change-set.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });

test("source correction crosses ordinary CLI gates and stops at the unsupported replacement boundary", async t => {
  // Retain the NEW synthetic dossier and actual command output for handover.
  // Suppress only fixture cleanup, never a review or publication check.
  const f = await correctionWorkflowFixture({ after() {} });
  t.diagnostic(`Synthetic correction evidence: ${f.dir}`);
  const run = (label, args, expected = 0) => {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 30000 });
    save(join(f.dir, label + ".json"), { executable: process.execPath, args, cwd: root,
      status: result.status, stdout: result.stdout, stderr: result.stderr });
    assert.ifError(result.error); assert.equal(result.status, expected, result.stderr);
    return JSON.parse(expected ? result.stderr : result.stdout);
  };
  const originalBytes = [f.before, f.after].map(packet => new Map(packet.manifest.files.map(file =>
    [join(packet.inputRoot, file.path), readFileSync(join(packet.inputRoot, file.path))])));
  const commonBase = readFileSync(f.before.baseline.databasePath);
  for (const [name, packet] of Object.entries({ before: f.before, after: f.after })) {
    const check = run(name + "-ordinary-check", ["scripts/build-local-database.mjs", "--plan", packet.options.plan, "--check"]);
    assert.equal(check.sourceEvidence[0].sourceMethodValidated, true);
    assert.equal(check.sourceEvidence[0].viewerShapeValidated, true);
    assert.equal(check.ownerAdmissions.length, 1);
    assert.equal(check.publishable, false);
  }
  const handoff = run("source-checked-handoff", ["content-tools/review-change-set-workflow.mjs", "--correction", f.correctionPath,
    "--before-plan", f.before.options.plan, "--after-plan", f.after.options.plan]);
  assert.equal(handoff.status, "SOURCE_CHECKED_CORRECTION_HANDOFF");
  assert.equal(handoff.publishable, false);
  assert.equal(handoff.publicationCreated, false);
  assert.deepEqual(handoff.entries.map(item => item.itemId), ["C1", "C2"]);
  assert.deepEqual(handoff.entries[1].changedFields, []);
  assert(handoff.entries.every(item => item.itemHash !== item.previousHash && item.reviewId !== item.previousReviewId));
  assert.deepEqual(handoff.entries[0].beforeSource, handoff.entries[0].afterSource);
  writeFileSync(join(f.dir, "release-notes-fragment.md"), handoff.releaseNotes +
    "\n\nSynthetisch concept. Niet vrijgegeven: correctiepublicatie, vergelijking en viewerproef ontbreken.\n", { flag: "wx" });
  const beforeBuild = run("before-ordinary-build", ["scripts/build-local-database.mjs", "--plan", f.before.options.plan,
    "--base", f.before.options.base, "--out", f.before.options.out]);
  assert.equal(beforeBuild.runtime.status, "LOCAL_READY");
  const retainedDatabase = readFileSync(beforeBuild.database);
  const afterOut = join(f.dir, "blocked-candidate");
  const blocked = run("after-ordinary-build-blocked", ["scripts/build-local-database.mjs", "--plan", f.after.options.plan,
    "--base", join(f.before.options.out, "local-build.json"), "--out", afterOut], 1);
  assert.equal(blocked.status, "HOLD");
  assert.match(blocked.error, /existing package cannot be replaced/);
  assert.equal(existsSync(afterOut), false);
  assert.deepEqual(readFileSync(beforeBuild.database), retainedDatabase);
  assert.deepEqual(readFileSync(f.before.baseline.databasePath), commonBase);

  const options = { correction: f.correction, beforePlan: f.before.options.plan, afterPlan: f.after.options.plan };
  await t.test("HOLD and missing dependent release note block before publication", async () => {
    const missing = structuredClone(f.correction); missing.notes.pop();
    await assert.rejects(prepareSourceCheckedCorrection({ ...options, correction: missing }), /concrete release note/);
    const hold = structuredClone(f.correction); hold.currentBasis.sources[0].items[0].hold.active = true;
    const manifest = createReviewManifest(hold.currentBasis);
    manifest.reviews = hold.currentManifest.reviews.map(review => ({ ...review,
      itemHash: manifest.sources[0].items.find(item => item.itemId === review.itemId).itemHash }));
    hold.currentManifest = manifest;
    await assert.rejects(prepareSourceCheckedCorrection({ ...options, correction: hold }), /contains HOLD/);
  });
  await t.test("retained source reviews and changed planner-only basis cannot be rebound", async () => {
    const oldReviews = structuredClone(f.correction);
    oldReviews.currentManifest.reviews[1].packageReviews = oldReviews.previousManifest.reviews[1].packageReviews;
    await assert.rejects(prepareSourceCheckedCorrection({ ...options, correction: oldReviews }), /exact retained source-specific reviews/);
    const detached = structuredClone(f.correction); detached.currentBasis.sources[0].items[0].beheersmaatregel += " Anders.";
    const manifest = createReviewManifest(detached.currentBasis);
    manifest.reviews = detached.currentManifest.reviews.map(review => ({ ...review,
      itemHash: manifest.sources[0].items.find(item => item.itemId === review.itemId).itemHash }));
    detached.currentManifest = manifest;
    await assert.rejects(prepareSourceCheckedCorrection({ ...options, correction: detached }), /reviewed correction basis differs/);
  });
  await t.test("ordinary source custody and owner admission cannot be omitted", async () => {
    for (const field of ["sourceEvidence", "admission"]) {
      const plan = JSON.parse(readFileSync(f.after.options.plan, "utf8")), entry = plan.packages[0];
      entry.intake = resolve(dirname(f.after.options.plan), entry.intake);
      entry.admission.file = resolve(dirname(f.after.options.plan), entry.admission.file);
      delete entry[field];
      const file = join(f.dir, `without-${field}.json`); save(file, plan);
      await assert.rejects(prepareSourceCheckedCorrection({ ...options, afterPlan: file }),
        field === "sourceEvidence" ? /complete standalone admission validator/ : /pinned local-owner admission/);
    }
  });
  await t.test("a HOLD in the offered catalogue cannot hide behind a clear planning basis", async () => {
    const held = await correctionWorkflowFixture(t, { configureAfter: packet => {
      const cat = packet.read("CATALOGUE.json"); cat.points[0].selection_status = "HOLD"; packet.set("CATALOGUE.json", cat);
    } });
    await assert.rejects(prepareSourceCheckedCorrection({ correction: held.correction,
      beforePlan: held.before.options.plan, afterPlan: held.after.options.plan }), /offered content contains HOLD/);
  });
  for (const packet of originalBytes) for (const [file, original] of packet) assert.deepEqual(readFileSync(file), original);
  save(join(f.dir, "result.json"), { synthetic: true, sourceCheckedHandoff: true, oldPublicationCreated: true,
    correctionPublicationCreated: false, comparisonExecuted: false, viewerExecuted: false, newContentApproval: false,
    blocker: blocked.error, releaseNotes: "release-notes-fragment.md" });
});
