// Local, dependency-free stage custody. Records observed work, never approves it.
// Run only in a coordinator-owned directory, not one concurrently edited by agents.
import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rmdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { reportStages } from "./report-stages.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const isHash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === "string" && Boolean(value.trim());
const need = (ok, message) => { if (!ok) throw Error(message); };
const entries = value => { need(value && typeof value === "object" && !Array.isArray(value), "Expected an object"); return Object.entries(value); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const clock = () => new Date().toISOString();
const time = value => { need(text(value) && Number.isFinite(Date.parse(value)), "Invalid recorded time"); return Date.parse(value); };

// Evidence paths are relative to this packet. Never follow supplied symlinks,
// URLs, absolute paths, Windows device names, alternate streams or parent paths.
function parts(name) {
  need(text(name) && name.length <= 1024, "Invalid packet path");
  const result = name.split("/");
  need(result.every(part => part && part !== "." && part !== ".." &&
    Array.from(part).every(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127) &&
    !/[\\:<>"|?*]/u.test(part) && !/[. ]$/u.test(part) &&
    !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part)), "Unsafe packet path");
  return result;
}

async function storage(directory) {
  const root = resolve(directory);
  // Inspect every ancestor too, so an existing directory junction cannot redirect I/O.
  for (let path = root;; path = dirname(path)) {
    const stat = await lstat(path);
    need(stat.isDirectory() && !stat.isSymbolicLink(), "Packet directory must not use links");
    if (dirname(path) === path) break;
  }
  async function pathFor(name, createParents = false) {
    const segments = parts(name);
    let path = root;
    for (let i = 0; i < segments.length; i++) {
      path = join(path, segments[i]);
      const last = i === segments.length - 1;
      let stat;
      try { stat = await lstat(path); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        if (last) return path;
        if (!createParents) throw error;
        await mkdir(path); stat = await lstat(path);
      }
      need(!stat.isSymbolicLink() && (last ? stat.isFile() : stat.isDirectory()), "Unsupported packet entry");
    }
    return path;
  }
  async function bytes(name) {
    const path = await pathFor(name), stat = await lstat(path);
    need(stat.size <= 8 * 1024 * 1024, "Receipt JSON exceeds 8 MiB");
    return readFile(path);
  }
  async function digest(name) {
    const handle = await open(await pathFor(name), "r");
    try {
      const hash = createHash("sha256");
      for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
      return hash.digest("hex");
    } finally { await handle.close(); }
  }
  const read = async name => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await bytes(name)));
  const write = async (name, value) => {
    const handle = await open(await pathFor(name, true), "wx");
    try { await handle.writeFile(Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + "\n"); }
    finally { await handle.close(); }
    return { path: name, sha256: await digest(name) };
  };
  return { root, pathFor, bytes, digest, read, write };
}

