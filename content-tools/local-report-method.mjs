// Portable checks for the retained single-report-kit 1.1 execution evidence.
// Never executes the scripts carried by a packet or generates an approval.
import { posix } from "node:path";
import { need, text, same, exactKeys, cover, time, object } from "./source-evidence-reader.mjs";
import { baselineRegistryCounts } from "./baseline-registry-counts.mjs";

import { reportStages } from "../skills/omnibus-add-report/scripts/report-stages.mjs";
export { reportStages };
const targets = reportStages.source_final_review[1];

function releaseCheck(e) {
  const { proof, final, read, pinned, manifest, digest } = e;
  exactKeys(proof.release, ["manifest", "approval"], "trusted kit release");
  const release = pinned(proof.release.manifest), approval = pinned(proof.release.approval), binding = read("RELEASE-BINDING.json");
  need(binding.kit_manifest_sha256 === proof.release.manifest.sha256 && binding.kit_approval_sha256 === proof.release.approval.sha256,
    "kit release differs from external pins");
  need(digest(binding.kit_manifest_path, binding.kit_manifest_sha256).file.id === proof.release.manifest.fileId &&
    digest(binding.kit_approval_path, binding.kit_approval_sha256).file.id === proof.release.approval.fileId, "kit path identity mismatch");
  need(approval.decision === "APPROVE" && approval.target_manifest_sha256 === proof.release.manifest.sha256 &&
    text(approval.reviewer_agent) && text(release.author_agent) && approval.reviewer_agent !== release.author_agent, "independent exact kit approval required");
  const required = ["tools/gate.py", "tools/workflow.py", "tools/stage_custody.py", "tools/measure_usage.py", "tools/snapshot-taxonomy.mjs",
    "contracts/CONTRACT.md", "contracts/record_contract.py", "QUALITY.md", "WORKFLOW.md", "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json"];
  need(object(release.files) && required.every(name => Object.hasOwn(release.files, name)), "kit manifest omits required members");
  const folder = posix.dirname(manifest.files.find(file => file.id === proof.release.manifest.fileId).path);
  for (const [name, expected] of Object.entries(release.files)) {
    need(name.split("/").every(part => part && part !== "." && part !== ".." && !/[\\:]/u.test(part)), "invalid kit member path");
    const file = manifest.files.find(file => file.path === folder + "/" + name);
    need(file?.sha256 === expected, "released kit member missing/changed: " + name);
    // Check actual bytes too, not just the manifest's declarations.
    e.pinBytes({ fileId: file.id, sha256: expected });
  }
  for (const name of ["gate.py", "workflow.py", "stage_custody.py", "snapshot-taxonomy.mjs"])
    need(final.engine?.[name] === release.files["tools/" + name], "unreviewed extraction engine");
  need(same(final.contract, proof.contracts), "contract differs from externally retained version");
  for (const [name, expected] of Object.entries(proof.contracts)) {
    need(release.files["contracts/" + name] === expected, "contract not in approved kit");
    for (const role of ["extractor", "inventory"]) digest(role + "/" + name, expected);
  }
  digest("REVIEW-CONTRACT.json", release.files["REVIEW-CONTRACT.json"]);
}

function stagesCheck(e) {
  const { read, pointer, hashes, final, first } = e, index = read("STAGE-INDEX.json"), stages = read("STAGES.json");
  exactKeys(index, Object.keys(reportStages), "stage index");
  exactKeys(stages, Object.keys(reportStages), "recorded stages");
  exactKeys(final.actors, Object.keys(reportStages), "observed actors");
  exactKeys(final.stage_receipts, Object.keys(reportStages), "final stage receipts");
  exactKeys(first.first_stage_receipts, ["source_a", "source_b"], "first reader receipts");
  const ends = {}, starts = {};
  for (const [name, [outputs, inputs, dependencies]] of Object.entries(reportStages)) {
    const entry = index[name], end = pointer(entry.end), start = pointer(entry.start);
    need(same(end.start, entry.start) && same(final.stage_receipts[name], entry.end), "stage receipt replaced");
    need(start.stage === name && end.stage === name && start.status === "STARTED" && end.status === "COMPLETE" &&
      Number.isInteger(entry.revision) && entry.revision > 0 && start.revision === entry.revision, "stage provenance/revision mismatch");
    need(text(start.actor) && start.actor === end.actor && end.actor === final.actors[name] && text(end.execution_observation), "stage identity/observation missing");
    need(same(start.inputs, end.inputs), "stage inputs recreated at completion");
    hashes(start.inputs, [...inputs, "RELEASE-BINDING.json"]); hashes(end.artifacts, outputs);
    exactKeys(start.dependencies, dependencies, "stage dependencies");
    for (const dep of dependencies) {
      need(same(start.dependencies[dep], index[dep].end), "stale dependency receipt");
      need(time(pointer(index[dep].end).completed_at) <= time(start.started_at), "stage started before dependency completed");
    }
    need(time(start.started_at) <= time(end.completed_at) && time(end.completed_at) <= time(final.sealed_at), "stage time order invalid");
    need(same(stages[name], Object.fromEntries(["status", "actor", "inputs", "artifacts"].map(key => [key, end[key]]))), "stage summary differs from actual receipts");
    ends[name] = end; starts[name] = start;
  }
  const frozen = read("FIRST-SUBMISSIONS.json");
  for (const name of ["source_a", "source_b"]) {
    need(same(first.first_stage_receipts[name], index[name].end), "original first reader execution replaced");
    need(time(ends[name].completed_at) <= time(frozen.frozen_at), "first freeze precedes reader completion");
  }
  need(time(frozen.frozen_at) <= time(first.created_at) && time(first.created_at) <= time(starts.reconciliation.started_at), "comparison precedes first receipt");
  return final.actors;
}

