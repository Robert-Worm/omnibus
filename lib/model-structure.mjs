// Shared model restoration rules. No source imports and no mutations of input.
export const interviewLevels = [
  { id: "operational", label: "Operationeel" },
  { id: "management", label: "Tactisch / Management" },
  { id: "strategic", label: "Strategisch / Boardroom" },
];
const safeText = (value, max = 4000) => typeof value === "string" && value.length <= max;
const validId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);

// Additive migration: stable IDs, saved questions, wording and choices are preserved.
export function structureModelData(model, { cevMetadata, cevIndicators, cevQuestionContent } = {}) {
  if (model.physicalTasksRelevant !== undefined && typeof model.physicalTasksRelevant !== 'boolean')
    throw new Error('Ongeldige keuze voor lichamelijke vaardigheden.');
  if (model.researchSubject !== undefined && !safeText(model.researchSubject, 240))
    throw new Error("Ongeldig onderzoeksonderwerp.");
  if (model.interviewLevel !== undefined && !interviewLevels.some(l => l.id === model.interviewLevel))
    throw new Error("Ongeldig interviewniveau.");
  const known = model.id === "L01" && model.kind === "kaptein";
  if (known && (!cevMetadata || !cevIndicators || !cevQuestionContent))
    throw new Error("Dit beschermde model vereist de bestaande cataloguscontext.");
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
