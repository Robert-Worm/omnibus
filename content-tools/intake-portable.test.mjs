import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, symlinkSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkIntake, intakeContracts, intakeLimits, historicalReportIntakeLimits, validateIntakeManifest, prepareIntake } from "./intake.mjs";
import { runIntakeCommand } from "../scripts/check-content-intake.mjs";
import { runPrepareIntakeCommand } from "../scripts/prepare-content-intake.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const common = ["contract", "source", "source-text", "limitations", "review-basis", "review"];
const roles = {
  report: [
    ...common,
    "source-bank",
    "viewer-content",
    "catalogue",
    "source-links",
    "context",
    "receipt",
  ],
  framework: [...common, "source-bank", "catalogue", "source-links", "context", "migration"],
  model: [...common, "viewer-content", "context"],
};
function fixture(t, kind) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-intake-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const payload = Buffer.from("Synthetic placeholder; not actual source or review evidence.");
  const files = roles[kind].map((role, i) => ({
    id: "file-" + i,
    path: role + ".txt",
    sha256: hash(payload),
    bytes: payload.length,
    roles: [role],
  }));
  for (const file of files) writeFileSync(join(dir, file.path), payload);
  const manifest = {
    format: "omnibus-intake",
    schemaVersion: 1,
    package: { id: "synthetic-" + kind, kind, version: "test-1", title: "Synthetic " + kind },
    contract: intakeContracts[kind],
    files,
  };
  const path = join(dir, "manifest.json");
  const save = () => writeFileSync(path, JSON.stringify(manifest));
  save();
  return { dir, path, manifest, save };
}

function plannedFixture(t, kind = "report") {
  const f = fixture(t, kind);
  const plan = { ...f.manifest, format: "omnibus-intake-plan",
    files: f.manifest.files.map(({ id, path, roles }) => ({ id, path, roles })) };
  const planPath = join(f.dir, "plan.json"), output = join(f.dir, "intake.json");
  const savePlan = () => writeFileSync(planPath, JSON.stringify(plan));
  savePlan();
  return { ...f, plan, planPath, output, savePlan };
}

function runCli(script, args) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/" + script, import.meta.url)), ...args],
    { encoding: "utf8", timeout: 15000 });
  assert.ifError(result.error);
  return result;
}

function packageSnapshot(f) {
  return [f.path, f.planPath, f.output, ...f.manifest.files.map(file => join(f.dir, file.path))]
    .filter(existsSync).map(path => [path, hash(readFileSync(path))]);
}

function heldResult(result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.status, "HOLD");
  assert.equal(failure.publishable, false);
  return failure;
}

