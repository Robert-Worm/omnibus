import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, relative, isAbsolute } from "node:path";
import { installContentSkills, skillNames } from "../scripts/install-content-skills.mjs";
import { checkIntake, prepareIntake, intakeContracts } from "./intake.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { reportSkillRuntimeFiles } from "../scripts/report-skill-runtime.mjs";
import { sourceMethodFixture } from "./test-support/local-source-method-fixture.mjs";

// Exercise the actual portable skill assets, not a second copy of their schema.
test("all eight skills install separately with licences and preserve local edits", async (t) => {
  const target = await mkdtemp(join(tmpdir(), "omnibus-public-skills-"));
  t.after(() => rm(target, { recursive: true, force: true }));
  const licence = await readFile(new URL("../LICENSE", import.meta.url));
  for (const name of skillNames) {
    const result = await installContentSkills(target, { checkOnly: false, names: [name] });
    assert.deepEqual(result.skills, [{ name, action: "install" }]);
    assert.deepEqual(await readFile(join(target, name, "LICENSE")), licence);
    assert.ok((await readFile(join(target, name, "README.md"), "utf8")).includes("[SKILL.md](SKILL.md)"));
  }
  const unchanged = await installContentSkills(target, { checkOnly: false });
  assert.ok(unchanged.skills.every(skill => skill.action === "unchanged"));
  const edited = join(target, skillNames[0], "README.md");
  await writeFile(edited, "My local changes");
  await assert.rejects(installContentSkills(target, { checkOnly: false }), /not overwritten/);
  assert.equal(await readFile(edited, "utf8"), "My local changes");
});

