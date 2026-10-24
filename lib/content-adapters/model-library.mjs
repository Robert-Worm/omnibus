// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/model-library.mjs";
import {softControlExample} from "@/lib/export-presets.mjs";
import {kapteinQuestions} from "@/lib/kaptein-questions.mjs";
import {themeCatalogue} from "@/lib/theme-workspaces.mjs";
import {themeLines} from "@/lib/report-choices.mjs";
import {structureModel,assembleInterview} from "@/lib/interview-structure.mjs";
import {cleanScopeDraft} from "@/lib/product-scope.mjs";
import {contextualQuestion,contextualModelQuestion} from "@/lib/model-context.mjs";
import {practiceQuestionRevision} from "@/lib/interview-practice-review.mjs";
import {validateModelLibrary} from "../model-library-validation.mjs";
const {preInterviewReview,prePracticalCevQuestions,previousActiveQuestions,activeIntegrityDimensions}=data;
export function hasReviewedQuestion(q) {
  const old=preInterviewReview.find(p=>p.id===q.id);
  return q.revision !== '1.2' && !q.purpose && old && q.title===old.title && q.probes===old.probes &&
    Object.keys(old.variants).every(l => (q.formulationBase?.[l] ?? q.variants?.[l]) === old.variants[l]);
}

export function initialModelLibrary(ids){return {version:1,models:structuredClone(ids?data.models.filter(model=>ids.includes(model.id)):data.models)};}
export function restoreModelLibrary(value, catalogue = data) {
  const {models} = validateModelLibrary(value, {activeIntegrityDimensions});
  for (const seed of catalogue.models) {
    const saved = models.find((m) => m.id === seed.id);
    if (!saved) {
      // Detach only catalogue content actually added to this project. Ordinary
      // edits should not clone every already-restored model on each keystroke.
      const added = structuredClone(seed);
      models.push({
        ...added,
        selected: false,
        items: added.items.map((i) => ({ ...i, included: false })),
      });
      continue;
    }
    // Add bibliographic context without rewriting saved questions, sources or selections.
    if (seed.id === "CEV-AI") {
      saved.sources = [...(saved.sources ?? [])];
      for (const source of seed.sources ?? [])
        if (!saved.sources.some(s => s.id === source.id)) saved.sources.push(structuredClone(source));
    }
    for (const item of seed.items) {
      const existing = saved.items.find((i) => i.id === item.id);
      if (existing) {
        existing.originalTitle = item.originalTitle ?? item.title;
        if (item.questions) {
          // An older saved interview must remain intact; newly added prompts are opt-in.
          if (!existing.questions)
            existing.questions = [
              {
                id: existing.id + "-Q00",
                dimensionId: existing.id,
                title: "Eerder bewaarde vraag",
                question: existing.question,
                probes: existing.probes,
                included: existing.included,
              },
            ];
          for (const question of item.questions)
            if (!existing.questions.some((q) => q.id === question.id))
              existing.questions.push({ ...structuredClone(question), included: false });
          existing.questions = existing.questions.map(q => !q.included
            ? practiceQuestionRevision(seed.id, q, item.questions.find(p => p.id === q.id)) ?? q : q);
          if (seed.id === "CEV-AI") existing.questions = existing.questions.map(q => {
            const latest = item.questions.find(p => p.id === q.id);
            if (latest && !q.included && hasReviewedQuestion(q)) {
              const {formulationBase:_formulationBase, ...kept}=q;
              return {...kept,title:latest.title,purpose:latest.purpose,question:latest.question,
                probes:latest.probes,variants:{...latest.variants},revision:latest.revision};
            }
            const unchanged = p => p && q.origin === "authored" && q.title === p.title &&
              q.question === p.question && q.probes === p.probes &&
              Object.keys(p.variants).every(level => q.variants?.[level] === p.variants[level]);
            const practicalPrevious = prePracticalCevQuestions.find(p => p.id === q.id);
            // This review refreshes available templates, not selected or edited interview work.
            if (!q.included && latest && unchanged(practicalPrevious))
              return {...q, title:latest.title,purpose:latest.purpose, question:latest.question, probes:latest.probes,
                variants:{...latest.variants}, revision:latest.revision};
            const old = previousActiveQuestions.find(p => p.id === q.id);
            // Refresh only recognisably unchanged prepared wording; retain choices and every user edit.
            if (!old || !latest || q.origin !== "authored" || q.title !== old.title ||
                q.question !== old.question || q.probes !== old.probes ||
                Object.keys(old.variants).some(level => q.variants?.[level] !== old.variants[level])) return q;
            return {...q, title:latest.title,purpose:latest.purpose, question:latest.question, probes:latest.probes,
              variants:{...latest.variants}, revision:latest.revision};
          });
        }
      } else saved.items.push({ ...structuredClone(item), included: false });
    }
  }
  return { version: 1, models: models.map(structureModel) };
}
export function scopedExportSelection(framework, draft) {
  draft = cleanScopeDraft(framework, draft).draft;
  // The built framework is authoritative; browsing filters do not change it.
  const questionIds = new Set((draft.research?.questions ?? []).map((q) => q.id));
  const linked = new Set(
    (draft.research?.links ?? [])
      .filter((link) => questionIds.has(link.question_id))
      .map((link) => link.line_id),
  );
  const included = [...new Set(draft.included.filter((id) => linked.has(id)))];
  // A selected workbench/model item need not belong to a report theme. Avoid
  // admitting unrelated theme members just to discover that none were chosen.
  const candidates = framework.themes?.filter(t=>t.lineIds.some(id=>included.includes(id)));
  const themes = (candidates?.length === 0 ? [] : themeCatalogue(candidates
    ? {...framework,themes:candidates} : framework)).filter((t) =>
    t.lineIds.some((id) => included.includes(id)),
  );
  return {
    themes: themes.map((t) => ({
      ...t,
      lineIds: themeLines(framework, t, [])
        .map((l) => l.id)
        .filter((id) => included.includes(id)),
    })),
    themeIds: themes.map((t) => t.id),
    excludedNorms: [...new Set(draft.included.filter((id) => !linked.has(id)))],
    included,
  };
}
export function exportDraftForSelection(draft, included) {
  const selected = [...new Set(included.filter((id) => draft.included.includes(id)))];
  // Ephemeral export metadata, not stored in the project or used for selection.
  const omitted = draft.included.filter(id=>!selected.includes(id));
  const linked = new Set((draft.research?.links || []).map(l=>l.line_id));
  const exportSelection = {chosen:draft.included.length, exported:selected.length,
    unlinked:omitted.filter(id=>!linked.has(id)).length,
    excluded:omitted.filter(id=>linked.has(id)).length};
  if (!draft.research) return { ...draft, included: selected, exportSelection };
  const questionIds = new Set(draft.research.questions.map((q) => q.id));
  const links = draft.research.links.filter(
    (l) => selected.includes(l.line_id) && questionIds.has(l.question_id),
  );
  const keep = new Set(links.map((l) => l.question_id));
  for (const q of draft.research.questions)
    if (keep.has(q.id) && q.parent_id) keep.add(q.parent_id);
  return {
    ...draft,
    included: selected,
    exportSelection,
    research: {
      ...draft.research,
      links,
      questions: draft.investigation
        ? draft.research.questions
        : draft.research.questions.filter((q) => keep.has(q.id)),
    },
  };
}
export function selectedModelOptions(model, interviewSettings) {
  if (!model || !model.selected) throw new Error("Kies eerst een model in Modellen.");
  const items = model.items.filter((i) => i.included);
  if (!items.length) throw new Error("Selecteer eerst onderdelen in Modellen.");
  const exportItems = items.flatMap((i) => {
    if (!i.questions) return [{ ...i }];
    const questions = i.questions.filter(
      (q) =>
        q.included &&
        (!i.indicators || i.indicators.some((d) => d.id === q.indicatorId && d.included)),
    );
    if (!questions.length && !interviewSettings)
      throw new Error("Kies minstens één interviewvraag bij “" + i.title + "” in Modellen.");
    return questions.flatMap(q => q.selectedLevels ? q.selectedLevels.map(level => ({...q, selectedLevel:level})) : [q]).map((q) => ({
      id: q.id + (q.selectedLevel ? '-' + q.selectedLevel : ''),
      dimensionId: i.id,
      title: i.title,
      question: contextualQuestion(q.selectedLevel ? q.variants?.[q.selectedLevel] : q.question, model.researchSubject),
      ...(q.selectedLevel ? {level:q.selectedLevel} : {}),
      probes: contextualQuestion(q.probes, model.researchSubject),
      included: true,
    }));
  });
  if (new Set(exportItems.map((i) => i.id)).size !== exportItems.length)
    throw new Error("Interviewvraag-ID’s moeten uniek zijn.");
  if (!interviewSettings && exportItems.some((i) => !i.title.trim() || !i.question.trim()))
    throw new Error("Vul voor elke gekozen interviewvraag een onderwerp en vraag in.");
  const adapted =
    model.kind === "kaptein" &&
    items.some((i) => {
      const original = softControlExample.find((v) => v.id === i.id);
      return (
        !original ||
        i.title !== (i.id === "SC003" ? "Voorbeeldgedrag hoger management" : original.title) ||
        (i.questions
          ? i.questions
              .filter((q) => q.included)
              .some((q) => {
                const seed = kapteinQuestions.find((v) => v.id === q.id);
                return !seed || q.question !== seed.question || q.probes !== seed.probes;
              })
          : ["question", "probes"].some((k) => i[k] !== original[k]))
      );
    });
  return {
    basis: model.kind,
    modelId: model.id,
    modelVersion: model.version,
    modelTitle: model.officialName || model.title,
    modelQuestion: contextualModelQuestion(model),
    modelSource: model.source,
    modelItems: interviewSettings
      ? assembleInterview(structureModel(model), interviewSettings)
      : exportItems,
    interviewStructured: Boolean(interviewSettings),
    modelAdapted: adapted,
  };
}

export default data;
