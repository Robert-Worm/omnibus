// Shared, data-only shape check used by saved projects and local model intake.
// No catalogue merge, source rewrite, publication or content approval happens here.
export function validateModelLibrary(value, { activeIntegrityDimensions = [] } = {}) {
  if (!value || value.version !== 1 || !Array.isArray(value.models) || value.models.length > 100)
    throw new Error("Modellenbestand niet herkend. Uw opgeslagen bestand is niet overschreven.");
  const models = value.models.map((m) => {
    if (
      !m ||
      typeof m.id !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(m.id) ||
      !["kaptein", "own"].includes(m.kind) ||
      typeof m.selected !== "boolean" ||
      !Array.isArray(m.items) ||
      m.items.length > 500
    )
      throw new Error("Ongeldige modelgegevens.");
    for (const key of ["version", "title", "source", "question"])
      if (typeof m[key] !== "string" || m[key].length > 4000)
        throw new Error("Ongeldige modeltekst.");
    const items = m.items.map((i) => {
      if (
        !i ||
        typeof i.id !== "string" ||
        !/^[A-Za-z0-9_-]+$/.test(i.id) ||
        typeof i.included !== "boolean"
      )
        throw new Error("Ongeldig modelonderdeel.");
      for (const key of ["title", "question", "probes"])
        if (typeof i[key] !== "string" || i[key].length > 4000)
          throw new Error("Ongeldige tekst bij modelonderdeel.");
      for (const key of ["definition", "relevance", "boundary"])
        if (i[key] !== undefined && (typeof i[key] !== "string" || i[key].length > 4000))
          throw new Error("Ongeldige toelichting bij modelonderdeel.");
      if (
        i.originalTitle !== undefined &&
        (typeof i.originalTitle !== "string" || i.originalTitle.length > 4000)
      )
        throw new Error("Ongeldige oorspronkelijke dimensie.");
      let questions;
      if (i.questions !== undefined) {
        if (!Array.isArray(i.questions) || i.questions.length > 100)
          throw new Error("Ongeldige interviewvragen.");
        questions = i.questions.map((q) => {
          if (
            !q ||
            typeof q.id !== "string" ||
            !/^[A-Za-z0-9_-]+$/.test(q.id) ||
            typeof q.included !== "boolean"
          )
            throw new Error("Ongeldige interviewvraag.");
          if (!q.id.startsWith(i.id + "-"))
            throw new Error("Interviewvraag-ID hoort bij een andere dimensie.");
          for (const key of ["title", "question", "probes"])
            if (typeof q[key] !== "string" || q[key].length > 4000)
              throw new Error("Ongeldige interviewvraagtekst.");
          if (q.dimensionId !== undefined && q.dimensionId !== i.id)
            throw new Error("Interviewvraag hoort bij een andere dimensie.");
          return { ...q };
        });
        if (new Set(questions.map((q) => q.id)).size !== questions.length)
          throw new Error("Dubbele interviewvraag-ID’s.");
      }
      return { ...i, ...(questions === undefined ? {} : { questions }) };
    });
    if (new Set(items.map((i) => i.id)).size !== items.length)
      throw new Error("Dubbele modelonderdelen.");
    if (m.id === "CEV-AI" && (items.length !== 8 || items.some((i, n) =>
      i.id !== "AI0" + (n + 1) || i.title !== activeIntegrityDimensions[n])))
      throw new Error("De acht dimensies van Active Integrity mogen niet worden vervangen of uitgebreid.");
    const questionIds = items.flatMap((i) => i.questions?.map((q) => q.id) ?? []);
    if (new Set(questionIds).size !== questionIds.length)
      throw new Error("Dubbele interviewvraag-ID’s binnen model.");
    return { ...m, items };
  });
  if (new Set(models.map((m) => m.id)).size !== models.length)
    throw new Error("Dubbele model-ID’s.");
  return { version: 1, models };
}
