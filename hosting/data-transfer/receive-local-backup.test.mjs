import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { runtimeFixture } from "../../local-data/test-support/runtime-fixture.mjs";
import { runtimeContractHash } from "../../lib/runtime-contract-identity.mjs";
import { backupRuntime } from "../../local-data/runtime-backup.mjs";
import { bytesHash, verifyRuntimePackage } from "../../local-data/runtime-package.mjs";
import { packageRuntime } from "../../scripts/package-runtime.mjs";
import { checkRuntimeDatabase } from "../../scripts/check-runtime-database.mjs";
import { parseReceiveArgs, receiveLocalBackup } from "./receive-local-backup.mjs";

const hash = (path) => bytesHash(fs.readFileSync(path));
const absent = (path) => assert.equal(fs.existsSync(path), false, path);
const receiver = new URL("./receive-local-backup.mjs", import.meta.url);

async function fixture(t, { invalidUpstream = false } = {}) {
  const f = runtimeFixture(t, {
    packages: [{ id: "SYNTHETIC", kind: "framework", title: "Synthetic only", records: [
      { id: "N1", kind: "norm", title: "Test norm", status: "HOLD", data: { text: "Fixture only" } },
    ] }],
    documents: [{ id: "SYNTHETIC-DOC", pages: [{ page: 1, text: "A😀 é" }] }],
  });
  const sourceBytes = fs.readFileSync(f.databasePath);
  const sender = join(f.dir, "sender"), receiving = join(f.dir, "receiver é");
  const webRoot = join(f.dir, "synthetic-web"), packageRoot = join(f.dir, "runtime");
  for (const path of [sender, receiving, webRoot]) fs.mkdirSync(path);
  const from = join(sender, "closed-backup.sqlite");
  await backupRuntime({ from: f.databasePath, to: from, release: f.release, publication: f.publication });
  fs.writeFileSync(join(webRoot, "database.html"), "<!doctype html><title>Synthetic transfer only</title>");
  fs.writeFileSync(join(webRoot, "omnibus-release.json"), JSON.stringify({ schema: 1,
    runtimeTarget: "portable-local", release: f.release, publication: f.publication, contract: runtimeContractHash }));
  packageRuntime({ webRoot, databasePath: from, out: packageRoot });
  // An independently pinned but invalid upstream file must still fail the existing
  // content validator. Deliberately prepare it BEFORE recording expected evidence.
  if (invalidUpstream) {
    const db = new DatabaseSync(from);
    try { db.prepare("UPDATE web_resources SET payload=?").run('{"synthetic":"invalid"}'); }
    finally { db.close(); }
  }
  const trusted = Object.freeze({ release: f.release, publication: f.publication,
    backupHash: hash(from), packageHash: hash(join(packageRoot, "runtime-package.json")) });
  assert.deepEqual(fs.readFileSync(f.databasePath), sourceBytes);
  return { ...f, sender, receiving, from, packageRoot, sourceBytes, trusted,
    options: { from, packageRoot, out: join(receiving, "new-release"), ...trusted } };
}

function interceptCopy(t, action) {
  const original = fs.copyFileSync;
  t.mock.method(fs, "copyFileSync", (from, to, flags) => { original(from, to, flags); action(from, to); });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
}

test("separate receiver verifies closed backup, trusted physical/package pins and logical content without source writes", async (t) => {
  const f = await fixture(t), before = fs.readFileSync(f.from);
  const result = await receiveLocalBackup(f.options), database = join(f.options.out, "catalogue.sqlite");
  assert.equal(result.status, "VERIFIED_LOCAL_RECEIPT");
  for (const [key, value] of Object.entries(f.trusted)) assert.equal(result[key], value);
  assert.equal(result.newContentApproval, false);
  assert.equal(result.records, 1);
  assert.equal(result.sourcePages, 1);
  assert.equal(checkRuntimeDatabase({ ...f.trusted, database }).status, "VERIFIED_RUNTIME_DATABASE");
  assert.equal(verifyRuntimePackage(f.packageRoot).publication, result.publication);
  assert.deepEqual(fs.readFileSync(database), before);
  assert.deepEqual(fs.readFileSync(f.from), before);
  assert.deepEqual(fs.readFileSync(f.databasePath), f.sourceBytes);
  assert.equal(fs.lstatSync(database).nlink, 1);
  assert.deepEqual(fs.readdirSync(f.options.out), ["catalogue.sqlite"]);
  assert.deepEqual(fs.readdirSync(f.sender), ["closed-backup.sqlite"]);
  t.diagnostic("Synthetic SQLite snapshot -> separate local receiver; same physical bytes, full existing content check, no server or transport.");
});

