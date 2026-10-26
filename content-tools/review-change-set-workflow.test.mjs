import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readLocalRuntimeBase } from "./local-model-runtime.mjs";
import { assertProjectCollections, collectionOrigin } from "../lib/source-collections.mjs";
import { hydratedModule } from "./local-source-runtime.mjs";
import { sourceRuntimeFixture } from "./test-support/local-source-runtime-fixture.mjs";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { correctionWorkflowFixture } from "./test-support/correction-workflow-fixture.mjs";
import { prepareSourceCheckedCorrection } from "./review-change-set-workflow.mjs";
import { createReviewManifest } from "./review-change-set.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });

test("source correction crosses ordinary CLI gates, replaces a pinned source and preserves unrelated content", async t => {
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
  const sha = value => createHash("sha256").update(value).digest("hex");
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
    "\n\nSynthetische proef; geen echte bronvrijgave.\n", { flag: "wx" });
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

  // Add an unrelated source AFTER the old edition. Replacement must work in a
  // later composition too, without rebuilding/replacing that unrelated source.
  const originalTemp = Object.fromEntries(["TMP", "TEMP", "TMPDIR"].map(key => [key, process.env[key]]));
  for (const key of Object.keys(originalTemp)) process.env[key] = f.dir;
  let extra;
  try { extra = await sourceRuntimeFixture({ after() {} }, "framework", packet => {
    packet.manifest.package.id = "UNRELATED";
    for (const [name, file] of packet.paths) packet.set(name, packet.files.get(file.id).toString("utf8").replaceAll("FICTIEF", "UNRELATED"));
    const cat = packet.read("CATALOGUE.json"); cat.source_bank_sha256 = packet.paths.get("RECONCILED-SOURCE.json").sha256; packet.set("CATALOGUE.json", cat);
  });
  } finally { for (const [key, value] of Object.entries(originalTemp)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  run("unrelated-build", ["scripts/build-local-database.mjs", "--plan", extra.options.plan,
    "--base", join(f.before.options.out, "local-build.json"), "--out", extra.options.out]);
  const currentSettings = join(extra.options.out, "local-build.json"), current = readLocalRuntimeBase(currentSettings);
  const currentBytes = readFileSync(join(extra.options.out, "catalogue.sqlite"));
  const plan = JSON.parse(readFileSync(f.after.options.plan));
  plan.packages[0].intake = resolve(dirname(f.after.options.plan), plan.packages[0].intake);
  plan.packages[0].admission.file = resolve(dirname(f.after.options.plan), plan.packages[0].admission.file);
  plan.correction = { file: f.correctionPath, sha256: sha(readFileSync(f.correctionPath)),
    beforePlan: f.before.options.plan, beforePlanSha256: sha(readFileSync(f.before.options.plan)) };
  const planFile = join(f.dir, "correction-plan.json"); save(planFile, plan);
  const checked = run("correction-check", ["scripts/build-local-database.mjs", "--plan", planFile, "--base", currentSettings, "--check"]);
  assert.equal(checked.status, "LOCAL_VIEWER_INPUTS_CHECKED");
  const out = join(f.dir, "corrected");
  const built = run("correction-build", ["scripts/build-local-database.mjs", "--plan", planFile, "--base", currentSettings, "--out", out]);
  assert.equal(built.runtime.status, "LOCAL_READY");
  assert.equal(readFileSync(join(out, "release-notes.md"), "utf8"), handoff.releaseNotes);
  const afterSettings = join(out, "local-build.json"), candidate = readLocalRuntimeBase(afterSettings);
  const retainedCorrection = candidate.bundle.artifacts.find(row => row.name === "corrections/" + plan.correction.sha256).data;
  assert.deepEqual(Buffer.from(retainedCorrection.originalEvidence.content, "base64"), readFileSync(f.correctionPath));
  for (const field of ["packages", "documents", "artifacts"]) {
    const key = field === "artifacts" ? "name" : "id";
    const unrelated = current.bundle[field].filter(row => field === "artifacts" ? !row.name.startsWith("FICTIEF/") : row.id !== "FICTIEF");
    for (const row of unrelated) assert.deepEqual(candidate.bundle[field].find(item => item[key] === row[key]), row);
  }
  const moduleId = "lib/topical-reviewed.json", oldPackets = hydratedModule(current, moduleId).packages,
    newPackets = hydratedModule(candidate, moduleId).packages;
  assert.deepEqual(newPackets.find(packet => packet.id === "UNRELATED"), oldPackets.find(packet => packet.id === "UNRELATED"));
  assert.deepEqual(newPackets.find(packet => packet.id === "FICTIEF").catalogue, f.after.read("CATALOGUE.json"));
  const archived = candidate.bundle.artifacts.find(row => row.name === "correction-history/" + current.pins.release).data;
  assert.deepEqual(archived.packages, current.bundle.packages.filter(packet => packet.id === "FICTIEF"));
  assert.deepEqual(archived.documents, current.bundle.documents.filter(document => document.id === "FICTIEF"));
  const oldCollections = current.content.modules["lib/application-catalogue.mjs"].collections;
  const newCollections = candidate.content.modules["lib/application-catalogue.mjs"].collections;
  const projectWith = id => {
    const origin = collectionOrigin(oldCollections, "foundation", id).id;
    return { format: "rijksmap-project", version: 2, collections: { mode: "own", origins: [origin],
      bindings: [{ kind: "foundation", id, collection: "own", origin }] } };
  };
  assert.throws(() => assertProjectCollections(projectWith("FICTIEF"), newCollections), /oorspronkelijke publicatie/);
  assert.doesNotThrow(() => assertProjectCollections(projectWith("UNRELATED"), newCollections));

  const comparison = run("comparison", ["scripts/compare-runtime-publications.mjs", "--before", currentSettings, "--after", afterSettings]);
  assert.equal(comparison.status, "RUNTIME_DIFFERENCES_REVIEW_REQUIRED");
  assert.equal(comparison.changes.packages.changed.length, 1);
  assert.deepEqual(comparison.changes.packages.added, []); assert.deepEqual(comparison.changes.packages.removed, []);
  assert.deepEqual(readFileSync(join(extra.options.out, "catalogue.sqlite")), currentBytes);
  save(join(f.dir, "publication-paths.json"), { before: currentSettings, after: afterSettings, plan: planFile });

  await t.test("stale publication, evidence pins, old sources and dependent reviews fail before creating output", async () => {
    for (const [name, mutate, base, pattern] of [
      ["stale-publication", () => {}, afterSettings, /current package/],
      ["missing-proof", value => { value.correction = null; }, currentSettings, /correction reference/],
      ["bad-pin", value => { value.correction.sha256 = "0".repeat(64); }, currentSettings, /checksum mismatch/],
      ["bad-before-plan", value => { value.correction.beforePlanSha256 = "0".repeat(64); }, currentSettings, /checksum mismatch/],
      ["dependency", value => {
        const c = structuredClone(f.correction); c.currentManifest.reviews.pop();
        const file = join(f.dir, "missing-dependent-review.json"); save(file, c);
        value.correction.file = file; value.correction.sha256 = sha(readFileSync(file));
      }, currentSettings, /complete, matching reviews/],
    ]) {
      const value = structuredClone(plan); mutate(value); const file = join(f.dir, name + "-plan.json"); save(file, value);
      const rejectedOut = join(f.dir, name + "-output");
      const rejected = run(name, ["scripts/build-local-database.mjs", "--plan", file, "--base", base, "--out", rejectedOut], 1);
      assert.match(rejected.error, pattern); assert.equal(existsSync(rejectedOut), false);
    }
    const input = join(f.before.inputRoot, f.before.manifest.files.find(file => file.roles.includes("source")).path);
    const bytes = readFileSync(input);
    try {
      writeFileSync(input, Buffer.concat([bytes, Buffer.from("changed")]));
      const rejected = run("changed-old-source", ["scripts/build-local-database.mjs", "--plan", planFile,
        "--base", currentSettings, "--out", join(f.dir, "changed-old-source-output")], 1);
      assert.equal(rejected.status, "HOLD"); assert.equal(existsSync(join(f.dir, "changed-old-source-output")), false);
    } finally { writeFileSync(input, bytes); }
  });

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
    correctionPublicationCreated: true, comparisonExecuted: true, viewerExecuted: false, newContentApproval: false,
    ordinaryDuplicateRefusal: blocked.error, releaseNotes: "release-notes-fragment.md" });
});

