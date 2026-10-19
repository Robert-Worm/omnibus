import {createHash} from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Node-only acceptance gate; never ships report fingerprints or review notes
// to the browser. An altered source cannot inherit an earlier classification.
export function validateThemeCuration(taxonomy, review, lines, points) {
  if (taxonomy.version !== review.version || hash(taxonomy) !== review.taxonomyHash)
    throw Error('Theme curation taxonomy differs from its review basis.');
  if (review.hiddenVariants.length) throw Error('This release supports subdivision only; hiding variants requires a separate coverage gate.');
  const byLine = new Map(lines.map(line => [line.id, line]));
  const byPoint = new Map();
  for (const point of points) {
    const group = byPoint.get(point.legacy_line_id) ?? [];
    group.push(point); byPoint.set(point.legacy_line_id, group);
  }
  const bindings = new Map(review.sourceBindings.map(binding => [binding.id, binding]));
  if (bindings.size !== review.sourceBindings.length) throw Error('Duplicate source binding.');
  for (const binding of bindings.values()) {
    const line = byLine.get(binding.id);
    if (!line || line.report_id !== binding.reportId || hash({line, points:byPoint.get(binding.id) ?? []}) !== binding.hash)
      throw Error('Theme curation requires source re-review: ' + binding.id);
  }
  const categories = new Set(), mapped = new Set(), parentIds = new Set(taxonomy.parents.map(parent => parent.id));
  for (const theme of taxonomy.themes) {
    if (categories.has(theme.id) || !parentIds.has(theme.parentId) || !theme.title || !theme.description || !theme.exclude)
      throw Error('Invalid or duplicate theme definition: ' + theme.id);
    categories.add(theme.id);
    for (const id of theme.lineIds) {
      const key = theme.parentId + ':' + id;
      if (!bindings.has(id) || mapped.has(key)) throw Error('Unknown or duplicate assignment: ' + key);
      mapped.add(key);
      const decision = review.assignments.find(a => a.lineId === id && a.parentId === theme.parentId);
      if (!decision || decision.categoryId !== theme.id || !decision.reason) throw Error('Missing classification decision: ' + key);
    }
  }
  if (mapped.size !== review.assignments.length || [...bindings.keys()].some(id => !review.assignments.some(a => a.lineId === id)))
    throw Error('Incomplete theme curation coverage.');
  return {status:'PASS',version:taxonomy.version,themes:categories.size,buildingBlocks:bindings.size,assignments:mapped.size,hidden:0};
}