for (const kind of Object.keys(intakeContracts)) {
  test(kind + " CLI locates missing fields without echoing untrusted field names or changing inputs", (t) => {
    const f = plannedFixture(t, kind);
    for (const phase of ["prepare", "check"]) {
      const input = phase === "prepare" ? f.plan : f.manifest;
      const path = phase === "prepare" ? f.planPath : f.path;
      const script = phase === "prepare" ? "prepare-content-intake.mjs" : "check-content-intake.mjs";
      const args = phase === "prepare" ? [path, "--output", f.output] : [path];
      for (const [location, missing, edit] of [
        ["$", "contract", value => delete value.contract],
        ["package", "version", value => delete value.package.version],
        ["files[1]", "roles", value => {
          delete value.files[1].roles;
          value.files[1]["private-field-do-not-echo\nAPPROVE"] = "untrusted";
        }],
      ]) {
        const changed = structuredClone(input);
        edit(changed);
        writeFileSync(path, JSON.stringify(changed));
        const before = packageSnapshot(f);
        const failure = heldResult(runCli(script, args));
        assert.match(failure.error, /expected fields/);
        assert.equal(failure.diagnostic.code, "INTAKE_FIELDS");
        assert.equal(failure.diagnostic.location, location);
        assert.deepEqual(failure.diagnostic.missingFields, [missing]);
        assert.ok(failure.diagnostic.expectedFields.includes(missing));
        assert.equal(failure.diagnostic.unexpectedFieldCount, location === "files[1]" ? 1 : 0);
        assert.match(failure.diagnostic.nextCommand, phase === "prepare" ? /content:prepare/ : /content:intake.*--expect-sha256/);
        if (phase === "check") assert.match(failure.diagnostic.action, /do not edit.*intake.json/i);
        assert.equal(failure.diagnostic.documentation, "docs/beheer/pakket-controleren.md#hold-herstellen");
        assert.equal(JSON.stringify(failure).includes("private-field-do-not-echo"), false);
        assert.deepEqual(packageSnapshot(f), before);
        assert.equal(existsSync(f.output), false);
      }
      writeFileSync(path, JSON.stringify(input));
    }
  });

  test(kind + " CLI identifies a missing review file and preserves the original handoff for retry", async (t) => {
    const f = plannedFixture(t, kind);
    const index = f.plan.files.findIndex(file => file.roles.includes("review"));
    const file = f.plan.files[index], path = join(f.dir, file.path), original = readFileSync(path);
    const pin = hash(readFileSync(f.path));
    rmSync(path);
    const before = packageSnapshot(f);
    for (const [script, args] of [
      ["prepare-content-intake.mjs", [f.planPath, "--output", f.output]],
      ["check-content-intake.mjs", [f.path, "--expect-sha256", pin]],
    ]) {
      const failure = heldResult(runCli(script, args));
      assert.match(failure.error, /ENOENT/);
      assert.equal(failure.diagnostic.code, "INTAKE_FILE_MISSING");
      assert.equal(failure.diagnostic.location, `files[${index}].path`);
      assert.deepEqual(failure.diagnostic.file, { id: file.id, path: file.path });
      assert.match(failure.diagnostic.action, /original/i);
      assert.match(failure.diagnostic.nextCommand, /npm run content:/);
      assert.equal(JSON.stringify(failure.diagnostic).includes(f.dir), false);
      assert.deepEqual(packageSnapshot(f), before);
      assert.equal(existsSync(f.output), false);
    }
    await assert.rejects(checkIntake(f.path), error => error.code === "ENOENT");
    writeFileSync(path, original);
    const restored = packageSnapshot(f);
    const checked = runCli("check-content-intake.mjs", [f.path, "--expect-sha256", pin]);
    assert.equal(checked.status, 0, checked.stderr);
    const result = JSON.parse(checked.stdout);
    assert.equal(result.trustedManifestMatched, true);
    assert.equal(result.publishable, false);
    assert.equal(result.reviewValidated, false);
    assert.equal(result.contentValidated, false);
    assert.equal(result.diagnostic, undefined);
    assert.deepEqual(packageSnapshot(f), restored);
  });
}

test("field guidance handles non-objects and preserves explicit historical hash requirements", (t) => {
  const f = plannedFixture(t);
  for (const [location, edit] of [
    ["$", () => null],
    ["package", value => ({ ...value, package: [] })],
    ["files[0]", value => ({ ...value, files: [null, ...value.files.slice(1)] })],
  ]) {
    writeFileSync(f.path, JSON.stringify(edit(f.manifest)));
    const before = packageSnapshot(f);
    const failure = heldResult(runCli("check-content-intake.mjs", [f.path, "--expect-sha256", hash(readFileSync(f.path)), "--historical-report"]));
    assert.match(failure.error, /object required/);
    assert.equal(failure.diagnostic.code, "INTAKE_OBJECT");
    assert.equal(failure.diagnostic.location, location);
    assert.match(failure.diagnostic.nextCommand, /--expect-sha256.*--historical-report$/);
    assert.deepEqual(packageSnapshot(f), before);
  }
  f.save();
  const failure = heldResult(runCli("check-content-intake.mjs", [f.path, "--historical-report"]));
  assert.deepEqual(Object.keys(failure), ["status", "publishable", "error"]);
  assert.match(failure.error, /Usage:/);
  const mismatched = heldResult(runCli("check-content-intake.mjs", [f.path, "--expect-sha256", "0".repeat(64), "--historical-report"]));
  assert.deepEqual(Object.keys(mismatched), ["status", "publishable", "error"]);
  assert.match(mismatched.error, /Trusted manifest SHA256 mismatch/);
});

