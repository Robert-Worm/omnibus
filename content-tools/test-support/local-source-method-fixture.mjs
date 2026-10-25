// Entirely fictitious execution evidence for software tests. These receipts do
// not describe a real reading, reviewer or releasable source package.
import { sourceReviewFixture } from "./local-source-review-fixture.mjs";
import { reportViewerFixture } from "./local-report-viewer-fixture.mjs";
import { reportStages } from "../local-report-method.mjs";
import { frameworkMethodDependencies } from "../local-framework-method.mjs";

const stamp = minute => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();
export function sourceMethodFixture(kind) {
  const f = kind === "report" ? reportViewerFixture() : sourceReviewFixture(kind);
  const { set, read, paths } = f, hash = name => paths.get(name).sha256;
  const hashes = names => Object.fromEntries(names.map(name => [name, hash(name)]));
  const proof = { firstReceipt: null, finalReceipt: null, paths: [], contracts: {} };
  const pin = name => ({ fileId: paths.get(name).id, sha256: hash(name) });
  const pointer = name => ({ path: "/synthetic-evidence/" + name, sha256: hash(name) });
  const external = name => { proof.paths.push({ original: pointer(name).path, fileId: paths.get(name).id }); return pointer(name); };
  const roles = kind === "report" ? ["SOURCE", "PRACTICAL"] : ["SOURCE", "LEGAL", "PRACTICAL"];
  function basisAndReviews() {
    const basis = read("REVIEW-BASIS.json"), map = kind === "report" ? basis.files : basis.target_hashes;
    for (const name of Object.keys(map)) map[name] = hash(name);
    set("REVIEW-BASIS.json", basis);
    for (const role of roles) {
      const review = read(`reviews/${role}.json`);
      review.target_hashes = kind === "report" ? hashes(["APP-FINAL.json", "CATALOGUE.json", "RECONCILED-SOURCE.json",
        "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "REVIEW-BASIS.json"])
        : { ...map, "REVIEW-BASIS.json": hash("REVIEW-BASIS.json") };
      set(`reviews/${role}.json`, review);
      set(kind === "report" ? role === "SOURCE" ? "source-final-review.json" : "audit-final-review.json"
        : `reviews/${role.toLowerCase()}-final.json`, review);
    }
  }
  if (kind === "report") {
    const kit = ["tools/gate.py", "tools/workflow.py", "tools/stage_custody.py", "tools/measure_usage.py", "tools/snapshot-taxonomy.mjs",
      "contracts/CONTRACT.md", "contracts/record_contract.py", "QUALITY.md", "WORKFLOW.md", "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json"];
    for (const name of kit) set("kit/" + name, name === "REVIEW-CONTRACT.json" ? { synthetic: true } : "Fictief hulpmiddel; nooit uitvoeren.");
    set("kit/RELEASE-MANIFEST.json", { author_agent: "synthetic-kit-author", files: Object.fromEntries(kit.map(name => [name, hash("kit/" + name)])) });
    set("kit/APPROVAL.json", { reviewer_agent: "synthetic-kit-reviewer", decision: "APPROVE", target_manifest_sha256: hash("kit/RELEASE-MANIFEST.json") });
    proof.release = { manifest: pin("kit/RELEASE-MANIFEST.json"), approval: pin("kit/APPROVAL.json") };
    set("RELEASE-BINDING.json", { kit_manifest_path: external("kit/RELEASE-MANIFEST.json").path, kit_manifest_sha256: proof.release.manifest.sha256,
      kit_approval_path: external("kit/APPROVAL.json").path, kit_approval_sha256: proof.release.approval.sha256 });
    for (const name of ["CONTRACT.md", "record_contract.py"]) proof.contracts[name] = hash("kit/contracts/" + name);
    set("REVIEW-CONTRACT.json", { synthetic: true });
    const source = read("SOURCE.json"); source.pdf_path = "source.pdf"; set("SOURCE.json", source);
    const pages = source.pages.map(row => row.page), actors = Object.fromEntries(Object.keys(reportStages).map(name => [name,
      ({ source_a: "synthetic-reader-a", source_b: "synthetic-reader-b", reconciliation: "synthetic-reconciler",
        practical_authoring: "synthetic-author", practical_draft_review: "synthetic-reviewer-PRACTICAL", repairs: "synthetic-author",
        source_final_review: "synthetic-reviewer-SOURCE", practical_final_review: "synthetic-reviewer-PRACTICAL" })[name]]));
    const members = [];
    for (const role of ["extractor", "inventory"]) {
      for (const name of ["TASK.md", "CONTRACT.md", "record_contract.py", "source.txt", "SOURCE.json"]) {
        const value = name === "SOURCE.json" ? source : name === "source.txt"
          ? f.files.get(paths.get("source.txt").id).toString("utf8") : "Fictief hulpmiddel; nooit uitvoeren.";
        set(role + "/" + name, value); members.push(role + "/" + name);
      }
      set(role + "/output/READ-LOG.json", { author_agent: actors[role === "extractor" ? "source_a" : "source_b"], text_pages_read: pages, visual_pages_read: pages });
    }
    set("INPUT-FREEZE.json", { pdf_sha256: source.pdf_sha256, text_sha256: source.text_sha256, packet_hashes: hashes(members) });
    set("PILOT-CONTROL.json", { report_id: f.manifest.package.id, candidate: "Fictief", packet_id: "synthetic-packet", one_report_only: true,
      acceptance_stop_required: true, second_report_authorized: false, model: "gpt-6-astra", ordinary_allowance_only: true, paid_extras_authorized: false });
    set("SELECTION.json", { synthetic: true });
    set("prior/viewer/app/reviewed-reports.json", { corpus: [] });
    set("BASELINE-FREEZE.json", { active_reports: 0, active_items: 0, files: hashes(["prior/viewer/app/reviewed-reports.json"]) });
    const index = {}, stages = {};
    function stage(name, minute) {
      const [outputs, inputs, dependencies] = reportStages[name], startName = `custody/${name}-start.json`, endName = `custody/${name}-end.json`;
      const start = { stage: name, actor: actors[name], revision: 1, status: "STARTED", started_at: stamp(minute),
        inputs: hashes([...inputs, "RELEASE-BINDING.json"]), dependencies: Object.fromEntries(dependencies.map(dep => [dep, index[dep].end])) };
      set(startName, start);
      const end = { stage: name, actor: actors[name], status: "COMPLETE", completed_at: stamp(minute + 1), start: external(startName),
        inputs: start.inputs, artifacts: hashes(outputs), execution_observation: "Fictieve fase voor een softwaretest." };
      set(endName, end); index[name] = { revision: 1, start: end.start, end: external(endName) };
      stages[name] = Object.fromEntries(["status", "actor", "inputs", "artifacts"].map(key => [key, end[key]]));
    }
    stage("source_a", 1); stage("source_b", 1);
    set("FIRST-SUBMISSIONS.json", { first_submissions: Object.fromEntries(["extractor", "inventory"].map(role => [role,
      { path: role + "/output/result.json", sha256: hash(role + "/output/result.json") }])), comparison_started: false, frozen_at: stamp(3), frozen_by: "synthetic-coordinator",
      support_hashes: hashes(["extractor", "inventory"].flatMap(role => ["READ-LOG.json", "VISUAL-EVIDENCE.json"].map(name => role + "/output/" + name))) });
    const anchors = ["PILOT-CONTROL.json", "INPUT-FREEZE.json", "FIRST-SUBMISSIONS.json", "BASELINE-FREEZE.json", "SELECTION.json", "RELEASE-BINDING.json"];
    set("custody/first.json", { packet_id: "synthetic-packet", files: hashes(anchors), first_stage_receipts: { source_a: index.source_a.end, source_b: index.source_b.end }, created_at: stamp(4) });
    proof.firstReceipt = pin("custody/first.json"); set("CUSTODY-FIRST.json", external("custody/first.json"));
    set("RECONCILIATION-LOG.json", { author_agent: actors.reconciliation, all_page_read_log: pages.map(page => ({ page, text_read: true, visual_read: true, observation: "Fictieve observatie." })) });
    stage("reconciliation", 5);
    set("audit-proposals.json", { synthetic: true });
    set("AUTHORING.json", { author_agent: actors.practical_authoring, proposal_sha256: hash("audit-proposals.json") });
    set("APP-DRAFT.json", read("APP-FINAL.json")); set("CATALOGUE-DRAFT.json", read("CATALOGUE.json")); stage("practical_authoring", 7);
    set("audit-draft-review.json", { ...read("reviews/PRACTICAL.json"), reviewer_agent: actors.practical_draft_review,
      target_hashes: hashes(["APP-DRAFT.json", "CATALOGUE-DRAFT.json"]), required_changes: [] }); stage("practical_draft_review", 9);
    set("REPAIRS.json", { author_agent: actors.repairs, draft_review_sha256: hash("audit-draft-review.json"), app_final_sha256: hash("APP-FINAL.json"),
      catalogue_sha256: hash("CATALOGUE.json"), dispositions: [] }); stage("repairs", 11);
    set("taxonomy.json", { synthetic: true });
    const taxonomy = read("TAXONOMY-SNAPSHOT.json"); Object.assign(taxonomy, { path: "taxonomy.json", file_sha256: hash("taxonomy.json") }); set("TAXONOMY-SNAPSHOT.json", taxonomy);
    const basis = read("REVIEW-BASIS.json"); basis.first_custody_receipt_sha256 = proof.firstReceipt.sha256; set("REVIEW-BASIS.json", basis);
    for (const role of roles) {
      const review = read(`reviews/${role}.json`);
      Object.assign(review, { taxonomy_approved: true, taxonomy_assessment: "Fictief.", scope_and_limitations: "Geen echte beoordeling.",
        accepted_issue_ids: [], process_mapping_reviews: read("CATALOGUE.json").process_mappings.map(row => ({ process_id: row.process_id, decision: "APPROVE", assessment: "Fictief." })) });
      if (role === "SOURCE") Object.assign(review, { reading_log: { author_agent: review.reviewer_agent, source_text_sha256: source.text_sha256, source_pdf_sha256: source.pdf_sha256,
        text_pages_read: pages, visual_pages_read: pages }, source_assessments: Object.fromEntries(["completeness", "reconciliation", "omissions", "supplements", "limitations", "management_response"].map(key => [key, "Fictief."])) });
      set(`reviews/${role}.json`, review);
    }
    basisAndReviews(); stage("source_final_review", 13); stage("practical_final_review", 13);
    set("STAGE-INDEX.json", index); set("STAGES.json", stages);
    set("custody/final.json", { workflow_version: "single-report-kit-v1", report_id: f.manifest.package.id, candidate: "Fictief", packet_id: "synthetic-packet",
      actual_agent_separation_verified: true, identity_verification_basis: "Synthetische testwaarneming, geen echte review.", human_acceptance_required: true, automatic_next_report_allowed: false,
      first_receipt_path: pointer("custody/first.json").path, first_receipt_sha256: proof.firstReceipt.sha256,
      files: hashes([...anchors, "STAGES.json", "APP-FINAL.json", "CATALOGUE.json", "RECONCILED-SOURCE.json", "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "REVIEW-BASIS.json"]),
      engine: Object.fromEntries(["gate.py", "workflow.py", "stage_custody.py", "snapshot-taxonomy.mjs"].map(name => [name, hash("kit/tools/" + name)])),
      actors, contract: proof.contracts, taxonomy_sha256: hash("taxonomy.json"), stage_receipts: Object.fromEntries(Object.entries(index).map(([name, entry]) => [name, entry.end])), sealed_at: stamp(15) });
    proof.finalReceipt = pin("custody/final.json");
  } else {
    const pages = read("source/pages.json").map(row => row.page), readers = ["synthetic-reader-a", "synthetic-reader-b"], coordinator = "synthetic-coordinator";
    for (const name of ["CONTRACT.txt", "CONTRACT-ADDENDUM-01.txt"]) proof.contracts[name] = hash(name);
    const binding = { contract_sha256: hash("CONTRACT.txt"), source_pdf_sha256: hash("source/source.pdf"), source_pages_sha256: hash("source/pages.json") };
    const reading = actor => ({ ...binding, author_agent: actor, limitations: [], text_pages_read: pages.map(page => ({ page, observation: "Fictieve tekstlezing." })),
      image_pages_viewed: pages.map(page => ({ page, observation: "Fictieve beeldlezing." })) });
    const firstFiles = [];
    for (const [i, role] of ["reader-a", "reader-b"].entries()) {
      set(role + "/READ-LOG.json", reading(readers[i])); set(role + "/STAGE-START.json", { ...binding, author_agent: readers[i], started_at_utc: stamp(1), independence: "Fictief." });
      firstFiles.push(...["result.json", "READ-LOG.json", "STAGE-START.json"].map(name => role + "/" + name));
    }
    for (const name of frameworkMethodDependencies) if (!paths.has(name)) set(name, { synthetic: true });
    set("custody/FIRST-SUBMISSIONS.json", { event: "first_submissions_frozen", observed_at_utc: stamp(3), coordinator, agents: readers, completion_observed: "Fictief.", files: hashes(firstFiles) });
    proof.firstReceipt = pin("custody/FIRST-SUBMISSIONS.json");
    set("reconciliation/READ-LOG.json", reading("synthetic-reconciler"));
    const rec = read("RECONCILIATION.json"); Object.assign(rec, { omission_audit: ["Fictief."], first_submissions_freeze_sha256: proof.firstReceipt.sha256,
      reading_log: { path: "reconciliation/READ-LOG.json", sha256: hash("reconciliation/READ-LOG.json") } }); set("RECONCILIATION.json", rec);
    set("reconciliation/STAGE-START.json", { actor: "synthetic-reconciler", started_at_utc: stamp(4), input_hashes: hashes(["custody/FIRST-SUBMISSIONS.json", "source/source.pdf", "source/pages.json", ...firstFiles]) });
    set("custody/STABLE-SOURCE.json", { author: "synthetic-reconciler", event: "stable_source_bank_received", observed_at_utc: stamp(5), author_completion_observed: true, semantic_final_approval: false,
      files: hashes(["RECONCILED-SOURCE.json", "RECONCILIATION.json", "reconciliation/READ-LOG.json", "reconciliation/STAGE-START.json", "reconciliation/UNCOVERED-LINES.json"]) });
    set("authoring/STAGE-START.json", { author_agent: "synthetic-author", started_at: stamp(6), input_hashes: hashes(["RECONCILED-SOURCE.json", "RECONCILIATION.json", "source/source.pdf", "source/pages.json"]) });
    set("authoring/DRAFT.json", read("CATALOGUE.json"));
    set("custody/FIRST-DRAFT.json", { author: "synthetic-author", event: "first_complete_practical_draft_received", observed_at_utc: stamp(7), completion_observed: true, semantic_approval: false,
      files: hashes(["CATALOGUE.json", "authoring/DRAFT.json", "authoring/STAGE-START.json"]) });
    const draftNames = ["authoring/DRAFT-REVIEW.json", "reviews/legal-draft-review.json", "reviews/source-draft-review.json"];
    const draftActors = draftNames.map((_, i) => "synthetic-draft-reviewer-" + i);
    draftNames.forEach((name, i) => set(name, { reviewer_agent: draftActors[i], decision: "APPROVE",
      target_hashes: hashes(["CATALOGUE.json", "authoring/DRAFT.json", "RECONCILED-SOURCE.json"]) }));
    set("custody/DRAFT-REVIEWS.json", { event: "three_draft_reviews_received_before_repair", observed_at_utc: stamp(8), draft_sha256: hash("authoring/DRAFT.json"), final_approval: false,
      files: hashes(draftNames), actual_distinct_reviewers: draftActors, decisions: Object.fromEntries(draftNames.map(name => [name, "APPROVE"])) });
    set("authoring/REPAIRS.json", { author_agent: "synthetic-author", created_at_utc: stamp(9), human_validation: false, approval: false,
      input_hashes: hashes(["authoring/DRAFT.json", "RECONCILED-SOURCE.json", ...draftNames]), output_hashes: hashes(["CATALOGUE.json"]) });
    set("LEGACY-BASELINE.json", { items: [], legacy_origin_keys: [] });
    set("MIGRATION.json", { legacy_manifest_sha256: hash("LEGACY-BASELINE.json"), automatic_migration: false, redistribute_question_links: false, preserve_saved_snapshots: true,
      new_source_id: f.manifest.package.id, entries: [] });
    set("CHALLENGE-CASES.json", { cases: [{ id: "case-1" }] });
    for (const page of pages) set(`source/page-${String(page).padStart(2, "0")}.png`, "Fictieve beeldbytes; geen echte pagina.");
    set("reviews/source-final-READ-LOG.json", reading("synthetic-reviewer-SOURCE"));
    for (const role of roles) {
      const review = read(`reviews/${role}.json`); review.challenge_reviews = [{ id: "case-1", object_ids: ["K1"], decision: "APPROVE", reason: "Fictief." }];
      if (role === "SOURCE") review.reading_log_sha256 = hash("reviews/source-final-READ-LOG.json"); set(`reviews/${role}.json`, review);
    }
    const basis = read("REVIEW-BASIS.json");
    Object.assign(basis.target_hashes, hashes([...frameworkMethodDependencies, ...pages.map(page => `source/page-${String(page).padStart(2, "0")}.png`)]));
    set("REVIEW-BASIS.json", basis); basisAndReviews();
    set("custody/FINAL-RECEIPT.json", { coordinator, decision: "PASS_FOR_TOOL_INTEGRATION_REVIEW", reviews_read_in_full: true, actual_role_separation_verified: true,
      human_validation: false, reading_method: "Fictieve testwaarneming.",
      review_hashes: hashes(roles.map(role => `reviews/${role.toLowerCase()}-final.json`)), review_basis_sha256: hash("REVIEW-BASIS.json"), accepted_at_utc: stamp(12),
      role_separation: { independent_source_readers: readers, reconciler: "synthetic-reconciler", practical_author_and_repairer: "synthetic-author",
        source_final: "synthetic-reviewer-SOURCE", legal_final: "synthetic-reviewer-LEGAL", practical_final: "synthetic-reviewer-PRACTICAL", basis: "Fictief." } });
    proof.finalReceipt = pin("custody/FINAL-RECEIPT.json");
  }
  return { ...f, proof, pin, hash, pointer };
}
