import resources from './report-overview-resources.mjs';
import {registerCatalogueResource} from './catalogue-runtime.mjs';

// Display projections stay outside the source catalogue and never enter drafts.
const overviews = new Map();
for (const [id, load] of Object.entries(resources)) {
  registerCatalogueResource('overview:' + id, load, value => {
    if (value.report.report.id !== id) throw Error('Het rapportoverzicht hoort niet bij deze bron.');
    overviews.set(id, value);
    return () => overviews.delete(id);
  });
}
export const reportOverviewKey = id => (Object.hasOwn(resources, id) ? 'overview:' : 'report:') + id;
export function reportOverviewCatalogue(reportIds) {
  if (!reportIds.length || reportIds.some(id => !overviews.has(id))) return null;
  const entries = [...new Set(reportIds)].map(id => overviews.get(id)).sort((a,b)=>a.reportOrder-b.reportOrder);
  const lines = entries.flatMap(entry => entry.lines).sort((a, b) => a.overviewOrder - b.overviewOrder);
  return {lines, blocks: lines, points: entries.flatMap(entry => entry.points), reports: entries.map(entry => entry.report)};
}