test("report correction uses the normal command and preserves exact source pages and report delivery", async t => {
  const f = await correctionWorkflowFixture(t, { kind: "report" });
  const run = args => {
    const result = spawnSync(process.execPath, ["scripts/build-local-database.mjs", ...args], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 30000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
  };
  const old = run(["--plan", f.before.options.plan, "--base", f.before.options.base, "--out", f.before.options.out]);
  const original = readFileSync(old.database), beforeSettings = join(f.before.options.out, "local-build.json");
  const sha = value => createHash("sha256").update(value).digest("hex"), plan = JSON.parse(readFileSync(f.after.options.plan));
  plan.correction = { file: f.correctionPath, sha256: sha(readFileSync(f.correctionPath)),
    beforePlan: f.before.options.plan, beforePlanSha256: sha(readFileSync(f.before.options.plan)) };
  const planFile = join(f.after.dir, "correction-plan.json"); save(planFile, plan);
  const out = join(f.dir, "report-corrected"), built = run(["--plan", planFile, "--base", beforeSettings, "--out", out]);
  assert.equal(built.runtime.status, "LOCAL_READY");
  const prepared = readLocalRuntimeBase(join(out, "local-build.json")), data = hydratedModule(prepared, "app/report-additions.json");
  assert.deepEqual(data.corpus[0].framework, f.after.read("APP-FINAL.json").framework);
  assert.deepEqual(data.catalogue.points, f.after.read("REUSE-CANDIDATE.json").points);
  assert.deepEqual(prepared.bundle.documents[0].pages, f.before.read("APP-FINAL.json").source.pages);
  assert.equal(data.history.at(-1).content_hash, readLocalRuntimeBase(beforeSettings).content.modules["app/report-additions.json"].content_hash);
  assert.deepEqual(readFileSync(old.database), original);
});
