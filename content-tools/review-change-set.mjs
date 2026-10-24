import { digest } from "./identity.mjs";

// Bump when the review unit, validation or hash input changes. Never rebind an
// old judgment to a newly calculated hash: only an actual review can do that.
export const reviewHashVersion = "omnibus-review-sha256-v1";
const sha256 = /^[a-f0-9]{64}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const key = (sourceId, itemId) => JSON.stringify([sourceId, itemId]);
const sorted = (values) => [...values].sort();
function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
function uniqueIds(entries, label, field = "id") {
  requireValue(Array.isArray(entries), `${label}: expected array`);
  const ids = new Set();
  for (const entry of entries) {
    requireValue(object(entry) && typeof entry[field] === "string" && idPattern.test(entry[field]), `${label}: invalid ID`);
    requireValue(!ids.has(entry[field]), `${label}: duplicate ID`);
    ids.add(entry[field]);
  }
}

// Reject values that canonical JSON would silently drop or rewrite. This API
// accepts JSON data, never executable package modules, getters or toJSON hooks.
function requireJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  requireValue(typeof value === "object" && value !== null && !ancestors.has(value), "Expected acyclic JSON data");
  requireValue(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, "Expected plain JSON data");
  ancestors.add(value);
  const names = Reflect.ownKeys(value).filter((name) => !(Array.isArray(value) && name === "length"));
  if (Array.isArray(value)) requireValue(names.length === value.length, "Expected dense JSON array");
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    requireValue(typeof name === "string" && descriptor.enumerable && Object.hasOwn(descriptor, "value"), "Expected JSON data properties");
    if (Array.isArray(value)) requireValue(/^(0|[1-9][0-9]*)$/.test(name) && Number(name) < value.length, "Expected JSON array indices");
    requireJson(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}

function evidenceIssues(basis, source, item) {
  const issues = [];
  const need = (condition, code) => { if (!condition) issues.push(code); };
  need(text(basis.rubricVersion), "rubric-version-missing");
  need(text(basis.protocolVersion), "protocol-version-missing");
  need(object(basis.context), "global-context-missing");
  need(text(source.version), "source-version-missing");
  for (const [label, value] of [["source", source], ["item", item]]) {
    need(object(value.context), `${label}-context-missing`);
    need(object(value.applicability) && Object.keys(value.applicability).length > 0, `${label}-applicability-missing`);
    need(object(value.hold) && typeof value.hold.active === "boolean", `${label}-hold-missing`);
  }
  for (const field of ["norm", "doel", "risico", "beheersdoelstelling", "beheersmaatregel"]) {
    need(text(item[field]), `${field}-missing`);
  }
  need(Array.isArray(item.toetspunten) && item.toetspunten.length > 0, "points-missing");
  for (const point of item.toetspunten ?? []) {
    for (const field of ["text", "opzet", "bestaan"]) need(text(point[field]), `point-${point.id}-${field}-missing`);
  }
  const documents = new Map((source.documents ?? []).map((doc) => [doc.id, doc]));
  need(documents.size > 0, "source-documents-missing");
  for (const doc of documents.values()) {
    need(text(doc.version) && typeof doc.sha256 === "string" && sha256.test(doc.sha256), `document-${doc.id}-version-or-hash-missing`);
  }
  need(Array.isArray(item.passages) && item.passages.length > 0, "passages-missing");
  for (const passage of item.passages ?? []) {
    const doc = documents.get(passage.documentId);
    need(Boolean(doc) && text(passage.documentVersion) && passage.documentVersion === doc.version &&
      typeof passage.documentSha256 === "string" && sha256.test(passage.documentSha256) && passage.documentSha256 === doc.sha256,
    `passage-${passage.id}-source-binding-missing`);
    need(text(passage.text) && text(passage.context) && object(passage.location) && Object.keys(passage.location).length > 0,
      `passage-${passage.id}-text-or-context-or-location-missing`);
  }
  need(Array.isArray(item.dependencies), "dependencies-missing");
  // Explicit completeness is a supplier statement, not proof of source reading.
  need(item.evidence?.complete === true && Array.isArray(item.evidence?.gaps) && item.evidence.gaps.length === 0,
    "evidence-incomplete");
  return issues;
}

