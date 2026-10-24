import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLocalDatabase, localDatabaseFailure } from "../content-tools/local-database.mjs";

export const localDatabaseHelp = `Usage: node scripts/build-local-database.mjs --plan <packages.json> --out <NEW-folder>

Creates a separate local review database from explicit, pinned model intakes.
Uses the existing intake, model review and release integrity checks. No dependencies beyond Node 24.21.0.
Does not execute package code, change an existing database, approve content or activate a viewer.
Report/framework packages remain HOLD until a standalone integration validator is available.
Success: catalogue.sqlite and local-database-result.json with counts, hashes and the remaining runtime HOLD.
Failure: HOLD, phase and reason; exit code 1. Never use incomplete output. Retry in a new folder.
Instructions and limits: content-tools/local-database.md
`;

export function parseLocalDatabaseArgs(args) {
  const options = {};
  if (args.length !== 4) throw Error(localDatabaseHelp);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!["--plan", "--out"].includes(key) || Object.hasOwn(options, key.slice(2)) ||
      !value?.trim() || value.startsWith("--") || value.includes("\0")) throw Error(localDatabaseHelp);
    options[key.slice(2)] = value;
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(localDatabaseHelp);
  else try { console.log(JSON.stringify(await buildLocalDatabase(parseLocalDatabaseArgs(args)), null, 2)); }
  catch (error) { console.error(JSON.stringify(localDatabaseFailure(error), null, 2)); process.exitCode = 1; }
}
