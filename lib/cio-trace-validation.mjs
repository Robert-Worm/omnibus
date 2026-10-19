export function validateEditorialTrace(trace, editorialFor, catalogue) {
  // Historical snapshots without an editorial layer remain valid records.
  if (!trace.editorial) return;
  const expected = editorialFor(trace.point?.id);
  if (JSON.stringify(trace.editorial) !== JSON.stringify(expected)) throw Error('Onbekende of gewijzigde CIO-redactieherleiding.');
  const point = catalogue.points.find(p => p.id === trace.point.id);
  const criterion = catalogue.criteria.find(c => c.id === point.criterion_id);
  if (JSON.stringify(trace.point) !== JSON.stringify(point) || JSON.stringify(trace.criterion) !== JSON.stringify(criterion)) throw Error('CIO-redactie komt niet overeen met de vastgelegde herleiding.');
}
