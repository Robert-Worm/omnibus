// Compile-only examples: synthetic shapes, no private catalogue payloads.
import type { Draft, Framework } from './framework-types.js';
import type { ReportPointCatalogue, ReportPointTrace } from './report-point-types.js';
import { pointWording, setReportPointSelection } from './report-point-adapter.mjs';
import { themeCatalogue, openTheme, workspaceReportIds } from './theme-workspaces.mjs';
import { normDrop } from './research-flow.mjs';

export function selectedReport(draft: Draft, catalogue: ReportPointCatalogue): Draft {
  const point = catalogue.points[0];
  const text: string = pointWording(point, 'source').text;
  if (!text) return draft;
  return setReportPointSelection(draft, catalogue, [point.id], true);
}
export function openedReports(framework: Framework): string[] {
  const themes = themeCatalogue(framework);
  return workspaceReportIds(openTheme({openIds: [], activeId: null}, themes[0].id, themes), themes);
}
export function traceLabels(trace: ReportPointTrace): string[] {
  return trace.relations.map(relation => `${relation.evidence_id}: ${relation.page}`);
}
export function invalidInputs(draft: Draft, catalogue: ReportPointCatalogue) {
  // @ts-expect-error Selection state is boolean, not a label.
  setReportPointSelection(draft, catalogue, ['synthetic'], 'selected');
  // @ts-expect-error Group drops must carry line IDs.
  normDrop(draft, {type: 'group', from: null}, 'question');
  // @ts-expect-error Source page indices must be numeric.
  const page: ReportPointTrace['relations'][number]['page'] = '1';
  return page;
}
