import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bytesHash, fileBytes, verifyRuntimePackage } from "../../local-data/runtime-package.mjs";

const template = new URL("./Dockerfile.template", import.meta.url);
const within = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith("..\\") && !rel.startsWith("../"));
};

export function parseContextArgs(args) {
  const options = {};
  const usage = "Usage: prepare-image-context --package <verified-runtime> --node-image <node:24.x.y-bookworm-slim@sha256:hash> --out <new-folder>";
  if (args.length !== 6) throw Error(usage);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!["--package", "--node-image", "--out"].includes(key) ||
        Object.hasOwn(options, key) || !value || value.startsWith("--")) throw Error(usage);
    options[key] = value;
  }
  return { packageRoot: options["--package"], nodeImage: options["--node-image"], out: options["--out"] };
}

/** Stage existing verified bytes only. Does not read a DB, run Docker or access a registry. */
export function prepareImageContext({ packageRoot, nodeImage, out }) {
  // Syntax pin, not proof that this digest exists, is safe, or matches its tag.
  if (typeof nodeImage !== "string" ||
      !/^node:24\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-bookworm-slim@sha256:[a-f0-9]{64}$/.test(nodeImage))
    throw Error("An explicit Node 24 patch, bookworm-slim variant and SHA-256 digest are required.");
  if (lstatSync(packageRoot).isSymbolicLink()) throw Error("Package root must not be a link.");
  packageRoot = realpathSync(packageRoot);
  out = join(realpathSync(dirname(resolve(out))), basename(resolve(out)));
  if (within(packageRoot, out) || within(out, packageRoot))
    throw Error("Image context and runtime package must be separate.");

  const receipt = verifyRuntimePackage(packageRoot);
  const inputs = new Map();
  for (const [path, expected] of Object.entries(receipt.files)) {
    const bytes = fileBytes(packageRoot, path);
    if (bytes.length !== expected.bytes || bytesHash(bytes) !== expected.sha256)
      throw Error("Runtime package changed during staging.");
    inputs.set("runtime/" + path, bytes);
  }
  const manifest = fileBytes(packageRoot, "runtime-package.json");
  if (JSON.stringify(JSON.parse(manifest)) !== JSON.stringify(receipt))
    throw Error("Runtime manifest changed during staging.");
  inputs.set("runtime/runtime-package.json", manifest);

  // Exact file exceptions only. Re-including a directory would also include its children.
  const ignore = ["**", "!Dockerfile", "!.dockerignore",
    ...[...inputs.keys()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0).map((path) => "!" + path), ""].join("\n");
  inputs.set(".dockerignore", Buffer.from(ignore));
  inputs.set("Dockerfile", Buffer.from(readFileSync(template, "utf8").replace("@NODE_IMAGE@", nodeImage)));

  // Exclusive new output; retain a partial directory after I/O failure for inspection.
  mkdirSync(out);
  for (const [path, bytes] of inputs) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), bytes, { flag: "wx" });
  }
  verifyRuntimePackage(join(out, "runtime"));
  return { status: "PREPARED_IMAGE_CONTEXT", files: inputs.size, imageBuilt: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(prepareImageContext(parseContextArgs(process.argv.slice(2)))));
  } catch {
    console.error("Image context refused. Check explicit arguments, pinned Node image, verified runtime and a separate new output folder.");
    process.exitCode = 1;
  }
}
