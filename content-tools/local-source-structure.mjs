// Pure, read-only contract checks. Literal spans and frozen review bindings are
// checked separately; these relationships are necessary but not an admission.
import { canonical } from "./identity.mjs";

const text = value => typeof value === "string" && Boolean(value.trim());
const need = (ok, label) => { if (!ok) throw Error("Source structure: " + label); };
const strings = values => Array.isArray(values) && values.every(text);
const values = (rows, key = "id") => {
  need(Array.isArray(rows), "expected object list");
  const ids = rows.map(row => row?.[key]);
  need(strings(ids) && new Set(ids).size === ids.length, "missing or duplicate " + key);
  return new Set(ids);
};
const refs = (ids, allowed, label, required = false) => need(strings(ids) &&
  new Set(ids).size === ids.length && ids.every(id => allowed.has(id)) && (!required || ids.length), label);
const same = (left, right) => left.size === right.size && [...left].every(id => right.has(id));
const fields = ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"];
const kinds = ["DUTY", "PROHIBITION", "POWER", "PERMISSION", "DEFINITION", "SCOPE", "EXCEPTION", "COMMENCEMENT", "EXPLANATION", "OTHER"];
const roles = ["NORM_ADDRESSEE", "TASK_BEARER", "BENEFICIARY", "OTHER"];
const limits = { IMPLEMENTATION_STATUS: "STATUS_ONLY", OBSERVED_EMPIRICAL_RESULT: "DESCRIPTIVE_ONLY",
  REPORTED_PERCEPTION: "PERCEPTION_ONLY", EVALUATIVE_VERDICT: "EVALUATION_ONLY",
  REPORT_CAUSAL_INFERENCE: "REPORT_ATTRIBUTED_CAUSAL_INFERENCE", ADOPTED_SYNTHESIS: "SOURCE_BOUNDED_SYNTHESIS" };

function closedIssues(rows, known, framework, historical = false) {
  values(rows);
  for (const issue of rows) {
    need(["RESOLVED", "ACCEPTED_SOURCE_LIMIT", ...(historical ? ["OPEN"] : [])].includes(issue.status) &&
      (issue.status === "OPEN" ? typeof issue.resolution === "string" : text(issue.resolution)) && text(issue.raised_by), "unclosed issue/provenance");
    need(issue.severity !== "MATERIAL" || issue.status !== "ACCEPTED_SOURCE_LIMIT", "material error cannot become a source limitation");
    if (framework) {
      need(["MATERIAL", "SOURCE_LIMIT", "EDITORIAL"].includes(issue.severity) && text(issue.description), "framework issue severity/description");
      refs(issue.affected_ids, known, "framework issue targets", issue.severity === "MATERIAL");
    } else need(Array.isArray(issue.affected_targets) && issue.affected_targets.length, "report issue targets");
  }
}

