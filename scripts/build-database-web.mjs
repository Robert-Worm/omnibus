import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { buildCodeRevision } from "./build-code-revision.mjs";
import { parseDatabaseBuildArgs, readDatabaseSettings } from "./database-build-options.mjs";
import {
  compareRuntimePublications,
  validateExpectedAdditions,
} from "./compare-runtime-publications.mjs";

const usage =
  "Usage: build -- <database options> [--out <new-candidate-folder> [--compare-with <current/local-build.json> --expect-addition <kind:id> ...]]";

/** Optional candidate output belongs to the web build, never to database settings. */
export function parseWebBuildArgs(args) {
  const inputs = [];
  const expectedAdditions = [];
  let out, compareWith;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!["--out", "--compare-with", "--expect-addition"].includes(flag)) {
      inputs.push(args[i]);
      continue;
    }
    const value = args[++i];
    if (!value || value.startsWith("--") || !value.trim() || value.includes("\0"))
      throw Error(usage);
    if (flag === "--out") {
      if (out !== undefined) throw Error(usage);
      out = resolve(value);
    } else if (flag === "--compare-with") {
      if (compareWith !== undefined) throw Error(usage);
      compareWith = value;
    } else expectedAdditions.push(value);
  }
  if (
    (compareWith !== undefined || expectedAdditions.length) &&
    (out === undefined || compareWith === undefined || !expectedAdditions.length)
  )
    throw Error(usage);
  if (expectedAdditions.length) validateExpectedAdditions(expectedAdditions);
  return {
    ...parseDatabaseBuildArgs(inputs),
    ...(out === undefined ? {} : { out }),
    ...(compareWith === undefined
      ? {}
      : { comparison: { before: readDatabaseSettings(compareWith), expectedAdditions } }),
  };
}

export function buildDatabase(args, { portable = false } = {}) {
  const { release, publication, database, out, comparison } = parseWebBuildArgs(args);
  const cwd = fileURLToPath(new URL("../", import.meta.url));
  const codeRevision = buildCodeRevision(cwd, process.env.OMNIBUS_CODE_REVISION);
  if (comparison) {
    const result = compareRuntimePublications({
      ...comparison,
      after: { release, publication, database },
    });
    if (result.status === "HOLD")
      throw Error(
        "Candidate addition check: HOLD. No build started.\n" +
          JSON.stringify(result.additionCheck, null, 2),
      );
    // Print the full metadata-only difference for review; never put private
    // comparison evidence into the web-served build directory.
    console.log(JSON.stringify(result, null, 2));
  }
  // Exclusive creation: never clear a previous candidate, active build, source
  // folder or linked directory. A failed candidate remains separate for diagnosis.
  if (out !== undefined) mkdirSync(out);
  // Content approval happens during private publication, not application compilation.
  // The Vite plugin verifies its exact publication/contract and opens SQLite read-only.
  execFileSync(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build", "--config", "vite.database.config.ts"],
    {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        OMNIBUS_DATABASE_RELEASE: release,
        OMNIBUS_RUNTIME_PUBLICATION: publication,
        OMNIBUS_DATABASE_PATH: database,
        OMNIBUS_PORTABLE_RUNTIME: portable ? "1" : "0",
        OMNIBUS_BUILD_OUTPUT: out ?? "",
        OMNIBUS_CODE_REVISION: codeRevision ?? "",
      },
    },
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  buildDatabase(process.argv.slice(2));
