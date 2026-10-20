import {
  constants, copyFileSync, createReadStream, linkSync, lstatSync, mkdirSync, unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bytesHash, fileBytes, verifyRuntimePackage } from "../../local-data/runtime-package.mjs";
import { checkRuntimeDatabase } from "../../scripts/check-runtime-database.mjs";

const sidecars = ["-wal", "-shm", "-journal"];
const stat = (path) => lstatSync(path, { throwIfNoEntry: false });
const within = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\"));
};

// Local, exclusively controlled directories are a precondition, not an adversarial
// filesystem boundary. Reject links in ancestors too (including Windows junctions).
function localPath(value, type) {
  if (typeof value !== "string" || !value || /^[\\/]{2}|^[a-z]+:\/\//i.test(value) ||
      value.split(/[\\/]/).includes("..")) throw Error("Use explicit local paths without traversal.");
  const path = resolve(value), root = parse(path).root;
  let current = root;
  for (const part of ["", ...relative(root, path).split(/[\\/]/)]) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw Error("Linked paths are not accepted.");
  }
  const info = lstatSync(path);
  if (type === "directory" ? !info.isDirectory() : !info.isFile() || info.nlink !== 1)
    throw Error("Expected a directory or a single-link regular file.");
  return path;
}

function closedFile(path) {
  localPath(path, "file");
  if (sidecars.some((suffix) => stat(path + suffix))) throw Error("Closed backup required; sidecar found.");
}

async function physicalHash(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/** Local receipt rehearsal only: no transport, start, settings or trust establishment.
 * Expected pins MUST come from separately trusted operator evidence, never the inbox.
 */
export async function receiveLocalBackup({ from, packageRoot, out, backupHash, packageHash, release, publication }) {
  for (const pin of [backupHash, packageHash, release, publication])
    if (typeof pin !== "string" || !/^[a-f0-9]{64}$/.test(pin)) throw Error("Four explicit SHA-256 pins required.");
  from = localPath(from, "file");
  packageRoot = localPath(packageRoot, "directory");
  // Validate the output spelling before resolve can discard a traversal component.
  if (typeof out !== "string" || !out || /^[\\/]{2}|^[a-z]+:\/\//i.test(out) ||
      out.split(/[\\/]/).includes("..")) throw Error("Use an explicit new local output directory.");
  out = resolve(out);
  localPath(dirname(out), "directory");
  if ([packageRoot, dirname(from)].some((root) => within(root, out) || within(out, root)) ||
      within(packageRoot, from)) throw Error("Sender, receiver and runtime package must be separate.");
  if (stat(out)) throw Error("Receiver directory must be new; existing destinations are never replaced.");
  closedFile(from);

  function checkPackage() {
    localPath(packageRoot, "directory");
    const manifest = fileBytes(packageRoot, "runtime-package.json");
    if (bytesHash(manifest) !== packageHash) throw Error("Trusted package hash mismatch.");
    const identity = verifyRuntimePackage(packageRoot);
    if (identity.release !== release || identity.publication !== publication)
      throw Error("Trusted package release/publication mismatch.");
  }
  checkPackage();
  if (await physicalHash(from) !== backupHash) throw Error("Trusted backup hash mismatch.");
  closedFile(from);

  // Never copy directly to a runtime filename. On error retain the new directory
  // for private inspection; a retry requires another new directory.
  mkdirSync(out, { mode: 0o700 });
  const pending = join(out, ".catalogue.partial"), database = join(out, "catalogue.sqlite");
  copyFileSync(from, pending, constants.COPYFILE_EXCL);
  closedFile(pending);
  if (await physicalHash(pending) !== backupHash) throw Error("Received backup hash mismatch.");
  const checked = checkRuntimeDatabase({ database: pending, release, publication });
  closedFile(pending);
  closedFile(from);
  if (await physicalHash(pending) !== backupHash || await physicalHash(from) !== backupHash)
    throw Error("Backup bytes changed during receipt.");
  checkPackage();
  localPath(out, "directory");
  if ([database, ...sidecars.map((suffix) => database + suffix)].some((path) => stat(path)))
    throw Error("Existing receiver database or sidecar is never replaced.");
  // Exclusive atomic name creation: rename could overwrite an existing target on
  // POSIX. The temporary hard link is within this new directory, never to sender.
  linkSync(pending, database);
  unlinkSync(pending);
  return { ...checked, status: "VERIFIED_LOCAL_RECEIPT", backupHash, packageHash };
}

export function parseReceiveArgs(args) {
  const names = { "--from": "from", "--package": "packageRoot", "--out": "out",
    "--backup-sha256": "backupHash", "--package-sha256": "packageHash",
    "--release": "release", "--publication": "publication" };
  const options = {};
  if (args.length !== 14) throw Error("Seven explicit arguments required.");
  for (let i = 0; i < args.length; i += 2) {
    const key = Object.hasOwn(names, args[i]) ? names[args[i]] : undefined, value = args[i + 1];
    if (!key || Object.hasOwn(options, key) || !value || value.startsWith("--"))
      throw Error("Seven unique explicit arguments required.");
    options[key] = value;
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await receiveLocalBackup(parseReceiveArgs(process.argv.slice(2)))));
  } catch {
    console.error("Local receipt refused. Check trusted hashes/pins, closed backup, matching package and separate new local directory. Retain partial output privately; do not start it.");
    process.exitCode = 1;
  }
}
