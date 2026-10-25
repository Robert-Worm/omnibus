// Data-only local publication. Called only after the intake, review and pinned
// owner-admission checks; never used by the web server or by received packages.
import { CatalogueRepository, digest } from "../local-data/repository.mjs";
import { readDatabaseSettings } from "../scripts/database-build-options.mjs";
import { readRuntimePublication, validateRuntimeModules, publishRuntime } from "../local-data/runtime-publication.mjs";
import { publicationReadScope, prepareWebResources, webResource } from "../local-data/web-resources.mjs";
import { verifyReleaseContent } from "../local-data/release-integrity.mjs";
import { runtimeContract } from "../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { applyCatalogueEdits } from "../lib/catalogue-runtime.mjs";
import { validateModelLibrary } from "../lib/model-library-validation.mjs";

const LIBRARY = "lib/model-library.mjs";
const requireValue = (condition, message) => { if (!condition) throw Error(message); };

/** Capture one verified read-only snapshot. No later reads of an unpinned base. */
export function prepareLocalModelRuntime(settings, snapshots) {
  requireValue(snapshots.every(item => item.admission), "Every viewer package needs its own checked local-owner admission");
  const pins = readDatabaseSettings(settings);
  const reader = new CatalogueRepository(pins.database, { readOnly: true });
  try {
    reader.db.exec("BEGIN");
    requireValue(reader.integrity().every(row => row.integrity_check === "ok"), "Base database integrity check failed");
    requireValue(!reader.db.prepare("PRAGMA foreign_key_check").all().length, "Base database has broken references");
    const content = readRuntimePublication(reader, { ...pins, contract: runtimeContractHash });
    validateRuntimeModules(content, runtimeContract);
    verifyReleaseContent(reader, pins.release);
    publicationReadScope(reader, content);
    const bundle = reader.exportRelease(pins.release);
    const resources = Object.fromEntries(Object.entries(content.refs)
      .map(([key, ref]) => [key, webResource(reader, pins.release, ref.hash)]));
    const library = structuredClone(content.modules[LIBRARY]);
    requireValue(Array.isArray(library?.models), "Base publication has no model library");
    for (const key of content.registrations[LIBRARY] ?? []) applyCatalogueEdits(library, resources[key]);
    const existingIds = new Set([...library.models.map(model => model.id), ...bundle.packages.map(item => item.id)]
      .map(id => id.toLowerCase()));
    for (const { model } of snapshots) {
      requireValue(!existingIds.has(model.id.toLowerCase()), `Existing identity cannot be replaced: ${model.id}`);
      existingIds.add(model.id.toLowerCase());
    }
    const models = [...library.models, ...snapshots.map(item => item.model)];
    validateModelLibrary({ version: 1, models }, { activeIntegrityDimensions: library.activeIntegrityDimensions });
    const registrations = [...(content.registrations[LIBRARY] ?? [])];
    requireValue(registrations.every(key => key.startsWith("models:")), "Unsupported base model delivery boundary");
    // Older inline publications also enter the existing per-model lazy route.
    const add = (key, value) => {
      requireValue(!Object.hasOwn(resources, key), `Delivery identity already exists: ${key}`);
      requireValue(Buffer.byteLength(JSON.stringify(value)) <= 2 * 1024 * 1024, `Model delivery exceeds 2 MiB: ${key}`);
      resources[key] = value; registrations.push(key);
    };
    if (content.modules[LIBRARY].models.length) {
      add("models:local-base", [{ path: ["models"], value: content.modules[LIBRARY].models }]);
      // Inline models precede deferred additions in the original library.
      registrations.unshift(registrations.pop());
      content.modules[LIBRARY].models = [];
    }
    for (const { model } of snapshots) add(`models:local:${model.id}`, [{ path: ["models"], value: [model] }]);
    content.registrations[LIBRARY] = registrations;
    content.summary.models = { models: models.length,
      dimensions: models.reduce((sum, model) => sum + model.items.length, 0),
      questions: models.reduce((sum, model) => sum + model.items.reduce((n, item) => n + (item.questions?.length ?? 0), 0), 0) };
    return { pins: { release: pins.release, publication: pins.publication }, bundle, content, resources,
      localModelKeys: new Set(snapshots.map(({ model }) => `models:local:${model.id}`)) };
  } finally { reader.close(); }
}

