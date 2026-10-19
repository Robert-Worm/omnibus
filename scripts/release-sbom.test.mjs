import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeReleaseSbom, parseSbomArgs } from "./release-sbom.mjs";
import { digest } from "../content-tools/identity.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "omnibus-sbom-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const manifest = { name: "synthetic", version: "1.0.0", dependencies: {}, devDependencies: {} };
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest));
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify({ lockfileVersion: 3, packages: { "": manifest } }),
  );
  const npmCli = join(root, "synthetic-npm.cjs");
  writeFileSync(npmCli, "// never executed");
  const out = join(root, "bom.json");
  return { root, out, npmCli };
}
const bom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  metadata: { component: { name: "synthetic" } },
  components: [],
  dependencies: [],
};

test("SBOM uses npm offline lockfile mode and includes build and optional dependencies", (t) => {
  const f = fixture(t),
    before = readFileSync(join(f.root, "package-lock.json"));
  const result = writeReleaseSbom(f, (command, args, options) => {
    assert.equal(command, process.execPath);
    for (const flag of [
      "--offline",
      "--package-lock-only",
      "--include=dev",
      "--include=optional",
      "--include=peer",
      "--ignore-scripts",
    ])
      assert(args.includes(flag));
    assert.equal(options.cwd, f.root);
    return JSON.stringify(bom);
  });
  assert.equal(result.status, "SBOM_WRITTEN");
  const saved = JSON.parse(readFileSync(f.out));
  assert.equal(
    saved.metadata.properties.find((p) => p.name === "omnibus:package-lock-sha256").value,
    digest(before.toString("utf8")),
  );
  assert.deepEqual(readFileSync(join(f.root, "package-lock.json")), before);
  assert.throws(
    () => writeReleaseSbom(f, () => assert.fail("Existing file must fail before running npm")),
    /never replaced/,
  );
});

test("SBOM rejects mismatched or changing inputs and incomplete generator output", (t) => {
  const f = fixture(t),
    manifestPath = join(f.root, "package.json"),
    before = readFileSync(manifestPath);
  writeFileSync(manifestPath, JSON.stringify({ name: "changed" }));
  assert.throws(() => writeReleaseSbom(f, () => assert.fail("Must not run")), /disagree/);
  writeFileSync(manifestPath, before);
  assert.throws(
    () => writeReleaseSbom(f, () => JSON.stringify({ bomFormat: "CycloneDX" })),
    /complete/,
  );
  assert.throws(
    () =>
      writeReleaseSbom(f, () => {
        writeFileSync(manifestPath, Buffer.concat([before, Buffer.from("\n")]));
        return JSON.stringify(bom);
      }),
    /changed/,
  );
  assert.equal(existsSync(f.out), false);
});

test("SBOM requires a new explicit JSON destination and never writes after npm failure", (t) => {
  const f = fixture(t);
  for (const args of [
    [],
    ["--out"],
    ["--out", "--force"],
    ["--out", "file.txt"],
    ["--out", "file.json", "--force"],
  ])
    assert.throws(() => parseSbomArgs(args), /Usage/);
  assert.throws(
    () =>
      writeReleaseSbom(f, () => {
        throw Error("Synthetic npm failure");
      }),
    /Synthetic/,
  );
  assert.equal(existsSync(f.out), false);
});
