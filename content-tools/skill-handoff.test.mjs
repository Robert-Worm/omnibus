import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installContentSkills, skillNames } from "../scripts/install-content-skills.mjs";
import { checkIntake, prepareIntake, intakeContracts } from "./intake.mjs";

// Exercise the actual portable skill assets, not a second copy of their schema.
test("all seven skills install separately with licences and preserve local edits", async (t) => {
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