test("wrong or absent independent pins and corrupted inbox bytes never create a receiver", async (t) => {
  const f = await fixture(t);
  for (const key of ["backupHash", "packageHash", "release", "publication"]) {
    for (const value of [undefined, "f".repeat(64)]) {
      await assert.rejects(receiveLocalBackup({ ...f.options, [key]: value }), /pins required|hash mismatch|release\/publication mismatch/);
      absent(f.options.out);
    }
  }
  const damaged = fs.readFileSync(f.from); damaged[100] ^= 1;
  fs.writeFileSync(f.from, damaged);
  await assert.rejects(receiveLocalBackup(f.options), /Trusted backup hash mismatch/);
  absent(f.options.out);
  assert.equal(f.options.backupHash, f.trusted.backupHash); // Never repair an expected pin.
});

test("package tampering and self-consistent replacement cannot replace independently trusted evidence", async (t) => {
  const f = await fixture(t), manifestPath = join(f.packageRoot, "runtime-package.json");
  const asset = join(f.packageRoot, "database-build/database.html");
  fs.writeFileSync(asset, "Synthetic changed web content");
  await assert.rejects(receiveLocalBackup(f.options), /checksum mismatch/);
  absent(f.options.out);
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.files["database-build/database.html"] = { bytes: fs.statSync(asset).size, sha256: hash(asset) };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  verifyRuntimePackage(f.packageRoot); // Internally valid is not the separately pinned package.
  await assert.rejects(receiveLocalBackup(f.options), /Trusted package hash mismatch/);
  absent(f.options.out);
});

test("independently hashed upstream content still has to pass the existing runtime validator", async (t) => {
  const f = await fixture(t, { invalidUpstream: true }), before = fs.readFileSync(f.from);
  await assert.rejects(receiveLocalBackup(f.options), /changed delivery resource/);
  absent(join(f.options.out, "catalogue.sqlite"));
  assert(fs.existsSync(join(f.options.out, ".catalogue.partial")));
  assert.deepEqual(fs.readFileSync(f.from), before);
});

test("closed-source, fresh-destination and package/webroot separation gates preserve existing files", async (t) => {
  const f = await fixture(t);
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    fs.writeFileSync(f.from + suffix, "synthetic source sidecar");
    await assert.rejects(receiveLocalBackup(f.options), /sidecar found/);
    assert.equal(fs.readFileSync(f.from + suffix, "utf8"), "synthetic source sidecar");
    absent(f.options.out);
    fs.unlinkSync(f.from + suffix);
  }
  for (const out of [f.sender, join(f.sender, "nested"), f.packageRoot,
    join(f.packageRoot, "database-build/received"), f.dir])
    await assert.rejects(receiveLocalBackup({ ...f.options, out }), /must be separate/);
  for (const [i, suffix] of ["", "-wal", "-shm", "-journal"].entries()) {
    const out = join(f.receiving, "occupied-" + i);
    fs.mkdirSync(out);
    const occupied = join(out, "catalogue.sqlite" + suffix);
    fs.writeFileSync(occupied, "synthetic existing data");
    await assert.rejects(receiveLocalBackup({ ...f.options, out }), /must be new/);
    assert.equal(fs.readFileSync(occupied, "utf8"), "synthetic existing data");
  }
  await assert.rejects(receiveLocalBackup({ ...f.options, from: f.databasePath }), /must be separate/);
});

