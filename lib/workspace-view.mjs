import { labels, draftValue } from "./framework-model.mjs";
import { sourceFields } from "./framework-source-items.mjs";
import {normId} from './norm-navigation.mjs';
import {reviewedReportIds} from './reviewed-reports.mjs';
export const defaultColumns = ["objective", "risk", "controlObjective", "control", "criterion"];
export function workspaceRoute(hash) {
  if (!hash || hash === '#begin') return 'entry';
  if (hash === '#risicoverkenning') return 'risk-start';
  if (hash === '#rapportthemas') return 'report-themes';
  if (hash === "#processen") return "processes";
  if (hash === '#open-grondslagen') return 'foundation-workspace';
  if (hash === '#start') return 'start';
  if (hash === '#grondslagen') return 'foundations';
  if (hash === "#modellen") return "models";
  if (hash === '#open-modellen') return 'model-workspace';
  if (hash === "#kaderexport") return "export";
  return hash === "#subsidiebeheer" || hash === "#open-themas"
    ? "topics"
    : hash === "#mijn-kader"
      ? "framework"
      : hash === "#rapporten"
        ? "reports"
        : (/^#rapport-(?:ezk-2019|H01|D04|D06|D07|D08)$/.test(hash) || reviewedReportIds.some(id => hash === '#rapport-' + id))
          ? "reader"
          : "catalogue";
}
export function filterLines(lines, draft, query, selectedOnly = false) {
  const terms = query.toLocaleLowerCase("nl").trim().split(/\s+/).filter(Boolean);
  const selected = new Set(draft.included);
  return lines.filter((line) => {
    if (selectedOnly && !selected.has(line.id)) return false;
    const text = [
      line.id,
      normId(line.id),
      line.title,
      line.entity,
      ...Object.keys(labels).flatMap((kind) =>
        sourceFields(line, kind).map((field) => draftValue(line, field.id, draft)),
      ),
    ]
      .join(" ")
      .toLocaleLowerCase("nl");
    return terms.every((term) => text.includes(term));
  });
}
export function selectLines(draft, ids, include) {
  const selected = new Set(draft.included);
  for (const id of ids) {
    if (include) selected.add(id);
    else selected.delete(id);
  }
  return { ...draft, included: [...selected] };
}
export function pageSlice(lines, index, size = 25) {
  const pages = Math.max(1, Math.ceil(lines.length / size));
  const page = Math.min(Math.max(0, index), pages - 1);
  return { page, pages, rows: lines.slice(page * size, (page + 1) * size) };
}
