import { run } from "node:test";
import { readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { canonical } from "../content-tools/identity.mjs";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["lib", "content-tools", "scripts", "local-data"];
const scriptSuites = { legacy: "test", database: "test:database", intake: "test:intake" };
const comparePaths = (a, b) => a < b ? -1 : a > b ? 1 : 0;

async function discover(directory, prefix = "") {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    // Never follow links or discover dependencies outside the checkout.
    if (entry.isDirectory() && entry.name !== "node_modules") found.push(...await discover(join(directory, entry.name), name + "/"));
    if (entry.isFile() && entry.name.endsWith(".test.mjs")) found.push(name);
  }
  return found.sort(comparePaths);
}

export async function inspectTestBaseline(root = projectRoot, suite = "legacy") {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const installedRoot = await realpath(join(root, "node_modules")).catch(() => null);
  const inventory = (await Promise.all(roots.map(async (folder) =>
    (await discover(join(root, folder))).map((file) => `${folder}/${file}`)))).flat().sort(comparePaths);
  let selected;
  if (suite === "all") selected = inventory;
  else {
    if (!Object.hasOwn(scriptSuites, suite)) throw new Error("Unknown suite; choose legacy, database, intake or all");
    const command = pkg.scripts[scriptSuites[suite]];
    if (!command?.startsWith("node --test ")) throw new Error("Expected an explicit node --test file list");
    selected = command.slice("node --test ".length).trim().split(/\s+/);
    for (const file of selected) {
      if (!inventory.includes(file)) throw new Error(`Missing or undiscovered test: ${file}`);
    }
    if (new Set(selected).size !== selected.length) throw new Error("Duplicate test in suite");
  }
  if (!selected.length) throw new Error("Empty test suite");
  const dependenciesExternal = installedRoot !== null &&
    (relative(root, installedRoot).startsWith("..") || isAbsolute(relative(root, installedRoot)));
  const mismatch = ["name", "version", "dependencies", "devDependencies", "engines"]
    .filter((key) => canonical(pkg[key] ?? null) !== canonical(lock.packages?.[""]?.[key] ?? null));
  return {
    suite, node: process.version, platform: process.platform,
    lockfileConsistent: mismatch.length === 0, lockfileMismatches: mismatch,
    dependenciesPresent: installedRoot !== null, dependenciesExternal,
    cleanInstallVerified: false,
    selected, inventory, notSelected: inventory.filter((file) => !selected.includes(file)),
  };
}

export async function collectTestResults(events) {
  const failures = [];
  const fileSummaries = [];
  let summary = null;
  for await (const event of events) {
    const d = event.data;
    if (event.type === "test:fail") failures.push({
      name: d.name, file: d.file, line: d.line, column: d.column,
      error: String(d.details?.error?.cause?.message ?? d.details?.error?.message ?? "Unknown test failure").slice(0, 1600),
      failureType: d.details?.error?.failureType,
    });
    if (event.type === "test:summary") {
      if (d.file) fileSummaries.push(d);
      else summary = d;
    }
  }
  return { summary, fileSummaries, failures };
}

async function main(args) {
  const suiteIndex = args.indexOf("--suite");
  const outIndex = args.indexOf("--out");
  const execute = args.includes("--run");
  const allowed = new Set(["--suite", "--out", "--run"]);
  const supplied = new Set();
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error(`Unknown option: ${args[i]}`);
    if (supplied.has(args[i])) throw new Error(`Duplicate option: ${args[i]}`);
    supplied.add(args[i]);
    if (args[i] !== "--run") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Missing option value");
      i++;
    }
  }
  const suite = suiteIndex < 0 ? "legacy" : args[suiteIndex + 1];
  const output = outIndex < 0 ? null : resolve(args[outIndex + 1]);
  if (execute && !output) throw new Error("--run requires --out <new-report.json>");
  if (output) {
    if (!(await stat(dirname(output))).isDirectory()) throw new Error("Output directory must exist");
    try { await stat(output); throw new Error("Output already exists; choose a new filename"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const baseline = await inspectTestBaseline(projectRoot, suite);
  const startedAt = new Date().toISOString();
  const results = execute ? await collectTestResults(run({
    files: baseline.selected.map((file) => join(projectRoot, file)),
    concurrency: 4, timeout: 120000,
  })) : null;
  // No summary, skipped/todo tests, or failures can silently produce a green gate.
  const counts = results?.summary?.counts;
  const passed = execute && results.summary?.success === true && results.failures.length === 0 &&
    counts?.tests > 0 && counts.failed === 0 && counts.cancelled === 0 && counts.skipped === 0 && counts.todo === 0;
  const report = { schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), ...baseline,
    status: !execute ? "INVENTORY_ONLY" : passed && baseline.lockfileConsistent ? "PASS_SELECTED_SUITE" : "ACTION_REQUIRED",
    results,
  };
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ ...report, selected: baseline.selected.length, inventory: baseline.inventory.length,
    notSelected: baseline.notSelected.length, results: results ? { summary: results.summary, failureCount: results.failures.length } : null,
    output,
  }, null, 2));
  if (execute && report.status !== "PASS_SELECTED_SUITE") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
