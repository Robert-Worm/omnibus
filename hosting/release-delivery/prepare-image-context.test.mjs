import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runtimeFixture } from "../../local-data/test-support/runtime-fixture.mjs";
import { runtimeContractHash } from "../../lib/runtime-contract-identity.mjs";
import { bytesHash, verifyRuntimePackage } from "../../local-data/runtime-package.mjs";
import { packageRuntime } from "../../scripts/package-runtime.mjs";
import { parseContextArgs, prepareImageContext } from "./prepare-image-context.mjs";

// Deliberately fictitious; tests never resolve or pull this image.
const nodeImage = "node:24.17.0-bookworm-slim@sha256:" + "a".repeat(64);
function fixture(t) {
  const f = runtimeFixture(t);
  const webRoot = join(f.dir, "web"), packageRoot = join(f.dir, "runtime");
  mkdirSync(join(webRoot, "assets"), { recursive: true });
  writeFileSync(join(webRoot, "database.html"), "<!doctype html><title>Synthetic delivery</title>");
  writeFileSync(join(webRoot, "assets/app-12345678.js"), "// Synthetic; no reviewed source content.");
  writeFileSync(join(webRoot, "omnibus-release.json"), JSON.stringify({
    schema: 1, runtimeTarget: "portable-local", release: f.release,
    publication: f.publication, contract: runtimeContractHash,
  }));
  packageRuntime({ webRoot, databasePath: f.databasePath, out: packageRoot });
  return { ...f, packageRoot, nodeImage, out: join(f.dir, "image context é") };
}
function files(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

test("staging is deterministic, preserves verified bytes and excludes adjacent private files", (t) => {
  const f = fixture(t), before = bytesHash(readFileSync(f.databasePath));
  writeFileSync(join(f.dir, ".env"), "SYNTHETIC_CANARY");
  const source = verifyRuntimePackage(f.packageRoot);
  const result = prepareImageContext(f);
  assert.deepEqual(result, { status: "PREPARED_IMAGE_CONTEXT", files: Object.keys(source.files).length + 3, imageBuilt: false });
  assert.deepEqual(verifyRuntimePackage(join(f.out, "runtime")), source);
  assert.equal(bytesHash(readFileSync(f.databasePath)), before);
  assert.equal(files(f.out).length, result.files);
  for (const path of [...Object.keys(source.files), "runtime-package.json"])
    assert.deepEqual(readFileSync(join(f.out, "runtime", path)), readFileSync(join(f.packageRoot, path)));
  const other = join(f.dir, "repeat");
  prepareImageContext({ ...f, out: other });
  for (const path of files(f.out))
    assert.deepEqual(readFileSync(path), readFileSync(path.replace(f.out, other)));
  const lines = readFileSync(join(f.out, ".dockerignore"), "utf8").trim().split("\n");
  assert.equal(lines[0], "**");
  assert(lines.slice(1).every((line) => line.startsWith("!") && !/[?*[\]]/.test(line)));
  assert(lines.slice(1).every((line) => !line.endsWith("/")));
  const allowedFiles = lines.slice(1).map((line) => line.slice(1)).sort();
  assert.deepEqual(allowedFiles, ["Dockerfile", ".dockerignore", "runtime/runtime-package.json",
    ...Object.keys(source.files).map((path) => "runtime/" + path)].sort());
  t.diagnostic(`${result.files} context files; ${Object.keys(source.files).length + 1} unchanged runtime files; no Docker execution`);
});

test("unexpected package files and changed bytes fail before a context is created", (t) => {
  const f = fixture(t);
  for (const name of [".env", "private.sqlite", "lib/private-author.mjs"]) {
    const path = join(f.packageRoot, name);
    writeFileSync(path, "SYNTHETIC_CANARY");
    assert.throws(() => prepareImageContext(f), /unexpected file/);
    assert(!existsSync(f.out));
    rmSync(path);
  }
  writeFileSync(join(f.packageRoot, "database-build/assets/app-12345678.js"), "changed");
  assert.throws(() => prepareImageContext(f), /checksum mismatch/);
  assert(!existsSync(f.out));
});

test("output must be new and disjoint; existing contents and source remain intact", (t) => {
  const f = fixture(t), before = readFileSync(join(f.packageRoot, "runtime-package.json"));
  mkdirSync(f.out);
  writeFileSync(join(f.out, "keep.txt"), "keep");
  assert.throws(() => prepareImageContext(f), /EEXIST/);
  for (const out of [f.packageRoot, f.dir, join(f.packageRoot, "nested")])
    assert.throws(() => prepareImageContext({ ...f, out }), /separate/);
  assert.equal(readFileSync(join(f.out, "keep.txt"), "utf8"), "keep");
  assert.deepEqual(readFileSync(join(f.packageRoot, "runtime-package.json")), before);
  assert(!existsSync(join(f.packageRoot, "nested")));
});

test("base-image pin and CLI arguments are explicit, with redacted CLI failures", () => {
  for (const invalid of [undefined, "node:24", "node:24-bookworm-slim", nodeImage.replace("24.17", "22.17"),
    nodeImage.replace("@sha256:", ":"), nodeImage.replace(/a$/, "G"), nodeImage + "\nRUN bad", "example.invalid/" + nodeImage])
    assert.throws(() => prepareImageContext({ nodeImage: invalid }), /explicit Node 24/);
  const args = ["--package", "runtime", "--node-image", nodeImage, "--out", "new"];
  assert.deepEqual(parseContextArgs(args), { packageRoot: "runtime", nodeImage, out: "new" });
  for (const invalid of [[], args.slice(0, 4), [...args, "--extra", "x"],
    ["--out", "x", "--out", "y", "--package", "z"], ["--package=x", "x", ...args.slice(2)]])
    assert.throws(() => parseContextArgs(invalid), /Usage/);
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("./prepare-image-context.mjs", import.meta.url)),
    "--node-image", "SECRET_CANARY", "--package", "PRIVATE_CANARY", "--out", "unused"], { encoding: "utf8" });
  assert.equal(cli.status, 1);
  assert(!cli.stdout);
  assert.match(cli.stderr, /^Image context refused\./);
  assert.doesNotMatch(cli.stderr, /SECRET_CANARY|PRIVATE_CANARY|at file:/);
});

