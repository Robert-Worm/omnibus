// CIO-contract/addendum custody, kept separate from report-kit stage receipts.
// Historical draft receipts are checked against the retained draft, never fixed
// by rehashing them against the current catalogue.
import { need, text, same, cover, time, object } from "./source-evidence-reader.mjs";

const draftReviews = ["authoring/DRAFT-REVIEW.json", "reviews/legal-draft-review.json", "reviews/source-draft-review.json"];
export const frameworkMethodDependencies = ["SCHEMA-NOTES.txt", "reconciliation/READ-LOG.json", "LEGACY-BASELINE.json", "CHALLENGE-CASES.json",
  "custody/FIRST-SUBMISSIONS.json", "custody/STABLE-SOURCE.json", "custody/FIRST-DRAFT.json", "custody/DRAFT-REVIEWS.json",
  "reconciliation/UNCOVERED-LINES.json", "authoring/DRAFT.json", ...draftReviews, "authoring/REPAIRS.json",
  "reviews/source-preliminary.json", "reviews/legal-preliminary.json", "authoring/STAGE-START.json", "reconciliation/STAGE-START.json",
  ...["reader-a", "reader-b"].flatMap(role => ["result.json", "READ-LOG.json", "STAGE-START.json"].map(name => role + "/" + name))];

