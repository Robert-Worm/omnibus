// Read-only portability boundary for the existing report/CIO review envelopes.
// Optional independently pinned custody evidence enables the source-method
// checks. Actual reading remains attested evidence, never a machine observation.
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { canonical } from "./identity.mjs";
import { checkLocalSourcePassages } from "./local-source-passages.mjs";
import { projectLocalReportViewer, reportViewerFiles } from "./local-report-viewer.mjs";
import { projectLocalFrameworkViewer } from "./local-framework-viewer.mjs";
import { checkLocalSourceStructure } from "./local-source-structure.mjs";
import { checkLocalSourceMethod } from "./local-source-method.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const text = value => typeof value === "string" && Boolean(value.trim());
const object = value => value && typeof value === "object" && !Array.isArray(value);
const requireValue = (value, message) => { if (!value) throw Error("Source review: " + message); };
const safePath = name => typeof name === "string" && name.length <= 240 &&
  name.split("/").every(part => part && part !== "." && part !== ".." &&
    !/[\\:]/u.test(part) && Array.from(part).every(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127));
const digestMap = value => object(value) && Object.keys(value).length > 0 &&
  Object.entries(value).every(([name, hash]) => safePath(name) && /^[a-f0-9]{64}$/.test(hash));

const reportTargets = ["APP-FINAL.json", "CATALOGUE.json", "RECONCILED-SOURCE.json",
  "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "REVIEW-BASIS.json"];
const reportDependencies = ["SOURCE.json", "source.txt", "INPUT-FREEZE.json", "FIRST-SUBMISSIONS.json",
  "ISSUES.json", "REPAIRS.json", "AUTHORING.json", "audit-draft-review.json", "REVIEW-CONTRACT.json",
  "TAXONOMY-SNAPSHOT.json", "RECONCILIATION-LOG.json",
  ...["extractor", "inventory"].flatMap(role => ["result.json", "READ-LOG.json", "VISUAL-EVIDENCE.json"]
    .map(name => role + "/output/" + name))];
const frameworkTargets = ["SOURCE-MANIFEST.json", "CONTRACT.txt", "CONTRACT-ADDENDUM-01.txt",
  "source/pages.json", "source/source.pdf", "RECONCILED-SOURCE.json", "RECONCILIATION.json",
  "CATALOGUE.json", "MIGRATION.json", "ISSUES.json", "SOURCE-STATUS.json",
  "reader-a/result.json", "reader-b/result.json"];
const reportAspects = {
  SOURCE: ["literal_fidelity", "attribution_and_scope", "counterevidence", "link_support"],
  PRACTICAL: ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"],
};
const frameworkAspects = {
  SOURCE: ["fidelity", "addressee_scope", "conditions_exceptions", "link_support"],
  LEGAL: ["addressee", "modality", "applicability", "composition_and_status"],
  PRACTICAL: ["independent_judgment", "phase_usability", "grouping", "reuse_semantics"],
};

function uniqueIds(rows, label, key = "id") {
  requireValue(Array.isArray(rows), label + " must be an array");
  const ids = rows.map(row => row?.[key]);
  requireValue(ids.every(text) && new Set(ids).size === ids.length, label + " has missing or duplicate identities");
  return ids;
}

function coverage(rows, ids, label, reason, aspects, points) {
  const actual = uniqueIds(rows, label);
  const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  requireValue(canonical([...actual].sort(order)) === canonical([...ids].sort(order)), label + " coverage differs from the exact content");
  for (const row of rows) {
    requireValue(row.decision === "APPROVE" && text(row[reason]), label + " needs an explicit decision and explanation");
    if (!points || points.has(row.id)) {
      const values = row[points ? "aspects" : "field_assessments"];
      requireValue(object(values) && aspects.every(key => text(values[key])), label + " is missing required review aspects");
      if (points) requireValue(row.link_count === points.get(row.id).source_links?.length,
        label + " relationship count differs from the reviewed point");
    }
  }
}

/** Input is the exact byte snapshot already checked by the intake reader.
 * Resolve references only against that snapshot, never the filesystem or a URL.
 * A transferred packet may have a prefix, but frozen relative paths are unchanged.
 */
export function localSourceSnapshot(manifest, files) {
  const bases = manifest.files.filter(file => file.roles.includes("review-basis"));
  requireValue(bases.length === 1 && posix.basename(bases[0].path) === "REVIEW-BASIS.json",
    "exactly one original REVIEW-BASIS.json is required");
  const basisFile = bases[0], prefix = posix.dirname(basisFile.path);
  const entries = new Map(manifest.files.map(file => [file.path, file]));
  const lookup = name => {
    requireValue(safePath(name), "a frozen reference is not package-relative; do not rewrite it or guess its basename");
    const path = prefix === "." ? name : prefix + "/" + name;
    const file = entries.get(path);
    requireValue(file && files.has(file.id), "missing frozen dependency: " + name);
    const bytes = files.get(file.id);
    requireValue(Buffer.isBuffer(bytes) && bytes.length === file.bytes && sha(bytes) === file.sha256,
      "snapshot differs from intake: " + name);
    return { file, bytes };
  };
  const read = name => {
    const { bytes } = lookup(name);
    requireValue(bytes.length <= 8 * 1024 * 1024, "JSON exceeds the local 8 MiB limit");
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw Error("Source review: invalid UTF-8 JSON: " + name); }
  };
  return { read, lookup, basisFile };
}

