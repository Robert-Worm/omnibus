import routing from './report-resource-routing.mjs';

export function reportContentKeys(ids, reports) {
  const keys = new Set();
  for (const id of ids) {
    const report = Object.hasOwn(reports, id) ? reports[id] : undefined;
    if (!report) continue;
    if (routing && Object.hasOwn(routing, id)) {
      keys.add('report:' + report + ':shared');
      keys.add('report:' + report + ':metadata');
      for (const key of routing[id]) keys.add(key);
    } else keys.add('report:' + report);
  }
  return [...keys];
}
