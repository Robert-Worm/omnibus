// Private-publication helper. Partition already reviewed data; never author or
// approve content. Unowned rows must fail rather than vanish from the viewer.
export const reportAdditionDetailPaths = [
  ['organizational_goals'], ['control_objectives'], ['interview_questions'],
  ['visual_sources'], ['locators'], ['catalogue','blocks'],
  ['catalogue','points'], ['catalogue','sources'],
];

export function partitionReportAdditionDetails(data) {
  const ids = data.corpus.map(c => c.framework.report.id);
  if (new Set(ids).size !== ids.length) throw Error('Duplicate added report identity.');
  const reports = new Set(ids), points = new Map();
  for (const point of data.catalogue.points) {
    if (points.has(point.id) || !reports.has(point.report_id)) throw Error('Invalid added point ownership.');
    points.set(point.id, point.report_id);
  }
  return reportAdditionDetailPaths.flatMap(path => {
    const values = path.reduce((value, key) => value[key], data);
    if (!Array.isArray(values)) throw Error('Expected added-report detail array: ' + path.join('.'));
    const groups = new Map(ids.map(id => [id, []]));
    for (const value of values) {
      let owner = value.report_id;
      if (path[0] === 'interview_questions') {
        const owners = new Set((value.point_ids ?? []).map(id => points.get(id)));
        if (owners.size !== 1 || owners.has(undefined)) throw Error('Ambiguous added interview question ownership.');
        const linked = [...owners][0];
        if (owner !== undefined && owner !== linked) throw Error('Conflicting added interview question ownership.');
        owner = linked;
      }
      if (!reports.has(owner)) throw Error('Unknown added-report detail owner: ' + path.join('.'));
      groups.get(owner).push(value);
    }
    return [...groups].filter(([, values]) => values.length)
      .map(([reportId, values]) => ({reportId, path: [...path], values}));
  });
}
