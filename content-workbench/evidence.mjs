// Read-only adapters: verify retained evidence, never execute package code or publish content.
import { createHash } from "node:crypto";
import { readFileSync, lstatSync } from "node:fs";
import { dirname, resolve, posix } from "node:path";
import { z } from "zod";
import { checkIntake } from "../content-tools/intake.mjs";
import { readDatabaseSettings } from "../scripts/database-build-options.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(2000);
const mapping = z
  .object({ packageId: text, packageVersion: text, sourceId: sha, reason: text })
  .strict();
export const evidencePlanSchema = z
  .object({
    format: z.literal("omnibus-workbench-evidence"),
    version: z.literal(1),
    publications: z
      .array(
        z
          .object({
            label: text,
            kind: z.enum(["active", "candidate"]),
            settings: text,
            release: sha,
            publication: sha,
            mappings: z.array(mapping).max(1000).default([]),
          })
          .strict(),
      )
      .max(20),
    intakes: z
      .array(
        z
          .object({
            label: text,
            manifest: text,
            manifestSha256: sha,
            historicalReport: z.boolean().default(false),
            packageId: text,
            packageVersion: text,
            sourceId: sha,
            reason: text,
            reviews: z.array(text).max(10).default([]),
          })
          .strict(),
      )
      .max(100),
    archives: z
      .array(
        z
          .object({
            label: text,
            directory: text,
            receipt: text,
            receiptSha256: sha,
            packageId: text,
            sourceId: sha,
            reason: text,
          })
          .strict(),
      )
      .max(100)
      .default([]),
  })
  .strict()
  .superRefine((plan, ctx) => {
    if (plan.publications.filter((p) => p.kind === "active").length > 1)
      ctx.addIssue({ code: "custom", message: "Only one active publication is allowed." });
    const labels = [...plan.publications, ...plan.intakes, ...plan.archives].map((p) => p.label);
    if (!labels.length || new Set(labels).size !== labels.length)
      ctx.addIssue({ code: "custom", message: "Evidence labels must be nonempty and unique." });
  });

function readJson(path, maximum = 1024 * 1024, expected) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum)
    throw Error("Invalid evidence file.");
  const bytes = readFileSync(path);
  if (bytes.length > maximum || (expected && hash(bytes) !== expected))
    throw Error("Evidence hash mismatch.");
  return {
    value: JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""),
    ),
    hash: hash(bytes),
  };
}

export function readEvidencePlan(path) {
  const input = readJson(path);
  return {
    plan: evidencePlanSchema.parse(input.value),
    hash: input.hash,
    base: dirname(resolve(path)),
  };
}

// Punctuation is not guessed: only Unicode normalization, whitespace and case.
const titleKey = (title) =>
  title.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
export function matchReports(reports, sources, mappings = []) {
  const results = [],
    unmatched = [],
    used = new Set();
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const exact = new Map(),
    explicitById = new Map();
  if (sourceById.size !== sources.length || reportById.size !== reports.length)
    throw Error("Duplicate source or package identity.");
  for (const s of sources) {
    const key = JSON.stringify([titleKey(s.title), s.date]);
    if (!exact.has(key)) exact.set(key, []);
    exact.get(key).push(s);
  }
  for (const m of mappings) {
    if (
      reportById.get(m.packageId)?.version !== m.packageVersion ||
      !sourceById.has(m.sourceId) ||
      used.has(m.packageId)
    )
      throw Error("Unknown, changed or duplicate explicit report mapping.");
    used.add(m.packageId);
    explicitById.set(m.packageId, m);
  }
  for (const report of reports) {
    const explicit = explicitById.get(report.id);
    const candidates = explicit
      ? [sourceById.get(explicit.sourceId)]
      : report.date
        ? exact.get(JSON.stringify([titleKey(report.title), report.date])) || []
        : [];
    if (candidates.length !== 1) {
      unmatched.push({
        id: report.id,
        title: report.title,
        version: report.version,
        reason: candidates.length
          ? "Meerdere exacte bronrecords; koppeling nodig."
          : "Geen exacte titel-/datummatch; koppeling nodig.",
      });
    } else
      results.push({
        sourceId: candidates[0].id,
        report,
        match: explicit ? "explicit" : "title-date",
        reason: explicit?.reason || "Unieke gelijke titel en publicatiedatum.",
      });
  }
  // Two packages attached to the same record require investigation, not double counting.
  if (new Set(results.map((r) => r.sourceId)).size !== results.length)
    throw Error("Ambiguous report-to-backlog mapping.");
  return { results, unmatched };
}

