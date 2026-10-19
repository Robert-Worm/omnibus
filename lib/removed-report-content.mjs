// Tombstones contain identities only, never the removed reports or their norms.
// These IDs must not be recycled when a report is extracted again.
export const removedReportIds = Object.freeze(['H01', 'D04', 'D06', 'D07', 'D08']);
export const removedLineIds = Object.freeze([
  ...Array.from({length:8}, (_, i) => 'K0' + (i + 1)),
  ...['D04','D06','D07','D08'].flatMap(id => [1,2,3].map(n => id + '-K0' + n)),
]);
const reports = new Set(removedReportIds), lines = new Set(removedLineIds);
export const isRemovedReportLine = id => typeof id === 'string' &&
  (lines.has(id) || removedLineIds.some(line => id.startsWith(line + '/')));

export function assertNoRemovedReportContent(value) {
  const draft = value?.draft ?? value;
  if (!draft || typeof draft !== 'object') return;
  const ids = [...(Array.isArray(draft.included) ? draft.included : []),
    ...Object.keys(draft.overrides ?? {}), ...Object.keys(draft.notes ?? {}),
    ...Object.keys(draft.branchItems ?? {}), ...Object.keys(draft.fieldChoices ?? {}),
    ...(Array.isArray(draft.research?.links) ? draft.research.links.map(link => link?.line_id) : [])];
  const materials = Array.isArray(draft.investigation?.materials) ? draft.investigation.materials : [];
  const removed = ids.some(isRemovedReportLine) || materials.some(material => {
    if (isRemovedReportLine(material.originalLineId) || isRemovedReportLine(material.sourcePointId) ||
      (typeof material.originKey === 'string' &&
        (isRemovedReportLine(material.originKey.replace(/^report-point:/,'')) ||
          removedReportIds.some(id => material.originKey.startsWith(id + ':'))))) return true;
    if (material.reportTrace) {
      try { if (reports.has(JSON.parse(material.reportTrace).report_id)) return true; }
      catch { /* The project validator handles malformed source traces. */ }
    }
    return false;
  });
  if (removed) throw new Error('Dit project gebruikt verwijderde proefrapporten (H01, D04, D06, D07 of D08). Deze inhoud wordt niet meer ondersteund. Het oorspronkelijke projectbestand blijft ongewijzigd.');
}
