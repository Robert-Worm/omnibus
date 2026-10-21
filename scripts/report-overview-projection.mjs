const displayFields = ['objective', 'risk', 'controlObjective', 'control', 'criterion'];
// These are presentation rows, NOT source records. Procedures, traces, evidence,
// historical findings and full testing points stay in the on-demand packages.
export function projectReportOverviews(admitted, reports, points, sourceElement) {
  const result = Object.fromEntries(reports.map(({report, scope, limitations, gaps}, reportOrder) => [report.id, {
    reportOrder, report: {report, scope, limitations, gaps}, lines: [], points: [],
  }]));
  const ids = new Set();
  admitted.forEach((line, overviewOrder) => {
    const target = result[line.report_id];
    if (!target || ids.has(line.id)) throw Error('Invalid admitted overview identity.');
    ids.add(line.id);
    const empty = {text: '', basis: 'NOT_ESTABLISHED', evidence_ids: [], reason: ''};
    target.lines.push({
      id: line.id, report_id: line.report_id, title: line.title, entity: line.entity,
      displayOnly: true, overviewOrder, practicalRevision: 'display-overview',
      ...Object.fromEntries(displayFields.map(key => [key, sourceElement(line, key)])),
      auditQuestion: empty, procedure: empty, finding: empty, owner: empty,
      relationships: [], controlStatus: line.controlStatus,
      sourceItems: (line.sourceItems ?? []).filter(item => displayFields.includes(item.kind)),
    });
  });
  const reportByLine = new Map(admitted.map(line => [line.id, line.report_id]));
  for (const {id, legacy_line_id, title, text} of points) {
    const report = reportByLine.get(legacy_line_id);
    if (report) result[report].points.push({id, legacy_line_id, title, text});
  }
  return result;
}
