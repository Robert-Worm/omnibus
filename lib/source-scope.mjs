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
