// Exportregel zonder afhankelijkheden, zodat ook de exportberekening in de worker hem kan laden.
/**
 * Alleen voor de export: gekozen bouwstenen die bij geen vraag horen, komen onder de
 * eerste centrale vraag, zodat er niets stil wegvalt (besluit beheerder 8 november 2026).
 * Het project zelf verandert niet.
 */
export function linkUnlinkedForExport(draft) {
  const r = draft.research;
  const central = r?.questions?.find((q) => q.parent_id === null);
  if (!central) return { draft, autoLinked: [], central: null };
  const questionIds = new Set(r.questions.map((q) => q.id));
  const linked = new Set(r.links.filter((l) => questionIds.has(l.question_id)).map((l) => l.line_id));
  const autoLinked = [...new Set(draft.included.filter((id) => !linked.has(id)))];
  if (!autoLinked.length) return { draft, autoLinked, central };
  return { draft: { ...draft, research: { ...r, links: [...r.links, ...autoLinked.map((line_id) => ({ question_id: central.id, line_id }))] } }, autoLinked, central };
}