test("installed report skill resolves its bundled contracts and isolated role instructions without the private kit", async (t) => {
  const target = await mkdtemp(join(tmpdir(), "omnibus-report-instructions-"));
  t.after(() => rm(target, { recursive: true, force: true }));
  await installContentSkills(target, { checkOnly: false, names: ["omnibus-add-report"] });
  const root = join(target, "omnibus-add-report");
  const entry = join(root, "references/report-package.md");
  const text = await readFile(entry, "utf8");
  const links = [...text.matchAll(/\]\(([^)#\s]+)\)/g)].map(match => match[1]);
  const required = ["QUALITY.md", "SOURCE-OUTPUT.md", "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json.example",
    "contracts/CONTRACT.md", "contracts/record_contract.py", "roles/source-reader.md", "roles/reconciler.md",
    "roles/practical-author.md", "roles/source-reviewer.md", "roles/practical-reviewer.md"];
  for (const file of required) assert.ok(links.includes(`report-kit/${file}`), `Missing contract/role: ${file}`);
  for (const link of links) {
    const path = resolve(dirname(entry), link), inside = relative(root, path);
    assert.ok(!isAbsolute(inside) && !inside.startsWith(".."), `Outside installed skill: ${link}`);
    assert.ok((await readFile(path)).length > 0, `Empty reference: ${link}`);
  }
  const review = JSON.parse(await readFile(join(root, "references/report-kit/REVIEW-CONTRACT.json.example"), "utf8"));
  assert.deepEqual(Object.keys(review.final_review_envelope.target_hashes).sort(), [
    "APP-FINAL.json", "APP-SOURCE-LINKS.json", "CATALOGUE.json", "INCLUSION-DECISIONS.json",
    "RECONCILED-SOURCE.json", "REVIEW-BASIS.json",
  ]);
  // The shipped envelope is a schema illustration, never a signed or filled review.
  assert.equal(review.final_review_envelope.human_validation, false);
  assert.ok(Object.values(review.final_review_envelope.target_hashes).every(value => value === "sha256"));
  await assert.rejects(readFile(join(root, "references/report-kit/tools/workflow.py")), { code: "ENOENT" });
});

test("standalone report checker contains exact shared code and no database, network or application dependency", async t => {
  const root = await mkdtemp(join(tmpdir(), "omnibus-checker-code-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await installContentSkills(root, { checkOnly: false, names: ["omnibus-add-report"] });
  const runtime = join(root, "omnibus-add-report/scripts/runtime"), allowed = new Set(reportSkillRuntimeFiles.map(file => resolve(runtime, file)));
  for (const file of reportSkillRuntimeFiles) {
    const bytes = await readFile(join(runtime, file));
    assert.deepEqual(bytes, await readFile(new URL("../" + file, import.meta.url)));
    for (const match of bytes.toString("utf8").matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)) {
      const name = match[1];
      if (name.startsWith(".")) assert.ok(allowed.has(resolve(dirname(join(runtime, file)), name)), "Unbundled dependency: " + name);
      else assert.ok(["node:crypto", "node:path", "node:fs", "node:fs/promises", "node:url"].includes(name), "Unexpected runtime dependency: " + name);
    }
  }
  await writeFile(join(runtime, reportSkillRuntimeFiles[0]), "Local modification");
  await assert.rejects(installContentSkills(root, { checkOnly: false, names: ["omnibus-add-report"] }), /not overwritten/);
});

test("installed report skill prepares and checks a complete fictitious packet outside the checkout without granting approval", async t => {
  const root = await mkdtemp(join(tmpdir(), "omnibus-final-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installed = join(root, "installed");
  await installContentSkills(installed, { checkOnly: false, names: ["omnibus-add-report"] });
  const skill = join(installed, "omnibus-add-report");
  const extras = ["scripts/check-final.mjs", "scripts/runtime-members.mjs", ...reportSkillRuntimeFiles.map(file => "scripts/runtime/" + file)];
  const kitExtras = Object.fromEntries(await Promise.all(extras.map(async file => [file, await readFile(join(skill, file), "utf8")])));
  const f = sourceMethodFixture("report", undefined, { standalone: true, kitExtras });
  const packet = join(root, "packet"), hash = bytes => createHash("sha256").update(bytes).digest("hex");
  for (const file of f.manifest.files) {
    const path = join(packet, file.path); await mkdir(dirname(path), { recursive: true }); await writeFile(path, f.files.get(file.id));
  }
  await writeFile(join(packet, "plan.json"), JSON.stringify({ format: "omnibus-intake-plan", schemaVersion: 1,
    package: f.manifest.package, contract: f.manifest.contract, files: f.manifest.files.map(({ id, path, roles }) => ({ id, path, roles })) }));
  const run = promisify(execFile), intakePath = join(packet, "intake.json");
  const prepared = JSON.parse((await run(process.execPath, [join(skill, "scripts/runtime/scripts/prepare-content-intake.mjs"),
    join(packet, "plan.json"), "--output", intakePath], { cwd: packet, windowsHide: true })).stdout);
  const planBytes = Buffer.from(JSON.stringify({ authorIds: f.authorIds, sourceEvidence: f.proof }));
  const evidencePath = join(root, "external-evidence.json"); await writeFile(evidencePath, planBytes);
  const command = [join(skill, "scripts/check-final.mjs"), "--intake", intakePath, "--expect-sha256", prepared.manifestSha256,
    "--evidence", evidencePath, "--evidence-sha256", hash(planBytes)];
  const invoke = args => run(process.execPath, args, { cwd: packet, windowsHide: true, timeout: 30000 });
  const result = JSON.parse((await invoke(command)).stdout);
  assert.equal(result.status, "REPORT_FINAL_CHECKED_REVIEW_REQUIRED");
  assert.equal(result.sourceMethodValidated, true);
  assert.equal(result.method.completeReadings, 4);
  assert.equal(result.publishable || result.reviewValidated || result.contentValidated || result.activationPerformed, false);
  const { checkReportFinal } = await import("../skills/omnibus-add-report/scripts/check-final.mjs");
  await assert.rejects(checkReportFinal({ intake: intakePath, intakeSha256: prepared.manifestSha256,
    evidence: evidencePath, evidenceSha256: hash(planBytes) }), /Complete prepared skill required/);
  for (const file of f.manifest.files) assert.deepEqual(await readFile(join(packet, file.path)), f.files.get(file.id));
  for (const [index, expected] of [[4, /Trusted manifest/], [8, /Evidence plan differs/]]) {
    const bad = [...command]; bad[index] = "0".repeat(64);
    await assert.rejects(invoke(bad), error => { assert.match(JSON.parse(error.stderr).error, expected); return true; });
  }
  const review = join(packet, f.paths.get("source-final-review.json").path), original = await readFile(review);
  await writeFile(review, "Changed review");
  await assert.rejects(invoke(command), error => { assert.match(JSON.parse(error.stderr).error, /checksum\/size mismatch/); return true; });
  await writeFile(review, original);
  const helper = join(skill, "scripts/runtime/content-tools/identity.mjs");
  await writeFile(helper, (await readFile(helper, "utf8")) + "\n// Unapproved local edit\n");
  await assert.rejects(invoke(command), error => { assert.match(JSON.parse(error.stderr).error, /Executing end checker is not in the approved release/); return true; });
});

// Deliberately fake payloads demonstrate transport integrity, NEVER content approval.
for (const kind of ["report", "framework"]) {
  test(`${kind} skill can hand a package to another chat without granting publication`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "omnibus-skill-handoff-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const name = "omnibus-add-" + kind;
    const target = join(root, "installed-skills");
    await installContentSkills(target, { checkOnly: false, names: [name] });
    const asset = join(target, name, "assets", "intake-plan.json.example");
    const original = await readFile(asset);
    const plan = JSON.parse(original.toString("utf8"));
    assert.equal(plan.package.kind, kind);
    assert.equal(plan.contract, intakeContracts[kind]);
    plan.package = {
      ...plan.package,
      id: "synthetic-" + kind,
      version: "test-1",
      title: "Synthetic only",
    };
    const incoming = join(root, "content-inbox", plan.package.id, plan.package.version);
    await mkdir(join(incoming, "payload"), { recursive: true });
    const planPath = join(incoming, "plan.json"),
      manifestPath = join(incoming, "intake.json");
    await writeFile(planPath, JSON.stringify(plan));
    // A copied template without genuine files is not an intake receipt.
    await assert.rejects(prepareIntake(planPath, manifestPath), /ENOENT/);
    const payload = Buffer.from(
      "Synthetic test payload. NOT source evidence or an approved review. é😀",
    );
    for (const file of plan.files) {
      const path = join(incoming, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, payload);
    }
    const prepared = await prepareIntake(planPath, manifestPath);
    const received = await checkIntake(manifestPath, { expectedSha256: prepared.manifestSha256 });
    assert.equal(received.status, "FILES_VERIFIED_REVIEW_REQUIRED");
    assert.equal(received.package.kind, kind);
    assert.equal(received.trustedManifestMatched, true);
    for (const result of [prepared, received]) {
      assert.equal(result.publishable, false);
      assert.equal(result.contentValidated, false);
      assert.equal(result.reviewValidated, false);
    }
    assert.deepEqual(await readFile(asset), original);
    assert.deepEqual(JSON.parse(await readFile(planPath, "utf8")), plan);
    for (const file of plan.files)
      assert.deepEqual(await readFile(join(incoming, file.path)), payload);
    await assert.rejects(
      checkIntake(manifestPath, { expectedSha256: "0".repeat(64) }),
      /Trusted manifest/,
    );
    const review = plan.files.find((file) => file.roles.includes("review"));
    await writeFile(join(incoming, review.path), "Changed after handoff");
    await assert.rejects(checkIntake(manifestPath), /checksum\/size mismatch/);
  });
}
