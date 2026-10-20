import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "./identity.mjs";
import { comparePublicationInventories } from "../local-data/publication-inventory.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";
import { readDatabaseSettings } from "../scripts/database-build-options.mjs";

export const activePublicationHelp = `Usage: node content-tools/active-publication-guard.mjs --approved <approved-inventory.json> --candidate <local-build.json>
Read-only check of an explicitly pinned candidate against a separately reviewed active inventory.
Use the existing publicationInventory packages (kind,id,version) and documents (id,version) arrays.
Versions are exact 64-character lowercase SHA-256 identities; other metadata is ignored.
Missing, extra, changed or duplicate identities fail closed (HOLD, exit 1).
For intentional additions, review and include each new package AND document version in the approved inventory.
There is no built-in report list, automatic baseline, approval generator or activation.
A match only confirms inventory equality, not content approval or redistribution rights.
Runtime modules/resources/artifacts still need the existing publication comparison and review.
Keep the approved inventory and this output private, outside Git.
`;

const categories = ["packages", "documents"];
const identity = (row, category) =>
  JSON.stringify(category === "packages" ? [row.kind, row.id] : [row.id]);
const validText = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 1000 &&
  value.trim() === value &&
  !Array.from(value).some((char) => char.codePointAt(0) < 32 || char === "\u007f");

// Project the existing inventory shape, never source/review text or titles.
// Pin versions too: restoring old content under the same id must be visible.
function activeInventory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Active inventory must explicitly include packages and documents.");
  const result = { artifacts: [], modules: [], resources: [], metadata: [] };
  for (const category of categories) {
    if (!Array.isArray(value[category]))
      throw Error("Active inventory must explicitly include packages and documents.");
    result[category] = Array.from(value[category], (row) => {
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        !validText(row.id) ||
        (category === "packages" && !validText(row.kind)) ||
        typeof row.version !== "string" ||
        !/^[a-f0-9]{64}$/.test(row.version)
      )
        throw Error("Invalid active inventory identity or version in " + category + ".");
      return category === "packages"
        ? { kind: row.kind, id: row.id, version: row.version }
        : { id: row.id, version: row.version };
    }).sort((a, b) => {
      const left = identity(a, category),
        right = identity(b, category);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }
  return result;
}

/** Pure comparison for an already verified snapshot. The caller owns approval;
 * this function cannot establish who reviewed an inventory or its source rights. */
export function compareActivePublicationInventory(approved, candidate) {
  const expected = activeInventory(approved);
  const differences = comparePublicationInventories(expected, activeInventory(candidate));
  const changes = Object.fromEntries(categories.map((key) => [key, differences[key]]));
  const mismatch = Object.values(changes).some(
    ({ added, removed, changed }) => added.length || removed.length || changed.length,
  );
  return {
    status: mismatch ? "HOLD" : "ACTIVE_INVENTORY_MATCH",
    approvedInventoryHash: digest(
      Object.fromEntries(categories.map((key) => [key, expected[key]])),
    ),
    changes,
    newContentApproval: false,
    redistributionApproval: false,
    activated: false,
  };
}

/** Reuse integrity checks and inventory from the SAME read-only transaction. */
export function checkActivePublication({ approved, candidate }) {
  // Reject malformed/ambiguous approval input before opening the candidate.
  compareActivePublicationInventory(approved, approved);
  const checked = checkRuntimeDatabase(candidate, { includeInventory: true });
  return {
    ...compareActivePublicationInventory(approved, checked.inventory),
    candidate: { release: checked.release, publication: checked.publication },
  };
}

function parseArgs(args) {
  if (args.length !== 4) throw Error(activePublicationHelp);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (
      !["--approved", "--candidate"].includes(flag) ||
      Object.hasOwn(options, flag) ||
      !validText(value) ||
      value.startsWith("--")
    )
      throw Error(activePublicationHelp);
    options[flag] = value;
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(activePublicationHelp);
  else {
    try {
      const options = parseArgs(args);
      const approved = JSON.parse(
        readFileSync(options["--approved"], "utf8").replace(/^\uFEFF/, ""),
      );
      const result = checkActivePublication({
        approved,
        candidate: readDatabaseSettings(options["--candidate"]),
      });
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "HOLD") process.exitCode = 1;
    } catch {
      // JSON/parser/filesystem errors may contain private text or local paths.
      console.error(
        JSON.stringify({
          status: "HOLD",
          reason: "INVALID_INPUT_OR_RUNTIME",
          error:
            "Check explicit arguments, inventory identities/versions and candidate integrity; use --help.",
          newContentApproval: false,
          redistributionApproval: false,
          activated: false,
        }),
      );
      process.exitCode = 1;
    }
  }
}