test("junction/symlink ancestors, hard-linked sources, traversal and network-shaped paths are refused", async (t) => {
  const f = await fixture(t), alias = join(f.dir, "linked-sender");
  fs.symlinkSync(f.sender, alias, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(receiveLocalBackup({ ...f.options, from: join(alias, "closed-backup.sqlite") }), /Linked paths/);
  const receiverAlias = join(f.dir, "linked-receiver");
  fs.symlinkSync(f.receiving, receiverAlias, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(receiveLocalBackup({ ...f.options, out: join(receiverAlias, "new") }), /Linked paths/);
  const packageAlias = join(f.dir, "linked-package");
  fs.symlinkSync(f.packageRoot, packageAlias, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(receiveLocalBackup({ ...f.options, packageRoot: packageAlias }), /Linked paths/);
  const hardlink = join(f.receiving, "hardlink.sqlite");
  fs.linkSync(f.from, hardlink);
  await assert.rejects(receiveLocalBackup(f.options), /single-link/);
  fs.unlinkSync(hardlink);
  for (const out of [f.receiving + "/../receiver é/escape", "//server/share/received", "https://example.invalid/received"])
    await assert.rejects(receiveLocalBackup({ ...f.options, out }), /local output directory/);
  absent(f.options.out);
});

test("damage during copying is quarantined; late destination sidecars and files are never overwritten", async (t) => {
  const f = await fixture(t), before = fs.readFileSync(f.from);
  let mode = "damage";
  interceptCopy(t, (_from, pending) => {
    if (mode === "damage") fs.appendFileSync(pending, "synthetic corruption");
    else fs.writeFileSync(join(f.options.out, "catalogue.sqlite" + mode), "late synthetic canary");
  });
  await assert.rejects(receiveLocalBackup(f.options), /Received backup hash mismatch/);
  absent(join(f.options.out, "catalogue.sqlite"));
  for (const [i, suffix] of ["", "-wal", "-shm", "-journal"].entries()) {
    mode = suffix;
    f.options.out = join(f.receiving, "late-" + i);
    await assert.rejects(receiveLocalBackup(f.options), /never replaced/);
    assert.equal(fs.readFileSync(join(f.options.out, "catalogue.sqlite" + suffix), "utf8"), "late synthetic canary");
    if (suffix) absent(join(f.options.out, "catalogue.sqlite"));
  }
  assert.deepEqual(fs.readFileSync(f.from), before);
});

test("process interruption during copy leaves only partial bytes, never a usable runtime name or automatic retry", async (t) => {
  const f = await fixture(t), before = fs.readFileSync(f.from);
  const interrupted = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import fs from 'node:fs';
    import {syncBuiltinESMExports} from 'node:module';
    fs.copyFileSync = (from, to) => {
      fs.writeFileSync(to, fs.readFileSync(from).subarray(0, 64), {flag: 'wx'});
      process.exit(73);
    };
    syncBuiltinESMExports();
    const {receiveLocalBackup} = await import(process.argv[1]);
    await receiveLocalBackup(JSON.parse(process.argv[2]));
  `, receiver.href, JSON.stringify(f.options)], { encoding: "utf8", timeout: 20000 });
  assert.equal(interrupted.status, 73, interrupted.stderr);
  assert.deepEqual(fs.readdirSync(f.options.out), [".catalogue.partial"]);
  assert.equal(fs.statSync(join(f.options.out, ".catalogue.partial")).size, 64);
  await assert.rejects(receiveLocalBackup(f.options), /must be new/);
  absent(join(f.options.out, "catalogue.sqlite"));
  assert.deepEqual(fs.readFileSync(f.from), before);
});

test("operator CLI requires all pins, returns safe evidence and redacts failure paths", async (t) => {
  const f = await fixture(t);
  const args = ["--from", f.from, "--package", f.packageRoot, "--out", f.options.out,
    "--backup-sha256", f.trusted.backupHash, "--package-sha256", f.trusted.packageHash,
    "--release", f.release, "--publication", f.publication];
  assert.deepEqual(parseReceiveArgs(args), f.options);
  for (const invalid of [[], args.slice(2), [...args, "--extra", "x"],
    ["--out", "x", ...args.slice(2)], ["--unknown", "x", ...args.slice(2)],
    ["toString", "x", ...args.slice(2)]])
    assert.throws(() => parseReceiveArgs(invalid), /explicit arguments/);
  const passed = spawnSync(process.execPath, [fileURLToPath(receiver), ...args], { encoding: "utf8", timeout: 20000 });
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(JSON.parse(passed.stdout).status, "VERIFIED_LOCAL_RECEIPT");
  const failed = spawnSync(process.execPath, [fileURLToPath(receiver), "--from", "PRIVATE_PATH_CANARY",
    ...args.slice(2)], { encoding: "utf8", timeout: 20000 });
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, "");
  assert.match(failed.stderr, /Local receipt refused/);
  assert.doesNotMatch(failed.stderr, /PRIVATE_PATH_CANARY|at file:/);
});
