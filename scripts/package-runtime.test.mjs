import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";
import { prepareWebResources } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { bytesHash, verifyRuntimePackage } from "../local-data/runtime-package.mjs";
import { packageRuntime, parsePackageArgs } from "./package-runtime.mjs";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-runtime-package-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = join(dir, "private.sqlite"),
    webRoot = join(dir, "web"),
    out = join(dir, "runtime");
  const repo = new CatalogueRepository(databasePath);
  const release = repo.importRelease({
    manifest: { baselineVersion: "synthetic" },
    packages: [],
    documents: [],
  });
  prepareWebResources(repo, release, {});
  const publication = publishRuntime(
    repo,
    {
      format: "omnibus-runtime-publication",
      schemaVersion: 1,
      contentGate: "VERIFIED_APPLICATION_RELEASE",
      contract: runtimeContractHash,
      release,
      modules: {},
      refs: {},
      registrations: {},
      routing: {},
      summary: {},
    },
    { release, contract: runtimeContractHash },
  );
  repo.close();
  mkdirSync(join(webRoot, "assets"), { recursive: true });
  writeFileSync(
    join(webRoot, "database.html"),
    "<!doctype html><title>Synthetic packaging test</title>",
  );
  writeFileSync(join(webRoot, "assets/app-12345678.js"), "// synthetic test asset");
  writeFileSync(
    join(webRoot, "omnibus-release.json"),
    JSON.stringify({
      schema: 1,
      runtimeTarget: "portable-local",
      release,
      publication,
      contract: runtimeContractHash,
    }),
  );
  return { dir, databasePath, webRoot, out };
}

test("package contains only runtime and unchanged web bytes; database stays separate", (t) => {
  const f = fixture(t),
    before = bytesHash(readFileSync(f.databasePath));
  const result = packageRuntime(f),
    receipt = verifyRuntimePackage(f.out);
  assert(result.files > 0);
  assert.equal(receipt.mode, "local-read-only");
  assert.equal(bytesHash(readFileSync(f.databasePath)), before);
  assert.deepEqual(
    readFileSync(join(f.out, "database-build/database.html")),
    readFileSync(join(f.webRoot, "database.html")),
  );
  const pkg = JSON.parse(readFileSync(join(f.out, "package.json")));
  assert.equal(pkg.engines.node, "24.x");
  assert(!pkg.dependencies && !pkg.devDependencies);
  assert(
    Object.keys(receipt.files).every(
      (path) =>
        !/(node_modules|\.sqlite|\.test\.|\.env|package-runtime\.mjs|published-catalogue)/.test(
          path,
        ),
    ),
  );
  const other = join(f.dir, "repeat");
  packageRuntime({ ...f, out: other });
  assert.deepEqual(
    readFileSync(join(f.out, "runtime-package.json")),
    readFileSync(join(other, "runtime-package.json")),
  );
});

