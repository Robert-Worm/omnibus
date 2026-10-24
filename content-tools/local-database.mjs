// Local, data-only staging. Passing intake/review structure is not publication approval.
import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readSync,
  realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { checkIntake, intakeLimits } from "./intake.mjs";
import { canonical } from "./identity.mjs";
import { prepareModelReview, checkModelReviews } from "./model-quality.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { verifyReleaseContent } from "../local-data/release-integrity.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { validateModelLibrary } from "../lib/model-library-validation.mjs";

export const localDatabaseLimits = Object.freeze({ packages: 64, bytes: 64 * 1024 * 1024, jsonBytes: 8 * 1024 * 1024 });
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const nonempty = value => typeof value === "string" && value.trim() && !value.includes("\0");
const fail = message => { throw Error(message); };
const requireValue = (condition, message) => { if (!condition) fail(message); };
const inside = (parent, child) => {
  const part = relative(parent, child);
  return !part || (part !== ".." && !part.startsWith(".." + sep) && !isAbsolute(part));
};

function exactKeys(value, keys, label) {
  requireValue(value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)),
  `${label}: expected fields ${keys.join(", ")}`);
}

// Read the exact checked bytes, not a later unchecked parse of the original path.
function readBytes(path, maximum, expected) {
  const before = lstatSync(path);
  requireValue(before.isFile() && !before.isSymbolicLink() && before.size > 0 && before.size <= maximum,
    `Expected a regular nonempty file within the byte limit: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    requireValue(before.dev === opened.dev && before.ino === opened.ino && before.size === opened.size,
      `File changed while opening: ${path}`);
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset);
      requireValue(count > 0, `File shrank while reading: ${path}`);
      offset += count;
    }
    const extra = readSync(fd, Buffer.alloc(1), 0, 1), after = fstatSync(fd);
    requireValue(!extra && bytes.length === after.size && bytes.length <= maximum &&
      opened.mtimeMs === after.mtimeMs && opened.ctimeMs === after.ctimeMs,
    `File changed while reading: ${path}`);
    if (expected) requireValue(sha256(bytes) === expected, `File checksum mismatch: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}

function json(bytes, label) {
  requireValue(bytes.length <= localDatabaseLimits.jsonBytes, `${label}: JSON exceeds local byte limit`);
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { fail(`${label}: valid UTF-8 JSON required`); }
}

function containedPath(root, portablePath) {
  let current = root;
  for (const part of portablePath.split("/")) {
    current = join(current, part);
    requireValue(!lstatSync(current).isSymbolicLink(), `Links are not accepted: ${portablePath}`);
  }
  requireValue(realpathSync(current) === current, `File resolves outside declared path: ${portablePath}`);
  return current;
}

function roleFile(manifest, role) {
  const files = manifest.files.filter(file => file.roles.includes(role));
  requireValue(files.length === 1, `Model package needs exactly one ${role} file; received ${files.length}`);
  return files[0];
}

function modelSnapshot(manifest, files, authorIds) {
  requireValue(manifest.package.kind === "model",
    `No standalone content/review validator for ${manifest.package.kind}. Keep this package in HOLD; use its existing integration review route.`);
  const readRole = role => {
    const file = roleFile(manifest, role);
    return json(files.get(file.id), file.path);
  };
  const model = readRole("viewer-content"), basis = readRole("review-basis"), reviews = readRole("review");
  requireValue(model?.id === manifest.package.id && model.title === manifest.package.title,
    "Model identity/title must match the intake package");
  const sources = manifest.files.filter(file => file.roles.includes("source"))
    .map(file => ({ id: file.id, sha256: file.sha256 }));
  const sorted = values => [...values].sort((a, b) => String(a?.id).localeCompare(String(b?.id)));
  requireValue(Array.isArray(basis?.sourceEvidence) && canonical(sorted(basis.sourceEvidence)) === canonical(sorted(sources)),
    "Review basis must bind every exact source file from the intake, without extra or missing sources");
  const prepared = prepareModelReview(model, { sourceEvidence: basis.sourceEvidence });
  requireValue(prepared.status === "STRUCTURAL_PASS_REVIEW_REQUIRED",
    `Model structure: ${prepared.errors.map(error => error.code + ": " + error.message).join("; ")}`);
  requireValue(canonical(prepared) === canonical(basis), "Review basis differs from the existing model check; request reviews of the exact current model");
  const checked = checkModelReviews(prepared, reviews, { authorIds });
  requireValue(checked.status === "READY_FOR_INTEGRATION_REVIEW", `Model reviews: ${checked.errors.join("; ")}`);
  // Reuse the saved-project/viewer shape check, not a second permissive model
  // schema. Keep the original bytes; compatibility is not publication approval.
  try { validateModelLibrary({ version: 1, models: [model] }); }
  catch (error) { fail(`Model viewer shape: ${error.message}`); }
  const documents = manifest.files.filter(file => file.roles.includes("source-text")).map(file => {
    requireValue(file.path.toLowerCase().endsWith(".txt"), "Local model source-text must be a UTF-8 .txt file; preserve other originals as source/supporting files");
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(files.get(file.id)); }
    catch { fail(`Source text must be UTF-8: ${file.path}`); }
    requireValue(text.trim(), `Source text is empty: ${file.path}`);
    // A text-file page is explicitly not an inferred PDF page or passage anchor.
    return { id: `${manifest.package.id}/${file.id}`, title: file.path, sourceFileSha256: file.sha256,
      pageNumbering: "text-file", pages: [{ page: 1, text }] };
  });
  return { model, documents, review: checked, targets: prepared.targets.length };
}