export function checkReportMethod(e) {
  const { read, lookup, digest, hashes, pointer, proof, first, final, manifest, reviews, authorIds } = e;
  need(final.workflow_version === "single-report-kit-v1" && text(final.packet_id) && final.report_id === manifest.package.id && text(final.candidate), "report receipt scope mismatch");
  need(final.actual_agent_separation_verified === true && text(final.identity_verification_basis) &&
    final.human_acceptance_required === true && final.automatic_next_report_allowed === false, "coordinator observation/acceptance stop missing");
  need(final.first_receipt_sha256 === proof.firstReceipt.sha256 &&
    digest(final.first_receipt_path, final.first_receipt_sha256).file.id === proof.firstReceipt.fileId && first.packet_id === final.packet_id,
  "original first receipt replaced");
  const anchors = ["PILOT-CONTROL.json", "INPUT-FREEZE.json", "FIRST-SUBMISSIONS.json", "BASELINE-FREEZE.json", "SELECTION.json", "RELEASE-BINDING.json"];
  hashes(first.files, anchors); hashes(final.files, [...anchors, "STAGES.json", ...targets]);
  for (const [name, expected] of Object.entries(first.files)) need(final.files[name] === expected, "original custody anchor rebased");
  need(read("REVIEW-BASIS.json").first_custody_receipt_sha256 === proof.firstReceipt.sha256, "review basis lost first custody anchor");
  const firstPointer = read("CUSTODY-FIRST.json"); pointer(firstPointer);
  need(firstPointer.sha256 === proof.firstReceipt.sha256 && same(pointer(firstPointer), first), "first pointer differs from external receipt");
  releaseCheck(e);
  const control = read("PILOT-CONTROL.json");
  need(["packet_id", "report_id", "candidate"].every(key => control[key] === final[key]) && control.one_report_only === true &&
    control.acceptance_stop_required === true && control.second_report_authorized === false && control.model === "gpt-6-astra" &&
    control.ordinary_allowance_only === true && control.paid_extras_authorized === false, "original single-report authorization changed");
  const source = read("SOURCE.json"), freeze = read("INPUT-FREEZE.json"), firstSubmissions = read("FIRST-SUBMISSIONS.json");
  digest(source.pdf_path, source.pdf_sha256);
  need(freeze.pdf_sha256 === source.pdf_sha256 && freeze.text_sha256 === source.text_sha256, "input source freeze differs");
  const members = ["extractor", "inventory"].flatMap(role => ["TASK.md", "CONTRACT.md", "record_contract.py", "source.txt", "SOURCE.json"].map(name => role + "/" + name));
  hashes(freeze.packet_hashes); cover(Object.keys(freeze.packet_hashes).map(name => name.replaceAll("\\", "/")), members, null, "reader input freeze");
  for (const role of ["extractor", "inventory"]) {
    digest(role + "/source.txt", source.text_sha256); digest(role + "/SOURCE.json", lookup("SOURCE.json").file.sha256);
  }
  need(firstSubmissions.comparison_started === false && text(firstSubmissions.frozen_by), "first submissions not frozen before comparison");
  exactKeys(firstSubmissions.first_submissions, ["extractor", "inventory"], "first submissions");
  const support = ["extractor", "inventory"].flatMap(role => ["READ-LOG.json", "VISUAL-EVIDENCE.json"].map(name => role + "/output/" + name));
  hashes(firstSubmissions.support_hashes, support);
  const actors = stagesCheck(e), pages = source.pages.map(page => page.page), readers = [];
  for (const [role, stage] of [["extractor", "source_a"], ["inventory", "source_b"]]) {
    const frozen = firstSubmissions.first_submissions[role];
    need(frozen.path === role + "/output/result.json", "first submission path mismatch"); pointer(frozen);
    const log = read(role + "/output/READ-LOG.json");
    need(log.author_agent === actors[stage], "reading/stage identity mismatch"); readers.push(log.author_agent);
    for (const key of ["text_pages_read", "visual_pages_read"]) cover(log[key], pages, null, "reader " + key);
  }
  need(new Set(readers).size === 2 && !readers.includes(actors.reconciliation), "blind reader/reconciler independence missing");
  for (const role of ["practical_draft_review", "source_final_review", "practical_final_review"])
    need(![actors.practical_authoring, actors.repairs, ...authorIds].includes(actors[role]), "practical author self-review");
  need(![...readers, actors.reconciliation].includes(actors.source_final_review) && actors.source_final_review !== actors.practical_final_review,
    "source self-review or overlapping final reviewers");
  const reconciliation = read("RECONCILIATION-LOG.json"), bank = read("RECONCILED-SOURCE.json");
  need(reconciliation.author_agent === actors.reconciliation && bank.author_agent === actors.reconciliation, "reconciliation author mismatch");
  cover(reconciliation.all_page_read_log, pages, "page", "reconciler reading");
  need(reconciliation.all_page_read_log.every(row => row.text_read === true && row.visual_read === true &&
    Object.entries(row).some(([key, value]) => key !== "page" && text(value))), "reconciler observation missing");
  const author = read("AUTHORING.json"), repair = read("REPAIRS.json"), draft = read("audit-draft-review.json");
  need(author.author_agent === actors.practical_authoring && repair.author_agent === actors.repairs &&
    draft.reviewer_agent === actors.practical_draft_review && ["APPROVE", "REVISE"].includes(draft.decision), "draft/repair provenance mismatch");
  digest("audit-proposals.json", author.proposal_sha256);
  hashes(draft.target_hashes, ["APP-DRAFT.json", "CATALOGUE-DRAFT.json"]);
  cover(draft.item_reviews, read("APP-DRAFT.json").framework.lines.map(line => line.id), "id", "draft review");
  need(draft.item_reviews.every(item => ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"]
    .every(key => text(item.field_assessments?.[key]))), "missing draft field assessment");
  need(Array.isArray(draft.required_changes) && (draft.decision !== "REVISE" || draft.required_changes.length), "missing draft change register");
  digest("audit-draft-review.json", repair.draft_review_sha256); digest("APP-FINAL.json", repair.app_final_sha256); digest("CATALOGUE.json", repair.catalogue_sha256);
  need(Array.isArray(repair.dispositions) && repair.dispositions.every(row => text(row.id) && text(row.resolution)) &&
    new Set(repair.dispositions.map(row => row.id)).size === repair.dispositions.length &&
    draft.required_changes.every(row => repair.dispositions.some(disposition => disposition.id === row.id)), "draft repair dispositions incomplete");
  const taxonomy = read("TAXONOMY-SNAPSHOT.json");
  need(taxonomy.file_sha256 === final.taxonomy_sha256, "taxonomy custody mismatch"); digest(taxonomy.path, taxonomy.file_sha256);
  const processes = read("CATALOGUE.json").process_mappings.map(row => row.process_id), issues = read("ISSUES.json").issues.map(row => row.id);
  for (const [role, filename, stage] of [["SOURCE", "source-final-review.json", "source_final_review"], ["PRACTICAL", "audit-final-review.json", "practical_final_review"]]) {
    const review = read(filename);
    need(same(review, reviews.find(value => value.review_kind === role)) && review.reviewer_agent === actors[stage], "final review differs from executed stage");
    need(review.taxonomy_approved === true && text(review.taxonomy_assessment) && text(review.scope_and_limitations) && same(review.accepted_issue_ids, issues), "final review scope/taxonomy/issues missing");
    cover(review.process_mapping_reviews, processes, "process_id", "process review");
    need(review.process_mapping_reviews.every(row => row.decision === "APPROVE" && text(row.assessment)), "process review not approved");
    if (role === "SOURCE") {
      const log = review.reading_log;
      need(log?.author_agent === review.reviewer_agent && log.source_text_sha256 === source.text_sha256 && log.source_pdf_sha256 === source.pdf_sha256, "final reading source/author mismatch");
      for (const key of ["text_pages_read", "visual_pages_read"]) cover(log[key], pages, null, "source reviewer " + key);
      need(["completeness", "reconciliation", "omissions", "supplements", "limitations", "management_response"].every(key => text(review.source_assessments?.[key])), "missing full source review");
    }
  }
  const baseline = read("BASELINE-FREEZE.json"); hashes(baseline.files);
  need([baseline.active_reports, baseline.active_items].every(value => Number.isInteger(value) && value >= 0), "baseline counts invalid");
  const registries = Object.keys(baseline.files).filter(name => name.replaceAll("\\", "/").endsWith("/viewer/app/reviewed-reports.json"));
  need(registries.length === 1, "original active registry not frozen");
  const registry = baselineRegistryCounts(digest(registries[0], baseline.files[registries[0]]).bytes);
  need(registry.reports === baseline.active_reports && registry.lines === baseline.active_items, "baseline registry counts differ");
  return { contract: "report-kit-1.1", stages: 8, completeReadings: 4, pages: pages.length };
}
