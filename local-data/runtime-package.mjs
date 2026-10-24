import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";

// Explicit runtime boundary: no node_modules, publisher, tests, credentials or DB.
export const runtimeFiles = Object.freeze([
  "scripts/start-runtime-package.mjs",
  "scripts/serve-database-web.mjs",
  "scripts/database-build-options.mjs",
  "local-data/runtime-package.mjs",
  "local-data/server.mjs",
  "local-data/response-compression.mjs",
  "local-data/hosting-policy.mjs",
  "local-data/request-rate-limit.mjs",
  "local-data/static-web.mjs",
  "local-data/repository.mjs",
  "local-data/runtime-publication.mjs",
  "local-data/runtime-readiness.mjs",
  "local-data/web-resources.mjs",
  "content-tools/identity.mjs",
  "lib/runtime-contract.mjs",
  "lib/content-batch-contract.mjs",
  "lib/model-presentation.mjs",
  "lib/admitted-foundation.mjs",
  "lib/runtime-contract-identity.mjs",
  "lib/source-text-blocks.mjs",
  "lib/reader-display.mjs",
]);
const MAX_FILE_BYTES = 24 * 1024 * 1024,
  MAX_TOTAL_BYTES = 128 * 1024 * 1024,
  MAX_FILES = 256;
const fail = (message) => {
  throw Error("Invalid runtime package: " + message);
};
export const bytesHash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const isWebFile = (path) =>
  ["database.html", "omnibus-release.json"].includes(path) ||
  /^assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.(js|css|woff2)$/.test(path) ||
  /^assets\/report-content-[a-f0-9]{64}\.js\.br$/.test(path) ||
  // Vite keeps the .worker suffix in fingerprinted background entry points.
  // This is still compiled JavaScript, not an allowance for arbitrary dotfiles.
  /^assets\/[a-zA-Z0-9_-]+\.worker-[a-zA-Z0-9_-]{8,}\.js$/.test(path);

export function fileBytes(root, path) {
  if (
    !/^[a-zA-Z0-9_./-]+$/.test(path) ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    fail("file path");
  let current = root;
  for (const part of path.split("/")) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) fail("symlink");
  }
  const stat = lstatSync(current);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) fail("file type or size");
  return readFileSync(current);
}

export function inventory(root, allowed) {
  const files = {};
  let total = 0;
  function walk(dir, prefix = "") {
    if (lstatSync(dir).isSymbolicLink()) fail("symlink");
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (entry.isSymbolicLink()) fail("symlink");
      if (entry.isDirectory()) {
        if (
          ![
            "assets",
            "database-build",
            "database-build/assets",
            "scripts",
            "local-data",
            "content-tools",
            "lib",
          ].includes(path)
        )
          fail("unexpected directory");
        walk(join(dir, entry.name), path + "/");
      } else {
        if (!allowed(path)) fail("unexpected file: " + path);
        const bytes = fileBytes(root, path);
        total += bytes.length;
        if (total > MAX_TOTAL_BYTES || Object.keys(files).length >= MAX_FILES) fail("package size");
        files[path] = { bytes: bytes.length, sha256: bytesHash(bytes) };
      }
    }
  }
  walk(root);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function readWebIdentity(root) {
  const value = JSON.parse(fileBytes(root, "omnibus-release.json"));
  if (
    value.schema !== 1 ||
    value.runtimeTarget !== "portable-local" ||
    value.contract !== runtimeContractHash ||
    !/^[a-f0-9]{64}$/.test(value.release || "") ||
    !/^[a-f0-9]{64}$/.test(value.publication || "")
  )
    fail("build identity");
  return { release: value.release, publication: value.publication, contract: value.contract };
}

export function verifyRuntimePackage(root) {
  const receipt = JSON.parse(fileBytes(root, "runtime-package.json"));
  if (
    receipt.schema !== 1 ||
    receipt.mode !== "local-read-only" ||
    receipt.nodeMajor !== 24 ||
    !receipt.files ||
    Array.isArray(receipt.files) ||
    typeof receipt.files !== "object"
  )
    fail("manifest");
  const allowed = (path) =>
    runtimeFiles.includes(path) ||
    ["package.json", "runtime-package.json"].includes(path) ||
    (path.startsWith("database-build/") && isWebFile(path.slice("database-build/".length)));
  const actual = inventory(root, allowed);
  delete actual["runtime-package.json"];
  for (const path of [
    ...runtimeFiles,
    "package.json",
    "database-build/database.html",
    "database-build/omnibus-release.json",
  ])
    if (!actual[path]) fail("missing file: " + path);
  if (JSON.stringify(actual) !== JSON.stringify(receipt.files))
    fail("file inventory or checksum mismatch");
  const identity = readWebIdentity(join(root, "database-build"));
  for (const key of ["release", "publication", "contract"])
    if (receipt[key] !== identity[key]) fail("identity mismatch");
  return receipt;
}
