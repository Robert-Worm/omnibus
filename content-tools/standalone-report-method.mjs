// Recognize the portable helper's evidence without running packet code.
// All ordinary passage, structure, reading and review checks still follow.
import { need, text, same, exactKeys, time } from "./source-evidence-reader.mjs";
import { reportStages } from "../skills/omnibus-add-report/scripts/report-stages.mjs";
import { taxonomySnapshot } from "../skills/omnibus-add-report/scripts/taxonomy-snapshot.mjs";

const resources = ["contracts/CONTRACT.md", "contracts/record_contract.py", "roles/source-reader.md", "QUALITY.md", "SOURCE-OUTPUT.md"];
export const standaloneReportMembers = [
  ...["stage-receipts.mjs", "report-stages.mjs", "prepare-source.py", "baseline-registry-counts.mjs", "taxonomy-snapshot.mjs"].map(name => "scripts/" + name),
  ...[...resources, "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json.example",
    ...["reconciler", "practical-author", "practical-reviewer", "source-reviewer"].map(name => "roles/" + name + ".md")].map(name => "references/report-kit/" + name),
];

export function checkStandaloneReportPreparation(e, release) {
  const { read, lookup, hashes, pointer, final, proof, digest } = e;
  need(["publishable", "contentValidated", "reviewValidated"].every(key => final[key] === false), "custody cannot grant content approval");
  const last = read("CUSTODY-FINAL.json");
  need(last.sha256 === proof.finalReceipt.sha256 && digest(last.path, last.sha256).file.id === proof.finalReceipt.fileId,
    "final pointer differs from external receipt");
  const att = pointer(final.preparation?.attestation), index = read("STAGE-INDEX.json");
  need(final.preparation.tool === "stage-receipts.mjs" && text(att.coordinator) && att.coordinator === final.preparation.coordinator &&
    att.actual_agent_separation_verified === true && att.identity_verification_basis === final.identity_verification_basis &&
    same(att.actors, final.actors) && ["packet_id", "report_id", "candidate"].every(key => att[key] === final[key]), "final attestation differs");
  exactKeys(att.stage_end_hashes, Object.keys(reportStages), "observed stage ends");
  for (const name of Object.keys(reportStages)) need(att.stage_end_hashes[name] === index[name]?.end.sha256, "observed stage end differs");
  hashes(final.files, ["CUSTODY-FIRST.json", "STAGE-INDEX.json", final.preparation.attestation.path,
    ...Object.values(index).flatMap(entry => [entry.start.path, entry.end.path])]);

  const freeze = read("INPUT-FREEZE.json"), source = read("SOURCE.json"), prep = freeze.preparation;
  need(prep?.tool === "prepare-source.py" && prep.tool_sha256 === release.files["scripts/prepare-source.py"], "unapproved source preparation");
  exactKeys(prep.resource_hashes, resources, "reader instruction hashes");
  for (const name of resources) need(prep.resource_hashes[name] === release.files["references/report-kit/" + name], "unapproved reader instructions");
  const images = Object.keys(freeze.packet_hashes).filter(name => /^visual\/page-\d+\.png$/.test(name));
  const pages = images.map(name => Number(/page-(\d+)/.exec(name)[1])).sort((a, b) => a - b);
  need(same(pages, source.pages.map(page => page.page)), "prepared page images incomplete or duplicated");
  hashes(freeze.packet_hashes, [source.pdf_path, "source.txt", "SOURCE.json", ...images]);

  const baseline = read("BASELINE-FREEZE.json"), preparation = baseline.preparation;
  need(preparation?.tool === "stage-receipts.mjs" && text(preparation.baseline_observation), "prepared baseline observation missing");
  const plan = pointer(preparation.plan);
  hashes(baseline.files, ["PILOT-CONTROL.json", "SELECTION.json", preparation.plan.path,
    preparation.registry_path, preparation.release_path, preparation.taxonomy_path]);
  need(same(plan.selection, read("SELECTION.json")) && plan.report_id === final.report_id && plan.candidate === final.candidate &&
    plan.source_pdf_sha256 === source.pdf_sha256 && plan.baseline_observation === preparation.baseline_observation &&
    ["registry_path", "release_path", "taxonomy_path"].every(key => plan[key] === preparation[key]), "selection plan differs from frozen baseline");
  hashes(plan.files, [plan.registry_path, plan.release_path, plan.taxonomy_path]);
  need(Object.entries(plan.files).every(([name, hash]) => baseline.files[name] === hash), "baseline plan hashes differ");
  const taxonomy = taxonomySnapshot(read(plan.taxonomy_path), plan.taxonomy_path, baseline.files[plan.taxonomy_path]);
  need(same(read("TAXONOMY-SNAPSHOT.json"), taxonomy), "taxonomy differs from frozen definitions");
  const basis = read("REVIEW-BASIS.json");
  need(basis.preparation?.tool === "stage-receipts.mjs" && same(basis.preparation.repairs, index.repairs.end), "review basis preparation differs");
  for (const [stage, entry] of Object.entries(index)) {
    const start = pointer(entry.start);
    hashes(start.inputs, ["BASELINE-FREEZE.json",
      ...(!["source_a", "source_b", "reconciliation"].includes(stage) ? ["TAXONOMY-SNAPSHOT.json"] : [])]);
    need(time(baseline.frozen_at) <= time(start.started_at), "stage precedes baseline freeze");
  }
  // The two external custody pins anchor these files; no new trust is inferred
  // from the manifest supplied by the packet itself.
  need(final.files["REVIEW-BASIS.json"] === lookup("REVIEW-BASIS.json").file.sha256, "review basis receipt differs");
}