export function reviewBindings(manifest, root, selected) {
  const entries = new Map(manifest.files.map((f) => [f.path, f]));
  const read = (path, role) => {
    const file = entries.get(path);
    if (!file || (role && !file.roles.includes(role)))
      throw Error("Review evidence is outside the verified envelope or has the wrong role.");
    return readJson(resolve(root, path), Math.min(file.bytes, 16 * 1024 * 1024), file.sha256).value;
  };
  const verifyTargets = (targets, parent) => {
    if (
      !targets ||
      typeof targets !== "object" ||
      Array.isArray(targets) ||
      !Object.keys(targets).length
    )
      throw Error("Missing review target binding.");
    for (const [relative, expected] of Object.entries(targets)) {
      if (
        relative.includes("\\") ||
        posix.isAbsolute(relative) ||
        relative.split("/").some((p) => p === ".." || !p)
      )
        throw Error("Unsafe review target.");
      const path = posix.join(parent, relative),
        file = entries.get(path);
      if (!sha.safeParse(expected).success || !file || file.sha256 !== expected)
        throw Error("Review targets do not match the verified intake version.");
    }
  };
  if (new Set(selected).size !== selected.length) throw Error("Duplicate review selection.");
  const reviews = selected.map((path) => {
    const review = read(path, "review"),
      parent = posix.dirname(path);
    if (
      !["SOURCE", "PRACTICAL"].includes(review.review_kind) ||
      !["APPROVE", "REVISE", "HOLD", "REJECT"].includes(review.decision) ||
      !text.safeParse(review.reviewer_agent).success ||
      typeof review.human_validation !== "boolean"
    )
      throw Error("Unsupported review shape; no approval inferred.");
    if (
      review.decision === "APPROVE" &&
      (!Array.isArray(review.item_reviews) ||
        !review.item_reviews.length ||
        review.item_reviews.some((item) => item.decision !== "APPROVE") ||
        !Array.isArray(review.unresolved_issues) ||
        review.unresolved_issues.length)
    )
      throw Error("Review approval conflicts with item decisions or unresolved issues.");
    verifyTargets(review.target_hashes, parent);
    for (const required of [
      "APP-FINAL.json",
      "CATALOGUE.json",
      "RECONCILED-SOURCE.json",
      "INCLUSION-DECISIONS.json",
      "APP-SOURCE-LINKS.json",
      "REVIEW-BASIS.json",
    ])
      if (!review.target_hashes[required]) throw Error("Incomplete report review binding.");
    if (review.additional_target_hashes) verifyTargets(review.additional_target_hashes, parent);
    const basis = read(posix.join(parent, "REVIEW-BASIS.json"), "review-basis");
    verifyTargets(basis.files, parent);
    return {
      path,
      sha256: entries.get(path).sha256,
      kind: review.review_kind,
      reviewer: review.reviewer_agent,
      decision: review.decision,
      humanValidation: review.human_validation,
      basis: review.target_hashes["REVIEW-BASIS.json"],
      bindingVerified: true,
    };
  });
  if (
    reviews.length > 1 &&
    (new Set(reviews.map((r) => r.kind)).size !== reviews.length ||
      new Set(reviews.map((r) => r.reviewer)).size !== reviews.length ||
      new Set(reviews.map((r) => r.basis)).size !== 1)
  )
    throw Error("Reviews must be distinct and bound to the same basis.");
  return reviews;
}