export function checkLocalSourceReview(manifest, files, authorIds, sourceEvidence) {
  const kind = manifest.package.kind;
  requireValue(["report", "framework"].includes(kind), "only report/framework envelopes are supported");
  requireValue(Array.isArray(authorIds) && authorIds.length > 0 && authorIds.every(text) &&
    new Set(authorIds).size === authorIds.length, "supply the actual distinct author identities");
  const { read, lookup, basisFile } = localSourceSnapshot(manifest, files);
  const prefix = posix.dirname(basisFile.path);
  const basis = read("REVIEW-BASIS.json");
  const dependencies = kind === "report" ? basis.files : basis.target_hashes;
  requireValue(digestMap(dependencies), "review basis needs original relative " + (kind === "report" ? "files" : "target_hashes"));
  requireValue(!Object.hasOwn(dependencies, "REVIEW-BASIS.json"), "review basis cannot hash itself");
  for (const [name, expected] of Object.entries(dependencies))
    requireValue(lookup(name).file.sha256 === expected, "changed frozen dependency: " + name);
  const required = kind === "report" ? reportDependencies : frameworkTargets;
  requireValue(required.every(name => Object.hasOwn(dependencies, name)), "review basis is missing contract targets");
  const expected = kind === "report"
    ? Object.fromEntries(reportTargets.map(name => [name, lookup(name).file.sha256]))
    : { ...dependencies, "REVIEW-BASIS.json": basisFile.sha256 };
  // Every declared source and final content file must belong to this exact basis.
  // Supporting evidence outside it may be a later receipt, never an alternate source.
  const boundPaths = new Set([...Object.keys(dependencies), ...Object.keys(expected)]
    .map(name => prefix === "." ? name : prefix + "/" + name));
  const boundRoles = new Set(["source", "source-text", "source-bank", "catalogue", "source-links",
    "viewer-content", "context", "limitations", "migration"]);
  if (kind === "report") {
    const source = read("SOURCE.json");
    requireValue(/^[a-f0-9]{64}$/.test(basis.source_pdf_sha256) && basis.source_pdf_sha256 === source.pdf_sha256,
      "report review basis must bind the original PDF");
    const pdfs = manifest.files.filter(file => file.roles.includes("source") && file.sha256 === basis.source_pdf_sha256);
    requireValue(pdfs.length === 1, "retain exactly one original report PDF with its reviewed hash");
    boundPaths.add(pdfs[0].path);
    requireValue(source.text_sha256 === lookup("source.txt").file.sha256, "report source text hash differs");
  }
  for (const file of manifest.files.filter(file => file.roles.some(role => boundRoles.has(role))))
    requireValue(boundPaths.has(file.path), "source/content file is outside the frozen review basis: " + file.id);
  const roles = kind === "report" ? reportAspects : frameworkAspects;
  const reviewFiles = manifest.files.filter(file => file.roles.includes("review"));
  requireValue(reviewFiles.length === Object.keys(roles).length, "each final reviewer role needs its own original file");
  const reviews = reviewFiles.map(file => {
    const relative = prefix === "." ? file.path : file.path.startsWith(prefix + "/") ? file.path.slice(prefix.length + 1) : null;
    requireValue(relative !== null, "review file is outside the package root");
    return read(relative);
  });
  const bank = read("RECONCILED-SOURCE.json"), catalogue = read("CATALOGUE.json");
  requireValue(text(bank.author_agent), "source bank author is missing");
  const authors = new Set([...authorIds, bank.author_agent, catalogue.author_agent].filter(text)), actors = new Set();
  if (kind === "report") {
    const author = read("AUTHORING.json").author_agent;
    requireValue(text(author), "practical author is missing");
    authors.add(author);
  }
  let ids, points;
  if (kind === "report") {
    const app = read("APP-FINAL.json");
    requireValue(app.framework?.report?.id === manifest.package.id && app.framework.report.title === manifest.package.title,
      "report identity/title differs from intake");
    ids = uniqueIds(app.framework.lines, "report lines");
  } else {
    requireValue(catalogue.source_identity?.source_id === manifest.package.id, "framework identity differs from intake");
    const all = ["goals", "objectives", "criteria", "points"].flatMap(key => uniqueIds(catalogue[key], key));
    requireValue(new Set(all).size === all.length, "framework review identities overlap");
    ids = all; points = new Map(catalogue.points.map(point => [point.id, point]));
  }
  requireValue(ids.length > 0, "empty final content");
  const sourceIds = uniqueIds(bank.records, "source bank", kind === "report" ? "record_id" : "id");
  requireValue(sourceIds.length > 0, "empty source bank");
  if (kind === "framework") requireValue(!sourceIds.some(id => ids.includes(id)), "source/content review identities overlap");
  for (const [role, aspects] of Object.entries(roles)) {
    const matches = reviews.filter(review => review?.[kind === "report" ? "review_kind" : "review_role"] === role);
    requireValue(matches.length === 1, "missing or duplicate final review: " + role);
    const review = matches[0], actor = review.reviewer_agent;
    requireValue(text(actor) && !actors.has(actor) && !authors.has(actor), "reviewer is also an author or another reviewer");
    if (kind === "framework" && role === "SOURCE") requireValue(
      !["reader-a/result.json", "reader-b/result.json"].some(name => read(name).author_agent === actor),
      "source reviewer is also an original source reader");
    actors.add(actor);
    requireValue(review.decision === "APPROVE" && review.human_validation === false &&
      Array.isArray(review.unresolved_issues) && review.unresolved_issues.length === 0, "unclosed final review: " + role);
    requireValue(canonical(review.target_hashes) === canonical(expected), "final review targets differ: " + role);
    if (kind === "report") coverage(review.item_reviews, ids, role, "assessment", aspects);
    else coverage(review.object_reviews, role === "SOURCE" ? [...ids, ...sourceIds] : ids, role, "reason", aspects, points);
  }
  const passages = checkLocalSourcePassages(kind, { read, lookup, packageId: manifest.package.id });
  const structure = checkLocalSourceStructure(kind, { read });
  let viewerShapeValidated = false;
  if (kind === "report" && reportViewerFiles.some(name => Object.hasOwn(dependencies, name))) {
    requireValue(reportViewerFiles.every(name => Object.hasOwn(dependencies, name)), "incomplete frozen report reuse packet");
    projectLocalReportViewer({ app: read("APP-FINAL.json"), reuse: read("REUSE-CANDIDATE.json"),
      projection: read("REUSE-VIEWER-PROJECTION.json"), locators: read("POINT-SOURCE-LOCATORS.json").locators });
    viewerShapeValidated = true;
  }
  if (kind === "framework" && catalogue.context) {
    projectLocalFrameworkViewer({ catalogue, bank, pages: read("source/pages.json"), status: read("SOURCE-STATUS.json"),
      pdfHash: lookup("source/source.pdf").file.sha256, reviewBasis: basisFile.sha256, title: manifest.package.title });
    viewerShapeValidated = true;
  }
  const method = sourceEvidence ? checkLocalSourceMethod(kind,
    { read, lookup, manifest, files, dependencies, reviews, authorIds }, sourceEvidence) : null;
  return { status: method ? "SOURCE_METHOD_EVIDENCE_CHECKED" : "REVIEW_BINDINGS_CHECKED", kind, packageId: manifest.package.id,
    basisSha256: basisFile.sha256, dependencies: Object.keys(dependencies).length,
    reviewers: reviews.length, contentObjects: ids.length, sourceRecords: sourceIds.length,
    reviewBindingsValidated: true, sourcePassagesValidated: true, passages, sourceStructureValidated: true, structure,
    sourceMethodValidated: Boolean(method), ...(method ? { method } : {}), reviewValidated: false,
    viewerShapeValidated, newContentApproval: false, publishable: false };
}

// Carry only a fixed, code-created summary through the CLI's ordinary HOLD path.
// Even a valid owner receipt must not substitute for the remaining source gate.
export class LocalSourceIntegrationRequired extends Error {
  constructor(evidence) {
    super(evidence.sourceMethodValidated
      ? `Source-method evidence for ${evidence.kind} checked. Shared-viewer runtime publication is not connected; no existing database was changed. Keep this package in HOLD for application integration.`
      : `No complete standalone admission validator for ${evidence.kind}. Review byte bindings, literal passages and record relationships checked; reading/custody verification and database publication are still required. Keep this package in HOLD.`);
    this.evidence = evidence;
  }
}
