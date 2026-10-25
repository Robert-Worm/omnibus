import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { sourceMethodFixture } from "./test-support/local-source-method-fixture.mjs";
import { prepareIntake } from "./intake.mjs";
import { checkLocalDatabase, buildLocalDatabase, localDatabaseFailure } from "./local-database.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";
import { verifyReleaseContent } from "../local-data/release-integrity.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const kind of ["report", "framework"]) test(`${kind}: real CLI builds an isolated evidence database and preserves input/source/HOLD bytes`, async t => {
  const scratch = join(root, "work/local-source-method-tests"); mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, "case-"));
  t.after(() => { assert.equal(dirname(dir), scratch); rmSync(dir, { recursive: true, force: true }); });
  const input = join(dir, "input"); mkdirSync(input);
  const f = sourceMethodFixture(kind), put = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2) + "\n");
  for (const file of f.manifest.files) {
    const path = join(input, file.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, f.files.get(file.id));
  }
  put("input/intake-plan.json", { format: "omnibus-intake-plan", schemaVersion: 1, package: f.manifest.package, contract: f.manifest.contract,
    files: f.manifest.files.map(({ id, path, roles }) => ({ id, path, roles })) });
  const intake = await prepareIntake(join(input, "intake-plan.json"), join(input, "intake.json"));
  put("packages.json", { format: "omnibus-local-database", schemaVersion: 1, packages: [{ intake: "input/intake.json", sha256: intake.manifestSha256,
    authorIds: f.authorIds, sourceEvidence: f.proof }] });
  const plan = join(dir, "packages.json"), out = join(dir, "new-database"), existing = join(dir, "existing.sqlite");
  writeFileSync(existing, "Existing database sentinel; never open for writing.");
  const before = readdirSync(dir, { recursive: true }).sort();
  const checked = await checkLocalDatabase({ plan });
  assert.equal(checked.sourceEvidence[0].sourceMethodValidated, true); assert.equal(checked.runtime.status, "HOLD");
  assert.deepEqual(readdirSync(dir, { recursive: true }).sort(), before);
  const child = spawnSync(process.execPath, [join(root, "scripts/build-local-database.mjs"), "--plan", plan, "--out", out],
    { encoding: "utf8", timeout: 30000, windowsHide: true });
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  const built = JSON.parse(child.stdout);
  assert.equal(built.status, "LOCAL_CATALOGUE_CREATED_REVIEW_REQUIRED"); assert.equal(built.publishable, false);
  assert.equal(existsSync(join(out, "local-build.json")), false);
  const repository = new CatalogueRepository(built.database);
  try {
    const bundle = repository.exportRelease(built.release);
    assert.equal(bundle.packages[0].kind, kind); assert.equal(verifyReleaseContent(repository, built.release).packages, 1);
    assert.ok(bundle.packages[0].records.every(row => row.status === "HOLD"));
    const originalRecords = kind === "report" ? f.read("APP-FINAL.json").framework.lines
      : ["goals", "objectives", "criteria", "points"].flatMap(key => f.read("CATALOGUE.json")[key]);
    assert.deepEqual(bundle.packages[0].records.map(row => row.data), originalRecords);
    assert.deepEqual(bundle.documents[0].pages, kind === "report" ? f.read("APP-FINAL.json").source.pages : f.read("source/pages.json"));
    const verification = bundle.artifacts.find(row => row.name === `${f.manifest.package.id}/review-check`).data;
    assert.deepEqual(verification.sourceEvidencePins, f.proof);
    for (const file of f.manifest.files) {
      const saved = bundle.artifacts.find(row => row.name === `${f.manifest.package.id}/files/${file.id}`).data;
      assert.deepEqual(Buffer.from(saved.content, "base64"), f.files.get(file.id));
      assert.deepEqual(readFileSync(join(input, file.path)), f.files.get(file.id));
    }
    assert.throws(() => publishRuntime(repository, { format: "omnibus-runtime-publication", schemaVersion: 1,
      release: built.release, contract: built.runtime.contract, contentGate: "VERIFIED_APPLICATION_RELEASE",
      modules: {}, refs: {}, registrations: {}, routing: {}, summary: {} },
    { release: built.release, contract: built.runtime.contract }), /INTEGRATION_REVIEW_REQUIRED/);
  } finally { repository.close(); }
  assert.equal(readFileSync(existing, "utf8"), "Existing database sentinel; never open for writing.");
  await assert.rejects(buildLocalDatabase({ plan, out }), /Output already exists/);
  await assert.rejects(buildLocalDatabase({ plan, out: join(dir, "unused"), base: existing }), error => {
    const result = localDatabaseFailure(error);
    assert.equal(result.code, "SOURCE_INTEGRATION_REQUIRED"); assert.equal(result.reviewEvidence.sourceMethodValidated, true); return true;
  });
  assert.equal(existsSync(join(dir, "unused")), false);
});
