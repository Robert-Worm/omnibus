import { mkdirSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication } from "../local-data/runtime-publication.mjs";
import {
  runtimeFiles,
  fileBytes,
  inventory,
  isWebFile,
  readWebIdentity,
  verifyRuntimePackage,
} from "../local-data/runtime-package.mjs";

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
const within = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

export function parsePackageArgs(args) {
  const options = {},
    usage =
      "Usage: package:runtime -- --web-root <compiled-web> --database <private.sqlite> --out <new-folder>";
  if (args.length !== 6) throw Error(usage);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    if (
      !["--web-root", "--database", "--out"].includes(key) ||
      Object.hasOwn(options, key) ||
      !value ||
      value.startsWith("--")
    )
      throw Error(usage);
    options[key] = resolve(value);
  }
  return {
    webRoot: options["--web-root"],
    databasePath: options["--database"],
    out: options["--out"],
  };
}

/** Copy only the reviewed runtime boundary; never copy a database or node_modules. */
export function packageRuntime({ webRoot, databasePath, out }) {
  webRoot = realpathSync(webRoot);
  databasePath = realpathSync(databasePath);
  out = join(realpathSync(dirname(resolve(out))), resolve(out).split(/[\\/]/).at(-1));
  if (within(webRoot, out) || within(out, webRoot) || within(out, databasePath))
    throw Error("Output must be separate from build and database");
  // Read and validate all inputs before creating any output. Existing outputs are never replaced.
  const files = inventory(webRoot, isWebFile),
    identity = readWebIdentity(webRoot);
  if (!files["database.html"]) throw Error("Missing compiled application");
  const repository = new CatalogueRepository(databasePath, { readOnly: true });
  try {
    readRuntimePublication(repository, identity);
  } finally {
    repository.close();
  }
  const inputs = new Map(runtimeFiles.map((path) => [path, fileBytes(sourceRoot, path)]));
  for (const path of Object.keys(files))
    inputs.set("database-build/" + path, fileBytes(webRoot, path));
  inputs.set(
    "package.json",
    Buffer.from(
      JSON.stringify(
        {
          name: "omnibus-local-runtime",
          private: true,
          type: "module",
          engines: { node: "24.x" },
          scripts: { start: "node scripts/start-runtime-package.mjs" },
        },
        null,
        2,
      ) + "\n",
    ),
  );
  mkdirSync(out); // Non-recursive, exclusive creation; do not clean up or overwrite on failure.
  for (const [path, bytes] of inputs) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), bytes, { flag: "wx" });
  }
  const copied = inventory(out, (path) => inputs.has(path));
  const receipt = { schema: 1, mode: "local-read-only", nodeMajor: 24, ...identity, files: copied };
  writeFileSync(join(out, "runtime-package.json"), JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
  });
  verifyRuntimePackage(out);
  return {
    folder: out,
    files: Object.keys(copied).length + 1,
    bytes: Object.values(copied).reduce((n, f) => n + f.bytes, 0),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(packageRuntime(parsePackageArgs(process.argv.slice(2)))));
  } catch (error) {
    console.error("Runtime package was not completed: " + error.message);
    process.exitCode = 1;
  }
}
