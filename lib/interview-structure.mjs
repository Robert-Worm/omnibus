import { cevMetadata, cevIndicators, cevQuestionContent } from "./cev-content.mjs";
import { contextualQuestion } from "./model-context.mjs";

export const interviewLevels = [
  { id: "operational", label: "Operationeel" },
  { id: "management", label: "Tactisch / Management" },
  { id: "strategic", label: "Strategisch / Boardroom" },
];
const safeText = (value, max = 4000) => typeof value === "string" && value.length <= max;
const validId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);

// Additive migration: stable IDs, saved questions, wording and choices are preserved.
export function structureModel(model) {
  if (model.physicalTasksRelevant !== undefined && typeof model.physicalTasksRelevant !== 'boolean')
    throw new Error('Ongeldige keuze voor lichamelijke vaardigheden.');
  if (model.researchSubject !== undefined && !safeText(model.researchSubject, 240))
    throw new Error("Ongeldig onderzoeksonderwerp.");
  if (model.interviewLevel !== undefined && !interviewLevels.some(l => l.id === model.interviewLevel))
    throw new Error("Ongeldig interviewniveau.");
  const known = model.id === "L01" && model.kind === "kaptein";
  if (model.structureVersion !== undefined && model.structureVersion !== 2)
    throw new Error("Modelstructuurversie wordt niet ondersteund.");
  for (const key of [
    "officialName",
    "author",
    "usage",
    "description",
    "limitation",
    "contentVersion",
    "usageNotes",
  ])
    if (model[key] !== undefined && !safeText(model[key]))
      throw new Error("Ongeldige modelbeschrijving.");
  const result = { ...model, structureVersion: 2 };
  if (known) {
    for (const [key, value] of Object.entries(cevMetadata))
      result[key] = model[key] ?? structuredClone(value);
    result.officialName = cevMetadata.officialName;
    if (model.title === "Soft controls · Kaptein") result.title = cevMetadata.officialName;
  } else {
    result.officialName ??= model.title;
    result.usage ??= "";
    result.description ??= "";
    result.sources ??= [];
  }
  if (!Array.isArray(result.sources) || result.sources.length > 50)
    throw new Error("Ongeldige modelbronnen.");
  for (const source of result.sources)
    if (
      !validId(source.id) ||
      !safeText(source.title) ||
      !safeText(source.url) ||
      !(source.url.startsWith("https://") || (source.type === 'local-reference' && source.url === ''))
    )
      throw new Error("Ongeldige publicatieverwijzing.");
  if (new Set(result.sources.map((s) => s.id)).size !== result.sources.length)
    throw new Error("Dubbele bron-ID.");
  result.items = model.items.map((item) => {
    if (item.researchQuestion !== undefined && !safeText(item.researchQuestion))
      throw new Error('Ongeldige modelonderzoeksvraag.');
    const prepared = known ? cevIndicators(item.id) : [];
    if (
      item.indicators !== undefined &&
      (!Array.isArray(item.indicators) || item.indicators.length > 100)
    )
      throw new Error("Ongeldige indicatoren.");
    const indicators = (item.indicators ?? prepared).map((i) => ({
      ...i,
      included: i.included ?? true,
    }));
    const questions = (
      item.questions ?? [
        {
          id: item.id + "-Q00",
          title: "Eerder bewaarde vraag",
          question: item.question,
          probes: item.probes,
          included: item.included,
        },
      ]
    ).map((q) => {
      const seed = known ? cevQuestionContent(q) : null;
      const indicatorId = q.indicatorId ?? seed?.indicatorId ?? item.id + "-I00";
      if (!indicators.some((i) => i.id === indicatorId) && q.indicatorId === undefined) {
        const missing = prepared.find((i) => i.id === indicatorId);
        indicators.push(
          missing
            ? { ...missing, included: true }
            : {
                id: indicatorId,
                title: "Nog in te delen",
                definition: "Eerder bewaarde vraag; kies of beschrijf de passende indicator.",
                documents: "",
                observation: "",
                origin: "legacy",
                included: true,
              },
        );
      }
      const unedited = seed?.variants.operational === q.question;
      const variants = q.variants ?? (unedited ? seed.variants : { operational: q.question });
      if (
        !variants ||
        typeof variants !== "object" ||
        Array.isArray(variants) ||
        Object.keys(variants).some(
          (k) => !interviewLevels.some((l) => l.id === k) || !safeText(variants[k]),
        )
      )
        throw new Error("Ongeldige niveauvarianten.");
      if (q.revision !== undefined && !safeText(q.revision, 80))
        throw new Error("Ongeldige vraagrevisie.");
      if(q.purpose !== undefined && !safeText(q.purpose,1000)) throw new Error('Ongeldige vraagtoelichting.');
      if(q.sourcePage !== undefined && !safeText(q.sourcePage,240)) throw new Error('Ongeldige bronpaginaverwijzing.');
      if (q.selectedLevels !== undefined && (!Array.isArray(q.selectedLevels) ||
          q.selectedLevels.length > 3 || new Set(q.selectedLevels).size !== q.selectedLevels.length ||
          q.selectedLevels.some(l => !interviewLevels.some(v => v.id === l)) ||
          q.included !== (q.selectedLevels.length > 0)))
        throw new Error("Ongeldige vraagselectie per niveau.");
      if (q.formulationBase !== undefined && (!q.formulationBase || typeof q.formulationBase !== "object" ||
          Array.isArray(q.formulationBase) || Object.entries(q.formulationBase).some(([l,t]) =>
            !interviewLevels.some(v => v.id === l) || !safeText(t))))
        throw new Error("Ongeldige basisformuleringen.");
      return {
        ...q,
        dimensionId: item.id,
        indicatorId,
        variants: { ...variants },
        origin: q.origin ?? (unedited ? "authored" : "user"),
        revision: q.revision ?? "1.0",
        sourceIds: q.sourceIds ?? seed?.sourceIds ?? [],
      };
    });
    for (const i of indicators) {
      if (
        !validId(i.id) ||
        !i.id.startsWith(item.id + "-") ||
        typeof i.included !== "boolean" ||
        !["title", "definition", "documents", "observation"].every((k) => safeText(i[k]))
      )
        throw new Error("Ongeldige indicatorgegevens.");
    }
    if (new Set(indicators.map((i) => i.id)).size !== indicators.length)
      throw new Error("Dubbele indicator-ID.");
    if (questions.some((q) => !indicators.some((i) => i.id === q.indicatorId)))
      throw new Error("Vraagtemplate verwijst naar een onbekende indicator.");
    for (const node of [...indicators, ...questions]) {
      if (
        node.origin !== undefined &&
        !["authored", "user", "legacy", "published"].includes(node.origin)
      )
        throw new Error("Ongeldige herkomstmarkering.");
      if (
        node.sourceIds !== undefined &&
        (!Array.isArray(node.sourceIds) ||
          node.sourceIds.some((id) => !result.sources.some((s) => s.id === id)))
      )
        throw new Error("Onbekende modelbron bij indicator of vraag.");
    }
    return { ...item, indicators, questions };
  });
  if (result.researchSubquestions !== undefined) {
    const subs = result.researchSubquestions;
    const indicators = new Set(result.items.flatMap(item => item.indicators.map(i => i.id)));
    if (!Array.isArray(subs) || !subs.length || subs.length > 50 ||
        new Set(subs.map(s => s?.id)).size !== subs.length || subs.some(s =>
          !s || !validId(s.id) || !safeText(s.title) || !safeText(s.question, 2000) || !s.question.trim() ||
          !Array.isArray(s.indicatorIds) || !s.indicatorIds.length ||
          new Set(s.indicatorIds).size !== s.indicatorIds.length ||
          s.indicatorIds.some(id => !indicators.has(id))))
      throw new Error('Ongeldige modelonderzoeksvragen of indicatorkoppelingen.');
    // Editorial question groups are not additional scientific dimensions.
    result.researchSubquestions = subs.map(s => ({...s, indicatorIds: [...s.indicatorIds]}));
  }
  return result;
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
