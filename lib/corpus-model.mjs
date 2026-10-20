import { initialDraft, validateDraft } from "./framework-model.mjs";
export function reportForEvidence(framework, evidence) {
  const id = evidence?.report_id ?? framework.report.id;
  const report =
    framework.reports?.find((r) => r.id === id) ??
    (framework.report.id === id ? framework.report : null);
  if (!report) throw new Error("Onbekend bronrapport: " + id);
  return report;
}
export function reportForLine(framework, line) {
  if (line.source_id) {
    const source = framework.sources?.find((s) => s.id === line.source_id);
    if (!source) throw Error("Grondslag niet gevonden.");
    return source;
  }
  return reportForEvidence(framework, { report_id: line.report_id ?? framework.report.id });
}
export function selectedReportIds(framework, draft) {
  return [
    ...new Set(
      framework.lines
        .filter((l) => !l.source_id && draft.included.includes(l.id))
        .map((l) => reportForLine(framework, l).id),
    ),
  ];
}
export function composeCorpus(bundle) {
  const base = bundle.corpus[0]?.framework ?? {lines:[],evidence:[],patterns:[]};
  return {
    ...base,
    version: bundle.version,
    content_hash: bundle.content_hash,
    title: "Mijn referentiekader",
    report: {
      id: "TRIAL",
      title: "Lokale rapportcollectie",
      year: 2026,
      source_hash: bundle.content_hash,
    },
    reports: bundle.corpus.map((c) => c.framework.report),
    reportContexts: bundle.corpus.map(c=>({report_id:c.framework.report.id,evidence_ids:c.framework.scope_evidence_ids??[]})),
    themes: bundle.themes,
    lines: bundle.corpus.flatMap((c) =>
      c.framework.lines.map((l) => ({ ...l, report_id: c.framework.report.id })),
    ),
    evidence: bundle.corpus.flatMap((c) =>
      c.framework.evidence.map((e) => ({ ...e, report_id: c.framework.report.id })),
    ),
    patterns: base.patterns ?? [],
    gaps: [
      "Stel de toepasselijke actuele criteria, auditpopulatie, verantwoordelijkheden en toetsingsomvang vast.",
      "Niet ieder rapport bevat alle auditvelden. Voorgestelde vragen zijn geen bevindingen.",
    ],
    limitations: [
      "Afzonderlijk geselecteerde rapporten; geen representatieve validatie van de volledige rapportbibliotheek.",
      "Geen nieuwe overkoepelende norm of bewezen cross-reportpatroon vastgesteld. Vergelijkbare onderwerpen behouden hun eigen rapportcontext.",
      "Elk rapport behoudt zijn eigen onderzoeksperiode, onderzoeksgroep en beperkingen.",
      "Nieuwe onderdelen zijn door AI samengesteld en brongecontroleerd, niet door een menselijke auditor gevalideerd.",
    ],
  };
}
export function upgradeDraft(value, framework, legacy, previous = []) {
  try {
    return validateDraft(value, framework);
  } catch {
    let old;
    for (const candidate of [...previous, legacy]) {
      try { old = validateDraft(value, candidate); break; } catch { /* Try only known preserved baselines. */ }
    }
    if (!old) throw Error('Dit concept hoort niet bij een bekende bronversie.');
    return validateDraft(
      {
        ...old,
        source_hash: framework.report.source_hash,
        baseline_id: initialDraft(framework).baseline_id,
      },
      framework,
    );
  }
}