async function readPackage(entry, planRoot, budget) {
  exactKeys(entry, ["intake", "sha256", "authorIds"], "package plan");
  requireValue(nonempty(entry.intake) && hash(entry.sha256), "Each package needs an intake path and independently retained SHA256");
  requireValue(Array.isArray(entry.authorIds) && entry.authorIds.length > 0 &&
    entry.authorIds.every(id => nonempty(id) && id.length <= 200) && new Set(entry.authorIds).size === entry.authorIds.length,
  "Supply the actual distinct authorIds; do not infer them from review receipts");
  const intakePath = resolve(planRoot, entry.intake), root = realpathSync(dirname(intakePath));
  const checked = await checkIntake(intakePath, { expectedSha256: entry.sha256 });
  requireValue(budget.bytes + checked.bytes <= localDatabaseLimits.bytes, "Selected packages exceed the local 64 MiB byte limit");
  const intakeBytes = readBytes(intakePath, intakeLimits.manifestBytes, entry.sha256);
  budget.bytes += checked.bytes + intakeBytes.length;
  requireValue(budget.bytes <= localDatabaseLimits.bytes, "Selected packages and manifests exceed the local 64 MiB byte limit");
  const manifest = json(intakeBytes, "intake"), files = new Map();
  for (const file of manifest.files) {
    const bytes = readBytes(containedPath(root, file.path), file.bytes, file.sha256);
    requireValue(bytes.length === file.bytes, `File byte count changed: ${file.path}`);
    files.set(file.id, bytes);
  }
  const snapshot = modelSnapshot(manifest, files, entry.authorIds);
  return { ...snapshot, manifest, files, intakeBytes, root, checked, authorIds: entry.authorIds };
}

function outputPath(out, roots) {
  requireValue(nonempty(out), "Choose an explicit new output folder");
  const target = resolve(out);
  requireValue(!lstatSync(target, { throwIfNoEntry: false }), "Output already exists; choose a NEW folder. Existing databases are never opened for writing.");
  const physical = join(realpathSync(dirname(target)), basename(target));
  requireValue(!roots.some(root => inside(root, physical)), "Output must be outside every input package folder");
  return physical;
}

function verifyDatabase(database, release) {
  const repository = new CatalogueRepository(database, { readOnly: true });
  try {
    repository.db.exec("BEGIN");
    requireValue(repository.integrity().every(row => row.integrity_check === "ok"), "Database integrity check failed");
    requireValue(!repository.db.prepare("PRAGMA foreign_key_check").all().length, "Database contains broken references");
    const totals = verifyReleaseContent(repository, release);
    requireValue(!repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(),
      "A local review database must not contain a runtime publication");
    return totals;
  } finally { repository.close(); }
}

