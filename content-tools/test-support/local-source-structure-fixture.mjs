// Invented contract examples for software tests, never real source approval.
export function addSyntheticStructure(f, kind) {
  const { read, set, paths } = f, report = kind === "report";
  const reason = "Fictieve onderbouwing voor een softwaretest.";
  set("ISSUES.json", { issues: [] });
  const sourceNames = report ? ["extractor/output/result.json", "inventory/output/result.json"] : ["reader-a/result.json", "reader-b/result.json"];
  for (const name of [...sourceNames, "RECONCILED-SOURCE.json"]) {
    const data = read(name);
    if (report) data.coverage = [1, 2, 3].map(page => ({ page, finding_record_ids: page === 2 ? [] : ["R1"], excluded_or_context_reason: reason }));
    else {
      data.contract_version = "synthetic-framework-0.1"; data.limitations = [reason];
      Object.assign(data.records[0], { locator: "fictief artikel 1", title: "Fictieve melding", normative_kind: "DUTY",
        source_status: "DIRECT_SOURCE", assertion: "Bij een melding wordt een behandelaar aangewezen.",
        actors: [{ label: "Fictieve organisatie", role: "NORM_ADDRESSEE", condition: "Bij een melding" }],
        conditions: ["Bij een melding"], exceptions: [], cross_references: [], interpretation_notes: [reason] });
      data.page_coverage = [1, 2, 3].map(page => ({ page, observation: reason }));
    }
    set(name, data);
  }
  const mapping = (report ? ["extractor", "inventory"] : ["A", "B"]).map(role => ({ role,
    first_record_id: "R1", final_record_ids: ["R1"], disposition: "RETAIN", reason }));
  if (report) {
    const bank = read("RECONCILED-SOURCE.json"); bank.first_submission_mapping = mapping;
    bank.supplementary_reconciliation_mapping = ["extractor", "inventory"].map(role => ({ role,
      first_supplementary_id: "S1", final_supplementary_ids: ["S1"], additional_final_record_ids: [], reason }));
    set("RECONCILED-SOURCE.json", bank);
    const app = read("APP-FINAL.json"), line = app.framework.lines[0];
    Object.assign(line, { entity: "Fictieve organisatie", researchGroup: "TEST-GROUP", exportContext: reason,
      controlStatus: Object.fromEntries(["design", "implementation", "operation"].map(phase => [phase, { value: "NOT_ESTABLISHED", explanation: reason }])) });
    for (const key of ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"])
      Object.assign(line[key], { reason, basis: key === "risk" ? "INFERRED" : key === "finding" ? "EXPLICIT" : key === "owner" ? "NOT_ESTABLISHED" : "PROPOSED" });
    line.procedure.text += " Doorvraag: welk besluit is vastgelegd?";
    set("APP-FINAL.json", app);
    set("CATALOGUE.json", { ...read("CATALOGUE.json"), theme: { id: "TEST-THEME", title: "Fictieve afhandeling" },
      preset: { key: "TEST-PRESET", text: "Hoe worden fictieve meldingen afgehandeld?" },
      groups: [{ id: "TEST-GROUP", key: "TEST-GROUP", text: "Fictieve meldingen" }],
      process_mappings: [{ process_id: "TEST-PROCESS", line_ids: ["K1"], reason }] });
    set("TAXONOMY-SNAPSHOT.json", { processes: { "TEST-PROCESS": { title: "Fictief proces" } } });
    set("INCLUSION-DECISIONS.json", { decisions: [{ record_id: "R1", decision: "INCLUDE", line_ids: ["K1"], reason }],
      supplement_decisions: [{ supplement_id: "S1", decision: "CONTEXT", line_ids: ["K1"], reason }] });
    set("APP-SOURCE-LINKS.json", { links: [{ line_id: "K1", record_ids: ["R1"], reason }] });
  } else {
    set("RECONCILIATION.json", { author_agent: "synthetic-reconciler", first_submission_mapping: mapping, issues: [] });
    const cat = read("CATALOGUE.json"), point = cat.points[0];
    cat.contract_version = "synthetic-framework-0.1"; cat.issues = [];
    // No invented control chain here: this tests the original CIO source schema,
    // not a selectable flat-viewer admission. Keep its explicit HOLD unchanged.
    cat.criteria = [{ id: "C1", title: "Fictieve afhandeling", text: "Wijs bij een melding een behandelaar aan.",
      basis: "SOURCE_PARAPHRASE", chapter: "Fictief", composition_rationale: reason, objective_ids: [],
      ungrouped_reason: reason, source_record_ids: ["R1"] }];
    Object.assign(point, { criterion_id: "C1", objective_ids: [], ungrouped_reason: reason,
      text: cat.criteria[0].text, scope: "Fictieve meldingen", split_rationale: reason,
      basis: "SOURCE_PARAPHRASE", normative_kind: "DUTY", selection_status: "HOLD", selection_reason: reason,
      interpretation_status: "SOURCE_CLEAR", conditions: ["Bij een melding"], exceptions: [], addressees: [],
      phase_plans: { opzet: { status: "APPLICABLE", action: "Lees de fictieve taakafspraak.", expected_evidence: "Fictieve afspraak", interpretation_boundary: "Alleen inrichting", reason },
        bestaan: { status: "NOT_APPLICABLE", action: "", expected_evidence: "", interpretation_boundary: "", reason },
        werking: { status: "NOT_SELECTED", reason } } });
    Object.assign(point.source_links[0], { supported_clause: point.text, contribution: "PRIMARY", derivation: "PARAPHRASE", explanation: reason, unresolved_interpretation: "" });
    cat.source_dispositions = [{ record_id: "R1", disposition: "POINT", point_ids: ["K1"], reason }];
    cat.source_bank_sha256 = paths.get("RECONCILED-SOURCE.json").sha256;
    set("CATALOGUE.json", cat);
  }
}