function reportRecord(record) {
  const allowed = ["contract_version", "record_id", "decision", "source_reason", "source", "findings", "extraction_status", "extraction_reason"];
  need(Object.keys(record).every(key => allowed.includes(key)) && record.contract_version === "4.22", "report record contract");
  need(text(record.source_reason) && Array.isArray(record.findings), "report record explanation/findings");
  const positive = record.decision === "HAS_FINDING";
  need(positive ? (record.findings.length ? record.extraction_status === "COMPLETE_IN_CONTEXT"
    : record.extraction_status === "UNREPAIRABLE_IN_CONTEXT" && text(record.extraction_reason))
    : ["NO_FINDING", "UNRESOLVED"].includes(record.decision) && !record.findings.length &&
      record.extraction_status === (record.decision === "NO_FINDING" ? "NOT_APPLICABLE" : "UNRESOLVED"), "report extraction status");
  const findingFields = ["claim_kind", "interpretation_limit", "status_milestone", "independently_verified_effectiveness",
    "claim_reason", "ontology_reason", "atomicity_reason", "referent_resolution", "result_start", "result_end", "result_quote",
    "accepted_ontology_reasons", "result_ontology", "qualifications", "no_essential_qualification_reason"];
  const seen = new Set();
  for (const finding of record.findings) {
    need(Object.keys(finding).every(key => findingFields.includes(key)), "unexpected finding field");
    need(Object.hasOwn(limits, finding.claim_kind) && limits[finding.claim_kind] === finding.interpretation_limit &&
      finding.independently_verified_effectiveness === false, "claim interpretation ceiling");
    need(finding.claim_kind === "IMPLEMENTATION_STATUS" ? ["LEGAL_ESTABLISHMENT", "INTRODUCED", "COMMENCED", "OPERATING",
      "GOVERNANCE_ESTABLISHED", "ACTUAL_EXPENDITURE"].includes(finding.status_milestone)
      : finding.status_milestone === null, "claim milestone");
    need(["claim_reason", "ontology_reason", "atomicity_reason"].every(key => text(finding[key])) &&
      ["SUPPORTED_BY_SUPPLIED_TEXT", "CONTEXT_LOCAL"].includes(finding.referent_resolution), "claim explanation/referent");
    need(finding.result_start < record.source.target_end && finding.result_end > record.source.target_start, "finding must overlap its target");
    const span = canonical([finding.result_start, finding.result_end]);
    need(!seen.has(span), "duplicate finding span"); seen.add(span);
    const accepted = finding.accepted_ontology_reasons;
    need(accepted && !Array.isArray(accepted) && Object.keys(accepted).length &&
      Object.entries(accepted).every(([key, reason]) => ["positive", "adverse_or_qualified", "absence", "neutral_descriptive"].includes(key) && text(reason)) &&
      Object.hasOwn(accepted, finding.result_ontology), "source-reasoned ontology");
    need(Array.isArray(finding.qualifications) && (finding.qualifications.length || text(finding.no_essential_qualification_reason)), "qualification accounting");
    for (const q of finding.qualifications) need(["ESSENTIAL", "OPTIONAL_CONTEXT"].includes(q.role) && text(q.meaning_reason), "qualification role/reason");
  }
}

function pageCoverage(rows, pages, report) {
  const ids = rows?.map(row => row.page);
  need(Array.isArray(ids) && ids.length === pages.length && new Set(ids).size === ids.length &&
    pages.every(page => ids.includes(page)), "complete unique physical page coverage");
  for (const row of rows) need(report ? text(row.excluded_or_context_reason) || row.finding_record_ids?.length
    : Object.entries(row).some(([key, value]) => key !== "page" && (text(value) || Array.isArray(value) && value.length)), "substantive page accounting");
}

function reconcile(read, kind, bank, recordIds) {
  const report = kind === "report", sourceNames = report ? ["extractor/output/result.json", "inventory/output/result.json"] : ["reader-a/result.json", "reader-b/result.json"];
  const roleNames = report ? ["extractor", "inventory"] : ["A", "B"];
  const reconciliation = report ? bank : read("RECONCILIATION.json");
  const mapping = reconciliation.first_submission_mapping;
  need(Array.isArray(mapping), "first submission reconciliation");
  const expected = new Set();
  for (const [index, name] of sourceNames.entries()) for (const id of values(read(name).records, report ? "record_id" : "id"))
    expected.add(canonical([roleNames[index], id]));
  need(mapping.length === expected.size && same(new Set(mapping.map(row => canonical([row.role, row.first_record_id]))), expected), "every role-qualified first record must be reconciled once");
  for (const row of mapping) {
    need(text(row.reason) && (report ? ["RETAIN", "MERGE", "REPAIR", "EXCLUDE", "CONTEXT", "UNRESOLVED_WITH_LIMIT"]
      : ["RETAIN", "MERGE", "REPAIR", "EXCLUDE", "CONTEXT", "UNRESOLVED"]).includes(row.disposition), "reconciliation disposition/reason");
    refs(row.final_record_ids, recordIds, "reconciliation target", ["RETAIN", "MERGE", "REPAIR", ...(!report ? ["CONTEXT"] : [])].includes(row.disposition));
  }
  if (!report) {
    const readers = sourceNames.map(name => read(name).author_agent);
    need(readers.every(text) && new Set(readers).size === 2 && text(bank.author_agent) &&
      !readers.includes(bank.author_agent) && reconciliation.author_agent === bank.author_agent, "independent source readers/reconciler");
    // Earlier observations stay frozen, including OPEN at that stage. The final
    // register below must account for them; never rewrite their old decisions.
    closedIssues(reconciliation.issues, recordIds, true, true);
  }
  return { sourceNames, mapping };
}

