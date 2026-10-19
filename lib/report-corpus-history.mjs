// Data-only composition helpers: release identities come from the pinned catalogue,
// never from a project supplied by the browser.
export function uniqueReportCorpus(...corpora) {
  const corpus = corpora.flat(), ids = new Set();
  for (const item of corpus) {
    const id = item.framework.report.id;
    if (ids.has(id)) throw Error('Dubbel bronrapport: ' + id);
    ids.add(id);
  }
  return corpus;
}

export function reportCorpusHistory(base, reviewed, additions) {
  const available = uniqueReportCorpus(reviewed.corpus, additions.corpus);
  uniqueReportCorpus(base.corpus, available);
  const themes = [...reviewed.themes, ...additions.themes];
  const releases = [...(additions.history ?? []).slice().reverse(),
    {content_hash: reviewed.content_hash, reportIds: reviewed.corpus.map(c => c.framework.report.id)},
    ...(reviewed.history ?? []).slice().reverse()];
  return releases.map(release => {
    if (new Set(release.reportIds).size !== release.reportIds.length)
      throw Error('Dubbel bronrapport in publicatiegeschiedenis.');
    const corpus = release.reportIds.map(id => {
      const entry = available.find(c => c.framework.report.id === id);
      if (!entry) throw Error('Ontbrekend bewaard bronrapport: ' + id);
      return entry;
    });
    const ids = new Set(corpus.flatMap(c => c.framework.lines.map(l => l.id)));
    return {...base, content_hash: release.content_hash, corpus: [...base.corpus, ...corpus],
      themes: [...base.themes, ...themes.filter(t => t.lineIds.some(id => ids.has(id))).map(t => ({
        ...t, lineIds: t.lineIds.filter(id => ids.has(id)),
        reportIds: t.reportIds.filter(id => release.reportIds.includes(id)),
      }))]};
  }).concat([base]);
}
