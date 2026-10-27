// Shared report-kit stage contract: [outputs, inputs, dependencies].
const targets = ["APP-FINAL.json", "CATALOGUE.json", "RECONCILED-SOURCE.json", "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "REVIEW-BASIS.json"];
export const reportStages = Object.freeze({
  source_a: [["extractor/output/result.json", "extractor/output/READ-LOG.json", "extractor/output/VISUAL-EVIDENCE.json"], ["INPUT-FREEZE.json"], []],
  source_b: [["inventory/output/result.json", "inventory/output/READ-LOG.json", "inventory/output/VISUAL-EVIDENCE.json"], ["INPUT-FREEZE.json"], []],
  reconciliation: [["RECONCILED-SOURCE.json", "RECONCILIATION-LOG.json"], ["FIRST-SUBMISSIONS.json", "SOURCE.json"], ["source_a", "source_b"]],
  practical_authoring: [["AUTHORING.json", "audit-proposals.json", "APP-DRAFT.json", "CATALOGUE-DRAFT.json"], ["RECONCILED-SOURCE.json", "SOURCE.json"], ["reconciliation"]],
  practical_draft_review: [["audit-draft-review.json"], ["APP-DRAFT.json", "CATALOGUE-DRAFT.json", "RECONCILED-SOURCE.json"], ["practical_authoring"]],
  repairs: [["REPAIRS.json", "APP-FINAL.json", "CATALOGUE.json", "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "ISSUES.json"], ["audit-draft-review.json", "RECONCILED-SOURCE.json"], ["practical_draft_review"]],
  source_final_review: [["source-final-review.json"], targets, ["repairs"]],
  practical_final_review: [["audit-final-review.json"], targets, ["repairs"]],
});

