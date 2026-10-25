// Fictitious passage shapes only. No genuine document, reading or source approval.
export function addSyntheticPassages({ set, read, paths, manifest }, kind) {
  const report = kind === "report", id = manifest.package.id;
  // Include a BOM, astral character, combining accent, CRLF and a blank PDF page.
  const pages = [{ page: 1, text: "\uFEFFFictieve bron 😀e\u0301\r\n" }, { page: 2, text: "" },
    { page: 3, text: "Alleen bij een melding.\r\n" }];
  const original = pages.map(page => page.text).join(""), chars = Array.from(original);
  const boundary = Array.from(pages[0].text).length, end = chars.length - 2;
  const pdf = paths.get(report ? "source.pdf" : "source/source.pdf").sha256;
  if (report) {
    set("source.txt", original);
    const pageIndex = [{ page: 1, start: 0, end: boundary }, { page: 2, start: boundary, end: boundary },
      { page: 3, start: boundary, end: chars.length }];
    set("SOURCE.json", { source_id: id, pdf_sha256: pdf, text_sha256: paths.get("source.txt").sha256,
      quote: original, pages: pageIndex });
    const record = { contract_version: "4.22", record_id: "R1", decision: "HAS_FINDING", source_reason: "Fictief.",
      extraction_status: "COMPLETE_IN_CONTEXT", extraction_reason: "Fictief.",
      source: { source_id: id, context_start: 0, context_end: chars.length, context_quote: original,
        target_start: 1, target_end: boundary },
      findings: [{ claim_kind: "OBSERVED_EMPIRICAL_RESULT", interpretation_limit: "DESCRIPTIVE_ONLY",
        status_milestone: null, independently_verified_effectiveness: false, claim_reason: "Fictief.",
        ontology_reason: "Fictief.", atomicity_reason: "Fictief.", referent_resolution: "SUPPORTED_BY_SUPPLIED_TEXT",
        result_start: 1, result_end: end, result_quote: chars.slice(1, end).join(""), result_ontology: "neutral_descriptive",
        accepted_ontology_reasons: { neutral_descriptive: "Fictief." }, no_essential_qualification_reason: "",
        qualifications: [{ role: "ESSENTIAL", meaning_reason: "Fictieve beperking.", start: boundary, end,
          quote: chars.slice(boundary, end).join("") }] }] };
    for (const [name, author] of [["RECONCILED-SOURCE.json", "synthetic-reconciler"],
      ["extractor/output/result.json", "synthetic-reader-a"], ["inventory/output/result.json", "synthetic-reader-b"]])
      set(name, { author_agent: author, source_id: id, records: [record], supplementary_sources: [{ id: "S1",
        start: boundary, end, quote: chars.slice(boundary, end).join("") }] });
    const app = read("APP-FINAL.json"), quote = record.findings[0].result_quote;
    app.source = { id, pages };
    Object.assign(app.framework.report, { source_hash: paths.get("source.txt").sha256, pdf_hash: pdf });
    app.framework.evidence = [{ id: "E1", report_id: id, role: "RESULT", page: 1, page_end: 3, start: 1, end, quote }];
    app.framework.lines[0].report_id = id;
    for (const key of ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"])
      app.framework.lines[0][key] = { text: key === "finding" ? quote : "Fictieve uitwerking.", evidence_ids: key === "owner" ? [] : ["E1"] };
    set("APP-FINAL.json", app);
  } else {
    set("source/pages.json", pages);
    set("SOURCE-MANIFEST.json", { source_id: id, page_count: pages.length });
    for (const [name, author] of [["RECONCILED-SOURCE.json", "synthetic-reconciler"],
      ["reader-a/result.json", "synthetic-reader-a"], ["reader-b/result.json", "synthetic-reader-b"]])
      set(name, { author_agent: author, source_id: id, source_pdf_sha256: pdf,
        source_pages_sha256: paths.get("source/pages.json").sha256, records: [{ id: "R1",
          source_spans: [{ page: 1, start: 1, end: boundary - 2, quote: chars.slice(1, boundary - 2).join("") },
            { page: 3, start: 0, end: end - boundary, quote: chars.slice(boundary, end).join("") }] }] });
    const catalogue = read("CATALOGUE.json");
    catalogue.source_bank_sha256 = paths.get("RECONCILED-SOURCE.json").sha256;
    set("CATALOGUE.json", catalogue);
  }
}

// Only construct fictitious test variants. Never use this to refresh real reviews.
export function refreshSyntheticReviewHashes(f) {
  const report = f.manifest.package.kind === "report", basis = f.read("REVIEW-BASIS.json");
  const dependencies = report ? basis.files : basis.target_hashes;
  for (const name of Object.keys(dependencies)) dependencies[name] = f.paths.get(name).sha256;
  f.set("REVIEW-BASIS.json", basis);
  for (const role of report ? ["SOURCE", "PRACTICAL"] : ["SOURCE", "LEGAL", "PRACTICAL"]) {
    const review = f.read(`reviews/${role}.json`);
    for (const name of Object.keys(review.target_hashes)) review.target_hashes[name] = f.paths.get(name).sha256;
    f.set(`reviews/${role}.json`, review);
  }
}