// Both modes read and validate the current input bytes. A check result is never
// accepted as input, a cached snapshot or permission to skip a later check.
async function runLocalDatabase({ plan, out }, checkOnly) {
  let phase = "INPUT_CHECK";
  try {
    const planPath = resolve(plan), planBytes = readBytes(planPath, intakeLimits.manifestBytes);
    const input = json(planBytes, "local database plan");
    exactKeys(input, ["format", "schemaVersion", "packages"], "local database plan");
    requireValue(input.format === "omnibus-local-database" && input.schemaVersion === 1, "Unsupported local database plan");
    requireValue(Array.isArray(input.packages) && input.packages.length > 0 && input.packages.length <= localDatabaseLimits.packages,
      "Select 1 to 64 explicit packages");
    if (!checkOnly) outputPath(out, []);
    const snapshots = [], ids = new Set(), budget = { bytes: 0 };
    for (const [index, entry] of input.packages.entries()) {
      phase = `PACKAGE_CHECK[${index + 1}]`;
      const snapshot = await readPackage(entry, dirname(planPath), budget), id = snapshot.manifest.package.id;
      requireValue(!ids.has(id.toLowerCase()), `Duplicate package identity: ${id}`);
      ids.add(id.toLowerCase()); snapshots.push(snapshot);
    }
    const checkedInputs = { planSha256: sha256(planBytes),
      inputBytes: budget.bytes, inputFiles: snapshots.reduce((sum, item) => sum + item.checked.files, 0),
      reviewTargets: snapshots.reduce((sum, item) => sum + item.targets, 0),
      packagesChecked: snapshots.map(item => ({ ...item.manifest.package, manifestSha256: item.checked.manifestSha256,
        reviewStatus: item.review.status })),
      reviewStructureValidated: true, viewerShapeValidated: true,
      contentValidated: false, reviewValidated: false, newContentApproval: false, publishable: false,
      runtime: { status: "HOLD", code: "INTEGRATION_REVIEW_REQUIRED", contract: runtimeContractHash, publication: null,
        reason: "Standalone model checks validate review structure, not source reading, reviewer identities or application integration. No runtime publication or local-build.json was created." } };
    if (checkOnly) return { status: "LOCAL_PACKAGES_CHECKED_REVIEW_REQUIRED", ...checkedInputs,
      packages: snapshots.length, sourceTexts: snapshots.reduce((sum, item) => sum + item.documents.length, 0) };
    phase = "DATABASE_WRITE";
    const destination = outputPath(out, snapshots.map(snapshot => snapshot.root));
    const bundle = { manifest: { format: "omnibus-local-review-database", schemaVersion: 1,
      contentGate: "INTEGRATION_REVIEW_REQUIRED", planSha256: sha256(planBytes), runtimeContract: runtimeContractHash },
    packages: [], documents: [], artifacts: [] };
    for (const snapshot of snapshots) {
      const { manifest, files, model, documents, review, checked, authorIds, intakeBytes } = snapshot;
      const id = manifest.package.id;
      bundle.packages.push({ id, kind: "model", title: model.title, intakeVersion: manifest.package.version,
        intakeSha256: checked.manifestSha256, reviewStatus: review.status,
        records: [{ id, kind: "model", title: model.title, status: "HOLD", data: model }] });
      bundle.documents.push(...documents);
      bundle.artifacts.push({ name: `${id}/intake`, data: { encoding: "base64", sha256: checked.manifestSha256,
        bytes: intakeBytes.length, content: intakeBytes.toString("base64") } });
      bundle.artifacts.push({ name: `${id}/review-check`, data: { authorIds, ...review, newContentApproval: false } });
      for (const file of manifest.files) bundle.artifacts.push({ name: `${id}/files/${file.id}`,
        data: { ...file, encoding: "base64", content: files.get(file.id).toString("base64") } });
    }
    mkdirSync(destination); // Exclusive reservation; never reuse a destination, even after failure.
    const database = join(destination, "catalogue.sqlite");
    writeFileSync(database, Buffer.alloc(0), { flag: "wx" });
    const repository = new CatalogueRepository(database);
    let release;
    try { release = repository.importRelease(bundle); } finally { repository.close(); }
    phase = "FINAL_VERIFICATION";
    const totals = verifyDatabase(database, release);
    const result = { status: "LOCAL_CATALOGUE_CREATED_REVIEW_REQUIRED", database, release,
      databaseSha256: sha256(readFileSync(database)), ...totals, ...checkedInputs };
    writeFileSync(join(destination, "local-database-result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    return result;
  } catch (error) {
    throw new Error(`${phase}: ${error instanceof Error ? error.message : "Unknown local database failure"}`, { cause: error });
  }
}

/** Check the selected inputs without creating any files or opening a database. */
export async function checkLocalDatabase({ plan }) {
  return runLocalDatabase({ plan }, true);
}

/** Build a NEW review database. No package code, private authoring imports or activation. */
export async function buildLocalDatabase({ plan, out }) {
  return runLocalDatabase({ plan, out }, false);
}

export function localDatabaseFailure(error) {
  return { status: "HOLD", publishable: false, newContentApproval: false,
    error: error instanceof Error ? error.message : "Local database build failed",
    action: "Restore the exact source/review files and trusted intake hash, or request a corrected version with matching reviews. Never change HOLD or rehash rejected evidence to pass. Keep incomplete output separate and retry with a new output folder.",
    documentation: "content-tools/local-database.md" };
}
