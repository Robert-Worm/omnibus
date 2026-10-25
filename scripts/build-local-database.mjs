import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLocalDatabase, checkLocalDatabase, localDatabaseFailure } from "../content-tools/local-database.mjs";

export const localDatabaseHelp = `Usage: node scripts/build-local-database.mjs --plan <packages.json> --out <NEW-folder>
       node scripts/build-local-database.mjs --plan <packages.json> --check
       node scripts/build-local-database.mjs --plan <packages.json> --base <local-build.json> --out <NEW-folder>

Creates a separate local review database from explicit, pinned model intakes.
Uses the existing intake, model review and release integrity checks. No dependencies beyond Node 24.21.0.
An optional pinned local-owner admission is checked and retained with its evidence; it cannot override HOLD.
With --base, every package needs its own owner admission. A pinned base is read-only;
the NEW database includes the existing viewer publication plus the admitted models.
This also writes local-build.json for the existing build:runtime command. No active tool is switched.
Does not execute package code, change an existing database or grant public content approval.
Report/framework inputs check original review bindings, declared object coverage and exact source passages, then remain HOLD.
SOURCE_INTEGRATION_REQUIRED reports checked bindings/passages, NOT source-method validation or viewer admission.
Their complete standalone source validators and viewer projections are not yet available.
Without --base: catalogue.sqlite and local-database-result.json with counts, hashes and the remaining runtime HOLD.
Check only: validates selected inputs (and optional base); creates no files and checks no output folder.
A successful check is not database verification or content approval. Building always checks the current inputs again.
Failure: HOLD, phase and reason; exit code 1. Never use incomplete output. Retry in a new folder.
Instructions and limits: content-tools/local-database.md
`;

export function parseLocalDatabaseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--check") {
      if (options.checkOnly) throw Error(localDatabaseHelp);
      options.checkOnly = true;
      continue;
    }
    const value = args[++i];
    if (!["--plan", "--out", "--base"].includes(key) || Object.hasOwn(options, key.slice(2)) ||
      !value?.trim() || value.startsWith("--") || value.includes("\0")) throw Error(localDatabaseHelp);
    options[key.slice(2)] = value;
  }
  if (!options.plan || (options.checkOnly ? options.out !== undefined : !options.out)) throw Error(localDatabaseHelp);
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(localDatabaseHelp);
  else try {
    const options = parseLocalDatabaseArgs(args);
    const result = await (options.checkOnly ? checkLocalDatabase(options) : buildLocalDatabase(options));
    console.log(JSON.stringify(result, null, 2));
  }
  catch (error) { console.error(JSON.stringify(localDatabaseFailure(error), null, 2)); process.exitCode = 1; }
}
