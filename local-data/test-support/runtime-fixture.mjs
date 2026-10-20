import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CatalogueRepository } from "../repository.mjs";
import { publishRuntime } from "../runtime-publication.mjs";
import { prepareWebResources } from "../web-resources.mjs";
import { runtimeContract } from "../../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../../lib/runtime-contract-identity.mjs";

// Synthetically satisfies module identities, never represents approved source content.
export function runtimeFixture(t, { packages = [], documents = [], artifacts = [], baselineVersion = "synthetic" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-publication-test-"));
  const beforeCleanup = [];
  t.after(async () => {
    for (const close of beforeCleanup.reverse()) await close();
    rmSync(dir, { recursive: true, force: true });
  });
  const databasePath = join(dir, "synthetic.sqlite");
  const repository = new CatalogueRepository(databasePath);
  try {
    const release = repository.importRelease({
      manifest: { baselineVersion },
      packages,
      documents,
      artifacts,
    });
    const refs = prepareWebResources(repository, release, {
      test: { label: "Synthetic test only" },
    });
    const modules = Object.fromEntries(
      Object.entries(runtimeContract).map(([id, entry]) => [
        id,
        entry.kind === "exports"
          ? Object.fromEntries(
              entry.names.map((name) => [name, { text: "Synthetic; not a real norm" }]),
            )
          : entry.property
            ? { [entry.property]: [] }
            : {},
      ]),
    );
    modules['lib/model-choice-guide.mjs'] = {guides:{},summaries:{}};
    modules['lib/research-models.mjs'] = {ids:[],presentations:{}};
    const value = {
      format: "omnibus-runtime-publication",
      schemaVersion: 1,
      contentGate: "VERIFIED_APPLICATION_RELEASE",
      contract: runtimeContractHash,
      release,
      modules,
      refs,
      registrations: {},
      routing: {},
      summary: {},
    };
    const publication = publishRuntime(repository, value, {
      release,
      contract: runtimeContractHash,
    });
    return { dir, databasePath, release, publication, beforeCleanup };
  } finally {
    repository.close();
  }
}