/** Make a data-only fingerprint manifest. It deliberately contains no reviews. */
export function createReviewManifest(basis) {
  requireJson(basis);
  requireValue(object(basis) && basis.format === "omnibus-review-basis" && basis.schemaVersion === 1, "Unsupported review basis");
  requireValue(typeof basis.scopeId === "string" && idPattern.test(basis.scopeId), "Invalid review scope ID");
  requireValue(basis.inventoryComplete === true, "A complete inventory within the declared scope is required");
  uniqueIds(basis.sources, "sources");
  const { sources, ...globalContext } = basis;
  const units = new Map();
  for (const source of sources) {
    uniqueIds(source.items, "items");
    if (source.documents !== undefined) uniqueIds(source.documents, "documents");
    const { items, ...sourceContext } = source;
    const pointIds = new Set();
    for (const item of items) {
      if (item.toetspunten !== undefined) uniqueIds(item.toetspunten, "points");
      for (const point of item.toetspunten ?? []) {
        requireValue(!pointIds.has(point.id), "Duplicate point ID within source");
        pointIds.add(point.id);
      }
      if (item.passages !== undefined) uniqueIds(item.passages, "passages");
      const dependencies = new Set();
      if (item.dependencies !== undefined) {
        requireValue(Array.isArray(item.dependencies), "Expected dependencies array");
        for (const dependency of item.dependencies) {
          requireValue(object(dependency) && typeof dependency.sourceId === "string" && idPattern.test(dependency.sourceId) &&
            typeof dependency.itemId === "string" && idPattern.test(dependency.itemId), "Invalid dependency identity");
          const identity = key(dependency.sourceId, dependency.itemId);
          requireValue(!dependencies.has(identity), "Duplicate dependency identity");
          dependencies.add(identity);
        }
      }
      units.set(key(source.id, item.id), {
        item, dependencies,
        baseHash: digest({ hashVersion: reviewHashVersion, globalContext, sourceContext, item }),
        issues: evidenceIssues(basis, source, item),
      });
    }
  }
  const manifestSources = sources.map((source) => ({
    sourceId: source.id,
    items: source.items.map((item) => {
      const identity = key(source.id, item.id), seen = new Set(), pending = [identity], chain = [], issues = [];
      // Resolve the complete dependency closure, including cycles, once per unit.
      // A changed/missing linked unit invalidates all its transitive dependants.
      while (pending.length) {
        const next = pending.pop();
        if (seen.has(next)) continue;
        seen.add(next);
        const unit = units.get(next);
        if (!unit) { issues.push(`dependency-missing:${next}`); continue; }
        chain.push({ identity: next, hash: unit.baseHash });
        issues.push(...unit.issues.map((issue) => `${next}:${issue}`));
        pending.push(...unit.dependencies);
      }
      chain.sort((a, b) => a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0);
      return {
        itemId: item.id,
        itemHash: digest({ hashVersion: reviewHashVersion, identity, chain }),
        pointIds: (item.toetspunten ?? []).map((point) => point.id),
        evidenceIssues: sorted(issues),
      };
    }),
  }));
  return {
    format: "omnibus-review-manifest", schemaVersion: 1, hashVersion: reviewHashVersion,
    scopeId: basis.scopeId, inventoryComplete: true,
    rubricVersion: basis.rubricVersion ?? null, protocolVersion: basis.protocolVersion ?? null,
    sources: manifestSources, reviews: [],
  };
}

