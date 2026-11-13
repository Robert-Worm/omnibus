// Toepassingsgebied in één regel, onder de titel van een wet of kader in de catalogus.
// Redactionele oriëntatie: wie de bron raakt (organisatie, toezichthouder of beide).
// Het bepaalt geen toepasselijkheid; de voorwaarden staan in "Over dit kader".
// Elke wet en elk kader in de catalogus heeft hier een regel (zie source-scope.test.mjs).

/** @typedef {'organisatie'|'toezichthouder'|'beide'|'auditfunctie'} ScopeRole */
/** @type {Record<string,{role:ScopeRole,text:string}>} */
export const sourceScopes = {
  // Wetgeving
  CIO2026: {role: 'organisatie', text: 'Ministeries en hun dienstonderdelen (rijksdienst)'},
  WWKE: {role: 'beide', text: 'Aangewezen kritieke entiteiten en de bevoegde ministers'},
  BVA2021: {role: 'organisatie', text: 'Ministeries en hun beveiligingsfunctionarissen (rijksdienst)'},
  'DORA-2022-2554': {role: 'organisatie', text: 'Financiële entiteiten'},
  'DORA-2024-1502': {role: 'toezichthouder', text: 'Europese toezichthouders (ETA’s) en de lead overseer'},
  'DORA-JOINT-TEAMS-420': {role: 'toezichthouder', text: 'Lead overseers, autoriteiten en gezamenlijke onderzoeksteams'},
  'DORA-OVERSIGHT-295': {role: 'beide', text: 'Kritieke ICT-dienstverleners, aanvragers en toezichthouders'},
  'DORA-INCIDENT-COSTS-GL34': {role: 'beide', text: 'Financiële entiteiten (geen micro-ondernemingen) en bevoegde autoriteiten'},
  'DORA-COOPERATION-GL36': {role: 'toezichthouder', text: 'ETA’s, lead overseers en bevoegde autoriteiten'},
  'DORA-OVERSIGHT-31-44': {role: 'beide', text: 'Toezichthouders en kritieke ICT-dienstverleners'},
  'DORA-OVERSIGHT-FEES-1505': {role: 'beide', text: 'Toezichthouders en kritieke ICT-dienstverleners'},
  'DORA-SECTOR-2022-2556': {role: 'beide', text: 'Financiële instellingen en autoriteiten, via de lidstaten'},
  // Uitvoeringskaders
  'DORA-2024-1774': {role: 'organisatie', text: 'Financiële entiteiten'},
  'DORA-2024-1772': {role: 'beide', text: 'Financiële entiteiten en bevoegde autoriteiten'},
  'DORA-2025-301': {role: 'beide', text: 'Financiële entiteiten en bevoegde autoriteiten'},
  'DORA-2025-302': {role: 'beide', text: 'Financiële entiteiten en bevoegde autoriteiten'},
  'DORA-2024-1773': {role: 'organisatie', text: 'Financiële entiteiten'},
  'DORA-2025-532': {role: 'organisatie', text: 'Financiële entiteiten en moederondernemingen in een groep'},
  'DORA-2024-2956': {role: 'organisatie', text: 'Financiële entiteiten en moederondernemingen in een groep'},
  'DORA-2025-1190': {role: 'beide', text: 'Financiële entiteiten met een TLPT, testers en autoriteiten'},
  'NOREA-DORA-3-2': {role: 'auditfunctie', text: 'Auditors bij een financiële instelling'},
  'TR-CYBER': {role: 'auditfunctie', text: 'Internal-auditfuncties'},
  'TR-BEHAV': {role: 'auditfunctie', text: 'Internal-auditfuncties'},
  'TR-RESIL': {role: 'auditfunctie', text: 'Internal-auditfuncties'},
  'TR-THIRD': {role: 'auditfunctie', text: 'Internal-auditfuncties'},
  'GIAS-2024-NL': {role: 'auditfunctie', text: 'Internal-auditfuncties, hun bestuur en senior management'},
};

export const scopeRoleLabels = {
  organisatie: 'Organisatie',
  toezichthouder: 'Toezichthouder',
  beide: 'Organisatie en toezichthouder',
  auditfunctie: 'Auditfunctie',
};

/** Het toepassingsgebied van een bron. Een nieuwe bronversie (CIO2026-REEXTRACT-1)
 * houdt de regel van haar familie (CIO2026). */
export function sourceScope(id = '') {
  if (Object.hasOwn(sourceScopes, id)) return sourceScopes[id];
  const family = Object.keys(sourceScopes).find(key => id.startsWith(key + '-'));
  return family ? sourceScopes[family] : undefined;
}