for (const kind of Object.keys(intakeContracts)) {
  test(kind + " plan prepares a verifiable envelope without touching inputs or granting approval", async (t) => {
    const f = plannedFixture(t, kind);
    const inputs = [f.planPath, ...f.plan.files.map(file => join(f.dir, file.path))];
    const before = inputs.map(path => readFileSync(path));
    const result = await runPrepareIntakeCommand([f.planPath, "--output", f.output]);
    assert.equal(result.status, "MANIFEST_PREPARED_VERIFICATION_REQUIRED");
    assert.equal(result.contentValidated, false);
    assert.equal(result.reviewValidated, false);
    assert.equal(result.publishable, false);
    assert.deepEqual(JSON.parse(readFileSync(f.output, "utf8")), f.manifest);
    assert.deepEqual(inputs.map(path => readFileSync(path)), before);
    const verified = await checkIntake(f.output, { expectedSha256: result.manifestSha256 });
    assert.equal(verified.trustedManifestMatched, true);
    assert.equal(verified.publishable, false);
    assert.equal(verified.bytes, result.bytes);
    // Changed payloads cannot be blessed by preparing over an existing receipt.
    const receipt = readFileSync(f.output);
    writeFileSync(inputs[1], "Changed after preparation");
    await assert.rejects(prepareIntake(f.planPath, f.output), /EEXIST/);
    assert.deepEqual(readFileSync(f.output), receipt);
    await assert.rejects(checkIntake(f.output), /checksum\/size mismatch|size out of bounds/);
  });
}

test("file count errors identify the actual count and boundary", (t) => {
  const { manifest } = fixture(t, "report");
  while (manifest.files.length < intakeLimits.files) {
    const id = "support-" + manifest.files.length;
    manifest.files.push({ id, path: id + ".txt", sha256: "0".repeat(64), bytes: 1, roles: ["supporting"] });
  }
  assert.doesNotThrow(() => validateIntakeManifest(manifest));
  manifest.files.push({ ...manifest.files.at(-1), id: "overflow", path: "overflow.txt" });
  assert.throws(() => validateIntakeManifest(manifest), /Invalid file count: received 257; allowed 1 to 256/);
  assert.throws(() => validateIntakeManifest({ ...manifest, files: [] }), /received 0; allowed 1 to 256/);
  assert.throws(() => validateIntakeManifest({ ...manifest, files: {} }), /expected an array/);
});

test("oversized plans fail before reading payloads or creating a receipt", async (t) => {
  const f = plannedFixture(t);
  while (f.plan.files.length <= intakeLimits.files) {
    const id = "missing-" + f.plan.files.length;
    f.plan.files.push({ id, path: id + ".txt", roles: ["supporting"] });
  }
  f.savePlan();
  await assert.rejects(prepareIntake(f.planPath, f.output), /received 257; allowed 1 to 256/);
  assert.equal(existsSync(f.output), false);
});

test("historical report profile is explicit, bounded and keeps byte and schema limits", (t) => {
  const { manifest } = fixture(t, "report"), options = { historicalReport: true };
  assert.deepEqual(historicalReportIntakeLimits, { ...intakeLimits, files: 1024 });
  while (manifest.files.length < 1024) {
    const id = "support-" + manifest.files.length;
    manifest.files.push({ id, path: id + ".txt", sha256: "0".repeat(64), bytes: 1, roles: ["supporting"] });
  }
  assert.doesNotThrow(() => validateIntakeManifest(manifest, options));
  assert.throws(() => validateIntakeManifest(manifest), /allowed 1 to 256/);
  assert.throws(() => validateIntakeManifest({ ...manifest, profile: "historical-report" }, options), /expected fields/);
  assert.throws(() => validateIntakeManifest(manifest, { historicalReport: "true" }), /Invalid historical/);
  const invalid = structuredClone(manifest);
  invalid.files.push({ ...invalid.files.at(-1), id: "overflow", path: "overflow.txt" });
  assert.throws(() => validateIntakeManifest(invalid, options), /received 1025; allowed 1 to 1024/);
  for (const fields of [{ bytes: intakeLimits.fileBytes + 1 }, { path: "../escape" }, { sha256: "bad" }, { roles: ["invented"] }]) {
    assert.throws(() => validateIntakeManifest({ ...manifest, files: [{ ...manifest.files[0], ...fields }, ...manifest.files.slice(1)] }, options));
  }
  const tooLarge = structuredClone(manifest);
  tooLarge.files[0].bytes = intakeLimits.fileBytes;
  tooLarge.files[1].bytes = intakeLimits.fileBytes;
  assert.throws(() => validateIntakeManifest(tooLarge, options), /exceeds intake size/);
  assert.throws(() => validateIntakeManifest({ ...manifest, files: manifest.files.slice(1) }, options), /Missing file roles/);
  for (const kind of ["framework", "model"]) {
    assert.throws(() => validateIntakeManifest(fixture(t, kind).manifest, options), /restricted to reports/);
  }
});

