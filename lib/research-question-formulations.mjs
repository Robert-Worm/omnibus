// Deliberately small, reversible wording changes. Everything after the question
// opening stays byte-for-byte identical: scope, qualifiers and measured concepts.
// Unsupported openings are left alone rather than inventing another question.
export function researchQuestionFormulations(text) {
  if (typeof text !== 'string') return [];
  const manner = text.match(/^(?:Hoe |Op welke wijze |Op welke manier )((?:is|zijn|wordt|worden|verloopt|verlopen|ondersteunt|ondersteunen|komen|spreken|ontstaan|verhouden|verschillen|beïnvloeden|sluiten|verbindt|verbinden|ontvangen|bereikt|blijft)\b[\s\S]*)$/);
  if (manner) return ['Hoe ', 'Op welke wijze ', 'Op welke manier '].map(prefix => prefix + manner[1]).filter(value=>value.length<=2000);
  const degree = text.match(/^(?:In hoeverre |In welke mate )([\s\S]+)$/);
  if (degree) return ['In hoeverre ', 'In welke mate '].map(prefix => prefix + degree[1]).filter(value=>value.length<=2000);
  return [text];
}

export function nextResearchQuestionFormulation(text) {
  const variants = researchQuestionFormulations(text);
  return variants[(variants.indexOf(text) + 1) % variants.length] ?? text;
}

export function proposalFormulation(base, chosen) {
  return researchQuestionFormulations(base).includes(chosen) ? chosen : base;
}
