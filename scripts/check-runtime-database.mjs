import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDatabaseBuildArgs } from "./database-build-options.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import {
  readRuntimePublication,
  validateRuntimeModules,
} from "../local-data/runtime-publication.mjs";
import { runtimeContract } from "../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { verifyReleaseContent } from "../local-data/release-integrity.mjs";
import { publicationInventory } from "../local-data/publication-inventory.mjs";

/** Preflight for a received publication; no server, source imports or database writes. */
export function checkRuntimeDatabase(
  { database, release, publication },
  { includeInventory = false, includeReportMetadata = false, includePackageMetadata = false } = {},
) {
  const repository = new CatalogueRepository(database, { readOnly: true });
  try {
    // The acceptance check sees one SQLite snapshot, even if another connection writes.
    // Closing the read-only connection releases this transaction without changing data.
    repository.db.exec("BEGIN");
    if (!repository.integrity().every((row) => row.integrity_check === "ok"))
      throw Error("Database integrity check failed.");
    if (repository.db.prepare("PRAGMA foreign_key_check").all().length)
      throw Error("Database contains broken references.");
    const data = readRuntimePublication(repository, {
      release,
      publication,
      contract: runtimeContractHash,
    });
    validateRuntimeModules(data, runtimeContract);
    const totals = verifyReleaseContent(repository, release);
    return {
      status: "VERIFIED_RUNTIME_DATABASE",
      release,
      publication,
      contract: runtimeContractHash,
      ...totals,
      modules: Object.keys(data.modules).length,
      resources: Object.keys(data.refs).length,
      newContentApproval: false,
      ...(includeInventory ? { inventory: publicationInventory(repository, release, data) } : {}),
      ...(includePackageMetadata
        ? {
            packages: repository.db
              .prepare(`SELECT p.source_id AS id,p.kind,p.version,p.title
          FROM packages p JOIN release_packages r ON r.version=p.version
          WHERE r.release_id=? ORDER BY p.kind,p.title,p.source_id`)
              .all(release),
          }
        : {}),
      ...(includeReportMetadata
        ? {
            reports: repository.db
              .prepare(`SELECT p.source_id AS id,p.version,p.title,p.payload
        FROM packages p JOIN release_packages r ON r.version=p.version
        WHERE r.release_id=? AND p.kind='report' ORDER BY p.source_id`)
              .all(release)
              .map((row) => {
                const metadata = JSON.parse(row.payload).metadata || {};
                return {
                  id: row.id,
                  version: row.version,
                  title: row.title,
                  date: metadata.publication_date || metadata.date || "",
                  pdfHash: metadata.pdf_hash || "",
                };
              }),
          }
        : {}),
    };
  } finally {
    repository.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(
      JSON.stringify(checkRuntimeDatabase(parseDatabaseBuildArgs(process.argv.slice(2))), null, 2),
    );
  } catch (error) {
    console.error("Runtime database check failed: " + error.message);
    process.exitCode = 1;
  }
}