function appendUnique(existing, additions, key, label) {
  const ids = new Set(existing.map(item => key(item).toLowerCase()));
  for (const item of additions) {
    requireValue(!ids.has(key(item).toLowerCase()), `Existing ${label} cannot be replaced: ${key(item)}`);
    ids.add(key(item).toLowerCase());
  }
  return [...existing, ...additions];
}

/** Write only to the caller's exclusively reserved NEW database. */
export function writeLocalModelRuntime(repository, prepared, additions) {
  const { bundle, pins, content, resources } = prepared;
  const release = repository.importRelease({
    manifest: { format: "omnibus-local-model-publication", schemaVersion: 1, scope: "local-database-only",
      contentGate: "LOCAL_OWNER_ADMITTED", base: pins, planSha256: additions.manifest.planSha256,
      runtimeContract: runtimeContractHash },
    packages: appendUnique(bundle.packages, additions.packages.map(item => ({ ...item,
      records: item.records.map(record => ({ ...record, status: "LOCAL_OWNER_ADMITTED" })) })), item => item.id, "package"),
    documents: appendUnique(bundle.documents, additions.documents, item => item.id, "document"),
    artifacts: appendUnique(bundle.artifacts, additions.artifacts, item => item.name, "evidence artifact"),
  });
  // Only delivery references change. Source text, model payloads, page versions
  // and evidence bytes remain exact. Never replace release-like prose strings.
  const byHash = new Map(Object.entries(content.refs).map(([key, ref]) => [ref.hash, key]));
  const projected = new Map(), pending = new Set(), indexes = new Map();
  function project(value) {
    if (!value || typeof value !== "object") return value;
    if (!Array.isArray(value) && value.release === pins.release && typeof value.hash === "string" &&
        Object.keys(value).sort().join(",") === "bytes,hash,release") {
      const key = byHash.get(value.hash);
      requireValue(key, "Unregistered nested delivery reference");
      const payload = JSON.stringify(resource(key));
      requireValue(value.bytes === content.refs[key].bytes, "Changed nested delivery length");
      return { release, hash: digest(payload), bytes: Buffer.byteLength(payload) };
    }
    if (Array.isArray(value)) return value.map(project);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => {
      if (key !== "databaseSource") return [key, project(child)];
      requireValue(child?.schema === 1 && child.release === pins.release, "Unexpected source reference");
      if (!indexes.has(child.version)) {
        const index = repository.documentIndex(release, child.version);
        requireValue(index, "Projected source document is missing");
        indexes.set(child.version, digest(JSON.stringify(index)));
      }
      return [key, { ...child, release, indexHash: indexes.get(child.version) }];
    }));
  }
  function resource(key) {
    if (projected.has(key)) return projected.get(key);
    requireValue(!pending.has(key), "Cyclic delivery references");
    pending.add(key);
    // Incoming model fields are evidence, not base-publication references to
    // rewrite. Unexpected embedded source refs must fail the scope check below.
    const value = prepared.localModelKeys.has(key) ? resources[key] : project(resources[key]);
    projected.set(key, value); pending.delete(key);
    return value;
  }
  const refs = prepareWebResources(repository, release,
    Object.fromEntries(Object.keys(resources).map(key => [key, resource(key)])));
  const value = { ...content, release, modules: project(content.modules), refs };
  validateRuntimeModules(value, runtimeContract);
  publicationReadScope(repository, value);
  const publication = publishRuntime(repository, value, { release, contract: runtimeContractHash });
  return { release, publication };
}
