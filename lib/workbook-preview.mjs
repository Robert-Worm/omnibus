// Read-only browser preview of the SAME rows used for the workbook download.
// Entry ranges preserve continuation rows; never preview the empty Excel input reserve.
/** @param {import('./workbook-preview-types.js').WorkbookSheet | null | undefined} sheet */
export function workbookPreviewEntries(sheet) {
  if (!sheet) return [];
  if (sheet.entries) return sheet.entries.map(entry => ({
    key: `${entry.pointId || entry.lineId || entry.row}:${entry.row}`,
    row: entry.row,
    label: [entry.pointId || entry.templateId, sheet.templateStyles ? entry.title : sheet.rows[entry.row - 1]?.[1]].filter(v => typeof v === 'string' && v.trim()).join(' · ') || `Rij ${entry.row}`,
    rows: sheet.rows.slice(entry.row - 1, entry.endRow || entry.row),
  }));
  // Supporting worksheets have no building-block register. Allow browsing their
  // populated rows, without presenting blank/formula-only reserve as user content.
  const start=sheet.headerRow || 5;
  return sheet.rows.slice(start).flatMap((row, i) => row.some((value,c) => !sheet.hiddenColumns?.includes(c) && (
    typeof value === 'number' || value instanceof Date || typeof value === 'string' && value.trim()))
    ? [{key:`row:${i+start+1}`,row:i+start+1,label:`Rij ${i+start+1}`,rows:[row]}] : []);
}

/** @param {unknown} value */
export function workbookPreviewValue(value) {
  if (value instanceof Date) return value.toLocaleDateString('nl-NL');
  if (typeof value === 'string' || typeof value === 'number') return String(value) || '—';
  if (value && typeof value === 'object' && 'value' in value) return String(value.value ?? '—');
  return '—';
}