test("historical report archive roundtrip checks all 709 files and requires the retained hash", async (t) => {
  const f = plannedFixture(t);
  while (f.plan.files.length < 709) {
    const id = "archive-" + f.plan.files.length;
    f.plan.files.push({ id, path: id + ".txt", roles: ["supporting"] });
    writeFileSync(join(f.dir, id + ".txt"), "Synthetic frozen evidence " + id);
  }
  f.savePlan();
  await assert.rejects(prepareIntake(f.planPath, f.output), /allowed 1 to 256/);
  assert.equal(existsSync(f.output), false);
  const prepared = await runPrepareIntakeCommand([f.planPath, "--output", f.output, "--historical-report"]);
  const options = { historicalReport: true, expectedSha256: prepared.manifestSha256 };
  assert.equal(prepared.profile, "historical-report");
  await assert.rejects(checkIntake(f.output, { historicalReport: true }), /independently retained/);
  await assert.rejects(checkIntake(f.output, { expectedSha256: prepared.manifestSha256 }), /allowed 1 to 256/);
  await assert.rejects(checkIntake(f.output, { ...options, expectedSha256: "0".repeat(64) }), /Trusted manifest SHA256 mismatch/);
  const result = await runIntakeCommand([f.output, "--expect-sha256", prepared.manifestSha256, "--historical-report"]);
  assert.equal(result.files, 709);
  assert.equal(result.profile, "historical-report");
  assert.equal(result.trustedManifestMatched, true);
  assert.equal(result.contentValidated, false);
  assert.equal(result.reviewValidated, false);
  assert.equal(result.publishable, false);
  // Mutating the last dependency must fail, not just the first 256 files.
  const last = join(f.dir, f.plan.files.at(-1).path), original = readFileSync(last);
  writeFileSync(last, Buffer.alloc(original.length, 65));
  await assert.rejects(checkIntake(f.output, options), /checksum\/size mismatch/);
  rmSync(last);
  await assert.rejects(checkIntake(f.output, options), /ENOENT/);
  writeFileSync(last, original);
  const before = readFileSync(f.output);
  await assert.rejects(prepareIntake(f.planPath, f.output, { historicalReport: true }), /EEXIST/);
  assert.deepEqual(readFileSync(f.output), before);
  const changed = JSON.parse(before);
  changed.files.pop();
  writeFileSync(f.output, JSON.stringify(changed));
  await assert.rejects(checkIntake(f.output, options), /Trusted manifest SHA256 mismatch/);
});

test("historical profile rejects links and malformed command options", async (t) => {
  const f = plannedFixture(t);
  const dir = join(f.dir, "target"), linked = join(f.dir, "linked");
  mkdirSync(dir);
  writeFileSync(join(dir, "source.txt"), "Untrusted linked source");
  symlinkSync(dir, linked, process.platform === "win32" ? "junction" : "dir");
  f.plan.files[0].path = "linked/source.txt";
  f.savePlan();
  await assert.rejects(prepareIntake(f.planPath, f.output, { historicalReport: true }), /Links are not accepted/);
  for (const args of [[f.path, "--historical-report"], [f.path, "--expect-sha256", "0".repeat(64), "--force"],
    [f.path, "--expect-sha256", "0".repeat(64), "--historical-report", "--historical-report"]]) {
    await assert.rejects(runIntakeCommand(args), /Usage:/);
  }
  for (const args of [[f.planPath, "--output", f.output, "--force"],
    [f.planPath, "--output", f.output, "--historical-report", "--historical-report"]]) {
    await assert.rejects(runPrepareIntakeCommand(args), /Usage:/);
  }
  assert.equal(existsSync(f.output), false);
});

test("preparation refuses malformed plans, inferred roles and supplied checksums before writing", async (t) => {
  const f = plannedFixture(t);
  const original = structuredClone(f.plan);
  const variants = [
    { ...original, format: "omnibus-intake" },
    { ...original, command: "execute this" },
    { ...original, contract: intakeContracts.model },
    { ...original, files: original.files.slice(1) },
    { ...original, files: [{ ...original.files[0], sha256: "0".repeat(64) }, ...original.files.slice(1)] },
    { ...original, files: original.files.map(file => ({ ...file, roles: [] })) },
  ];
  for (const plan of variants) {
    writeFileSync(f.planPath, JSON.stringify(plan));
    await assert.rejects(prepareIntake(f.planPath, f.output));
    assert.equal(existsSync(f.output), false);
  }
});

