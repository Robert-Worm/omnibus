import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

/**
 * @typedef {'report' | 'framework' | 'model'} ContentKind
 * @typedef {{id: string, kind: ContentKind, version: string, title: string}} IntakePackage
 * @typedef {{id: string, path: string, sha256: string, bytes: number, roles: string[]}} IntakeFile
 * @typedef {{format: 'omnibus-intake', schemaVersion: 1, package: IntakePackage, contract: string, files: IntakeFile[]}} IntakeManifest
 * @typedef {{code: 'INTAKE_FIELDS' | 'INTAKE_OBJECT' | 'INTAKE_FILE_MISSING', location: string, expectedFields?: string[], missingFields?: string[], unexpectedFieldCount?: number, file?: {id: string, path: string}}} IntakeDiagnostic
 */

// A transport envelope around the existing contracts, not a new extraction schema.
export const intakeContracts = Object.freeze({
  report: "report-kit-1.1",
  framework: "framework-cio-0.1+addendum-01",
  model: "model-review-1",
});
const commonRoles = ["contract", "source", "source-text", "limitations", "review-basis", "review"];
const requiredRoles = {
  report: [...commonRoles, "source-bank", "viewer-content", "catalogue", "source-links", "context", "receipt"],
  framework: [...commonRoles, "source-bank", "catalogue", "source-links", "context", "migration"],
  model: [...commonRoles, "viewer-content", "context"],
};
const roles = new Set([...Object.values(requiredRoles).flat(), "supporting"]);
export const intakeLimits = Object.freeze({
  manifestBytes: 1024 * 1024,
  files: 256,
  fileBytes: 256 * 1024 * 1024,
  totalBytes: 512 * 1024 * 1024,
});
// Local opt-in for complete frozen report archives, not a general upload limit.
// Keep the memory/byte budget unchanged; do not split a single review basis.
export const historicalReportIntakeLimits = Object.freeze({ ...intakeLimits, files: 1024 });
const shaPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const reserved = /^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i;

// Keep the original Error (including Node error codes) and legacy CLI fields.
// Only diagnostics created here may enter the optional operator feedback.
/** @type {WeakMap<Error, IntakeDiagnostic>} */
const diagnostics = new WeakMap();

/** @param {unknown} condition @param {string} message @param {IntakeDiagnostic} [diagnostic] @returns {asserts condition} */
function requireValue(condition, message, diagnostic) {
  if (!condition) {
    const error = new Error(message);
    if (diagnostic) diagnostics.set(error, diagnostic);
    throw error;
  }
}

/** @param {unknown} error @param {'prepare' | 'check'} phase @param {boolean} [historicalReport] */
export function intakeFailure(error, phase, historicalReport = false) {
  const diagnostic = error instanceof Error ? diagnostics.get(error) : undefined;
  const preparing = phase === "prepare";
  const nextCommand = (preparing
    ? "npm run content:prepare -- <package-dir>/plan.json --output <package-dir>/intake.json"
    : "npm run content:intake -- <package-dir>/intake.json --expect-sha256 <retained-manifest-sha256>") +
    (historicalReport ? " --historical-report" : "");
  const action = diagnostic?.code === "INTAKE_FILE_MISSING"
    ? (preparing
      ? "Supply the original file at the declared package-relative path, or correct the plan path before preparation. Keep required evidence and frozen contents unchanged."
      : "Restore the missing file from the original handoff at the declared path, or request a complete transfer. Do not edit intake.json, regenerate checksums or remove required evidence.")
    : (preparing
      ? "Correct the listed plan fields using the declared contract and actual files. Keep frozen evidence unchanged; a content revision requires a new package version, directory and matching reviews."
      : "Request a corrected transfer from the sender; do not edit the received intake.json or recalculate its checksums. Keep the original package and verify the corrected transfer against its independently retained manifest hash.");
  return {
    status: "HOLD",
    publishable: false,
    error: error instanceof Error ? error.message : (preparing ? "Intake preparation failed" : "Intake verification failed"),
    ...(diagnostic ? { diagnostic: { ...diagnostic, action, nextCommand, documentation: "docs/beheer/pakket-controleren.md#hold-herstellen" } } : {}),
  };
}

/**
 * @template {string} K
 * @param {unknown} value
 * @param {K[]} keys
 * @param {string} label
 * @param {string} [location]
 * @returns {asserts value is Record<K, unknown>}
 */