test("template checks run on host Node without data; no image build or public listener", (t) => {
  const f = fixture(t);
  renameSync(f.databasePath, f.databasePath + ".not-mounted");
  assert(!existsSync(f.databasePath));
  prepareImageContext(f);
  const dockerfile = readFileSync(join(f.out, "Dockerfile"), "utf8");
  assert.match(dockerfile, new RegExp("^FROM " + nodeImage.replaceAll(".", "\\.") + "$", "m"));
  assert.match(dockerfile, /^COPY --chown=0:0 runtime\/ \.\/$/m);
  assert.match(dockerfile, /^USER 1000:1000$/m);
  assert.doesNotMatch(dockerfile, /^(ADD|VOLUME|ENV|ARG|HEALTHCHECK)\b/m);
  assert.doesNotMatch(dockerfile, /npm (ci|install|run)|\/var\/lib\/omnibus|COPY \. /);
  const check = JSON.parse(dockerfile.split("\n").find((line) => line.startsWith("RUN [")).slice(4));
  assert.equal(check[0], "node");
  // This exercises the Node expression only, not Docker's parser or filesystem layers.
  const checked = spawnSync(process.execPath, check.slice(1), { cwd: join(f.out, "runtime"), encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  const start = JSON.parse(dockerfile.split("\n").find((line) => line.startsWith("ENTRYPOINT ")).slice(11));
  const refused = spawnSync(process.execPath, start.slice(1), { cwd: join(f.out, "runtime"), encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Runtime start refused/);
});