function reportStructure(read, bank, ids) {
  const pages = read("SOURCE.json").pages.map(page => page.page);
  const { sourceNames } = reconcile(read, "report", bank, ids);
  for (const data of [bank, ...sourceNames.map(read)]) {
    values(data.records, "record_id"); data.records.forEach(reportRecord);
    pageCoverage(data.coverage, pages, true);
    for (const page of data.coverage) refs(page.finding_record_ids ?? [], values(data.records, "record_id"), "page record reference");
  }
  const supplements = values(bank.supplementary_sources), expectedSupplements = new Set();
  for (const [index, name] of sourceNames.entries()) for (const id of values(read(name).supplementary_sources))
    expectedSupplements.add(canonical([["extractor", "inventory"][index], id]));
  const mapping = bank.supplementary_reconciliation_mapping;
  need(Array.isArray(mapping) && mapping.length === expectedSupplements.size && same(new Set(mapping.map(row =>
    canonical([row.role, row.first_supplementary_id]))), expectedSupplements), "supplementary reconciliation coverage");
  for (const row of mapping) {
    need(text(row.reason), "supplementary reconciliation reason");
    refs(row.final_supplementary_ids, supplements, "supplementary reconciliation target", true);
    refs(row.additional_final_record_ids, ids, "supplementary record reference");
  }
  const app = read("APP-FINAL.json"), lines = app.framework.lines, lineIds = values(lines), evidence = values(app.framework.evidence);
  closedIssues(read("ISSUES.json").issues, lineIds, false);
  for (const line of lines) {
    need(["title", "entity", "researchGroup", "exportContext"].every(key => text(line[key])), "report line context");
    for (const key of fields) {
      const field = line[key], basis = key === "risk" ? "INFERRED" : key === "finding" ? "EXPLICIT" : key === "owner" ? "NOT_ESTABLISHED" : "PROPOSED";
      need(text(field?.text) && text(field.reason) && field.basis === basis, "report field role/text: " + key);
      refs(field.evidence_ids, evidence, "report field evidence: " + key, key !== "owner");
    }
    need(line.procedure.text.includes("Doorvraag:") && line.finding.reason.includes(line.exportContext), "test follow-up/export qualification");
    for (const phase of ["design", "implementation", "operation"]) need(line.controlStatus?.[phase]?.value === "NOT_ESTABLISHED" &&
      text(line.controlStatus[phase].explanation), "current control state cannot be invented");
  }
  const cat = read("CATALOGUE.json"), groups = values(cat.groups), knownProcesses = new Set(Object.keys(read("TAXONOMY-SNAPSHOT.json").processes ?? {}));
  need(text(cat.theme?.id) && text(cat.theme?.title) && cat.theme.title !== app.framework.report.title && text(cat.preset?.text) &&
    lines.every(line => groups.has(line.researchGroup)), "report theme/groups");
  values(cat.process_mappings, "process_id");
  const mapped = new Set();
  for (const row of cat.process_mappings) {
    need(knownProcesses.has(row.process_id) && text(row.reason), "known justified process mapping");
    refs(row.line_ids, lineIds, "process line mapping", true); row.line_ids.forEach(id => mapped.add(id));
  }
  need(same(mapped, lineIds), "process mappings must cover every line");
  const decisions = read("INCLUSION-DECISIONS.json"), links = read("APP-SOURCE-LINKS.json").links;
  need(same(values(decisions.decisions, "record_id"), ids) && same(values(decisions.supplement_decisions, "supplement_id"), supplements), "complete source dispositions");
  for (const row of decisions.decisions) {
    need(["INCLUDE", "CONTEXT", "EXCLUDE"].includes(row.decision) && text(row.reason), "record inclusion reason");
    refs(row.line_ids, lineIds, "record inclusion lines", row.decision === "INCLUDE");
  }
  for (const row of decisions.supplement_decisions) {
    need(["CONTEXT", "EXCLUDE"].includes(row.decision) && text(row.reason), "supplement inclusion reason");
    refs(row.line_ids, lineIds, "supplement inclusion lines");
  }
  need(same(values(links, "line_id"), lineIds), "complete line/source links");
  for (const link of links) {
    need(text(link.reason), "line/source explanation"); refs(link.record_ids, ids, "line/source references", true);
    const admitted = decisions.decisions.filter(row => row.decision === "INCLUDE" && row.line_ids.includes(link.line_id));
    need(same(new Set(link.record_ids), new Set(admitted.map(row => row.record_id))), "bidirectional source inclusion links");
  }
  return { records: ids.size, lines: lineIds.size, supplementarySources: supplements.size };
}