test("preparation rejects path escapes, self references, output references and missing files", async (t) => {
  const f = plannedFixture(t);
  for (const path of ["../outside.txt", "/absolute", "C:/outside", "con.txt", "plan.json", "intake.json", "INTAKE.JSON", "missing.txt"]) {
    f.plan.files[0].path = path;
    f.savePlan();
    await assert.rejects(prepareIntake(f.planPath, f.output));
    assert.equal(existsSync(f.output), false);
  }
  f.plan.files[0].path = f.manifest.files[0].path;
  f.savePlan();
  for (const output of [f.planPath, join(f.dir, "manifest.json"), join(f.dir, "sub", "intake.json")]) {
    await assert.rejects(prepareIntake(f.planPath, output), /Output must be a new intake.json next to the plan/);
  }
});

test("preparation refuses directory links and never overwrites a hardlinked output", async (t) => {
  const f = plannedFixture(t);
  const target = join(f.dir, "target"), link = join(f.dir, "linked");
  mkdirSync(target);
  writeFileSync(join(target, "file.txt"), "Synthetic content");
  symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
  f.plan.files[0].path = "linked/file.txt";
  f.savePlan();
  await assert.rejects(prepareIntake(f.planPath, f.output), /Links are not accepted/);
  assert.equal(existsSync(f.output), false);
  f.plan.files[0].path = f.manifest.files[0].path;
  f.savePlan();
  const before = readFileSync(f.planPath);
  linkSync(f.planPath, f.output);
  await assert.rejects(prepareIntake(f.planPath, f.output), /EEXIST/);
  assert.deepEqual(readFileSync(f.planPath), before);
});

test("preparation hashes Unicode and executable payloads without interpreting them", async (t) => {
  const f = plannedFixture(t, "model"), marker = join(f.dir, "executed.txt");
  const content = 'import {writeFileSync} from "node:fs"; writeFileSync(' + JSON.stringify(marker) + ',"do not execute");\n// é 中文 🧭';
  writeFileSync(join(f.dir, "source.mjs"), content);
  f.plan.files[0].path = "source.mjs";
  f.savePlan();
  await prepareIntake(f.planPath, f.output);
  const file = JSON.parse(readFileSync(f.output, "utf8")).files[0];
  assert.equal(file.bytes, Buffer.byteLength(content));
  assert.equal(file.sha256, hash(content));
  assert.equal(existsSync(marker), false);
  await checkIntake(f.output);
});

test("preparation rejects empty payloads, invalid UTF8 and unsupported command arguments", async (t) => {
  const f = plannedFixture(t);
  writeFileSync(join(f.dir, f.plan.files[0].path), "");
  await assert.rejects(prepareIntake(f.planPath, f.output), /size out of bounds/);
  assert.equal(existsSync(f.output), false);
  writeFileSync(f.planPath, Buffer.from([0xff]));
  await assert.rejects(prepareIntake(f.planPath, f.output), /encoded data/);
  for (const args of [[], [f.planPath], [f.planPath, "--force", f.output], [f.planPath, "--output", f.output, "extra"], ["--plan", "--output", f.output]]) {
    await assert.rejects(runPrepareIntakeCommand(args), /Usage:/);
  }
  assert.equal(existsSync(f.output), false);
});

test("intake CLI emits machine-readable preparation and HOLD results with reliable exit codes", (t) => {
  const f = plannedFixture(t);
  const run = (script, args) => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/" + script, import.meta.url)), ...args],
      { encoding: "utf8", timeout: 15000 });
    assert.ifError(result.error);
    return result;
  };
  const args = [f.planPath, "--output", f.output];
  const prepared = run("prepare-content-intake.mjs", args);
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.equal(JSON.parse(prepared.stdout).status, "MANIFEST_PREPARED_VERIFICATION_REQUIRED");
  const duplicate = run("prepare-content-intake.mjs", args);
  assert.equal(duplicate.status, 1);
  assert.equal(duplicate.stdout, "");
  assert.equal(JSON.parse(duplicate.stderr).status, "HOLD");
  assert.equal(JSON.parse(duplicate.stderr).publishable, false);
  const verified = run("check-content-intake.mjs", [f.output]);
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(JSON.parse(verified.stdout).publishable, false);
  writeFileSync(f.output, "null");
  const malformed = run("check-content-intake.mjs", [f.output]);
  assert.equal(malformed.status, 1);
  assert.equal(JSON.parse(malformed.stderr).status, "HOLD");
});

