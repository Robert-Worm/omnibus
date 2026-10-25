import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { prepareIntake } from "./intake.mjs";
import { prepareModelReview, REVIEW_ASPECTS } from "./model-quality.mjs";
import { buildLocalDatabase, checkLocalDatabase, localDatabaseFailure } from "./local-database.mjs";
import { parseLocalDatabaseArgs } from "../scripts/build-local-database.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";
import { verifyReleaseContent } from "../local-data/release-integrity.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const load = path => JSON.parse(readFileSync(path, "utf8"));

// All generated sources and receipts are explicitly fictitious and remain under work/.
async function fixture(t, count = 1, editModel = () => {}) {
  const scratch = join(root, "work", "local-database-tests");
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, "case-"));
  t.after(() => {
    assert.equal(dirname(dir), scratch);
    rmSync(dir, { recursive: true, force: true });
  });
  const packages = [], plan = { format: "omnibus-local-database", schemaVersion: 1, packages: [] };
  for (let index = 0; index < count; index++) {
    const id = `SYNTHETIC_${index}`, folder = join(dir, id);
    mkdirSync(folder);
    const model = { id, kind: "own", version: "synthetic-1", source: "Fictieve testbron", selected: false,
      title: `Fictief model ${index}`, question: "Hoe werkt de fictieve oefening?", selection_status: "HOLD",
      limitations: "Uitsluitend testgegevens; geen inhoudelijke goedkeuring.",
      items: [{ id: "TEST", title: "Fictieve dimensie", definition: "Een verzonnen testbegrip.",
        question: "Hoe beschrijf je deze oefening?", probes: "", included: false,
        questions: [{ id: "TEST-1", title: "Fictieve vraag", question: "Hoe beschrijf je deze oefening?", probes: "", included: false, origin: "synthetic-test" }] }] };
    editModel(model);
    const source = "Fictieve testbron. Geen echt model. A😀é\r\nTweede regel.\r\n";
    writeFileSync(join(folder, "source.txt"), source);
    writeFileSync(join(folder, "contract.txt"), "Synthetic test of model-review-1; no real source approval.");
    save(join(folder, "model.json"), model);
    const basis = prepareModelReview(model, { sourceEvidence: [{ id: "source", sha256: hash(Buffer.from(source)) }] });
    // Receipt fabrication is confined to tests. The builder never creates or fixes reviews.
    const reviews = Object.entries(REVIEW_ASPECTS).map(([role, aspects]) => ({ role,
      actorId: `synthetic-test-reviewer-${role}`, basisHash: basis.basisHash, decision: "APPROVE", humanValidation: false,
      unresolvedIssues: [], assessments: basis.targets.map(target => ({ targetId: target.id, decision: "APPROVE",
        reason: "Synthetic receipt for a software test only.",
        aspects: Object.fromEntries(aspects.map(aspect => [aspect, "Fictitious test assessment; no substantive approval."])) })) }));
    save(join(folder, "basis.json"), basis);
    save(join(folder, "reviews.json"), reviews);
    const marker = join(dir, "executed.txt");
    writeFileSync(join(folder, "inert.mjs"), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'DO NOT EXECUTE');`);
    const intakePlan = { format: "omnibus-intake-plan", schemaVersion: 1,
      package: { id, kind: "model", version: "synthetic-1", title: model.title }, contract: "model-review-1",
      files: [
        { id: "contract", path: "contract.txt", roles: ["contract"] },
        { id: "source", path: "source.txt", roles: ["source", "source-text"] },
        { id: "model", path: "model.json", roles: ["viewer-content", "context", "limitations"] },
        { id: "basis", path: "basis.json", roles: ["review-basis"] },
        { id: "reviews", path: "reviews.json", roles: ["review"] },
        { id: "inert", path: "inert.mjs", roles: ["supporting"] },
      ] };
    const intake = join(folder, "intake.json");
    save(join(folder, "plan.json"), intakePlan);
    const prepared = await prepareIntake(join(folder, "plan.json"), intake);
    plan.packages.push({ intake: `${id}/intake.json`, sha256: prepared.manifestSha256, authorIds: ["synthetic-test-author"] });
    packages.push({ id, folder, intake, model, source, basis, reviews });
  }
  const planPath = join(dir, "packages.json"), out = join(dir, "new-database");
  save(planPath, plan);
  return { dir, packages, plan, planPath, out, options: { plan: planPath, out }, savePlan: () => save(planPath, plan) };
}

// Negative tests may create a newly pinned fictitious envelope to reach deeper checks.
// This is never advice or code for repairing a received, rejected package.
function repinFixture(f, index = 0) {
  const p = f.packages[index], manifest = load(p.intake);
  for (const file of manifest.files) {
    const bytes = readFileSync(join(p.folder, file.path));
    file.sha256 = hash(bytes); file.bytes = bytes.length;
  }
  save(p.intake, manifest);
  f.plan.packages[index].sha256 = hash(readFileSync(p.intake)); f.savePlan();
}

await test("check-only CLI validates the complete plan without changing any files or granting approval", async t => {
  const f = await fixture(t, 2);
  const existing = join(f.dir, "existing.sqlite");
  writeFileSync(existing, "Unrelated database sentinel; never opened by check-only.");
  const contents = () => readdirSync(f.dir, { recursive: true }).sort().map(name =>
    [name, statSync(join(f.dir, name)).isFile() ? readFileSync(join(f.dir, name)) : null]);
  const before = contents();
  const cli = spawnSync(process.execPath, [join(root, "scripts/build-local-database.mjs"), "--plan", f.planPath, "--check"],
    { encoding: "utf8", cwd: f.dir, timeout: 30000 });
  assert.ifError(cli.error); assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.status, "LOCAL_PACKAGES_CHECKED_REVIEW_REQUIRED");
  assert.equal(result.packages, 2); assert.equal(result.sourceTexts, 2);
  assert.equal(result.inputFiles, 12); assert.equal(result.reviewTargets, 6);
  assert.equal(result.planSha256, hash(readFileSync(f.planPath)));
  assert.equal(result.inputBytes, f.packages.reduce((sum, p) => sum + readFileSync(p.intake).length +
    load(p.intake).files.reduce((total, file) => total + file.bytes, 0), 0));
  assert.deepEqual(result.packagesChecked, f.packages.map(p => ({ ...load(p.intake).package,
    manifestSha256: hash(readFileSync(p.intake)), reviewStatus: "READY_FOR_INTEGRATION_REVIEW" })));
  for (const key of ["publishable", "contentValidated", "reviewValidated", "newContentApproval"]) assert.equal(result[key], false);
  assert.equal(result.reviewStructureValidated, true); assert.equal(result.viewerShapeValidated, true);
  assert.equal(result.runtime.status, "HOLD"); assert.equal(result.runtime.publication, null);
  for (const key of ["database", "databaseSha256", "release", "records", "sourceArtifacts"]) assert.equal(Object.hasOwn(result, key), false);
  assert.deepEqual(contents(), before, "no database, report, code execution or other input/output writes");
  assert.deepEqual(await checkLocalDatabase({ plan: f.planPath }), result);
  const built = await buildLocalDatabase(f.options);
  for (const key of ["planSha256", "inputBytes", "inputFiles", "reviewTargets", "packagesChecked", "runtime"])
    assert.deepEqual(built[key], result[key]);
  assert.equal(built.documents, result.sourceTexts);
});

await test("a successful check cannot authorize changed inputs or substitute for the package plan", async t => {
  const f = await fixture(t), checked = await checkLocalDatabase({ plan: f.planPath });
  writeFileSync(join(f.packages[0].folder, "source.txt"), "Changed after the successful check.");
  const cli = spawnSync(process.execPath, [join(root, "scripts/build-local-database.mjs"), "--plan", f.planPath, "--out", f.out],
    { encoding: "utf8", timeout: 15000 });
  assert.ifError(cli.error); assert.equal(cli.status, 1); assert.equal(cli.stdout, "");
  const failure = JSON.parse(cli.stderr.slice(cli.stderr.indexOf("{"), cli.stderr.lastIndexOf("}") + 1));
  assert.equal(failure.status, "HOLD"); assert.match(failure.error, /PACKAGE_CHECK\[1\].*checksum\/size/);
  assert.equal(existsSync(f.out), false);
  save(f.planPath, checked);
  await assert.rejects(buildLocalDatabase(f.options), /INPUT_CHECK/);
  assert.equal(existsSync(f.out), false);
});

await test("one command builds two pinned local packages with exact source/review bytes and no runtime approval", async t => {
  const f = await fixture(t, 2);
  const before = f.packages.flatMap(p => load(p.intake).files.map(file => [join(p.folder, file.path), readFileSync(join(p.folder, file.path))]));
  // Represents a separate, pre-existing catalogue: it must remain byte-identical.
  const untouchedPath = join(f.dir, "existing.sqlite"), untouched = new CatalogueRepository(untouchedPath);
  untouched.importRelease({ manifest: { test: "unrelated" }, packages: [], documents: [] }); untouched.close();
  const untouchedBytes = readFileSync(untouchedPath);
  const cli = spawnSync(process.execPath, [join(root, "scripts/build-local-database.mjs"), "--plan", f.planPath, "--out", f.out],
    { encoding: "utf8", cwd: f.dir, timeout: 30000 });
  assert.ifError(cli.error); assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.status, "LOCAL_CATALOGUE_CREATED_REVIEW_REQUIRED");
  assert.equal(result.packages, 2); assert.equal(result.records, 2); assert.equal(result.documents, 2);
  assert.equal(result.sourcePages, 2); assert.equal(result.inputFiles, 12); assert.equal(result.reviewTargets, 6);
  assert.equal(result.sourceArtifacts, 16);
  assert.equal(result.databaseSha256, hash(readFileSync(result.database)));
  assert.deepEqual(load(join(f.out, "local-database-result.json")), result);
  for (const key of ["publishable", "contentValidated", "reviewValidated", "newContentApproval"]) assert.equal(result[key], false);
  assert.equal(result.reviewStructureValidated, true); assert.equal(result.runtime.status, "HOLD");
  assert.equal(result.viewerShapeValidated, true);
  assert.equal(existsSync(join(f.out, "local-build.json")), false);
  assert.equal(existsSync(join(f.dir, "executed.txt")), false);
  const reader = new CatalogueRepository(result.database, { readOnly: true });
  try {
    reader.db.exec("BEGIN");
    assert.equal(verifyReleaseContent(reader, result.release).packages, 2);
    const bundle = reader.exportRelease(result.release);
    assert.equal(bundle.manifest.contentGate, "INTEGRATION_REVIEW_REQUIRED");
    for (const p of f.packages) {
      const stored = bundle.packages.find(item => item.id === p.id);
      assert.equal(stored.records[0].status, "HOLD"); assert.deepEqual(stored.records[0].data, p.model);
      assert.equal(bundle.documents.find(item => item.id === `${p.id}/source`).pages[0].text, p.source);
      for (const file of load(p.intake).files) {
        const artifact = bundle.artifacts.find(item => item.name === `${p.id}/files/${file.id}`).data;
        assert.deepEqual(Buffer.from(artifact.content, "base64"), readFileSync(join(p.folder, file.path)));
      }
    }
  } finally { reader.close(); }
  assert.throws(() => checkRuntimeDatabase({ database: result.database, release: result.release, publication: "0".repeat(64) }), /content publisher/);
  for (const [file, bytes] of before) assert.deepEqual(readFileSync(file), bytes);
  assert.deepEqual(readFileSync(untouchedPath), untouchedBytes);
  const second = await buildLocalDatabase({ ...f.options, out: join(f.dir, "another-new-database") });
  assert.equal(second.release, result.release, "same pinned inputs preserve content identity");
});

await test("reviewable models that cannot reopen in the viewer fail before database creation", async t => {
  for (const editModel of [
    m => delete m.kind,
    m => m.kind = "unknown",
    m => delete m.version,
    m => delete m.selected,
    m => m.source = {},
    m => delete m.items[0].included,
    m => delete m.items[0].probes,
    m => delete m.items[0].questions[0].included,
    m => delete m.items[0].questions[0].probes,
  ]) {
    // These synthetic receipts cover the exact malformed input; the separate
    // model review structure alone previously accepted it.
    const f = await fixture(t, 1, editModel);
    const p = f.packages[0];
    assert.equal(p.basis.status, "STRUCTURAL_PASS_REVIEW_REQUIRED");
    await assert.rejects(buildLocalDatabase(f.options), /PACKAGE_CHECK\[1\]: Model viewer shape:/);
    await assert.rejects(checkLocalDatabase({ plan: f.planPath }), /PACKAGE_CHECK\[1\]: Model viewer shape:/);
    assert.equal(existsSync(f.out), false);
  }
});

await test("a structurally checked local model remains HOLD at the runtime publication boundary", async t => {
  const f = await fixture(t), result = await buildLocalDatabase(f.options);
  const before = readFileSync(result.database);
  const receipt = readFileSync(join(f.out, "local-database-result.json"));
  const repository = new CatalogueRepository(result.database, { readOnly: true });
  try {
    // A deliberate false approval claim, using only the fictitious test package.
    // No runtime modules, evidence or approval receipts are generated for production.
    const candidate = { format: "omnibus-runtime-publication", schemaVersion: 1,
      contentGate: "VERIFIED_APPLICATION_RELEASE", release: result.release, contract: result.runtime.contract,
      modules: { "lib/model-library.mjs": { models: [f.packages[0].model] } },
      refs: {}, registrations: {}, routing: {}, summary: {} };
    assert.throws(() => publishRuntime(repository, candidate,
      { release: result.release, contract: result.runtime.contract }),
    /INTEGRATION_REVIEW_REQUIRED.*local review database/);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(), undefined);
    assert.equal(repository.exportRelease(result.release).packages[0].records[0].status, "HOLD");
  } finally { repository.close(); }
  assert.deepEqual(readFileSync(result.database), before);
  assert.deepEqual(readFileSync(join(f.out, "local-database-result.json")), receipt);
  assert.equal(existsSync(join(f.out, "local-build.json")), false);
});

/** @type {[string, (fixture: Awaited<ReturnType<typeof fixture>>) => void, RegExp][]} */
const rejectedPackages = [
  ["missing source", f => rmSync(join(f.packages[0].folder, "source.txt")), /ENOENT/],
  ["missing review", f => rmSync(join(f.packages[0].folder, "reviews.json")), /ENOENT/],
  ["changed source", f => writeFileSync(join(f.packages[0].folder, "source.txt"), "Changed"), /checksum\/size/],
  ["wrong retained hash", f => { f.plan.packages[0].sha256 = "0".repeat(64); f.savePlan(); }, /Trusted manifest/],
  ["missing author identity", f => { f.plan.packages[0].authorIds = []; f.savePlan(); }, /authorIds/],
  ["duplicate packages", f => { f.plan.packages.push(f.plan.packages[0]); f.savePlan(); }, /Duplicate package/],
  ["unsupported report", f => {
    const m = load(f.packages[0].intake); m.package.kind = "report"; m.contract = "report-kit-1.1";
    m.files[0].roles.push("source-bank", "catalogue", "source-links", "receipt"); save(f.packages[0].intake, m); repinFixture(f);
  }, /No standalone.*report/],
  ["unsupported framework", f => {
    const m = load(f.packages[0].intake); m.package.kind = "framework"; m.contract = "framework-cio-0.1+addendum-01";
    m.files[0].roles.push("source-bank", "catalogue", "source-links", "migration"); save(f.packages[0].intake, m); repinFixture(f);
  }, /No standalone.*framework/],
  ["missing required intake role", f => {
    const m = load(f.packages[0].intake); m.files = m.files.filter(file => !file.roles.includes("review"));
    save(f.packages[0].intake, m); repinFixture(f);
  }, /Missing file roles: review/],
  ["ambiguous review role", f => {
    const m = load(f.packages[0].intake); m.files[0].roles.push("review"); save(f.packages[0].intake, m); repinFixture(f);
  }, /exactly one review file/],
  ["stale model review", f => { const p = f.packages[0]; p.model.items[0].questions[0].question = "Een andere tekst?"; save(join(p.folder, "model.json"), p.model); repinFixture(f); }, /Review basis differs/],
  ["review bound to different source", f => { writeFileSync(join(f.packages[0].folder, "source.txt"), "Changed source"); repinFixture(f); }, /every exact source/],
  ["empty theory review", f => { const p = f.packages[0]; p.reviews.shift(); save(join(p.folder, "reviews.json"), p.reviews); repinFixture(f); }, /theory.*review/],
  ["HOLD review", f => { const p = f.packages[0]; p.reviews[0].decision = "HOLD"; save(join(p.folder, "reviews.json"), p.reviews); repinFixture(f); }, /explicit AI review/],
  ["review by author", f => { f.plan.packages[0].authorIds = ["synthetic-test-reviewer-theory"]; f.savePlan(); }, /distinct from authors/],
  ["unresolved review issue", f => { const p = f.packages[0]; p.reviews[0].unresolvedIssues.push("Synthetic unresolved issue"); save(join(p.folder, "reviews.json"), p.reviews); repinFixture(f); }, /unresolved issues/],
  ["incomplete target coverage", f => { const p = f.packages[0]; p.reviews[0].assessments.pop(); save(join(p.folder, "reviews.json"), p.reviews); repinFixture(f); }, /every exact target/],
  ["empty required assessment", f => { const p = f.packages[0]; p.reviews[0].assessments[0].aspects.construct = ""; save(join(p.folder, "reviews.json"), p.reviews); repinFixture(f); }, /missing construct/],
];
for (const [name, edit, message] of rejectedPackages) await test(`${name} remains HOLD and creates no output`, async t => {
  const f = await fixture(t); edit(f);
  const held = error => {
    const result = localDatabaseFailure(error);
    assert.equal(result.status, "HOLD"); assert.equal(result.publishable, false);
    assert.match(result.error, /PACKAGE_CHECK\[\d+\]/); assert.match(result.error, message); return true;
  };
  await assert.rejects(buildLocalDatabase(f.options), held);
  await assert.rejects(checkLocalDatabase({ plan: f.planPath }), held);
  assert.equal(existsSync(f.out), false);
});

await test("a failed second package cannot leave the first package partially imported", async t => {
  const f = await fixture(t, 2); rmSync(join(f.packages[1].folder, "reviews.json"));
  await assert.rejects(buildLocalDatabase(f.options), /PACKAGE_CHECK\[2\].*ENOENT/);
  await assert.rejects(checkLocalDatabase({ plan: f.planPath }), /PACKAGE_CHECK\[2\].*ENOENT/);
  assert.equal(existsSync(f.out), false);
});

await test("existing output, package output and directory links are refused without overwriting files", async t => {
  const f = await fixture(t);
  mkdirSync(f.out); const marker = join(f.out, "catalogue.sqlite"); writeFileSync(marker, "existing sentinel");
  await assert.rejects(buildLocalDatabase(f.options), /Output already exists/);
  assert.equal(readFileSync(marker, "utf8"), "existing sentinel");
  await assert.rejects(buildLocalDatabase({ ...f.options, out: join(f.packages[0].folder, "new") }), /outside every input/);
  const alias = join(f.dir, "alias");
  symlinkSync(f.packages[0].folder, alias, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(buildLocalDatabase({ ...f.options, out: join(alias, "new") }), /outside every input/);
  f.plan.packages[0].intake = "alias/intake.json"; f.savePlan();
  await assert.rejects(buildLocalDatabase({ ...f.options, out: join(f.dir, "unused") }), /root must not be a link/);
  await assert.rejects(checkLocalDatabase({ plan: f.planPath }), /root must not be a link/);
});

await test("malformed plans and CLI options fail closed with machine-readable HOLD", async t => {
  const f = await fixture(t);
  assert.deepEqual(parseLocalDatabaseArgs(["--check", "--plan", "x"]), { checkOnly: true, plan: "x" });
  assert.deepEqual(parseLocalDatabaseArgs(["--plan", "x", "--check"]), { checkOnly: true, plan: "x" });
  assert.deepEqual(parseLocalDatabaseArgs(["--out", "y", "--plan", "x"]), { plan: "x", out: "y" });
  for (const args of [[], ["--plan", "x", "--force", "y"], ["--out", "x", "--out", "y"],
    ["--plan", "x", "--out", "y", "--skip-review"], ["--plan", "", "--out", "y"],
    ["--plan", "x", "--check", "--out", "y"], ["--check"], ["--plan", "x"],
    ["--plan", "x", "--check", "--check"], ["--plan", "x", "--check", "--skip-review"],
    ["--check", "--plan", "--out"], ["--check", "--plan", "x", "--plan", "x"], ["--check", "--plan", "x", "--force"]]) {
    assert.throws(() => parseLocalDatabaseArgs(args), /Usage:/);
  }
  for (const value of [null, { ...f.plan, skipReview: true }, { ...f.plan, packages: [] }, { ...f.plan, packages: Array(65).fill(f.plan.packages[0]) }]) {
    save(f.planPath, value);
    await assert.rejects(buildLocalDatabase(f.options), /INPUT_CHECK/);
    await assert.rejects(checkLocalDatabase({ plan: f.planPath }), /INPUT_CHECK/);
    assert.equal(existsSync(f.out), false);
  }
  const cli = spawnSync(process.execPath, [resolve(root, "scripts/build-local-database.mjs"), "--plan", f.planPath, "--out", f.out], { encoding: "utf8", timeout: 15000 });
  assert.ifError(cli.error); assert.equal(cli.status, 1); assert.equal(cli.stdout, "");
  // Node may prepend an experimental SQLite warning on stderr; the JSON remains intact.
  const error = JSON.parse(cli.stderr.slice(cli.stderr.indexOf("{"), cli.stderr.lastIndexOf("}") + 1));
  assert.equal(error.status, "HOLD"); assert.match(error.error, /INPUT_CHECK/);
  const check = spawnSync(process.execPath, [resolve(root, "scripts/build-local-database.mjs"), "--check", "--plan", f.planPath], { encoding: "utf8", timeout: 15000 });
  assert.ifError(check.error); assert.equal(check.status, 1); assert.equal(check.stdout, "");
  const checkError = JSON.parse(check.stderr.slice(check.stderr.indexOf("{"), check.stderr.lastIndexOf("}") + 1));
  assert.equal(checkError.status, "HOLD"); assert.match(checkError.error, /INPUT_CHECK/);
});
