import test from "node:test";
import assert from "node:assert/strict";
import { checkLocalSourceReview } from "./local-source-review.mjs";
import { sourceReviewFixture } from "./test-support/local-source-review-fixture.mjs";
import { refreshSyntheticReviewHashes } from "./test-support/local-source-passages-fixture.mjs";

const cases = {
  report: [
    ["interpretation ceiling", "RECONCILED-SOURCE.json", v => { v.records[0].findings[0].interpretation_limit = "PERCEPTION_ONLY"; }, /ceiling/],
    ["effectiveness claim", "extractor/output/result.json", v => { v.records[0].findings[0].independently_verified_effectiveness = true; }, /ceiling/],
    ["invented output field", "inventory/output/result.json", v => { v.records[0].summary = "Not a source record"; }, /record contract/],
    ["wrong milestone", "RECONCILED-SOURCE.json", v => { v.records[0].findings[0].status_milestone = "OPERATING"; }, /milestone/],
    ["unsupported ontology", "RECONCILED-SOURCE.json", v => { v.records[0].findings[0].result_ontology = "positive"; }, /ontology/],
    ["first record omitted", "RECONCILED-SOURCE.json", v => { v.first_submission_mapping.pop(); }, /first record/],
    ["first record duplicated", "RECONCILED-SOURCE.json", v => { v.first_submission_mapping[1] = v.first_submission_mapping[0]; }, /first record/],
    ["supplement omitted", "RECONCILED-SOURCE.json", v => { v.supplementary_reconciliation_mapping.pop(); }, /supplementary reconciliation/],
    ["blank page omitted", "RECONCILED-SOURCE.json", v => { v.coverage.splice(1, 1); }, /page coverage/],
    ["unjustified practical field", "APP-FINAL.json", v => { v.framework.lines[0].risk.reason = ""; }, /field role/],
    ["proposed control turned into source fact", "APP-FINAL.json", v => { v.framework.lines[0].control.basis = "EXPLICIT"; }, /field role/],
    ["invented current operation", "APP-FINAL.json", v => { v.framework.lines[0].controlStatus.operation.value = "EFFECTIVE"; }, /control state/],
    ["export qualification lost", "APP-FINAL.json", v => { v.framework.lines[0].finding.reason = "Different reason"; }, /export qualification/],
    ["unknown process", "CATALOGUE.json", v => { v.process_mappings[0].process_id = "NOT-REVIEWED"; }, /process mapping/],
    ["missing process coverage", "CATALOGUE.json", v => { v.process_mappings = []; }, /every line/],
    ["excluded but linked record", "INCLUSION-DECISIONS.json", v => { v.decisions[0].decision = "EXCLUDE"; }, /bidirectional/],
    ["lost line source reason", "APP-SOURCE-LINKS.json", v => { v.links[0].reason = ""; }, /explanation/],
    ["open issue", "ISSUES.json", v => { v.issues.push({ id: "I1", status: "OPEN", resolution: "Not resolved", raised_by: "synthetic-reviewer", affected_targets: ["K1"] }); }, /unclosed issue/],
  ],
  framework: [
    ["source role lost", "RECONCILED-SOURCE.json", v => { v.records[0].actors[0].role = "RESPONDENT"; }, /actor role/],
    ["explanation called an obligation", "reader-a/result.json", v => { v.records[0].source_status = "OBLIGATION"; }, /kind\/status/],
    ["first reader unmapped", "RECONCILIATION.json", v => { v.first_submission_mapping.pop(); }, /first record/],
    ["blind reader page missing", "reader-b/result.json", v => { v.page_coverage.pop(); }, /page coverage/],
    ["parent missing child source", "CATALOGUE.json", v => { v.criteria[0].source_record_ids = []; }, /criterion source|missing or unknown source records/],
    ["unknown parent", "CATALOGUE.json", v => { v.points[0].criterion_id = "MISSING"; }, /without points|unknown point/],
    ["actor confused with respondent", "CATALOGUE.json", v => { v.points[0].addressees = [{ label: "Auditor", role: "RESPONDENT", condition: "" }]; }, /actor role/],
    ["point actor lacks condition text", "CATALOGUE.json", v => { v.points[0].addressees = [{ label: "Fictieve organisatie", role: "NORM_ADDRESSEE", condition: null }]; }, /actor role/],
    ["missing source contribution", "CATALOGUE.json", v => { delete v.points[0].source_links[0].contribution; }, /relationship meaning/],
    ["unresolved selectable interpretation", "CATALOGUE.json", v => { v.points[0].selection_status = "SELECTABLE"; v.points[0].source_links[0].unresolved_interpretation = "Unresolved condition"; }, /unresolved selectable/],
    ["empty applicable test", "CATALOGUE.json", v => { v.points[0].phase_plans.opzet.action = ""; }, /execution\/boundary/],
    ["unexplained omitted test", "CATALOGUE.json", v => { v.points[0].phase_plans.bestaan.reason = ""; }, /execution\/boundary/],
    ["extra operation phase", "CATALOGUE.json", v => { v.points[0].phase_plans.werking.status = "APPLICABLE"; }, /operation phase/],
    ["source disposition reversed", "CATALOGUE.json", v => { v.source_dispositions[0].disposition = "EXCLUDE"; }, /bidirectional/],
    ["same source readers", "reader-b/result.json", v => { v.author_agent = "synthetic-reader-a"; }, /independent source/],
    ["reconciliation by source reader", "RECONCILIATION.json", v => { v.author_agent = "synthetic-reader-a"; }, /independent source/],
    ["material issue relabelled", "ISSUES.json", v => { v.issues.push({ id: "I1", severity: "MATERIAL", status: "ACCEPTED_SOURCE_LIMIT", resolution: "Fictief", raised_by: "synthetic-reviewer", description: "Fictieve fout", affected_ids: ["K1"] }); }, /material error/],
  ],
};

