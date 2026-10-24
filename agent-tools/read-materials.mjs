// Read projections only. These never create selectable materials or replace a
// source adapter's admission, snapshot or applicability checks.
export const keyFor = (sourceId, pointId, level = '') => [sourceId, pointId, level].filter(Boolean).join('|');
export function readEntry(kind, source, pointId, material, options = {}) {
  const {level = '', selectionStatus = 'SELECTABLE', selectionReason = '', draftSelectable = true, themes = []} = options;
  return {key: keyFor(source.id, pointId, level), kind, sourceId: source.id, sourceTitle: source.title,
    pointId, level, material, themes, selectionStatus, selectionReason,
    draftSelectable: draftSelectable && selectionStatus === 'SELECTABLE',
    sourceCoverage: source.coverage || '', sourceReadiness: source.readiness || '',
    passageStatus: material.sourceText?.trim() ? 'AVAILABLE' : 'NOT_AVAILABLE',
    passageNotice: material.sourceText?.trim() ? '' : 'Geen letterlijke bronpassage in deze bouwsteen. Broncontext of een eigen modelvraag is geen broncitaat.'};
}

// HOLD/context points are readable in the shared viewers but deliberately
// rejected by their selection factories. Read their existing linked evidence;
// never change the status or call a factory with a fabricated SELECTABLE point.
export function readRestrictedPoint(source, point, detail, {trace = {}, linkSpans = false, spanLocation} = {}) {
  const records = detail.records || [];
  const sourceText = (point.source_links || []).map(link => {
    const record = records.find(record => record.id === link.record_id);
    if (!record) throw Error('Ontbrekend bronrecord voor ' + point.id + ': ' + link.record_id);
    const spans = linkSpans ? (record.evidence_kind === 'XML_ONLY' ? [] : link.visible_spans || []) : record.source_spans || [];
    if (!spans.length && !record.xml_evidence?.quote) return '';
    return [record.id + ' · ' + record.locator + ' · ' + link.contribution,
      ...spans.map(span => (spanLocation ? spanLocation(span) : 'Pagina ' + span.page) +
        ' [' + span.start + '–' + span.end + ']\n' + span.quote),
      record.xml_evidence?.quote ? 'XML · geconsolideerde tekst; geen PDF-markering\n' + record.xml_evidence.quote : '',
    ].filter(Boolean).join('\n\n');
  }).filter(Boolean).join('\n\n');
  return {title: point.title, body: point.text, sourceTitle: source.title, sourceUrl: source.url || '', edition: source.edition || '',
    sourcePointId: point.id, location: records.map(record => record.locator).join('; '), sourceText,
    parentCriterion: detail.criterion?.text || '',
    controlObjective: (detail.objectives || []).map(o => o.text).filter(Boolean).join('\n\n'),
    rationale: (detail.goals || []).map(g => g.text).filter(Boolean).join('\n\n'),
    risk: (detail.objectives || []).map(o => o.risk).filter(Boolean).join('\n\n'),
    sourceContext: [point.selection_status + ' · ' + (point.selection_reason || ''), point.scope,
      ...(point.addressees || []).map(a => a.label + (a.condition ? ' · ' + a.condition : '')),
      ...(point.conditions || []), ...(point.exceptions || []), source.statusNote, source.coverage,
      JSON.stringify({issues: detail.issues || [], issueUses: detail.issueUses || [], limitations: detail.limitations || []}),
    ].filter(Boolean).join('\n\n'),
    readTrace: JSON.stringify({source, point, ...detail, ...trace})};
}

export function flatReadMaterial(source, point, documents, passagesFor) {
  const material = {...point, body: point.auditNorm || point.body || '', foundationId: source.id,
    sourceTitle: source.title, sourceUrl: point.sourceUrl || source.url, edition: point.edition || source.edition};
  // The shared reader resolves only the exact edition/hash and returns its
  // published passage offsets. No fuzzy matching or alternate edition fallback.
  const passages = documents.flatMap(document => passagesFor(document, material).map(passage => ({
    documentId: document.id, title: document.title, sourceUrl: document.sourceUrl,
    sourceHash: document.source_file_hash || document.pdf_hash, textHash: document.source_sha256, ...passage,
  })));
  if (passages.length) material.sourceText = passages.map(p => [p.title || p.documentId,
    p.label, 'Bronfragment ' + p.page + ' [' + p.start + '–' + p.end + ']', p.quote].filter(Boolean).join('\n')).join('\n\n');
  material.readTrace = JSON.stringify({source, point, passages});
  return material;
}

export function modelReadMaterial(model, item, question, material) {
  const sources = (model.sources || []).filter(source => !question.sourceIds?.length || question.sourceIds.includes(source.id));
  return {...material, sourceContext: [material.sourceContext, model.source,
    ...sources.map(source => [source.id, source.title, source.url].filter(Boolean).join(' · ')),
    model.limitation, model.usageNotes, item.boundary].filter(Boolean).join('\n\n'),
    readTrace: JSON.stringify({modelId: model.id, version: model.version, source: model.source, sources,
      limitation: model.limitation, usageNotes: model.usageNotes, dimension: {id: item.id, definition: item.definition, boundary: item.boundary}, question})};
}

export function themesForPoint(themes, point) {
  return themes.filter(theme => theme.lineIds.includes(point.legacy_line_id)).map(theme => ({
    id: theme.id, title: theme.title, keywords: theme.keywords || '', description: theme.description || '',
  }));
}
