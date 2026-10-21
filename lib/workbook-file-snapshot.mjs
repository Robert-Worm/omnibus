// The downloadable workbook is the validated preview, not a second calculation
// from a potentially newer draft. Renderer functions/preview navigation are not
// file data. Evidence, formulas, styles and every worksheet remain unchanged.
export function workbookFileSnapshot(model, exportedAt = new Date().toISOString()) {
  const date = new Date(exportedAt);
  if (!Number.isFinite(date.getTime())) throw Error('Ongeldige exportdatum.');
  const sheets = model.sheets.map(({entries: _entries, detailRecords: _details, viewer: _viewer, ...sheet}) => {
    if (!sheet.exportedAtCell) return sheet;
    const {row, column} = sheet.exportedAtCell;
    if (!(sheet.rows[row - 1]?.[column] instanceof Date)) throw Error('De exportdatum ontbreekt in het werkboek.');
    return {...sheet, rows:sheet.rows.map((cells, i) => i === row - 1
      ? cells.map((value, c) => c === column ? date : value) : cells)};
  });
  return {title:model.title, meta:{...model.meta, exportedAt}, sheets,
    definedNames:model.definedNames, stylesXml:model.stylesXml,
    evidence:model.evidence, applicability:model.applicability};
}
