import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, digest } from "../content-tools/identity.mjs";

export function parseSbomArgs(args) {
  if (
    args.length !== 2 ||
    args[0] !== "--out" ||
    !args[1] ||
    args[1].startsWith("--") ||
    !args[1].endsWith(".json")
  )
    throw Error("Usage: npm run release:sbom -- --out <new-file.json>");
  return resolve(args[1]);
}

/** npm owns the CycloneDX schema; we bind its full lockfile inventory to exact inputs. */
export function writeReleaseSbom(
  { root, out, npmCli = process.env.npm_execpath },
  run = execFileSync,
) {
  if (existsSync(out)) throw Error("Choose a new SBOM file; existing files are never replaced.");
  if (!npmCli || !existsSync(npmCli))
    throw Error("Run through npm run release:sbom to use the installed npm CLI.");
  const lockPath = join(root, "package-lock.json"),
    manifestPath = join(root, "package.json");
  const lockBytes = readFileSync(lockPath),
    manifestBytes = readFileSync(manifestPath);
  const lock = JSON.parse(lockBytes),
    manifest = JSON.parse(manifestBytes);
  for (const key of [
    "name",
    "version",
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "engines",
  ]) {
    if (canonical(manifest[key] ?? null) !== canonical(lock.packages?.[""]?.[key] ?? null))
      throw Error("Package manifest and lockfile disagree: " + key);
  }
  const output = run(
    process.execPath,
    [
      npmCli,
      "sbom",
      "--package-lock-only",
      "--sbom-format=cyclonedx",
      "--sbom-type=application",
      "--include=dev",
      "--include=optional",
      "--include=peer",
      "--ignore-scripts",
      "--offline",
      "--workspaces=false",
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const bom = JSON.parse(output);
  if (
    bom.bomFormat !== "CycloneDX" ||
    !bom.metadata?.component ||
    !Array.isArray(bom.components) ||
    !Array.isArray(bom.dependencies)
  )
    throw Error("npm did not return a complete CycloneDX inventory.");
  if (
    !readFileSync(lockPath).equals(lockBytes) ||
    !readFileSync(manifestPath).equals(manifestBytes)
  )
    throw Error("Build inputs changed during SBOM generation.");
  bom.metadata.properties = [
    ...(bom.metadata.properties ?? []),
    { name: "omnibus:package-lock-sha256", value: digest(lockBytes.toString("utf8")) },
    { name: "omnibus:package-json-sha256", value: digest(manifestBytes.toString("utf8")) },
    {
      name: "omnibus:scope",
      value:
        "Full npm lockfile including development and optional dependencies; not a deployed-image inventory.",
    },
  ];
  writeFileSync(out, JSON.stringify(bom, null, 2) + "\n", { flag: "wx" });
  return {
    status: "SBOM_WRITTEN",
    components: bom.components.length,
    lockfileSha256: digest(lockBytes.toString("utf8")),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(
      JSON.stringify(
        writeReleaseSbom({
          root: fileURLToPath(new URL("../", import.meta.url)),
          out: parseSbomArgs(process.argv.slice(2)),
        }),
      ),
    );
  } catch {
    // npm errors may contain local configuration; do not dump subprocess output.
    console.error(
      "SBOM not written. Check matching package files, installed npm, and a new output path.",
    );
    process.exitCode = 1;
  }
}
