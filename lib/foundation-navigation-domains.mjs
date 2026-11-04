// Editorial discovery only: these categories never establish legal applicability,
// merge source packages or select norms. Original catalogue memberships remain.
const core = 'DORA-2022-2554';
const norea = 'NOREA-DORA-3-2';
const risk = 'DORA-2024-1774';
const incidents = ['DORA-2024-1772', 'DORA-2025-301', 'DORA-2025-302', 'DORA-INCIDENT-COSTS-GL34'];
const suppliers = ['DORA-2024-1773', 'DORA-2025-532', 'DORA-2024-2956'];
const oversight = ['DORA-2024-1502', 'DORA-OVERSIGHT-31-44', 'DORA-OVERSIGHT-FEES-1505',
  'DORA-OVERSIGHT-295', 'DORA-JOINT-TEAMS-420', 'DORA-COOPERATION-GL36'];
const sector = 'DORA-SECTOR-2022-2556';

export const additionalSourceDomains = {
  financial: {title: 'Financiële sector & DORA', ids: [core, risk, ...incidents, ...suppliers,
    'DORA-2025-1190', ...oversight, sector, norea]},
  cyber: {ids: [core, risk, ...incidents, 'DORA-2025-1190', norea]},
  procurement: {ids: [core, ...suppliers, norea]},
  it: {ids: [core, risk, norea]},
  governance: {ids: [core, ...oversight, sector, norea]},
};

/** Extend navigation without modifying the frozen database catalogue.
 * @param {import('./source-catalogue-filter.mjs').SourceDomains} original
 * @returns {import('./source-catalogue-filter.mjs').SourceDomains} */
export function extendSourceDomains(original) {
  return Object.fromEntries([...new Set([...Object.keys(original), ...Object.keys(additionalSourceDomains)])].map(id => {
    const extra = additionalSourceDomains[id];
    return [id, {...original[id], ...extra, ids: [...new Set([...(original[id]?.ids || []), ...(extra?.ids || [])])]}];
  }));
}
