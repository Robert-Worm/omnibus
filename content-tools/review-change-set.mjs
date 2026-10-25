import { digest } from "./identity.mjs";
import { questionReviewIds, questionReviewIssues } from "../lib/question-quality-review.mjs";

// Bump when the review unit, validation or hash input changes. Never rebind an
// old judgment to a newly calculated hash: only an actual review can do that.
export const reviewHashVersion = "omnibus-review-sha256-v2";
const sha256 = /^[a-f0-9]{64}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const key = (sourceId, itemId) => JSON.stringify([sourceId, itemId]);
const sorted = (values) => [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
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
      if (item.questions !== undefined) questionReviewIds(item.questions);
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
        ...(item.questions === undefined ? {} : { questionIds: questionReviewIds(item.questions) }),
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
      if (item.questionIds !== undefined) {
        requireValue(Array.isArray(item.questionIds) && item.questionIds.every((id) => typeof id === "string" && idPattern.test(id)) &&
          new Set(item.questionIds).size === item.questionIds.length, "Invalid or duplicate manifest question identities");
      }
      items.set(key(source.sourceId, item.itemId), item);
    }
  }
  requireValue(Array.isArray(manifest.reviews), "Missing review list");
  for (const review of manifest.reviews) {
    requireValue(object(review) && typeof review.sourceId === "string" && typeof review.itemId === "string", "Invalid review identity");
    const identity = key(review.sourceId, review.itemId);
    requireValue(items.has(identity) && !reviews.has(identity), "Unknown or duplicate review identity");
    if (review.questionReviews !== undefined) {
      requireValue(items.get(identity).questionIds !== undefined, "Question receipts require an explicit question inventory");
      questionReviewIssues({ sourceId: review.sourceId, itemId: review.itemId, itemHash: review.itemHash,
        questionIds: items.get(identity).questionIds, reviews: review.questionReviews });
    }
    reviews.set(identity, review);
  }
  return { items, reviews };
}