test(
  "package starts from an isolated folder without installed npm dependencies",
  { timeout: 120000 },
  async (t) => {
    // Durable SQLite fixture setup can wait for a filesystem journal commit.
    // Keep its bounded setup budget separate from the runtime behaviour budget.
    const fixtureStarted = performance.now();
    const f = fixture(t);
    packageRuntime(f);
    t.diagnostic(`Fixture and packaging: ${(performance.now() - fixtureStarted).toFixed(1)} ms`);
    await t.test("isolated runtime HTTP and shutdown", { timeout: 20000 }, async (t) => {
      const child = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import {startRuntimePackage} from './scripts/start-runtime-package.mjs';
   const app=await startRuntimePackage({root:process.cwd(),databasePath:process.argv[1],port:0});
   console.log(app.url);process.once('SIGTERM',async()=>{await app.close();});`,
          f.databasePath,
        ],
        { cwd: f.out, stdio: ["ignore", "pipe", "pipe"] },
      );
      t.after(() => {
        if (child.exitCode === null) child.kill();
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => (stderr += chunk));
      const url = await new Promise((resolve, reject) => {
        let text = "";
        child.stdout.on("data", (chunk) => {
          text += chunk;
          const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
          if (match) resolve(match[0]);
        });
        child.once("error", reject);
        child.once("exit", () => reject(Error(stderr)));
      });
      assert.equal((await fetch(url)).status, 200);
      assert.equal((await fetch(url + "/api/v1/health")).status, 200);
      const ready = await fetch(url + "/api/v1/ready");
      assert.equal(ready.status, 200);
      assert.equal(ready.headers.get("cache-control"), "no-store");
      assert.deepEqual(await ready.json(), {status:"ready", mode:"local-read-only", schema:1});
      for (const path of [
        "/runtime-package.json",
        "/package.json",
        "/scripts/start-runtime-package.mjs",
        "/private.sqlite",
      ])
        assert.equal((await fetch(url + path)).status, 404);
      const exit = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await exit;
    });
  },
);

test("missing, added or changed files block verification", (t) => {
  const f = fixture(t);
  packageRuntime(f);
  const asset = join(f.out, "database-build/assets/app-12345678.js"),
    original = readFileSync(asset);
  writeFileSync(asset, "changed");
  assert.throws(() => verifyRuntimePackage(f.out), /checksum mismatch/);
  writeFileSync(asset, original);
  rmSync(asset);
  assert.throws(() => verifyRuntimePackage(f.out), /checksum mismatch/);
  writeFileSync(asset, original);
  writeFileSync(join(f.out, ".env"), "CANARY-not-a-secret");
  assert.throws(() => verifyRuntimePackage(f.out), /unexpected file/);
});

test("unsafe build extras and symlinks are rejected before output creation", (t) => {
  const f = fixture(t);
  for (const path of [
    ".env",
    "catalogue.sqlite",
    "assets/app-12345678.js.map",
    "assets/private.json",
  ]) {
    writeFileSync(join(f.webRoot, path), "CANARY");
    assert.throws(() => packageRuntime(f), /unexpected file/);
    assert(!existsSync(f.out));
    rmSync(join(f.webRoot, path));
  }
  const external = join(f.dir, "external");
  mkdirSync(external);
  symlinkSync(
    external,
    join(f.webRoot, "assets/linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(() => packageRuntime(f), /symlink/);
  assert(!existsSync(f.out));
});

test("wrong publication and unsafe destinations fail without replacing existing output", (t) => {
  const f = fixture(t);
  packageRuntime(f);
  const receipt = readFileSync(join(f.out, "runtime-package.json"));
  assert.throws(() => packageRuntime(f), /EEXIST/);
  assert.deepEqual(receipt, readFileSync(join(f.out, "runtime-package.json")));
  assert.throws(() => packageRuntime({ ...f, out: join(f.webRoot, "new") }), /separate/);
  const manifest = JSON.parse(readFileSync(join(f.webRoot, "omnibus-release.json")));
  manifest.publication = "0".repeat(64);
  writeFileSync(join(f.webRoot, "omnibus-release.json"), JSON.stringify(manifest));
  const bad = join(f.dir, "invalid");
  assert.throws(() => packageRuntime({ ...f, out: bad }), /missing or changed publication/);
  assert(!existsSync(bad));
});

test("packaging arguments are explicit and do not accept hosting overrides", () => {
  for (const args of [
    [],
    ["--database", "x"],
    ["--out", "x", "--out", "y", "--database", "z"],
    ["--host", "0.0.0.0", "--database", "x", "--out", "y"],
  ])
    assert.throws(() => parsePackageArgs(args), /Usage/);
  assert(parsePackageArgs(["--web-root", "web", "--database", "x", "--out", "y"]).out);
});

test("ordinary local builds with personal AI configuration cannot be packaged", (t) => {
  const f = fixture(t),
    path = join(f.webRoot, "omnibus-release.json");
  const manifest = JSON.parse(readFileSync(path));
  manifest.runtimeTarget = "local-preview";
  writeFileSync(path, JSON.stringify(manifest));
  assert.throws(() => packageRuntime(f), /build identity/);
  assert(!existsSync(f.out));
});
