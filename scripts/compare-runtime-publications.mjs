import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readDatabaseSettings } from "./database-build-options.mjs";
import { checkRuntimeDatabase } from "./check-runtime-database.mjs";
import { comparePublicationInventories } from "../local-data/publication-inventory.mjs";

export const comparisonHelp = `Usage: data:compare-runtime -- --before <current/local-build.json> --after <candidate/local-build.json> [--expect-addition <kind:id> ...]
Both publications are checked read-only against their explicit release and publication hashes.
The result lists added, removed and changed metadata; it does not include norm or source text.
Differences require review, including unexpected removals or changes to existing packages.
Optional --expect-addition requires exactly those new packages and unchanged existing packages/documents.
Repeat it for multiple additions. Missing/unexpected packages or existing content changes return HOLD (exit 1).
New documents and runtime/artifact differences still require review; this is not a complete impact approval.
This does not approve content, verify rendered viewers or activate a publication.
Keep the result local with the pilot evidence, outside Git.
`;

export function parseComparisonArgs(args) {
  if (args.length < 4 || args.length > 204 || args.length % 2) throw Error(comparisonHelp);
  const options = {};
  const expectedAdditions = [];
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (
      !["--before", "--after", "--expect-addition"].includes(flag) ||
      (flag !== "--expect-addition" && Object.hasOwn(options, flag)) ||
      !value ||
      !value.trim() ||
      value.startsWith("--") ||
      value.includes("\0")
    )
      throw Error(comparisonHelp);
    if (flag === "--expect-addition") expectedAdditions.push(value);
    else options[flag] = value;
  }
  if (!options["--before"] || !options["--after"]) throw Error(comparisonHelp);
  if (expectedAdditions.length) validateExpectedAdditions(expectedAdditions);
  return {
    before: readDatabaseSettings(options["--before"]),
    after: readDatabaseSettings(options["--after"]),
    ...(expectedAdditions.length ? { expectedAdditions } : {}),
  };
}

export function validateExpectedAdditions(expected) {
  if (
    !Array.isArray(expected) ||
    !expected.length ||
    expected.length > 100 ||
    expected.some(
      (value) =>
        typeof value !== "string" ||
        value.trim() !== value ||
        !/^[a-z][a-z0-9-]{0,63}:[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(value),
    ) ||
    new Set(expected).size !== expected.length
  )
    throw Error(
      "Expected additions must be 1–100 distinct kind:id identities; no wildcards.\n" +
        comparisonHelp,
    );
}

function checkAdditions(changes, expected) {
  const actual = changes.packages.added.map((row) => `${row.kind}:${row.id}`);
  const issues = [];
  for (const id of expected)
    if (!actual.includes(id)) issues.push({ reason: "EXPECTED_PACKAGE_NOT_ADDED", id });
  for (const id of actual)
    if (!expected.includes(id)) issues.push({ reason: "UNEXPECTED_PACKAGE_ADDED", id });
  for (const category of ["packages", "documents"])
    for (const change of ["changed", "removed"])
      for (const row of changes[category][change]) {
        const previous = change === "changed" ? row.before : row;
        issues.push({
          reason: "EXISTING_CONTENT_" + change.toUpperCase(),
          category,
          id: category === "packages" ? `${previous.kind}:${previous.id}` : previous.id,
        });
      }
  return { status: issues.length ? "MISMATCH" : "MATCH", expected: [...expected], issues };
}

export function compareRuntimePublications({ before, after, expectedAdditions }) {
  if (expectedAdditions !== undefined) validateExpectedAdditions(expectedAdditions);
  // Each inventory is obtained in the SAME read snapshot as its integrity check.
  // Explicit hashes identify both snapshots even when the files share a path.
  const previous = checkRuntimeDatabase(before, { includeInventory: true });
  const candidate = checkRuntimeDatabase(after, { includeInventory: true });
  const changes = comparePublicationInventories(previous.inventory, candidate.inventory);
  const additionCheck =
    expectedAdditions === undefined ? undefined : checkAdditions(changes, expectedAdditions);
  return {
    status: additionCheck?.status === "MISMATCH" ? "HOLD" : "RUNTIME_DIFFERENCES_REVIEW_REQUIRED",
    before: { release: previous.release, publication: previous.publication },
    after: { release: candidate.release, publication: candidate.publication },
    changes,
    ...(additionCheck ? { additionCheck } : {}),
    newContentApproval: false,
    activated: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(comparisonHelp);
  else
    try {
      const result = compareRuntimePublications(parseComparisonArgs(args));
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "HOLD") process.exitCode = 1;
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            status: "HOLD",
            newContentApproval: false,
            activated: false,
            error: error instanceof Error ? error.message : "Publication comparison failed",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
}