// Keep explicit negative decisions visible, including when a question disappears.
// Removal is only a planning result; the normal package/publication review still
// has to accept the revised inventory. Never rewrite the retained receipts.
function questionChanges(sourceId, itemId, before, after, review) {
  if (before?.questionIds === undefined && after?.questionIds === undefined) return undefined;
  const currentIds = after?.questionIds ?? [], previousIds = before?.questionIds ?? [];
  const receipts = review?.questionReviews ?? [];
  const checks = questionReviewIssues({ sourceId, itemId, itemHash: after?.itemHash,
    questionIds: currentIds, reviews: receipts.filter(receipt => currentIds.includes(receipt.questionId)) });
  const disappeared = previousIds.filter(id => !currentIds.includes(id)).map(questionId => {
    const receipt = receipts.find(entry => entry.questionId === questionId);
    return { questionId, previousDecision: receipt?.decision ?? null, previousReviewId: receipt?.reviewId ?? null };
  });
  return { current: checks, disappeared };
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
        const questions = questionChanges(sourceId, itemId, before, undefined, old.reviews.get(identity));
        result.verdwenen.push({ itemId, previousHash: before.itemHash, pointIds: before.pointIds,
          ...(questions ? { questions } : {}), reason: "absent-from-current-inventory" });
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
      const questions = questionChanges(sourceId, itemId, before, after, review);
      if (before?.questionIds !== undefined && after.questionIds === undefined) reasons.push("question-inventory-missing");
      if (questions?.current.some(question => question.reasons.length)) reasons.push("question-review-required");
      const entry = {
        itemId, itemHash: after.itemHash, previousHash: before?.itemHash ?? null, pointIds: after.pointIds,
        removedPointIds: (before?.pointIds ?? []).filter((id) => !after.pointIds.includes(id)),
        reasons, evidenceIssues: after.evidenceIssues, ...(questions ? { questions } : {}),
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

/** Bind a correction handoff to retained reviews; never approve or import it.
 * The normal source-specific admission and publication gates remain mandatory.
 * notes are authored descriptions, not quality scores or inferred approvals. */
export function prepareCorrectionHandoff({ previousBasis, previousManifest, currentBasis, currentManifest, notes }) {
  for (const [basis, manifest] of [[previousBasis, previousManifest], [currentBasis, currentManifest]]) {
    const snapshot = createReviewManifest(basis);
    indexManifest(manifest);
    requireValue(digest({ ...manifest, reviews: [] }) === digest(snapshot), "Correction manifest does not match its exact basis");
    const checked = reviewChangeSet(manifest, basis);
    requireValue(checked.sources.every(source => source.opnieuw.length === 0), "Correction requires complete, matching reviews of both versions");
  }
  const changes = reviewChangeSet(previousManifest, currentBasis);
  requireValue(digest(sorted(previousBasis.sources.map(source => source.id))) === digest(sorted(currentBasis.sources.map(source => source.id))),
    "Correction handoff requires existing source identities");
  requireValue(changes.sources.every(source => source.verdwenen.length === 0 && source.opnieuw.every(item => item.previousHash)),
    "Correction handoff requires existing item identities; additions and removals need the normal inventory review");
  for (const source of currentBasis.sources) {
    for (const value of [source, ...source.items, ...source.items.flatMap(item => item.toetspunten)]) {
      requireValue(value.hold?.active !== true && value.selection_status !== "HOLD" && value.reviewStatus !== "HOLD",
        "Correction contains HOLD; keep it outside publication");
    }
  }
  for (const review of currentManifest.reviews) {
    requireValue(review.hold?.active !== true && review.status !== "HOLD" &&
      (review.decision === undefined || ["PASS", "APPROVE"].includes(review.decision)),
    "Correction contains an unclosed review decision");
  }
  requireJson(notes);
  requireValue(Array.isArray(notes), "Correction notes must be an array");
  const descriptions = new Map();
  for (const note of notes) {
    requireValue(object(note) && typeof note.sourceId === "string" && typeof note.itemId === "string" &&
      text(note.summary) && note.summary.length <= 1000 && Array.from(note.summary).every(char => char.codePointAt(0) >= 32),
    "Invalid correction note");
    const identity = key(note.sourceId, note.itemId);
    requireValue(!descriptions.has(identity), "Duplicate correction note");
    descriptions.set(identity, note.summary);
  }
  const old = indexManifest(previousManifest), current = indexManifest(currentManifest);
  const entries = changes.sources.flatMap(source => source.opnieuw.map(item => {
    const identity = key(source.sourceId, item.itemId);
    requireValue(descriptions.has(identity), "Every changed or dependent item needs a concrete release note");
    requireValue(old.reviews.get(identity).reviewId !== current.reviews.get(identity).reviewId,
      "A changed item needs a new review reference; never rebind the old receipt");
    const beforeSource = previousBasis.sources.find(entry => entry.id === source.sourceId);
    const afterSource = currentBasis.sources.find(entry => entry.id === source.sourceId);
    const before = beforeSource.items.find(entry => entry.id === item.itemId);
    const after = afterSource.items.find(entry => entry.id === item.itemId);
    const changedFields = sorted(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter(field => digest({ present: Object.hasOwn(before, field), value: before[field] ?? null }) !==
        digest({ present: Object.hasOwn(after, field), value: after[field] ?? null }));
    const binding = value => ({ version: value.version, documents: value.documents.map(({ id, version, sha256 }) => ({ id, version, sha256 })) });
    return { sourceId: source.sourceId, itemId: item.itemId, previousHash: item.previousHash, itemHash: item.itemHash,
      previousReviewId: old.reviews.get(identity).reviewId, reviewId: current.reviews.get(identity).reviewId,
      beforeSource: binding(beforeSource), afterSource: binding(afterSource), changedFields,
      summary: descriptions.get(identity) };
  }));
  requireValue(entries.length > 0 && entries.length === descriptions.size, "Correction notes must cover exactly the changed and dependent items");
  // No source passages in the note fragment; escape supplied descriptions as text.
  const markdown = value => value.replace(/[\\`*_{}[\]<>|]/g, "\\$&");
  return { format: "omnibus-correction-handoff", schemaVersion: 1, scopeId: currentBasis.scopeId,
    planningOnly: true, automaticApproval: false, runtimeSourceChecksRequired: true, publishable: false,
    entries, releaseNotes: ["### Verbeteringen in bestaande inhoud", "",
      ...entries.map(entry => `- **${markdown(entry.sourceId)} / ${markdown(entry.itemId)}**: ${markdown(entry.summary)}`), ""].join("\n") };
}