for (const kind of ["report", "framework"]) {
  test(`${kind}: original record relationships checked, not admitted`, () => {
    const f = sourceReviewFixture(kind), before = [...f.files].map(([key, bytes]) => [key, Buffer.from(bytes)]);
    const result = checkLocalSourceReview(f.manifest, f.files, f.authorIds);
    assert.equal(result.sourceStructureValidated, true); assert.equal(result.sourceMethodValidated, false);
    assert.equal(result.structure.records, 1); assert.equal(result.publishable, false);
    assert.deepEqual([...f.files], before);
  });
  for (const [label, path, mutate, error] of cases[kind]) test(`${kind}: ${label} fails even with re-pinned fictitious reviews`, () => {
    const f = sourceReviewFixture(kind), value = f.read(path); mutate(value); f.set(path, value);
    // Only fictitious tests may re-pin data to exercise deeper guards.
    if (kind === "framework" && path === "RECONCILED-SOURCE.json") {
      const cat = f.read("CATALOGUE.json"); cat.source_bank_sha256 = f.paths.get(path).sha256; f.set("CATALOGUE.json", cat);
    }
    refreshSyntheticReviewHashes(f);
    assert.throws(() => checkLocalSourceReview(f.manifest, f.files, f.authorIds), error);
  });
}

test("framework: frozen earlier OPEN issues are closed only in the reviewed final register", () => {
  const f = sourceReviewFixture("framework"), reconciliation = f.read("RECONCILIATION.json");
  const earlier = { id: "I1", severity: "SOURCE_LIMIT", status: "OPEN", resolution: "",
    raised_by: "synthetic-reconciler", description: "Fictieve onduidelijkheid", affected_ids: ["R1"] };
  reconciliation.issues = [earlier]; f.set("RECONCILIATION.json", reconciliation);
  const complete = { ...earlier, status: "ACCEPTED_SOURCE_LIMIT", resolution: "Fictieve expliciete afbakening." };
  f.set("ISSUES.json", { issues: [complete] }); refreshSyntheticReviewHashes(f);
  assert.equal(checkLocalSourceReview(f.manifest, f.files, f.authorIds).sourceStructureValidated, true);
  assert.deepEqual(f.read("RECONCILIATION.json").issues, [earlier]);
  for (const issues of [[], [{ ...complete, severity: "EDITORIAL" }], [{ ...complete, affected_ids: [] }], [earlier]]) {
    f.set("ISSUES.json", { issues }); refreshSyntheticReviewHashes(f);
    assert.throws(() => checkLocalSourceReview(f.manifest, f.files, f.authorIds), /final issue register|unclosed issue/);
  }
});