function exactKeys(value, keys, label, location = label) {
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${label}: object required`,
    { code: "INTAKE_OBJECT", location, expectedFields: keys });
  const missingFields = keys.filter((key) => !Object.hasOwn(value, key));
  // Never echo arbitrary incoming field names or values in the new diagnostic.
  const unexpectedFieldCount = Object.keys(value).filter((key) => !keys.some((expected) => expected === key)).length;
  requireValue(Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)),
    `${label}: expected fields ${keys.join(", ")}`,
    { code: "INTAKE_FIELDS", location, expectedFields: keys, missingFields, unexpectedFieldCount });
}

/** @param {unknown} value @returns {value is ContentKind} */
function isContentKind(value) {
  return typeof value === "string" && Object.hasOwn(intakeContracts, value);
}

/** @param {unknown} manifest @param {{historicalReport?: boolean}} options */
export function validateIntakeManifest(manifest, { historicalReport = false } = {}) {
  requireValue(typeof historicalReport === "boolean", "Invalid historical report option");
  exactKeys(manifest, ["format", "schemaVersion", "package", "contract", "files"], "manifest", "$");
  requireValue(manifest.format === "omnibus-intake" && manifest.schemaVersion === 1, "Unsupported intake format/version");
  exactKeys(manifest.package, ["id", "kind", "version", "title"], "package");
  const { id, kind, version, title } = manifest.package;
  requireValue(typeof id === "string" && idPattern.test(id), "Invalid package id");
  requireValue(isContentKind(kind), "Unsupported content kind");
  requireValue(!historicalReport || kind === "report", "Historical archive intake is restricted to reports");
  const limits = historicalReport ? historicalReportIntakeLimits : intakeLimits;
  requireValue(typeof version === "string" && idPattern.test(version), "Invalid package version");
  requireValue(typeof title === "string" && title.trim().length > 0 && title.length <= 500, "Invalid package title");
  requireValue(manifest.contract === intakeContracts[kind], "Contract does not match content kind");
  requireValue(Array.isArray(manifest.files), "Invalid file list: expected an array");
  requireValue(manifest.files.length > 0 && manifest.files.length <= limits.files,
    `Invalid file count: received ${manifest.files.length}; allowed 1 to ${limits.files}`);
  const ids = new Set();
  const paths = new Set();
  const presentRoles = new Set();
  let totalBytes = 0;
  for (const [index, entry] of manifest.files.entries()) {
    /** @type {unknown} */
    const file = entry;
    exactKeys(file, ["id", "path", "sha256", "bytes", "roles"], "file", `files[${index}]`);
    requireValue(typeof file.id === "string" && idPattern.test(file.id) && !ids.has(file.id.toLowerCase()), "Invalid or duplicate file id");
    ids.add(file.id.toLowerCase());
    requireValue(typeof file.path === "string" && file.path.length <= 240 && file.path.length > 0, "Invalid file path");
    const segments = file.path.split("/");
    requireValue(segments.every((part) => part && part !== "." && part !== ".." &&
      Array.from(part).every((char) => (char.codePointAt(0) ?? 0) >= 32 && char.codePointAt(0) !== 127) &&
      !/[\\:<>"|?*]/.test(part) && !/[. ]$/.test(part) && !reserved.test(part)),
    `Unsafe or nonportable file path: ${file.path}`);
    const key = file.path.normalize("NFC").toLowerCase();
    requireValue(!paths.has(key), `Duplicate file path: ${file.path}`);
    paths.add(key);
    requireValue(typeof file.sha256 === "string" && shaPattern.test(file.sha256), `Invalid SHA256: ${file.id}`);
    requireValue(typeof file.bytes === "number" && Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= intakeLimits.fileBytes, `Invalid byte count: ${file.id}`);
    totalBytes += file.bytes;
    requireValue(totalBytes <= intakeLimits.totalBytes, "Package exceeds intake size limit");
    requireValue(Array.isArray(file.roles) && file.roles.length > 0 && new Set(file.roles).size === file.roles.length &&
      file.roles.every((role) => roles.has(role)), `Invalid file roles: ${file.id}`);
    file.roles.forEach((role) => presentRoles.add(role));
  }
  const missing = requiredRoles[kind].filter((role) => !presentRoles.has(role));
  requireValue(!missing.length, `Missing file roles: ${missing.join(", ")}`);
  return { files: manifest.files.length, bytes: totalBytes };
}

/** @param {string} path @param {number} maximum */
async function regularFile(path, maximum) {
  const stat = await lstat(path);
  requireValue(!stat.isSymbolicLink() && stat.isFile(), `Expected a regular file, not a link: ${path}`);
  requireValue(stat.size > 0 && stat.size <= maximum, `File size out of bounds: ${path}`);
  return stat;
}

/** @param {string} root @param {IntakeFile} file @param {number} index */
async function containedFile(root, file, index) {
  const relative = file.path;
  const parts = relative.split("/");
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    const stat = await lstat(current).catch((error) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        diagnostics.set(error, { code: "INTAKE_FILE_MISSING", location: `files[${index}].path`, file: { id: file.id, path: relative } });
      }
      throw error;
    });
    requireValue(!stat.isSymbolicLink(), `Links are not accepted: ${relative}`);
    if (i < parts.length - 1) requireValue(stat.isDirectory(), `Expected directory: ${relative}`);
  }
  const actual = await realpath(current);
  requireValue(actual === join(root, ...parts), `File resolves outside declared path: ${relative}`);
  return current;
}

/** @param {string} path @param {number} maximum @param {{collect?: boolean}} options */
export async function readVerifiedFile(path, maximum, { collect = false } = {}) {
  const before = await regularFile(path, maximum);
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = await handle.stat();
    requireValue(opened.isFile() && before.dev === opened.dev && before.ino === opened.ino && before.size === opened.size,
      `File changed while opening: ${path}`);
    const hash = createHash("sha256");
    const chunks = [];
    const buffer = Buffer.alloc(Math.min(maximum, 1024 * 1024));
    let bytes = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      bytes += bytesRead;
      requireValue(bytes <= maximum, `File grew beyond size limit: ${path}`);
      hash.update(buffer.subarray(0, bytesRead));
      if (collect) chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    const after = await handle.stat();
    requireValue(opened.size === bytes && opened.mtimeMs === after.mtimeMs && opened.ctimeMs === after.ctimeMs,
      `File changed while reading: ${path}`);
    return { sha256: hash.digest("hex"), bytes, ...(collect ? { data: Buffer.concat(chunks) } : {}) };
  } finally {
    await handle.close();
  }
}

/**
 * Read-only integrity check. Never executes a package, imports it, or approves it.
 * @param {string} manifestPath
 * @param {{expectedSha256?: string, historicalReport?: boolean}} options
 */
async function inspectIntake(manifestPath, { expectedSha256, historicalReport = false } = {}, collect = false) {
  requireValue(typeof historicalReport === "boolean", "Invalid historical report option");
  requireValue(!historicalReport || expectedSha256 !== undefined,
    "Historical report intake requires an independently retained manifest SHA256");
  if (expectedSha256 !== undefined) requireValue(typeof expectedSha256 === "string" && shaPattern.test(expectedSha256), "Invalid trusted manifest SHA256");
  const absolute = resolve(manifestPath);
  const directory = dirname(absolute);
  requireValue(!(await lstat(directory)).isSymbolicLink(), "Package root must not be a link");
  const root = await realpath(directory);
  const manifestFile = await readVerifiedFile(absolute, intakeLimits.manifestBytes, { collect: true });
  if (expectedSha256 !== undefined) requireValue(manifestFile.sha256 === expectedSha256, "Trusted manifest SHA256 mismatch");
  /** @type {unknown} */
  const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestFile.data));
  const totals = validateIntakeManifest(input, { historicalReport });
  // Only the validated envelope crosses the unknown-data boundary.
  const manifest = /** @type {IntakeManifest} */ (input);
  const canonicalManifest = await realpath(absolute);
  const files = new Map();
  for (const [index, file] of manifest.files.entries()) {
    const path = await containedFile(root, file, index);
    requireValue(path !== canonicalManifest, "Manifest cannot reference itself");
    const actual = await readVerifiedFile(path, file.bytes, { collect });
    requireValue(actual.bytes === file.bytes && actual.sha256 === file.sha256, `File checksum/size mismatch: ${file.path}`);
    if (collect) files.set(file.id, actual.data);
  }
  const check = {
    status: "FILES_VERIFIED_REVIEW_REQUIRED",
    package: manifest.package,
    contract: manifest.contract,
    manifestSha256: manifestFile.sha256,
    trustedManifestMatched: expectedSha256 !== undefined,
    ...(historicalReport ? { profile: "historical-report" } : {}),
    ...totals,
    contentValidated: false,
    reviewValidated: false,
    publishable: false,
  };
  return { check, manifest, files };
}

/** @param {string} manifestPath @param {{expectedSha256?: string, historicalReport?: boolean}} options */
export async function checkIntake(manifestPath, options = {}) {
  return (await inspectIntake(manifestPath, options)).check;
}

// Same bounded, link-free read as transport verification, retaining those exact
// bytes for substantive checks rather than reopening supplied package paths.
/** @param {string} manifestPath @param {{expectedSha256: string}} options */
export async function readIntakeSnapshot(manifestPath, options) {
  requireValue(typeof options?.expectedSha256 === "string" && shaPattern.test(options.expectedSha256), "Independent intake SHA256 required");
  return inspectIntake(manifestPath, options, true);
}

/**
 * Prepare a NEW envelope from an explicit file/role plan, never refresh a receipt.
 * @param {string} planPath
 * @param {string} outputPath
 * @param {{historicalReport?: boolean}} options
 */
export async function prepareIntake(planPath, outputPath, { historicalReport = false } = {}) {
  requireValue(typeof historicalReport === "boolean", "Invalid historical report option");
  const absolute = resolve(planPath), output = resolve(outputPath);
  const directory = dirname(absolute);
  requireValue(!(await lstat(directory)).isSymbolicLink(), "Package root must not be a link");
  const root = await realpath(directory);
  requireValue(dirname(output) === directory && basename(output) === "intake.json",
    "Output must be a new intake.json next to the plan");
  const planFile = await readVerifiedFile(absolute, intakeLimits.manifestBytes, { collect: true });
  /** @type {unknown} */
  const plan = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(planFile.data));
  exactKeys(plan, ["format", "schemaVersion", "package", "contract", "files"], "plan", "$");
  requireValue(plan.format === "omnibus-intake-plan" && plan.schemaVersion === 1, "Unsupported intake plan format/version");
  requireValue(Array.isArray(plan.files), "Invalid file list");
  // Reuse the envelope's contract, role and portable-path checks before reading
  // any payload. Placeholders are replaced with observed bytes, never written.
  const input = { ...plan, format: "omnibus-intake",
    files: plan.files.map((/** @type {unknown} */ file, index) => {
      exactKeys(file, ["id", "path", "roles"], "planned file", `files[${index}]`);
      return { ...file, sha256: "0".repeat(64), bytes: 1 };
    }) };
  validateIntakeManifest(input, { historicalReport });
  const manifest = /** @type {IntakeManifest} */ (input);
  const canonicalPlan = await realpath(absolute);
  const canonicalOutput = join(root, "intake.json");
  let totalBytes = 0;
  for (const [index, file] of manifest.files.entries()) {
    requireValue(join(root, file.path).toLowerCase() !== canonicalOutput.toLowerCase(),
      "Output cannot be a planned payload");
    const path = await containedFile(root, file, index);
    requireValue(path !== canonicalPlan, "Plan cannot reference itself");
    const actual = await readVerifiedFile(path, Math.min(intakeLimits.fileBytes, intakeLimits.totalBytes - totalBytes));
    file.sha256 = actual.sha256;
    file.bytes = actual.bytes;
    totalBytes += actual.bytes;
  }
  const totals = validateIntakeManifest(manifest, { historicalReport });
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  requireValue(bytes.length <= intakeLimits.manifestBytes, "Manifest exceeds size limit");
  // Exclusive creation refuses existing receipts, symlinks and hardlinks alike.
  // A write failure can leave an incomplete new envelope; it is never accepted
  // as a receipt without the separate checkIntake verification.
  const handle = await open(output, "wx", 0o600);
  try { await handle.writeFile(bytes); } finally { await handle.close(); }
  return {
    status: "MANIFEST_PREPARED_VERIFICATION_REQUIRED",
    manifestPath: output,
    manifestSha256: createHash("sha256").update(bytes).digest("hex"),
    ...(historicalReport ? { profile: "historical-report" } : {}),
    ...totals,
    contentValidated: false,
    reviewValidated: false,
    publishable: false,
  };
}
