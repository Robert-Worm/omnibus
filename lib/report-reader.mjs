// Display-only transformations. Offsets are Unicode codepoints in untouched text.
import { reportForEvidence } from "./corpus-model.mjs";
export { indexPages, rawUnits, readingBlocks, markedSegments } from "./source-text-blocks.mjs";
/**
 * @typedef {import('./source-text-blocks.mjs').Unit} Unit
 * @typedef {import('./source-text-blocks.mjs').IndexedPage} IndexedPage
 * @typedef {import('./source-text-blocks.mjs').ReadingBlock} ReadingBlock
 */
export function referenceLabel(framework, id) {
  const e = framework.evidence.find((entry) => entry.id === id);
  if (!e) return "Bronverwijzing niet beschikbaar";
  const report = reportForEvidence(framework, e);
  const peers = framework.evidence.filter(
    (entry) => entry.page === e.page && (entry.report_id ?? framework.report.id) === report.id,
  );
  const shortTitle =
    report.id === "H01" ? `EZK — Verantwoordingsonderzoek ${report.year}` : report.title;
  return `${shortTitle} · p. ${e.page}${e.page_end > e.page ? `–${e.page_end}` : ''}${peers.length > 1 ? ` · passage ${peers.findIndex((entry) => entry.id === id) + 1}` : ""}`;
}
export const roleLabels = {
  OBJECTIVE: "Doel in het rapport",
  RISK: "Risico in het rapport",
  CONTROL: "Maatregel in het rapport",
  CONTROL_DESCRIPTION: "Beschrijving van een maatregel",
  CRITERION: "Toetsingscriterium in het rapport",
  FINDING: "Historische bevinding",
  RESULT: "Bevinding in het rapport",
  RECOMMENDATION: "Aanbeveling in het rapport",
  CONTEXT: "Context uit het rapport",
  RESPONSIBILITY: "Verantwoordelijkheid in het rapport",
};
