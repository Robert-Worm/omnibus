import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, relative, isAbsolute } from "node:path";
import { installContentSkills, skillNames } from "../scripts/install-content-skills.mjs";
import { checkIntake, prepareIntake, intakeContracts } from "./intake.mjs";

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
    for (const file of plan.files) await writeFile(join(incoming, file.path), payload);
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