export function checkFrameworkMethod(e) {
  const { read, lookup, digest, hashes, proof, first, final, reviews, dependencies, manifest, authorIds } = e;
  for (const [name, expected] of Object.entries(proof.contracts)) digest(name, expected);
  need(lookup("custody/FIRST-SUBMISSIONS.json").file.id === proof.firstReceipt.fileId &&
    lookup("custody/FINAL-RECEIPT.json").file.id === proof.finalReceipt.fileId, "framework receipt identity mismatch");
  const source = read("SOURCE-MANIFEST.json"), pages = read("source/pages.json").map(page => page.page);
  need(source.page_count === pages.length, "source page count mismatch");
  const images = pages.map(page => `source/page-${String(page).padStart(2, "0")}.png`);
  need([...frameworkMethodDependencies, ...images].every(name => Object.hasOwn(dependencies, name)), "missing frozen reading/custody dependency");
  const sourceBinding = value => {
    need(value.contract_sha256 === proof.contracts["CONTRACT.txt"] && value.source_pdf_sha256 === lookup("source/source.pdf").file.sha256 &&
      value.source_pages_sha256 === lookup("source/pages.json").file.sha256, "reading/start source or contract changed");
  };
  const reading = (name, actor) => {
    const log = read(name); sourceBinding(log);
    need(log.author_agent === actor && text(actor) && Array.isArray(log.limitations), "reading author/limitations missing");
    for (const key of ["text_pages_read", "image_pages_viewed"]) {
      cover(log[key], pages, "page", "framework " + key);
      need(log[key].every(row => Object.entries(row).some(([key, value]) => key !== "page" && text(value))), "missing substantive page observation");
    }
  };
  const bank = read("RECONCILED-SOURCE.json"), catalogue = read("CATALOGUE.json"), reconciliation = read("RECONCILIATION.json");
  const readers = ["reader-a", "reader-b"].map(role => read(role + "/result.json").author_agent);
  need(new Set(readers).size === 2 && readers.every(text) && !readers.includes(bank.author_agent), "framework reader independence missing");
  const firstFiles = ["reader-a", "reader-b"].flatMap(role => ["result.json", "READ-LOG.json", "STAGE-START.json"].map(name => role + "/" + name));
  hashes(first.files, firstFiles, true);
  need(first.event === "first_submissions_frozen" && text(first.coordinator) && text(first.completion_observed), "first freeze observation missing");
  cover(first.agents, readers, null, "observed first readers");
  for (const [index, role] of ["reader-a", "reader-b"].entries()) {
    reading(role + "/READ-LOG.json", readers[index]);
    const start = read(role + "/STAGE-START.json"); sourceBinding(start);
    need(start.author_agent === readers[index] && (text(start.independence) || text(start.blind_scope)) &&
      time(start.started_at_utc) <= time(first.observed_at_utc), "reader start provenance/order missing");
  }
  reading("reconciliation/READ-LOG.json", bank.author_agent);
  need(reconciliation.author_agent === bank.author_agent && reconciliation.first_submissions_freeze_sha256 === proof.firstReceipt.sha256 &&
    reconciliation.reading_log?.path === "reconciliation/READ-LOG.json" &&
    reconciliation.reading_log.sha256 === lookup("reconciliation/READ-LOG.json").file.sha256 &&
    ((Array.isArray(reconciliation.omission_audit) && reconciliation.omission_audit.length) ||
      (object(reconciliation.omission_audit) && Object.keys(reconciliation.omission_audit).length)), "reconciliation reading/freeze/omissions missing");
  const stable = read("custody/STABLE-SOURCE.json"), start = read("reconciliation/STAGE-START.json");
  hashes(start.input_hashes, ["custody/FIRST-SUBMISSIONS.json", "source/source.pdf", "source/pages.json", ...firstFiles]);
  hashes(stable.files, ["RECONCILED-SOURCE.json", "RECONCILIATION.json", "reconciliation/READ-LOG.json", "reconciliation/STAGE-START.json", "reconciliation/UNCOVERED-LINES.json"]);
  need(start.actor === bank.author_agent && stable.author === bank.author_agent && stable.author_completion_observed === true &&
    stable.semantic_final_approval === false && stable.event === "stable_source_bank_received", "stable source receipt provenance missing");
  need(time(first.observed_at_utc) <= time(start.started_at_utc) && time(start.started_at_utc) <= time(stable.observed_at_utc), "reconciliation starts before first freeze");
  const authorStart = read("authoring/STAGE-START.json"), draftReceipt = read("custody/FIRST-DRAFT.json"), draft = read("authoring/DRAFT.json");
  hashes(authorStart.input_hashes, ["RECONCILED-SOURCE.json", "RECONCILIATION.json", "source/source.pdf", "source/pages.json"]);
  need(authorStart.author_agent === catalogue.author_agent && draftReceipt.author === catalogue.author_agent && draft.author_agent === catalogue.author_agent &&
    draftReceipt.completion_observed === true && draftReceipt.semantic_approval === false &&
    draftReceipt.event === "first_complete_practical_draft_received", "practical draft provenance missing");
  need(time(stable.observed_at_utc) <= time(authorStart.started_at) && time(authorStart.started_at) <= time(draftReceipt.observed_at_utc), "authoring started before stable source");
  // The first catalogue was later repaired. Its frozen bytes are still DRAFT,
  // not the final CATALOGUE; do not mutate a historical receipt to make it match.
  need(draftReceipt.files?.["CATALOGUE.json"] === lookup("authoring/DRAFT.json").file.sha256, "first catalogue draft lost");
  hashes(Object.fromEntries(Object.entries(draftReceipt.files).filter(([name]) => name !== "CATALOGUE.json")), ["authoring/DRAFT.json", "authoring/STAGE-START.json"]);
  const draftFreeze = read("custody/DRAFT-REVIEWS.json"), repairs = read("authoring/REPAIRS.json");
  hashes(draftFreeze.files, draftReviews, true);
  need(draftFreeze.draft_sha256 === lookup("authoring/DRAFT.json").file.sha256 && draftFreeze.final_approval === false &&
    draftFreeze.event === "three_draft_reviews_received_before_repair", "draft review receipt mismatch");
  need(time(draftReceipt.observed_at_utc) <= time(draftFreeze.observed_at_utc) && time(draftFreeze.observed_at_utc) <= time(repairs.created_at_utc), "repair precedes recorded draft reviews");
  need(repairs.author_agent === catalogue.author_agent && repairs.human_validation === false && repairs.approval === false,
    "repair author/approval mismatch");
  hashes(repairs.input_hashes, ["authoring/DRAFT.json", "RECONCILED-SOURCE.json", ...draftReviews]);
  hashes(repairs.output_hashes, ["CATALOGUE.json"]);
  const draftActors = draftReviews.map(name => read(name).reviewer_agent);
  need(new Set(draftActors).size === 3 && draftActors.every(actor => text(actor) && ![catalogue.author_agent, ...authorIds].includes(actor)), "draft reviewer independence missing");
  cover(draftFreeze.actual_distinct_reviewers, draftActors, null, "observed draft reviewers");
  for (const name of draftReviews) {
    const review = read(name);
    need(["APPROVE", "REVISE"].includes(review.decision) && draftFreeze.decisions?.[name] === review.decision, "draft decision mismatch");
    need(review.target_hashes?.["CATALOGUE.json"] === lookup("authoring/DRAFT.json").file.sha256 &&
      review.target_hashes?.["authoring/DRAFT.json"] === lookup("authoring/DRAFT.json").file.sha256, "draft review targets changed");
    hashes(Object.fromEntries(Object.entries(review.target_hashes).filter(([target]) => target !== "CATALOGUE.json")),
      ["authoring/DRAFT.json", "RECONCILED-SOURCE.json"]);
  }
  const cases = read("CHALLENGE-CASES.json").cases, caseIds = cases.map(row => row.id);
  need(caseIds.length > 0 && new Set(caseIds).size === caseIds.length && caseIds.every(text), "challenge case identities missing");
  const ids = new Set([...bank.records, ...catalogue.goals, ...catalogue.objectives, ...catalogue.criteria, ...catalogue.points].map(row => row.id));
  const reviewHashes = {};
  for (const role of ["SOURCE", "LEGAL", "PRACTICAL"]) {
    const name = `reviews/${role.toLowerCase()}-final.json`, review = read(name);
    need(same(review, reviews.find(row => row.review_role === role)), "final receipt review differs from reviewed file");
    reviewHashes[name] = lookup(name).file.sha256;
    cover(review.challenge_reviews, caseIds, "id", "adversarial review");
    need(review.challenge_reviews.every(row => row.decision === "APPROVE" && text(row.reason) && Array.isArray(row.object_ids) &&
      row.object_ids.length && new Set(row.object_ids).size === row.object_ids.length && row.object_ids.every(id => ids.has(id))), "challenge unresolved/unbound");
    if (role === "SOURCE") {
      reading("reviews/source-final-READ-LOG.json", review.reviewer_agent);
      digest("reviews/source-final-READ-LOG.json", review.reading_log_sha256);
    }
  }
  need(final.coordinator === first.coordinator && final.decision === "PASS_FOR_TOOL_INTEGRATION_REVIEW" &&
    final.reviews_read_in_full === true && final.actual_role_separation_verified === true && final.human_validation === false &&
    text(final.reading_method), "actual final review observation missing");
  need(same(final.review_hashes, reviewHashes) && final.review_basis_sha256 === lookup("REVIEW-BASIS.json").file.sha256, "final receipt review binding changed");
  const roles = final.role_separation;
  need(roles && text(roles.basis) && same(roles.independent_source_readers, readers) && roles.reconciler === bank.author_agent &&
    roles.practical_author_and_repairer === catalogue.author_agent &&
    ["SOURCE", "LEGAL", "PRACTICAL"].every(role => roles[role.toLowerCase() + "_final"] === reviews.find(row => row.review_role === role).reviewer_agent),
  "coordinator role observation differs from actual authors/reviewers");
  need(time(repairs.created_at_utc) <= time(final.accepted_at_utc), "final receipt precedes repair");
  const migration = read("MIGRATION.json"), legacy = read("LEGACY-BASELINE.json");
  digest("LEGACY-BASELINE.json", migration.legacy_manifest_sha256);
  need(migration.automatic_migration === false && migration.redistribute_question_links === false && migration.preserve_saved_snapshots === true &&
    migration.new_source_id === manifest.package.id, "unsafe migration policy");
  const old = new Map(legacy.items.map(row => [row.originKey, row.id]));
  for (const row of legacy.replacements ?? []) if (!old.has(row.oldOriginKey)) old.set(row.oldOriginKey, row.oldId);
  for (const key of legacy.legacy_origin_keys) if (!old.has(key)) old.set(key, null);
  cover(migration.entries, [...old.keys()], "old_origin_key", "legacy identity coverage");
  need(!catalogue.points.some(point => [...old.values()].includes(point.id)), "new point reuses legacy identity");
  need(migration.entries.every(row => row.old_id === old.get(row.old_origin_key) && row.disposition === "KEEP_SAVED_SNAPSHOT" && text(row.reason) &&
    Array.isArray(row.new_point_ids) && row.new_point_ids.length === 0), "unreviewed migration equivalence");
  return { contract: "framework-cio-0.1+addendum-01", completeReadings: 4, pages: pages.length, preservedIdentities: old.size };
}
