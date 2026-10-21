export const choiceKey = (themeId, reportId) => themeId + "::" + reportId;
import {reportSummaries} from './catalogue-summary.mjs';
export function reportEnabled(excluded, themeId, reportId) {
  return !excluded.includes(choiceKey(themeId, reportId));
}
export function chooseReport(excluded, themeId, reportId, enabled) {
  const key = choiceKey(themeId, reportId);
  return enabled ? excluded.filter((x) => x !== key) : [...new Set([...excluded, key])];
}
export function themeLines(framework, theme, excluded) {
  if (!theme) return [];
  return admittedLines(framework).filter(
    (l) =>
      theme.lineIds.includes(l.id) &&
      reportEnabled(excluded, theme.id, l.report_id ?? framework.report.id),
  );
}

// Union by norm ID: overlapping themes must not duplicate the same norm.
export function browseThemeLines(framework, themes, excluded = [], admitted = admittedLines(framework)) {
  const memberships = new Map();
  for (const theme of themes) for (const id of theme.lineIds) {
    if (!memberships.has(id)) memberships.set(id, []);
    memberships.get(id).push(theme.id);
  }
  const hidden = new Set(excluded);
  return admitted.filter(line => memberships.get(line.id)?.some(themeId =>
    !hidden.has(choiceKey(themeId, line.report_id ?? framework.report.id))));
}
export function reportNormImpact(framework, theme, reportId, draft) {
  const ids = new Set(
    reportSummaries[reportId]?reportSummaries[reportId].admittedIds.filter(id=>theme?.lineIds.includes(id)):admittedLines(framework)
      .filter(
        (l) => theme?.lineIds.includes(l.id) && (l.report_id ?? framework.report.id) === reportId,
      )
      .map((l) => l.id),
  );
  const collected = new Set(draft.included.filter((id) => ids.has(id)));
  const questions = new Set((draft.research?.questions ?? []).map((q) => q.id));
  const linked = new Set(
    (draft.research?.links ?? [])
      .filter((l) => collected.has(l.line_id) && questions.has(l.question_id))
      .map((l) => l.line_id),
  );
  return { norms: ids.size, collected: collected.size, linked: linked.size };
}
import { admittedLines } from "./product-scope.mjs";
