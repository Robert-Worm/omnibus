import { posix } from "node:path";

export const localBaselineArchiveBytes = 128 * 1024 * 1024;
const need = (ok, message) => { if (!ok) throw Error("Local evidence budget: " + message); };

// Only frozen report-baseline attachments get a separate archive budget. They
// remain exact intake members and must pass the full receipt/method checks later.
// No source, authoring, review or viewer payload is exempt from the normal budget.
export function baselineArchiveIds(manifest, proof, readCheckedJson) {
  const result = new Set();
  if (manifest.package.kind !== "report" || !proof) return result;
  const basis = manifest.files.filter(file => file.roles.includes("review-basis"));
  need(basis.length === 1, "missing original review basis");
  const directory = posix.dirname(basis[0].path), prefix = directory === "." ? "" : directory + "/";
  const freezeFile = manifest.files.find(file => file.path === prefix + "BASELINE-FREEZE.json");
  need(freezeFile, "missing frozen baseline");
  const freeze = readCheckedJson(freezeFile);
  need(freeze.files && typeof freeze.files === "object" && !Array.isArray(freeze.files), "missing frozen members");
  need(Array.isArray(proof.paths), "missing explicit historical mapping");
  const mapped = new Map(proof.paths.map(entry => [entry.original?.replaceAll("\\", "/"), entry.fileId]));
  for (const [original, expected] of Object.entries(freeze.files)) {
    const name = original.replaceAll("\\", "/");
    const relative = !name.startsWith("/") && !name.includes(":") && name.split("/").every(p => p && p !== "." && p !== "..");
    const file = relative ? manifest.files.find(file => file.path === prefix + name) :
      manifest.files.find(file => file.id === mapped.get(name));
    need(file && /^[a-f0-9]{64}$/.test(expected) && file.sha256 === expected, "baseline differs from checked intake");
    if (file.roles.length === 1 && file.roles[0] === "supporting") result.add(file.id);
  }
  return result;
}

export function reserveLocalPackageBytes(budget, manifest, archiveIds, manifestBytes, coreLimit) {
  const archiveBytes = manifest.files.filter(file => archiveIds.has(file.id)).reduce((n, file) => n + file.bytes, 0);
  const coreBytes = manifest.files.filter(file => !archiveIds.has(file.id)).reduce((n, file) => n + file.bytes, manifestBytes);
  need(budget.archiveBytes + archiveBytes <= localBaselineArchiveBytes, "frozen baseline archives exceed 128 MiB");
  need(budget.bytes + coreBytes <= coreLimit, "selected packages and manifests exceed the local 64 MiB byte limit");
  budget.bytes += coreBytes; budget.archiveBytes += archiveBytes;
}