/** Korte balk in de viewer: voor wie is dit kader? Bij elk kader, zodat je het ook ziet zonder "Over dit kader" te openen
 * (besluit beheerder 12 november 2026; eerst alleen bij kaders die ook taken van toezichthouders beschrijven). */
export function sourceAudienceNotice(id = '') {
  const scope = sourceScope(id);
  if (!scope) return undefined;
  if (scope.role === 'toezichthouder') return {role: scope.role, title: 'Voor onderzoek bij een toezichthouder', text: `Dit kader beschrijft taken van: ${scope.text}. Bij een financiële instelling kun je deze toetspunten niet rechtstreeks toetsen.`};
  if (scope.role === 'beide') return {role: scope.role, title: 'Voor onderzoek bij een organisatie of een toezichthouder', text: `Dit kader richt zich op: ${scope.text}. Kies alleen toetspunten die passen bij de partij die je onderzoekt.`};
  if (scope.role === 'auditfunctie') return {role: scope.role, title: 'Voor de auditfunctie', text: `Dit kader is geschreven voor: ${scope.text}. De toetspunten zijn een aanpak voor de audit; ze zijn niet zelf een wettelijke eis.`};
  return {role: scope.role, title: 'Voor onderzoek bij een organisatie', text: `Dit kader richt zich op: ${scope.text}. Deze toetspunten kun je bij zo’n organisatie zelf toetsen.`};
}

// Doelgroepen als vaste indeling: in de lijstweergave staat per doelgroep één symbool, met de uitleg bij aanwijzen.
// De volgorde hier is ook de volgorde van de symbolen. Het is oriëntatie, geen oordeel over toepasselijkheid.
export const audienceGroups = {
  rijk: {label: 'Rijksdienst', description: 'Ministeries en hun dienstonderdelen'},
  financieel: {label: 'Financiële sector', description: 'Banken, verzekeraars en andere financiële entiteiten'},
  ict: {label: 'ICT-dienstverleners', description: 'Kritieke ICT-dienstverleners van de financiële sector'},
  kritiek: {label: 'Kritieke entiteiten', description: 'Aangewezen organisaties met een essentiële dienst'},
  toezicht: {label: 'Toezichthouders', description: 'Toezichthouders en bevoegde autoriteiten'},
  audit: {label: 'Auditfunctie', description: 'Internal-auditfuncties en auditors'},
};
/** @type {Record<string,(keyof typeof audienceGroups)[]>} */
const sourceAudienceGroups = {
  CIO2026: ['rijk'], WWKE: ['kritiek', 'toezicht'], BVA2021: ['rijk'],
  'DORA-2022-2554': ['financieel'], 'DORA-2024-1502': ['toezicht'], 'DORA-JOINT-TEAMS-420': ['toezicht'],
  'DORA-OVERSIGHT-295': ['ict', 'toezicht'], 'DORA-INCIDENT-COSTS-GL34': ['financieel', 'toezicht'], 'DORA-COOPERATION-GL36': ['toezicht'],
  'DORA-OVERSIGHT-31-44': ['ict', 'toezicht'], 'DORA-OVERSIGHT-FEES-1505': ['ict', 'toezicht'], 'DORA-SECTOR-2022-2556': ['financieel', 'toezicht'],
  'DORA-2024-1774': ['financieel'], 'DORA-2024-1772': ['financieel', 'toezicht'], 'DORA-2025-301': ['financieel', 'toezicht'], 'DORA-2025-302': ['financieel', 'toezicht'],
  'DORA-2024-1773': ['financieel'], 'DORA-2025-532': ['financieel'], 'DORA-2024-2956': ['financieel'], 'DORA-2025-1190': ['financieel', 'toezicht'],
  'NOREA-DORA-3-2': ['financieel', 'audit'], 'TR-CYBER': ['audit'], 'TR-BEHAV': ['audit'], 'TR-RESIL': ['audit'], 'TR-THIRD': ['audit'], 'GIAS-2024-NL': ['audit'],
};
/** De doelgroepen van een bron, in vaste volgorde. Een nieuwe bronversie houdt de indeling van haar familie. */
export function sourceAudiences(id = '') {
  const key = Object.hasOwn(sourceAudienceGroups, id) ? id : Object.keys(sourceAudienceGroups).find(k => id.startsWith(k + '-'));
  const own = key ? sourceAudienceGroups[key] : [];
  return Object.keys(audienceGroups).filter(group => own.includes(group));
}
