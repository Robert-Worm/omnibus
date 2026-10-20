import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, readlinkSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { runtimeFiles } from "../../local-data/runtime-package.mjs";

assert.equal(process.platform, "linux", "This rehearsal requires Linux permissions and /proc");
assert.equal(process.getuid(), 1000);
assert.equal(process.getgid(), 1000);
assert.equal(Number(process.versions.node.split(".")[0]), 24);
const source = fileURLToPath(new URL("../../", import.meta.url));
const readme = readFileSync(new URL("README.md", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const command = readme.match(/<!-- first-start-command -->\s*```sh\n([\s\S]*?)\n```/)[1];
const root = mkdtempSync(join(tmpdir(), "wave7-first-start-"));
const runtime = join(root, "runtime"), data = join(root, "data");
mkdirSync(runtime); mkdirSync(data);
const canary = join(data, "existing.txt");
writeFileSync(canary, "synthetic existing data\n");
let sequence = 0;

function run(t, executable, args, env = process.env) {
  const log = join(root, `child-${++sequence}.log`);
  const fd = openSync(log, "wx", 0o600);
  const child = spawn(executable, args, { cwd: runtime, env, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  const done = new Promise((resolveResult, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolveResult({ code, signal, output: readFileSync(log, "utf8") }));
  });
  t.after(async () => {
    // Only this test's child; never terminate a process by name or port.
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await done;
  });
  return { child, done };
}

function hold(t, deadline) {
  const body = command.replace("FIXED_UTC_DEADLINE", deadline);
  // Sevalla's documented shell form; only the locally installed Node location differs.
  // The Node location is passed as data in the environment, not spliced into the command text.
  const env = { ...process.env, OMNIBUS_REHEARSAL_PATH: `${dirname(process.execPath)}:/usr/bin:/bin` };
  return run(t, "/bin/sh", ["-l", "-c", `PATH="$OMNIBUS_REHEARSAL_PATH"; export PATH; ${body}`], env);
}

function inspectHolder(child) {
  assert.equal(child.exitCode, null);
  assert.equal(child.signalCode, null);
  assert.equal(readlinkSync(`/proc/${child.pid}/exe`), process.execPath);
  const status = readFileSync(`/proc/${child.pid}/status`, "utf8");
  assert.match(status, /^Uid:\s+1000\s+1000\s+1000\s+1000$/m);
  assert.match(status, /^Gid:\s+1000\s+1000\s+1000\s+1000$/m);
  const descriptors = readdirSync(`/proc/${child.pid}/fd`)
    .map((fd) => readlinkSync(`/proc/${child.pid}/fd/${fd}`));
  assert.equal(descriptors.some((target) => target.startsWith("socket:")), false);
}

function unchanged() {
  assert.deepEqual(readdirSync(runtime), []);
  assert.deepEqual(readdirSync(data), ["existing.txt"]);
  assert.equal(readFileSync(canary, "utf8"), "synthetic existing data\n");
}

test("override fits documented API length and stays outside the runtime inventory", () => {
  assert.ok(command.replace("FIXED_UTC_DEADLINE", new Date().toISOString()).length <= 1024);
  assert.equal(runtimeFiles.some((path) => path.startsWith("hosting/first-start/")), false);
  unchanged();
});

test("unset, malformed, expired and overlong windows fail without changing data", async (t) => {
  for (const deadline of ["FIXED_UTC_DEADLINE", "invalid", new Date(Date.now() - 1000).toISOString(),
    new Date(Date.now() + 1800000).toISOString()]) {
    assert.deepEqual(await hold(t, deadline).done, { code: 64, signal: null, output: "" });
  }
  unchanged();
});

test("same fixed expiry survives a restart; holders have no sockets or file effects", async (t) => {
  const end = Date.now() + 3500, deadline = new Date(end).toISOString();
  const first = hold(t, deadline);
  await delay(250); inspectHolder(first.child);
  assert.equal(first.child.kill("SIGTERM"), true);
  assert.deepEqual(await first.done, { code: 0, signal: null, output: "" });
  const second = hold(t, deadline);
  await delay(250); inspectHolder(second.child);
  assert.deepEqual(await second.done, { code: 0, signal: null, output: "" });
  assert.ok(Date.now() >= end - 20, "holder must not expire early");
  assert.ok(Date.now() < end + 3000, "same deadline must not become a new full window");
  assert.deepEqual(await hold(t, deadline).done, { code: 64, signal: null, output: "" });
  unchanged();
});

test("exec gives the bounded holder direct TERM and INT handling", async (t) => {
  for (const signal of ["SIGTERM", "SIGINT"]) {
    const holder = hold(t, new Date(Date.now() + 10000).toISOString());
    await delay(250); inspectHolder(holder.child);
    const before = Date.now();
    assert.equal(holder.child.kill(signal), true);
    assert.deepEqual(await holder.done, { code: 0, signal: null, output: "" });
    assert.ok(Date.now() - before < 1500);
  }
  unchanged();
});

test("same-owner chmod is not a durable separation between operator and runtime", () => {
  const directory = join(root, "permission-demo"), file = join(directory, "synthetic.txt");
  mkdirSync(directory, { mode: 0o700 }); writeFileSync(file, "synthetic\n", { mode: 0o400 });
  chmodSync(directory, 0o500);
  assert.equal(statSync(file).uid, 1000);
  assert.equal(statSync(directory).uid, 1000);
  assert.equal(readFileSync(file, "utf8"), "synthetic\n");
  assert.throws(() => writeFileSync(file, "blocked\n"), { code: "EACCES" });
  assert.throws(() => unlinkSync(file), { code: "EACCES" });
  // The same unprivileged owner can reverse its own modes: this is the provider blocker.
  chmodSync(file, 0o600); chmodSync(directory, 0o700);
  writeFileSync(file, "owner can change this\n");
  assert.equal(readFileSync(file, "utf8"), "owner can change this\n");
  unchanged();
});

test("normal strict start still refuses a missing separate database without creating one", async (t) => {
  const database = join(data, "absent.sqlite");
  const result = await run(t, process.execPath, [resolve(source, "scripts/start-runtime-package.mjs"),
    "--database", database, "--release", "a".repeat(64), "--publication", "b".repeat(64),
    "--public-origin", "https://omnibus.example.invalid", "--listen-host", "127.0.0.1", "--port", "48967",
  ]).done;
  assert.equal(result.code, 1); assert.equal(result.signal, null);
  assert.match(result.output, /^Runtime start refused\./);
  assert.equal(existsSync(database), false);
  unchanged();
});
