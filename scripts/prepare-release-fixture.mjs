// Fixed synthetic input for the release handover rehearsal. No source imports,
// external inputs or substantive approvals; this is not an authoring publisher.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";
import { prepareWebResources } from "../local-data/web-resources.mjs";
import { runtimeContract } from "../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { checkRuntimeDatabase } from "./check-runtime-database.mjs";

export function createReleaseFixture(out) {
  out = path.resolve(out);
  if (existsSync(out)) throw Error("Kies een nieuwe map voor de fictieve oefendatabase.");
  mkdirSync(out, { recursive: true });
  const database = path.join(out, "catalogue.sqlite");
  const repository = new CatalogueRepository(database);
  let release, publication;
  try {
    const quote = "Fictieve controle: café 😀.";
    release = repository.importRelease({
      manifest: { baselineVersion: "synthetic-release-handover-only" },
      packages: [
        { id: "FICTIEF-RAPPORT", kind: "report", title: "Fictief oefenrapport", records: [
          { id: "FICTIEF-NORM", kind: "norm", title: "Fictieve norm", status: "HOLD",
            data: { question: "Hoe wordt de fictieve controle vastgelegd?" } },
          { id: "FICTIEF-BEWIJS", kind: "evidence", title: "Fictieve passage", status: "HOLD",
            data: { report_id: "FICTIEF-DOCUMENT", quote, start: 0, end: Array.from(quote).length, page: 1 } },
        ] },
        ...[["WET", "law"], ["KADER", "foundation"], ["MODEL", "model"]].map(([id, kind]) => ({
          id: "FICTIEF-" + id, kind, title: "Fictief " + id.toLowerCase(),
          records: [{ id: "FICTIEF-" + id + "-1", kind: "note", title: "Alleen oefenmateriaal", status: "HOLD", data: { synthetic: true } }],
        })),
      ],
      documents: [{ id: "FICTIEF-DOCUMENT", title: "Fictieve bron", sourceId: "FICTIEF-RAPPORT",
        pages: [{ page: 1, text: quote }, { page: 2, text: "Tweede fictieve pagina; geen echte bron." }] }],
      artifacts: [{ name: "synthetic-review", data: { synthetic: true, approved: false } }],
    });
    // Same minimal module shapes as local-data/test-support/runtime-fixture.mjs.
    // They exercise the technical contract, not a working viewer or source review.
    const modules = Object.fromEntries(Object.entries(runtimeContract).map(([id, entry]) => [id,
      entry.kind === "exports"
        ? Object.fromEntries(entry.names.map((name) => [name, { text: "Fictief; geen echte norm" }]))
        : entry.property ? { [entry.property]: [] } : {},
    ]));
    modules["lib/model-choice-guide.mjs"] = { guides: {}, summaries: {} };
    modules["lib/research-models.mjs"] = { ids: [], presentations: {} };
    const refs = prepareWebResources(repository, release, { test: { label: "Fictieve overdrachtsproef" } });
    publication = publishRuntime(repository, {
      format: "omnibus-runtime-publication", schemaVersion: 1,
      contentGate: "VERIFIED_APPLICATION_RELEASE", contract: runtimeContractHash, release,
      modules, refs, registrations: {}, routing: {}, summary: { synthetic: true },
    }, { release, contract: runtimeContractHash });
  } finally {
    repository.close();
  }
  const settings = { database, release, publication };
  const checked = checkRuntimeDatabase(settings);
  writeFileSync(path.join(out, "local-build.json"), JSON.stringify({ ...settings, database: "catalogue.sqlite" }, null, 2) + "\n");
  writeFileSync(path.join(out, "FICTIEF.txt"), "Alleen een technische overdrachtsproef. Niet publiceren of activeren. Geen inhoudelijke goedkeuring of geteste viewer.\n");
  return { settings, checked };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || process.argv[2].startsWith("--"))
      throw Error("Gebruik: node scripts/prepare-release-fixture.mjs <nieuwe-oefenmap>");
    console.log(JSON.stringify(createReleaseFixture(process.argv[2]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
