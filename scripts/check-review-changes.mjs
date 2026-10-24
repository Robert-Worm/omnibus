#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createReviewManifest, reviewChangeSet } from "../content-tools/review-change-set.mjs";

async function readJson(path) {
  // JSON.parse only: input paths are never imported, evaluated or traversed.
  let value;
  try { value = await readFile(path, "utf8"); }
  catch { throw new Error("Review input could not be read"); }
  try { return JSON.parse(value); }
  catch { throw new Error("Review input must be valid JSON data"); }
}

export async function runReviewChangesCommand(args) {
  if (args.length === 2 && args[0] === "--snapshot" && !args[1].startsWith("--")) {
    return createReviewManifest(await readJson(args[1]));
  }
  if (args.length === 2 && args.every((arg) => !arg.startsWith("--"))) {
    const [previous, current] = await Promise.all(args.map(readJson));
    return reviewChangeSet(previous, current);
  }
  throw new Error("Usage: node scripts/check-review-changes.mjs --snapshot <basis.json> | <previous-manifest.json> <current-basis.json>");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runReviewChangesCommand(process.argv.slice(2)), null, 2)); }
  catch (error) {
    console.error(JSON.stringify({ planningOnly: true, error: error.message }));
    process.exitCode = 1;
  }
}
