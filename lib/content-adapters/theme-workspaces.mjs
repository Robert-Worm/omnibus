// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/theme-workspaces.mjs";
import { subSuggestions } from "@/lib/research-flow.mjs";
import { researchOf } from "@/lib/research-plan.mjs";
import { admittedLines } from "@/lib/product-scope.mjs";
import { reviewedResearchPresets } from "@/lib/reviewed-reports.mjs";
import { mappedResearchQuestion } from '../source-question-plan.mjs';

// Permanent display aliases; independent of alphabetical order, filtering or catalogue growth.
export function themeReference(id) {
  if(id==='cloudbeoordeling')return 'T14';
  return { subsidiebeheer: "T01", beleidsevaluatie: "T02", informatiebeheer: "T03", "informatieveilig-gedrag": "T04", "backup-herstel": "T05", "uitvoerbaarheid-beleid": "T06", "informatie-op-orde": "T07", "samenwerking-beleid-uitvoering": "T08", "betaalprocessen": "T09", "duurzame-bedrijfsvoering": "T10", "organisatie-inrichting": "T11", "gegevensbevragingen": "T12", "crisisregelingen": "T13" }[id] ?? id;
}

// Catalogue entries refer to existing content, never fabricated extra reports.
export function themeCatalogue(framework) {
  if (framework.themes) {
    if (!framework.productScope) return framework.themes;
    const lines = admittedLines(framework),
      allowed = new Set(lines.map((l) => l.id));
    return framework.themes
      .map((t) => ({
        ...t,
        lineIds: t.lineIds.filter((id) => allowed.has(id)),
        reportIds: [
          ...new Set(
            lines
              .filter((l) => t.lineIds.includes(l.id))
              .map((l) => l.report_id ?? framework.report.id),
          ),
        ],
      }))
      .filter((t) => t.lineIds.length);
  }
  return [
    {
      id: "subsidiebeheer",
      title: "Subsidiebeheer",
      keywords: "subsidies ezk",
      lineIds: framework.lines.map((l) => l.id),
      reportIds: [framework.report.id],
    },
  ];
}
export function restoreWorkspace(value, themes) {
  const known = new Set(themes.map((t) => t.id));
  const openIds = [
    ...new Set((Array.isArray(value?.openIds) ? value.openIds : []).filter((id) => known.has(id))),
  ];
  return {
    openIds,
    activeId: openIds.includes(value?.activeId) ? value.activeId : (openIds[0] ?? null),
  };
}
export function openTheme(workspace, id, themes) {
  return restoreWorkspace({ openIds: [...workspace.openIds, id], activeId: id }, themes);
}
export function closeTheme(workspace, id, themes) {
  return restoreWorkspace(
    { openIds: workspace.openIds.filter((x) => x !== id), activeId: workspace.activeId },
    themes,
  );
}
export function workspaceReportIds(workspace, themes) {
  return [
    ...new Set(themes.filter((t) => workspace.openIds.includes(t.id)).flatMap((t) => t.reportIds)),
  ];
}
export function selectedThemes(draft, themes) {
  return themes.filter((t) => t.lineIds.some((id) => draft.included.includes(id)));
}
const presets = data.presets;
presets.push({
  key: "policy",
  themeId: "beleidsevaluatie",
  text: "In hoeverre bereikt de regeling haar doelgroep en worden ontwikkelingen benut voor onderbouwde bijsturing?",
  ids: ["D04-K01", "D04-K03"],
  groups: ["access", "evaluation"],
});
presets.push({
  key: "information",
  themeId: "informatiebeheer",
  text: "In hoeverre zijn informatie en applicaties navolgbaar, passend beveiligd en onder beheersing?",
  ids: ["D06-K03", "D08-K01", "D08-K02", "D08-K03"],
  groups: ["decisions", "applications", "privacy", "accesscontrol"],
});
const normalize = (text) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
presets.push(...reviewedResearchPresets);
export function centralSuggestions(draft, themeIds, framework) {
  const roots = researchOf(draft).questions.filter((q) => q.parent_id === null);
  const candidates = presets.filter(p => themeIds.includes(p.themeId) &&
    (!draft.included.length || p.ids.some(id => draft.included.includes(id))))
    .map(p=>mappedResearchQuestion(p,'theme:'+p.themeId)).filter(Boolean);
  const candidateIds = new Set(candidates.flatMap(p => p.ids));
  // Admission remains source-checked, but unrelated reports cannot contribute
  // to these proposals and need no repeated snapshot comparisons here.
  const allowed = framework?.productScope
    ? new Set(admittedLines({...framework,lines:framework.lines.filter(l=>candidateIds.has(l.id))}).map((l) => l.id))
    : null;
  return candidates
    .map((p) => (allowed ? { ...p, ids: p.ids.filter((id) => allowed.has(id)) } : p))
    .filter((p) => p.ids.length)
    .filter(
      (p) =>
        themeIds.includes(p.themeId) &&
        (!draft.included.length || p.ids.some((id) => draft.included.includes(id))),
    )
    .map((p) => ({ ...p, adopted: roots.some((q) => normalize(q.text) === normalize(p.text)) }));
}
/** @param {string|null} [targetId] */
export function scopedSubSuggestions(draft, questionId, targetId = null) {
  const question = researchOf(draft).questions.find((q) => q.id === questionId);
  const preset = presets.find((p) => normalize(p.text) === normalize(question?.text ?? ""));
  // Previewing wording for an existing child must not treat its own links as
  // proof that wording has already been chosen.
  const candidate = targetId
    ? {
        ...draft,
        research: {
          ...researchOf(draft),
          questions: researchOf(draft).questions.filter((q) => q.parent_id !== questionId),
        },
      }
    : draft;
  return subSuggestions(candidate, questionId).filter(
    (s) => !preset || preset.groups.includes(s.key),
  );
}
export function applySubQuestionWording(draft, questionId, key) {
  const r = researchOf(draft),
    question = r.questions.find((q) => q.id === questionId);
  if (!question?.parent_id) return draft;
  const suggestion = scopedSubSuggestions(draft, question.parent_id, questionId).find(
    (s) => s.key === key,
  );
  if (!suggestion) return draft;
  return {
    ...draft,
    research: {
      ...r,
      questions: r.questions.map((q) =>
        q.id === questionId ? { ...q, text: suggestion.text, origin: "suggested" } : q,
      ),
    },
  };
}
