import { interviewSubject } from './research-wording.mjs';
// Context is substituted at the boundary, never written back into the template.
export function contextualQuestion(value, subject = "") {
  if (typeof value !== "string") return "";
  return value.replaceAll("{{onderwerp}}", () => interviewSubject(subject, value));
}

export function contextualModelQuestion(model) {
  const text=model.question ?? '';
  const prepared=[
    'Welke culturele omstandigheden beïnvloeden zorgvuldig handelen in ons onderzoeksonderwerp?',
    'Wat helpt of belemmert mensen om zorgvuldig te werken bij ons onderzoeksonderwerp?',
  ];
  if(model.kind==='kaptein' && model.researchSubject?.trim() && prepared.includes(text))
    return text.replace(/(?:in|bij) ons onderzoeksonderwerp/, () => 'bij '+model.researchSubject.trim());
  return contextualQuestion(text,model.researchSubject);
}

export const questionLevels = ["operational", "management", "strategic"];

// Physical capability concerns bodily/motor skills, not knowledge, budgets or authority.
// Existing choices stay visible when the browsing filter is switched off.
export function modelQuestionApplicable(model, question) {
  return model.id !== 'COM-B' || question.indicatorId !== 'COMB-C-I01' ||
    model.physicalTasksRelevant === true || chosenQuestionLevels(model, question).length > 0;
}

// Legacy choices retain their previous meaning until explicitly edited in the workbench.
export function chosenQuestionLevels(model, q) {
  return q.selectedLevels ?? (q.included ? [model.interviewLevel || "operational"] : []);
}
export function independentModelLevels(model) {
  return { ...model, items: model.items.map(i => ({...i, questions: i.questions?.map(q =>
    ({...q, selectedLevels: [...chosenQuestionLevels(model, q)]}))})) };
}

export function chooseModelQuestion(model, itemId, questionId, included, level) {
  if (level && !questionLevels.includes(level)) throw Error("Onbekend interviewniveau.");
  if (level) model = independentModelLevels(model);
  return {
    ...model,
    selected: included ? true : model.selected,
    items: model.items.map((item) =>
      item.id !== itemId
        ? item
        : {
            ...item,
            included: included ? true : item.included,
            indicators: item.indicators?.map((indicator) => ({
              ...indicator,
              included:
                included &&
                item.questions.some((q) => q.id === questionId && q.indicatorId === indicator.id)
                  ? true
                  : indicator.included,
            })),
            questions: item.questions.map((q) => {
              if (q.id !== questionId) return q;
              if (!level) return { ...q, included, ...(q.selectedLevels ? { selectedLevels: included ? (q.selectedLevels.length ? q.selectedLevels : [model.interviewLevel || 'operational']) : [] } : {}) };
              const previous = chosenQuestionLevels(model, q);
              const selectedLevels = questionLevels.filter(l => l === level ? included : previous.includes(l));
              return { ...q, included: selectedLevels.length > 0, selectedLevels };
            }),
          },
    ),
  };
}

export function effectiveModelCount(model) {
  if (!model.selected) return 0;
  return model.items
    .filter((i) => i.included)
    .reduce(
      (n, i) =>
        n +
        (i.questions?.filter(
          (q) =>
            q.included &&
            (!i.indicators || i.indicators.some((d) => d.id === q.indicatorId && d.included)),
        ).reduce((sum, q) => sum + (q.selectedLevels?.length ?? 1), 0) ?? 1),
      0,
    );
}