export async function collectEvidence(input, sources) {
  const { plan, base } = input,
    results = [],
    links = [];
  for (const entry of plan.publications) {
    try {
      const settingsPath = resolve(base, entry.settings),
        settingsFile = readJson(settingsPath, 16384);
      const settings = readDatabaseSettings(settingsPath);
      if (settings.release !== entry.release || settings.publication !== entry.publication)
        throw Error("Publication settings differ from the retained pins.");
      const verified = checkRuntimeDatabase(settings, {
        includeReportMetadata: true,
        includePackageMetadata: true,
      });
      if (readJson(settingsPath, 16384).hash !== settingsFile.hash)
        throw Error("Settings changed during verification.");
      const matches = matchReports(verified.reports, sources, entry.mappings);
      const facts = {
        label: entry.label,
        type: entry.kind,
        status: "verified",
        release: settings.release,
        publication: settings.publication,
        contract: verified.contract,
        reportCount: verified.reports.length,
        matched: matches.results.length,
        unmatched: matches.unmatched,
        newContentApproval: false,
        otherPackages: verified.packages.filter((p) => p.kind !== "report"),
      };
      results.push(facts);
      for (const match of matches.results)
        links.push({
          sourceId: match.sourceId,
          kind: entry.kind,
          facts: {
            ...facts,
            unmatched: undefined,
            reportCount: undefined,
            matched: undefined,
            otherPackages: undefined,
            package: match.report,
            match: match.match,
            reason: match.reason,
          },
        });
    } catch {
      results.push({
        label: entry.label,
        type: entry.kind,
        status: "failed",
        message:
          "Publicatie, integriteit of bronkoppeling niet bevestigd. Controleer instellingen, pins en koppelingen.",
      });
    }
  }
  for (const entry of plan.intakes) {
    let intakeFacts;
    try {
      if (!sources.some((s) => s.id === entry.sourceId)) throw Error("Unknown backlog source.");
      const path = resolve(base, entry.manifest);
      const checked = await checkIntake(path, {
        expectedSha256: entry.manifestSha256,
        historicalReport: entry.historicalReport,
      });
      if (
        checked.package.id !== entry.packageId ||
        checked.package.version !== entry.packageVersion ||
        checked.package.kind !== "report"
      )
        throw Error("Intake identity mismatch.");
      intakeFacts = {
        label: entry.label,
        type: "intake",
        status: "verified",
        package: checked.package,
        manifestSha256: checked.manifestSha256,
        files: checked.files,
        reason: entry.reason,
        match: "explicit",
        newContentApproval: false,
      };
      links.push({ sourceId: entry.sourceId, kind: "intake", facts: intakeFacts });
      results.push(intakeFacts);
      if (entry.reviews.length) {
        const manifest = readJson(path, 1024 * 1024, entry.manifestSha256).value;
        const reviews = reviewBindings(manifest, dirname(path), entry.reviews);
        const facts = {
          ...intakeFacts,
          type: "review",
          reviews,
          bothApproved: reviews.length === 2 && reviews.every((r) => r.decision === "APPROVE"),
        };
        results.push(facts);
        links.push({ sourceId: entry.sourceId, kind: "review", facts });
      }
    } catch {
      results.push({
        label: entry.label,
        sourceId: entry.sourceId,
        type: intakeFacts ? "review" : "intake",
        status: "failed",
        message: intakeFacts
          ? "Reviewbinding niet bevestigd; ontvangst alleen bewijst geen inhoudelijke goedkeuring."
          : "Intake niet bevestigd. Controleer het volledige pakket, de behouden manifesthash en bronkoppeling.",
      });
    }
  }
  for (const entry of plan.archives || []) {
    try {
      if (!sources.some((s) => s.id === entry.sourceId)) throw Error("Unknown source.");
      const archive = historicalReportBinding(entry, base);
      const facts = {
        label: entry.label,
        type: "review",
        status: "verified",
        package: { id: entry.packageId, version: archive.basis },
        reason: entry.reason,
        receiptSha256: entry.receiptSha256,
        evidenceScope: "historical-review",
        reviews: archive.reviews,
        bothApproved: archive.reviews.every((r) => r.decision === "APPROVE"),
        newContentApproval: false,
      };
      results.push(facts);
      links.push({ sourceId: entry.sourceId, kind: "review", facts });
    } catch {
      results.push({
        label: entry.label,
        sourceId: entry.sourceId,
        type: "review",
        status: "failed",
        message:
          "Historische reviewbinding niet bevestigd. Controleer ontvangstbewijs, bestanden en bronidentiteit.",
      });
    }
  }
  return { planHash: input.hash, results, links };
}

// Narrow historical adapter: a retained receipt pins the reviews and their basis.
// This does not claim a complete intake, source PDF validation or current approval.
export function historicalReportBinding(entry, base) {
  const receipt = readJson(resolve(base, entry.receipt), 1024 * 1024, entry.receiptSha256).value;
  if (receipt.report_id !== entry.packageId || !receipt.files)
    throw Error("Receipt identity mismatch.");
  const root = resolve(base, entry.directory),
    files = new Map();
  let totalBytes = 0;
  const add = (path, expected) => {
    if (
      !sha.safeParse(expected).success ||
      typeof path !== "string" ||
      path.split("/").some((p) => !p || p === "." || p === ".." || /[\\:]/.test(p))
    )
      throw Error("Unsafe historical evidence path.");
    if (files.has(path)) {
      if (files.get(path).sha256 !== expected) throw Error("Conflicting archive binding.");
      return;
    }
    let target = root;
    for (const part of path.split("/")) {
      target = resolve(target, part);
      if (lstatSync(target).isSymbolicLink()) throw Error("Linked archive evidence refused.");
    }
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.size > 32 * 1024 * 1024 || files.size >= 1000)
      throw Error("Archive file limit.");
    const bytes = readFileSync(target);
    totalBytes += bytes.length;
    if (totalBytes > 256 * 1024 * 1024 || hash(bytes) !== expected)
      throw Error("Archive integrity mismatch.");
    files.set(path, {
      path,
      sha256: expected,
      bytes: bytes.length,
      roles:
        path === "REVIEW-BASIS.json"
          ? ["review-basis"]
          : path.endsWith("-final-review.json")
            ? ["review"]
            : ["supporting"],
    });
  };
  for (const [path, expected] of Object.entries(receipt.files)) add(path, expected);
  if (!files.has("REVIEW-BASIS.json") || !files.has("APP-FINAL.json"))
    throw Error("Missing archive basis.");
  const basis = readJson(
    resolve(root, "REVIEW-BASIS.json"),
    1024 * 1024,
    receipt.files["REVIEW-BASIS.json"],
  ).value;
  if (!basis.files || !Object.keys(basis.files).length) throw Error("Empty archive basis.");
  for (const [path, expected] of Object.entries(basis.files)) add(path, expected);
  const app = readJson(
    resolve(root, "APP-FINAL.json"),
    16 * 1024 * 1024,
    receipt.files["APP-FINAL.json"],
  ).value;
  if (app.framework?.report?.id !== entry.packageId) throw Error("Report identity mismatch.");
  const reviews = reviewBindings({ files: [...files.values()] }, root, [
    "source-final-review.json",
    "audit-final-review.json",
  ]);
  return { reviews, basis: receipt.files["REVIEW-BASIS.json"] };
}
