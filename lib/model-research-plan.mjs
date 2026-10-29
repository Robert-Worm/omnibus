// Shared proposal projection: the viewer and publication checks execute the same route.
// Inputs may be saved user edits; this function does not approve or mutate them.
import {contextualModelQuestion,contextualQuestion} from './model-context.mjs';
const normalized = text => (text || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl');
const matches = (a,b) => normalized(a) === normalized(b);

// Research questions for the auditor, not verbatim interview prompts or new norms.
const cevDimensionQuestions = {
  AI01:'In hoeverre is voor mensen duidelijk wat in het werk van hen wordt verwacht',
  AI02:'Welk voorbeeld geven leidinggevenden en bestuur in hun dagelijkse keuzes',
  AI03:'Welke mogelijkheden en belemmeringen ervaren mensen om hun werk zorgvuldig uit te voeren',
  AI04:'Wat helpt of belemmert mensen om zich in te zetten voor de gezamenlijke afspraken',
  AI05:'Hoe komen het handelen van mensen en de gevolgen daarvan in beeld',
  AI06:'Hoe worden vragen, twijfels en lastige situaties besproken',
  AI07:'Hoe spreken mensen elkaar aan op wat zij doen',
  AI08:'Hoe wordt gereageerd op het naleven en niet naleven van afspraken',
};

export function modelResearchPlans(models, materials) {
  return models.filter(model => model.selected || materials.some(m => m.originKey?.startsWith(model.id + ":")))
    .filter(model => model.question?.trim()).map(model => ({
      key: `model:${model.id}`, modelId: model.id, label: model.officialName || model.title,
      modelSubject:model.researchSubject?.trim() || '',
      text: contextualModelQuestion(model),
      subquestions: model.researchSubquestions ? model.researchSubquestions.flatMap(sub => {
        const selected = materials.filter(m => m.originKey?.startsWith(model.id + ':') &&
          sub.indicatorIds.includes(m.location?.split(' / ')[1]) && matches(m.topic, model.researchSubject));
        return selected.length ? [{key: `model:${model.id}:${sub.id}`,
          text: contextualQuestion(sub.question, model.researchSubject),
          indicatorIds: [...sub.indicatorIds], ids: selected.map(m => m.id)}] : [];
      }) : model.items.flatMap(item => {
        const selected = materials.filter(m => m.originKey?.startsWith(model.id + ":") &&
          m.location?.split(" / ")[0] === item.id && matches(m.topic,model.researchSubject));
        if (!selected.length) return [];
        return [{ key: `model:${model.id}:${item.id}`,
          text: item.researchQuestion ? contextualQuestion(item.researchQuestion, model.researchSubject) : model.id==='CEV-AI' && cevDimensionQuestions[item.id]
            ? `${cevDimensionQuestions[item.id]}${model.researchSubject ? ' bij ' + model.researchSubject : ''}?`
            : model.kind === "kaptein"
            ? `Wat helpt of belemmert zorgvuldig handelen op het gebied van ${item.title.toLocaleLowerCase("nl")}${model.researchSubject ? " bij " + model.researchSubject : ""}?`
            : `Wat blijkt uit de gekozen indicatoren over ${item.title.toLocaleLowerCase("nl")}${model.researchSubject ? " bij " + model.researchSubject : ""}?`,
          ids: selected.map(m => m.id) }];
      }),
    }));
}