function actors(rows, allowNull = false) {
  need(Array.isArray(rows), "actor list");
  for (const actor of rows) need(text(actor.label) && roles.includes(actor.role) &&
    (allowNull && actor.condition === null || typeof actor.condition === "string"), "actor role/condition");
}

function frameworkStructure(read, bank, ids) {
  const pages = read("source/pages.json").map(page => page.page), { sourceNames } = reconcile(read, "framework", bank, ids);
  for (const data of [bank, ...sourceNames.map(read)]) {
    need(text(data.contract_version) && Array.isArray(data.limitations), "framework source envelope");
    for (const row of data.records) {
      need(kinds.includes(row.normative_kind) && ["DIRECT_SOURCE", "EXPLANATORY_CONTEXT"].includes(row.source_status), "framework source kind/status");
      need(["locator", "title", "assertion"].every(key => text(row[key])), "framework record explanation");
      need(["conditions", "exceptions", "cross_references", "interpretation_notes"].every(key => Array.isArray(row[key])), "framework record context"); actors(row.actors, true);
    }
    pageCoverage(data.page_coverage, pages, false);
  }
  const cat = read("CATALOGUE.json"), goals = values(cat.goals), objectives = values(cat.objectives), criteria = values(cat.criteria), points = values(cat.points);
  need(text(cat.contract_version) && text(cat.author_agent), "framework catalogue contract/author");
  const known = new Set([...ids, ...goals, ...objectives, ...criteria, ...points]);
  closedIssues(cat.issues, known, true); closedIssues(read("ISSUES.json").issues, known, true);
  const finalIssues = new Map(read("ISSUES.json").issues.map(issue => [issue.id, issue]));
  for (const earlier of read("RECONCILIATION.json").issues) {
    const final = finalIssues.get(earlier.id);
    need(final && final.severity === earlier.severity && earlier.affected_ids.every(id => final.affected_ids.includes(id)),
      "final issue register must preserve earlier issue identity, severity and targets");
  }
  for (const obj of [...cat.goals, ...cat.objectives]) {
    need(["DIRECT_SOURCE", "SOURCE_PARAPHRASE", "ANALYST_PROPOSAL"].includes(obj.basis) &&
      ["title", "text", "rationale"].every(key => text(obj[key])), "framework goal/objective role");
    refs(obj.source_record_ids, ids, "goal/objective source", true);
    if (objectives.has(obj.id)) {
      refs(obj.goal_ids, goals, "objective goals");
      need(obj.risk === null && obj.risk_basis === null || text(obj.risk) && obj.risk_basis === "ANALYST_PROPOSAL", "risk proposal role");
    }
  }
  for (const criterion of cat.criteria) {
    need(["SOURCE_PARAPHRASE", "ANALYST_SYNTHESIS"].includes(criterion.basis) &&
      ["title", "text", "chapter", "composition_rationale"].every(key => text(criterion[key])), "criterion derivation");
    refs(criterion.objective_ids, objectives, "criterion objectives");
    need(criterion.objective_ids.length || text(criterion.ungrouped_reason), "ungrouped criterion reason");
    refs(criterion.source_record_ids, ids, "criterion source", true);
    const children = cat.points.filter(point => point.criterion_id === criterion.id);
    need(children.length, "criterion without points");
    const childRefs = new Set(children.flatMap(point => point.source_links.map(link => link.record_id)));
    refs([...childRefs], new Set(criterion.source_record_ids), "parent must preserve child sources");
    need(same(childRefs, new Set(criterion.source_record_ids)) || text(criterion.additional_context_reason), "additional parent context reason");
  }
  for (const point of cat.points) {
    need(criteria.has(point.criterion_id), "unknown point parent"); refs(point.objective_ids, objectives, "point objectives");
    need(point.objective_ids.length || text(point.ungrouped_reason), "ungrouped point reason");
    const parent = cat.criteria.find(row => row.id === point.criterion_id);
    need(same(new Set(point.objective_ids), new Set(parent.objective_ids)) || text(point.objective_relationship_reason), "point/parent objective reason");
    need(["title", "text", "scope", "split_rationale", "selection_reason"].every(key => text(point[key])) &&
      ["SOURCE_PARAPHRASE", "ANALYST_SYNTHESIS", "AUDIT_OPERATIONALIZATION"].includes(point.basis) && kinds.includes(point.normative_kind), "point meaning/scope");
    need(["SELECTABLE", "CONTEXT_ONLY", "HOLD"].includes(point.selection_status) &&
      ["SOURCE_CLEAR", "ANALYST_DERIVED", "SOURCE_AMBIGUITY", "DEPENDENT_ON_EXTERNAL_SOURCE"].includes(point.interpretation_status), "point interpretation/selection");
    need(strings(point.conditions) && strings(point.exceptions), "point conditions/exceptions"); actors(point.addressees);
    need(point.source_links.length && new Set(point.source_links.map(link => canonical([link.record_id, link.contribution, link.supported_clause]))).size === point.source_links.length, "unique source relationships");
    for (const link of point.source_links) need(ids.has(link.record_id) && text(link.supported_clause) && text(link.explanation) &&
      ["PRIMARY", "DEFINITION", "SCOPE", "CONDITION", "EXCEPTION", "QUALIFICATION", "EXPLANATION"].includes(link.contribution) &&
      ["DIRECT", "PARAPHRASE", "SYNTHESIS"].includes(link.derivation) && typeof link.unresolved_interpretation === "string", "source relationship meaning");
    if (point.selection_status === "SELECTABLE" && (point.interpretation_status === "SOURCE_AMBIGUITY" || point.source_links.some(link => text(link.unresolved_interpretation))))
      need(["RESOLVED", "BOUNDED_SOURCE_LIMIT"].includes(point.interpretation_resolution?.status) && text(point.interpretation_resolution.reason), "unresolved selectable interpretation");
    for (const phase of ["opzet", "bestaan"]) {
      const plan = point.phase_plans?.[phase];
      need(plan && ["APPLICABLE", "NOT_APPLICABLE"].includes(plan.status) &&
        ["action", "expected_evidence", "interpretation_boundary", "reason"].every(key => typeof plan[key] === "string"), "phase plan shape");
      need(plan.status === "APPLICABLE" ? ["action", "expected_evidence", "interpretation_boundary"].every(key => text(plan[key]))
        : text(plan.reason), "phase execution/boundary");
    }
    need(point.phase_plans?.werking?.status === "NOT_SELECTED" && text(point.phase_plans.werking.reason), "unreviewed operation phase");
  }
  need(same(values(cat.source_dispositions, "record_id"), ids), "complete framework source dispositions");
  for (const row of cat.source_dispositions) {
    need(["POINT", "CONTEXT", "EXCLUDE"].includes(row.disposition) && text(row.reason), "framework disposition reason");
    refs(row.point_ids, points, "framework disposition points", row.disposition === "POINT");
    const linked = new Set(cat.points.filter(point => point.source_links.some(link => link.record_id === row.record_id)).map(point => point.id));
    need(same(new Set(row.point_ids), linked) && (row.disposition !== "EXCLUDE" || !linked.size), "bidirectional framework source links");
  }
  return { records: ids.size, points: points.size, criteria: criteria.size, objectives: objectives.size, goals: goals.size };
}

/** Call only after the immutable byte binding and literal passage checks. */
export function checkLocalSourceStructure(kind, { read }) {
  const bank = read("RECONCILED-SOURCE.json"), ids = values(bank.records, kind === "report" ? "record_id" : "id");
  need(ids.size, "empty source bank");
  if (kind === "report") return reportStructure(read, bank, ids);
  need(kind === "framework", "unsupported source kind");
  return frameworkStructure(read, bank, ids);
}