test("manifest validation rejects unknown shapes instead of trusting declared types", (t) => {
  const f = fixture(t, "report");
  for (const input of [null, [], "manifest", 1, {}, { ...f.manifest, package: null },
    { ...f.manifest, package: { ...f.manifest.package, kind: "__proto__" } }]) {
    assert.throws(() => validateIntakeManifest(input));
  }
  for (const fields of [{ bytes: "50" }, { bytes: NaN }, { bytes: 1.5 }, { bytes: 0 },
    { roles: [null] }, { path: null }, { sha256: null }]) {
    assert.throws(() => validateIntakeManifest({ ...f.manifest,
      files: [{ ...f.manifest.files[0], ...fields }, ...f.manifest.files.slice(1)] }));
  }
});

for (const kind of Object.keys(intakeContracts)) {
  test(kind + " intake verifies files but never grants substantive approval", async (t) => {
    const f = fixture(t, kind),
      before = readFileSync(f.path),
      expectedSha256 = hash(before);
    const result = await checkIntake(f.path, { expectedSha256 });
    assert.equal(result.status, "FILES_VERIFIED_REVIEW_REQUIRED");
    assert.equal(result.trustedManifestMatched, true);
    assert.equal(result.contentValidated, false);
    assert.equal(result.reviewValidated, false);
    assert.equal(result.publishable, false);
    assert.deepEqual(readFileSync(f.path), before);
    assert.deepEqual(await runIntakeCommand([f.path, "--expect-sha256", expectedSha256]), result);
    for (const role of roles[kind]) {
      const incomplete = structuredClone(f.manifest);
      incomplete.files = incomplete.files.filter((file) => !file.roles.includes(role));
      assert.throws(() => validateIntakeManifest(incomplete), /Missing file roles/);
    }
  });
}

test("intake rejects altered files, an altered trusted manifest and missing files", async (t) => {
  const f = fixture(t, "report"),
    expectedSha256 = hash(readFileSync(f.path));
  const source = join(f.dir, f.manifest.files[0].path),
    before = readFileSync(source);
  writeFileSync(source, Buffer.alloc(before.length, 65));
  await assert.rejects(checkIntake(f.path), /checksum\/size mismatch/);
  writeFileSync(source, before);
  f.manifest.package.title = "Changed manifest";
  f.save();
  await assert.rejects(checkIntake(f.path, { expectedSha256 }), /Trusted manifest SHA256 mismatch/);
  f.manifest.files[0].path = "missing.txt";
  f.save();
  await assert.rejects(checkIntake(f.path), /ENOENT/);
});

test("intake rejects path escapes, Windows device names and case collisions", (t) => {
  const f = fixture(t, "framework");
  for (const path of [
    "../outside",
    "/absolute",
    "C:/outside",
    "folder\\file",
    "con.txt",
    "dir/aux",
    "trailing.",
  ]) {
    const manifest = structuredClone(f.manifest);
    manifest.files[0].path = path;
    assert.throws(() => validateIntakeManifest(manifest), /Unsafe or nonportable/);
  }
  const duplicate = structuredClone(f.manifest);
  duplicate.files[1].path = duplicate.files[0].path.toUpperCase();
  assert.throws(() => validateIntakeManifest(duplicate), /Duplicate file path/);
  assert.throws(
    () => validateIntakeManifest({ ...f.manifest, contract: intakeContracts.report }),
    /Contract does not match/,
  );
});

test("package code is hashed as bytes, never executed, even if it claims approval", async (t) => {
  const f = fixture(t, "model"),
    marker = join(f.dir, "executed.txt");
  const code = Buffer.from(
    'import {writeFileSync} from "node:fs"; writeFileSync(' +
      JSON.stringify(marker) +
      ',"unexpected");',
  );
  writeFileSync(join(f.dir, "untrusted.mjs"), code);
  f.manifest.files.push({
    id: "untrusted",
    path: "untrusted.mjs",
    sha256: hash(code),
    bytes: code.length,
    roles: ["supporting"],
  });
  f.save();
  const result = await checkIntake(f.path);
  assert.equal(existsSync(marker), false);
  assert.equal(result.publishable, false);
});
