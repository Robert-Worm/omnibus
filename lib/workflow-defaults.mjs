import {chosenTopicsText} from './topic-families.mjs';
// Defaults only: explicit saved choices, including empty strings, take precedence.
export function suggestedExportProfile(lines) {
  return lines.length > 0 && lines.every(line => line.materialKind === 'model-question') ? 'interview' : 'testing';
}
// Zonder eigen onderwerp of afbakening noemen titel en afbakening de gekozen onderwerpen (bijvoorbeeld van DORA), niet
// een algemene naam als "Mijn referentiekader" (testronde 20-11).
export function researchSubjectDefault(draft) {
  return draft.investigation?.goal?.subject?.trim() || draft.investigation?.scope?.trim() || chosenTopicsText(draft) || '';
}
// The short subject is suitable for a title, not a replacement for recorded boundaries.
export function exportScopeDefault(draft) {
  return draft.investigation?.scope?.trim() || researchSubjectDefault(draft);
}
export function exportTitle(draft) {
  const subject = researchSubjectDefault(draft);
  return subject && (!draft.title?.trim() || ['Mijn auditkader','Mijn referentiekader'].includes(draft.title)) ? `Referentiekader — ${subject}` : draft.title;
}