async function pinned(io, pointer) {
  need(entries(pointer).length === 2 && text(pointer.path) && isHash(pointer.sha256), "Invalid receipt pointer");
  const bytes = await io.bytes(pointer.path);
  need(sha(bytes) === pointer.sha256, "Receipt changed");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function checkHashes(io, files, required) {
  const values = entries(files);
  need(required.every(name => Object.hasOwn(files, name)), "Required input/output missing");
  for (const [name, expected] of values)
    need(isHash(expected) && await io.digest(name) === expected, "Stage input/output changed: " + name);
}

async function release(io, options) {
  need(isHash(options.releaseSha256) && isHash(options.approvalSha256), "Externally retained release and approval hashes required");
  const binding = await io.read("RELEASE-BINDING.json");
  need(binding.kit_manifest_sha256 === options.releaseSha256 && binding.kit_approval_sha256 === options.approvalSha256,
    "Release differs from external pins");
  const manifest = await pinned(io, { path: binding.kit_manifest_path, sha256: options.releaseSha256 });
  const approval = await pinned(io, { path: binding.kit_approval_path, sha256: options.approvalSha256 });
  need(approval.decision === "APPROVE" && approval.target_manifest_sha256 === options.releaseSha256 &&
    text(manifest.author_agent) && text(approval.reviewer_agent) && manifest.author_agent !== approval.reviewer_agent,
  "Independent exact helper release approval required");
  const folder = parts(binding.kit_manifest_path).slice(0, -1);
  for (const [name, expected] of entries(manifest.files)) {
    parts(name);
    need(isHash(expected) && await io.digest([...folder, name].join("/")) === expected, "Released file changed");
  }
  for (const name of ["stage-receipts.mjs", "report-stages.mjs"])
    need(manifest.files["scripts/" + name] === sha(await readFile(new URL(name, import.meta.url))), "Executing helper is not in approved release");
  const freeze = await io.read("INPUT-FREEZE.json");
  if (freeze.preparation || options.inputFreezeSha256) {
    need(isHash(options.inputFreezeSha256) && await io.digest("INPUT-FREEZE.json") === options.inputFreezeSha256,
      "Externally retained input freeze hash required");
  }
  if (freeze.preparation) {
    need(freeze.preparation.tool === "prepare-source.py" && isHash(freeze.preparation.tool_sha256) &&
      manifest.files["scripts/prepare-source.py"] === freeze.preparation.tool_sha256, "Unapproved source preparation helper");
    const resources = freeze.preparation.resource_hashes;
    need(entries(resources).length === 5, "Incomplete source preparation resources");
    for (const name of ["contracts/CONTRACT.md", "contracts/record_contract.py", "roles/source-reader.md", "QUALITY.md", "SOURCE-OUTPUT.md"])
      need(isHash(resources[name]) && manifest.files["references/report-kit/" + name] === resources[name], "Unapproved reader instructions");
    await checkHashes(io, freeze.packet_hashes, ["source.pdf", "source.txt", "SOURCE.json"]);
  }
}

async function current(io, index, stage, seen = new Set()) {
  need(Object.hasOwn(reportStages, stage) && !seen.has(stage), "Invalid stage dependency");
  const entry = index[stage];
  need(entry?.end, "Dependency stage not complete: " + stage);
  const start = await pinned(io, entry.start), end = await pinned(io, entry.end);
  need(start.stage === stage && end.stage === stage && start.status === "STARTED" && end.status === "COMPLETE" &&
    start.revision === entry.revision && Number.isInteger(entry.revision) && entry.revision > 0 &&
    text(start.actor) && start.actor === end.actor && same(end.start, entry.start) && same(start.inputs, end.inputs) &&
    text(end.execution_observation) && time(start.started_at) <= time(end.completed_at), "Stage provenance mismatch");
  await checkHashes(io, start.inputs, [...reportStages[stage][1], "RELEASE-BINDING.json"]);
  await checkHashes(io, end.artifacts, reportStages[stage][0]);
  await dependencies(io, index, stage, start, new Set([...seen, stage]));
  return end;
}

async function dependencies(io, index, stage, start, seen = new Set()) {
  const expected = reportStages[stage][2];
  need(same(entries(start.dependencies).map(([key]) => key).sort(order), [...expected].sort(order)), "Stage dependency set differs");
  for (const dependency of expected) {
    need(same(start.dependencies[dependency], index[dependency]?.end), "Stale stage dependency");
    const end = await current(io, index, dependency, seen);
    need(time(end.completed_at) <= time(start.started_at), "Stage precedes dependency completion");
  }
}

async function readIndex(io) {
  try { return await io.read("STAGE-INDEX.json"); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
}

// Only the index moves forward. Receipts and old indexes remain write-once.
async function saveIndex(io, index) {
  try {
    const bytes = await io.bytes("STAGE-INDEX.json");
    const history = "stage-receipts/index-" + sha(bytes) + ".json";
    await io.write(history, bytes);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const pending = await io.write("stage-receipts/index-next.json", index);
  await rename(await io.pathFor(pending.path), await io.pathFor("STAGE-INDEX.json"));
}

export async function recordStage(options) {
  const { action, stage } = options;
  need(["start", "finish", "check"].includes(action) && Object.hasOwn(reportStages, stage), "Known action and stage required");
  const io = await storage(options.packet);
  const lock = join(io.root, ".stage-receipts.lock");
  await mkdir(lock); // Exclusive ownership; never take over an interrupted run automatically.
  try {
    await release(io, options);
    const index = await readIndex(io);
    entries(index);
    let pointer;
    if (action === "start") {
      need(text(options.actor), "Actual actor required");
      need(!Object.hasOwn(index, stage), "Stage already recorded; preserve it and use a new packet for a retry");
      for (const name of reportStages[stage][0]) {
        try { await lstat(await io.pathFor(name)); throw Error("Stage output already exists; do not reconstruct execution"); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      if (["source_a", "source_b"].includes(stage)) {
        try { await io.bytes("FIRST-SUBMISSIONS.json"); throw Error("First submissions already frozen"); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      const inputs = Object.fromEntries(await Promise.all([...reportStages[stage][1], "RELEASE-BINDING.json"]
        .map(async name => [name, await io.digest(name)])));
      const start = { stage, actor: options.actor, revision: 1, status: "STARTED", started_at: clock(), inputs,
        dependencies: Object.fromEntries(reportStages[stage][2].map(name => [name, index[name]?.end])) };
      await dependencies(io, index, stage, start);
      pointer = await io.write(`stage-receipts/${stage}-001-start.json`, start);
      index[stage] = { revision: 1, start: pointer };
      await saveIndex(io, index);
    } else if (action === "finish") {
      const entry = index[stage];
      need(isHash(options.startSha256) && entry?.start?.sha256 === options.startSha256, "Externally retained stage start hash required");
      need(!entry.end, "Stage already completed");
      const start = await pinned(io, entry.start);
      need(start.stage === stage && start.status === "STARTED" && start.revision === entry.revision && text(start.actor), "Stage start mismatch");
      need(text(options.observation), "Actual coordinator observation required");
      await checkHashes(io, start.inputs, [...reportStages[stage][1], "RELEASE-BINDING.json"]);
      await dependencies(io, index, stage, start);
      const artifacts = Object.fromEntries(await Promise.all(reportStages[stage][0].map(async name => [name, await io.digest(name)])));
      const completed = clock();
      need(time(start.started_at) <= time(completed), "Clock precedes stage start");
      pointer = await io.write(`stage-receipts/${stage}-001-end.json`, { stage, actor: start.actor, status: "COMPLETE",
        completed_at: completed, start: entry.start, inputs: start.inputs, artifacts, execution_observation: options.observation });
      entry.end = pointer;
      await saveIndex(io, index);
    } else {
      need(isHash(options.endSha256) && options.endSha256 === index[stage]?.end?.sha256, "Externally retained stage end hash required");
      await current(io, index, stage);
      pointer = index[stage].end;
    }
    return { status: action === "start" ? "STAGE_STARTED" : "STAGE_RECORDED_NOT_APPROVED", stage,
      receipt: pointer, publishable: false, contentValidated: false, reviewValidated: false };
  } finally { await rmdir(lock); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries(
      ["packet", "stage", "actor", "release-sha256", "approval-sha256", "input-freeze-sha256", "start-sha256", "end-sha256", "observation"].map(name => [name, { type: "string" }])) });
    need(positionals.length === 1 && text(values.packet), "Usage: node stage-receipts.mjs start|finish|check --packet <directory> --stage <name> --release-sha256 <hash> --approval-sha256 <hash>");
    const options = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    console.log(JSON.stringify(await recordStage({ ...options, action: positionals[0] }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
