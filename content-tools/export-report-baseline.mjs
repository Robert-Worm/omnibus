// Owner-side, read-only export. Never activates, edits or approves a database.
import { readFileSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { readLocalRuntimeBase } from "./local-model-runtime.mjs";
import { hydratedModule } from "./local-source-runtime.mjs";
import { digest } from "../local-data/repository.mjs";
import { uniqueReportCorpus } from "../lib/report-corpus-history.mjs";
import { retiredReportIds, retiredThemeIds } from "../lib/catalogue-retirement.mjs";
import { additionalProcesses } from "../lib/additional-processes.mjs";
import { baselineRegistryCounts } from "./baseline-registry-counts.mjs";
import { taxonomySnapshot } from "../skills/omnibus-add-report/scripts/taxonomy-snapshot.mjs";

const need = (ok, message) => { if (!ok) throw Error("Baseline delivery: " + message); };
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const bytesHash = bytes => createHash("sha256").update(bytes).digest("hex");
function newDestination(out) {
  need(typeof out === "string" && out.trim(), "explicit new baseline directory required");
  const path = resolve(out);
  need(basename(path) === "baseline" && !lstatSync(path, { throwIfNoEntry: false }), "choose a NEW directory named baseline");
  for (let parent = dirname(path);; parent = dirname(parent)) {
    const stat = lstatSync(parent);
    need(stat.isDirectory() && !stat.isSymbolicLink(), "destination ancestors must not use links");
    if (parent === dirname(parent)) break;
  }
  return path;
}

export function exportReportBaseline({ settings, out }) {
  const destination = newDestination(out);
  const prepared = readLocalRuntimeBase(settings); // Same transaction, pins and source checks as local publication.
  const moduleIds = ["app/trial-corpus.json", "app/reviewed-reports.json", "app/report-additions.json"];
  const modules = moduleIds.map(id => hydratedModule(prepared, id));
  need(modules.every(data => Array.isArray(data.corpus)), "complete report modules required");
  const complete = uniqueReportCorpus(...modules.map(data => data.corpus));
  const corpus = complete.filter(row => !retiredReportIds.includes(row.framework.report.id));
  const registry = encode({ corpus });
  // Reserved sentinel enables complete identity checks without excluding a report.
  const counts = baselineRegistryCounts(registry, "\0");
  const processData = hydratedModule(prepared, "lib/process-catalogue.mjs");
  need(Array.isArray(processData.processes), "process catalogue required");
  const processes = [...processData.processes, ...additionalProcesses]
    .filter(row => !row.themeId || !retiredThemeIds.includes(row.themeId));
  const taxonomy = encode({ processes });
  taxonomySnapshot({ processes }, "baseline/taxonomy.json", bytesHash(taxonomy));
  const files = {
    "viewer/app/reviewed-reports.json": registry,
    "data-release.json": encode(prepared.bundle.manifest),
    "taxonomy.json": taxonomy,
  };
  need(files["data-release.json"].length <= 8 * 1024 * 1024 && taxonomy.length <= 8 * 1024 * 1024,
    "metadata exceeds the existing 8 MiB intake limit");
  const code = ["content-tools/export-report-baseline.mjs", "lib/additional-processes.mjs", "lib/catalogue-retirement.mjs",
    "lib/removed-report-content.mjs", "lib/report-corpus-history.mjs", "skills/omnibus-add-report/scripts/baseline-registry-counts.mjs",
    "skills/omnibus-add-report/scripts/taxonomy-snapshot.mjs"];
  const receipt = { format: "omnibus-report-baseline-delivery", schemaVersion: 1,
    status: "BASELINE_DELIVERED_NOT_APPROVED", source: prepared.pins,
    counts, registry_path: "baseline/viewer/app/reviewed-reports.json", release_path: "baseline/data-release.json", taxonomy_path: "baseline/taxonomy.json",
    files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => ["baseline/" + name, bytesHash(bytes)])),
    derivation: { report_modules: Object.fromEntries(moduleIds.map((id, i) => [id, digest(modules[i])])),
      process_module: digest(processData), excluded_report_ids: complete.filter(row => retiredReportIds.includes(row.framework.report.id)).map(row => row.framework.report.id),
      code: Object.fromEntries(code.map(name => [name, bytesHash(readFileSync(new URL("../" + name, import.meta.url)))])) },
    publishable: false, contentValidated: false, reviewValidated: false };
  // Reserve exclusively only after all checks. Partial output remains for diagnosis.
  newDestination(out); mkdirSync(destination);
  for (const [name, bytes] of Object.entries(files)) {
    const path = join(destination, name); mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes, { flag: "wx" });
  }
  const receiptBytes = encode(receipt);
  writeFileSync(join(destination, "BASELINE-DELIVERY.json"), receiptBytes, { flag: "wx" });
  return { ...receipt, receipt: { path: "baseline/BASELINE-DELIVERY.json", sha256: bytesHash(receiptBytes) } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { settings: { type: "string" }, out: { type: "string" } } });
    need(typeof values.settings === "string" && values.settings.trim(), "--settings <local-build.json> required");
    console.log(JSON.stringify(exportReportBaseline(values), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
