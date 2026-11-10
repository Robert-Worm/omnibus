// Run after exact question-review validation, and only for new source proposals.
// Personal questions and frozen templates are never rewritten.
export function sourceQuestionSubject(text, subject = '') {
  const value = subject.trim() || '[onderwerp]';
  // Tikfout in twee beoordeelde DORA-deelvragen (panel 10 november 2026); de opgeslagen vraagtekst blijft gelijk.
  return text.replaceAll('{{onderwerp}}', () => value).replaceAll('penetratests', 'penetratietests');
}

// In de DORA-plannen staat {{onderwerp}} voor de gecontroleerde entiteit, niet voor het
// onderwerp uit de intake ("de samenwerking tussen teams") (#311).
const DORA_PLAN = /^(DORA-|NOREA-DORA)/;
export function planVraagOnderwerp(sourceId, subject) {
  return DORA_PLAN.test(sourceId) ? 'de entiteit' : subject;
}
// De afbakening per route is in de DORA-plannen werktaal voor de uitwerking. Toon een gewone zin.
export const DORA_ROUTE_SCOPE = 'Dit voorstel volgt de gekozen onderdelen. Of een eis op de organisatie van toepassing is, beoordeel je apart.';
export function planRouteScope(sourceId, scope) {
  return DORA_PLAN.test(sourceId) ? DORA_ROUTE_SCOPE : scope;
}
