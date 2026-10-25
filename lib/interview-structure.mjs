import { cevMetadata, cevIndicators, cevQuestionContent } from "./cev-content.mjs";
import { contextualQuestion } from "./model-context.mjs";

import { structureModelData, interviewLevels } from "./model-structure.mjs";
export { interviewLevels };

export function structureModel(model) {
  return structureModelData(model, { cevMetadata, cevIndicators, cevQuestionContent });
}

export function modelDisplayName(model) {
  return model.officialName || model.title;
}
export function selectedQuestionCount(model) {
  return model.items
    .filter((i) => i.included)
    .reduce(
      (n, i) =>
        n +
        (i.questions?.filter(
          (q) =>
            q.included &&
            (!i.indicators || i.indicators.some((d) => d.id === q.indicatorId && d.included)),
        ).reduce((sum,q) => sum + (q.selectedLevels?.length ?? 1),0) ?? 1),
      0,
    );
}

export function starrPrompts(level, topic) {
  const roles = {
    operational: "uw eigen werkzaamheden",
    management: "de aansturing van uw team",
    strategic: "uw bestuurlijke besluitvorming of toezicht",
  };
  if (!roles[level]) throw new Error("Onbekend interviewniveau.");
  return [
    [
      "Situatie",
      `Welke concrete situatie rond “${topic}” heeft u recent meegemaakt binnen ${roles[level]}? Wat speelde er en wie waren betrokken?`,
    ],
    [
      "Taak",
      level === "operational"
        ? "Wat was uw eigen taak en welke verantwoordelijkheid of bevoegdheid had u?"
        : level === "management"
          ? "Wat was uw verantwoordelijkheid als leidinggevende en wat lag bij medewerkers of anderen?"
          : "Wat was uw bestuurlijke rol, welk mandaat gold en wat was gedelegeerd?",
    ],
    [
      "Actie",
      level === "operational"
        ? "Wat heeft u zelf gedaan en welke afwegingen maakte u?"
        : "Welke keuze maakte u zelf, hoe kwam die tot stand en welke opvolging organiseerde u?",
    ],
    [
      "Resultaat",
      "Wat gebeurde er vervolgens? Waaruit blijkt het resultaat, en wat weet u nog niet?",
    ],
    ["Reflectie", "Hoe kijkt u terug op uw aanpak? Wat zou u behouden of anders doen, en waarom?"],
  ].map(([phase, prompt]) => ({ phase, prompt }));
}

// These models examine the respondent's own behaviour/transition/team experience.
// A boardroom label must not turn that into an audit of their oversight of others.
export function modelStarrPrompts(modelId, level, topic) {
  if (!interviewLevels.some(l => l.id === level)) throw new Error('Onbekend interviewniveau.');
  return starrPrompts(['COM-B','ADKAR','EDMONDSON'].includes(modelId) ? 'operational' : level, topic);
}

export function assembleInterview(model, settings) {
  if (!settings || typeof settings !== "object")
    throw new Error("Interviewinstellingen ontbreken.");
  for (const key of ["starr", "triangulation"])
    if (settings[key] !== undefined && typeof settings[key] !== "boolean")
      throw new Error("Ongeldige interviewoptie.");
  if (
    settings.overrides !== undefined &&
    (!settings.overrides ||
      typeof settings.overrides !== "object" ||
      Array.isArray(settings.overrides))
  )
    throw new Error("Ongeldige vraaginstellingen.");
  for (const override of Object.values(settings.overrides ?? {}))
    if (
      !override ||
      typeof override !== "object" ||
      Array.isArray(override) ||
      Object.entries(override).some(
        ([key, value]) => !["starr", "triangulation"].includes(key) || typeof value !== "boolean",
      )
    )
      throw new Error("Ongeldige vraaginstellingen.");
  const levels = interviewLevels.filter((l) => settings.levels?.includes(l.id));
  const needsLevels = model.items.filter(i => i.included).some(i =>
    i.questions?.some(q => q.included && !q.selectedLevels && i.indicators?.some(d => d.id === q.indicatorId && d.included)));
  if (
    !Array.isArray(settings.levels) ||
    settings.levels.some((id) => !interviewLevels.some((l) => l.id === id)) ||
    (!levels.length && needsLevels)
  )
    throw new Error("Kies minstens één interviewniveau.");
  const rows = [];
  for (const variable of model.items.filter((i) => i.included)) {
    for (const q of (variable.questions ?? []).filter((q) => q.included)) {
      const indicator = variable.indicators?.find((i) => i.id === q.indicatorId);
      if (!indicator?.included) continue;
      if (!variable.title.trim() || !indicator.title.trim() || !q.title.trim())
        throw new Error("Vul de naam van de gekozen variabele, indicator en vraagtemplate in.");
      for (const level of q.selectedLevels ? interviewLevels.filter(l => q.selectedLevels.includes(l.id)) : levels) {
        const question = contextualQuestion(q.variants?.[level.id], model.researchSubject);
        if (!question?.trim())
          throw new Error(
            `Niveauvariant ontbreekt: ${q.id} · ${level.label}. Vul deze in bij Modellen of pas uw selectie aan.`,
          );
        const overrides = settings.overrides?.[q.id] ?? {};
        const starr = (overrides.starr ?? settings.starr) ? modelStarrPrompts(model.id, level.id, model.researchSubject || q.title) : [];
        const triangulation =
          (overrides.triangulation ?? settings.triangulation)
            ? {
                documents:
                  indicator.documents ||
                  "Nog geen documentsuggestie voorbereid voor deze indicator.",
                observation:
                  indicator.observation ||
                  "Nog geen observatiesuggestie voorbereid voor deze indicator.",
                verification:
                  "Vergelijk de uitspraak met een onafhankelijke bron over dezelfde periode en situatie. Leg ook tegenstrijdigheden en beperkingen vast; een ontbrekend document is niet automatisch bewijs van een tekortkoming.",
              }
            : null;
        rows.push({
          id: q.id + "-" + level.id,
          templateId: q.id,
          variableId: variable.id,
          variable: variable.title,
          indicatorId: indicator.id,
          indicator: indicator.title,
          indicatorDefinition: indicator.definition,
          level: level.label,
          title: variable.title + " · " + q.title,
          question,
          probes: contextualQuestion(q.probes, model.researchSubject),
          included: true,
          starr,
          triangulation,
          revision: q.revision,
          origin: q.origin,
        });
      }
    }
  }
  if (!rows.length)
    throw new Error("Kies een variabele, indicator en minstens één vraagtemplate in Modellen.");
  if (new Set(rows.map((q) => q.id)).size !== rows.length)
    throw new Error("Dubbele interviewvraag-ID.");
  return rows;
}