function indexManifest(manifest) {
  requireJson(manifest);
  requireValue(object(manifest) && manifest.format === "omnibus-review-manifest" && manifest.schemaVersion === 1,
    "Unsupported review manifest");
  requireValue(text(manifest.hashVersion) && text(manifest.scopeId) && manifest.inventoryComplete === true, "Incomplete review manifest");
  uniqueIds(manifest.sources, "manifest sources", "sourceId");
  const items = new Map(), reviews = new Map();
  for (const source of manifest.sources) {
    uniqueIds(source.items, "manifest items", "itemId");
    const points = new Set();
    for (const item of source.items) {
      requireValue(typeof item.itemHash === "string" && sha256.test(item.itemHash), "Invalid item hash");
      requireValue(Array.isArray(item.pointIds) && item.pointIds.every((id) => typeof id === "string" && idPattern.test(id)), "Invalid point identities");
      for (const id of item.pointIds) {
        requireValue(!points.has(id), "Duplicate manifest point ID within source");
        points.add(id);
      }
      requireValue(Array.isArray(item.evidenceIssues) && item.evidenceIssues.every(text), "Missing manifest evidence status");
      items.set(key(source.sourceId, item.itemId), item);
    }
  }
  requireValue(Array.isArray(manifest.reviews), "Missing review list");
  for (const review of manifest.reviews) {
    requireValue(object(review) && typeof review.sourceId === "string" && typeof review.itemId === "string", "Invalid review identity");
    const identity = key(review.sourceId, review.itemId);
    requireValue(items.has(identity) && !reviews.has(identity), "Unknown or duplicate review identity");
    reviews.set(identity, review);
  }
  return { items, reviews };
}

/** Compare a retained reviewed manifest with a fresh, complete JSON basis. */
export function reviewChangeSet(previous, currentBasis) {
  const old = indexManifest(previous);
  const current = createReviewManifest(currentBasis), now = indexManifest(current);
  requireValue(previous.scopeId === current.scopeId, "Cannot compare different review scopes");
  const sources = sorted(new Set([...previous.sources, ...current.sources].map((source) => source.sourceId))).map((sourceId) => {
    const result = { sourceId, opnieuw: [], ongewijzigd: [], verdwenen: [] };
    const itemIds = sorted(new Set([...previous.sources, ...current.sources].filter((source) => source.sourceId === sourceId)
      .flatMap((source) => source.items.map((item) => item.itemId))));
    for (const itemId of itemIds) {
      const identity = key(sourceId, itemId), before = old.items.get(identity), after = now.items.get(identity);
      if (!after) {
        result.verdwenen.push({ itemId, previousHash: before.itemHash, pointIds: before.pointIds, reason: "absent-from-current-inventory" });
        continue;
      }
      const reasons = [], review = old.reviews.get(identity);
      if (!before) reasons.push("new-item");
      else {
        if (previous.hashVersion !== current.hashVersion) reasons.push("hash-version-changed");
        if (previous.rubricVersion !== current.rubricVersion || previous.protocolVersion !== current.protocolVersion) reasons.push("review-method-changed");
        if (before.itemHash !== after.itemHash) reasons.push("review-basis-changed");
        if (before.evidenceIssues.length) reasons.push("previous-evidence-incomplete");
        if (!review) reasons.push("previous-review-missing");
        else {
          if (review.hashVersion !== current.hashVersion || review.itemHash !== after.itemHash || review.itemHash !== before.itemHash)
            reasons.push("previous-review-hash-mismatch");
          if (!text(review.reviewId) || review.sourceVerified !== true || review.coverageComplete !== true ||
            !Array.isArray(review.unresolvedQuestions) || review.unresolvedQuestions.length)
            reasons.push("previous-review-incomplete");
        }
      }
      if (after.evidenceIssues.length) reasons.push("current-evidence-incomplete");
      const entry = {
        itemId, itemHash: after.itemHash, previousHash: before?.itemHash ?? null, pointIds: after.pointIds,
        removedPointIds: (before?.pointIds ?? []).filter((id) => !after.pointIds.includes(id)),
        reasons, evidenceIssues: after.evidenceIssues,
      };
      if (reasons.length) result.opnieuw.push(entry);
      else result.ongewijzigd.push({ ...entry, previousReviewId: review.reviewId });
    }
    return result;
  });
  return {
    format: "omnibus-review-changes", schemaVersion: 1, hashVersion: reviewHashVersion,
    scopeId: current.scopeId, planningOnly: true, automaticApproval: false, runtimeSourceChecksRequired: true,
    sources,
  };
}
