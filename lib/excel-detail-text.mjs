export const excelCellTextLimit = 32767;

export function excelColumnName(index) {
  let name = '';
  for (index++; index; index = Math.floor((index - 1) / 26))
    name = String.fromCharCode(65 + (index - 1) % 26) + name;
  return name;
}

// No trimming, normalization or ellipsis: joining the parts restores the exact
// source text. Prefer paragraph boundaries and never cut a surrogate pair.
export function excelTextParts(text) {
  const parts = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(text.length, start + excelCellTextLimit);
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end - 1);
      if (newline > start + excelCellTextLimit * .8) end = newline + 1;
      if (/[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
    }
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts.length ? parts : [''];
}

// Expand only literal sections. Live register formulas must stay live, not be
// replaced by a cached snapshot. New lookup columns go AFTER existing helpers.
export function splitDetailTextSections(sheet, labels, firstColumn, set) {
  if (!sheet.detailRecords.some(record => record.contents.some(text => text.length > excelCellTextLimit)))
    return labels.map((_, index) => firstColumn + index);
  const columns = [], expandedLabels = [], contents = sheet.detailRecords.map(() => []);
  labels.forEach((label, index) => {
    const column = firstColumn + index;
    const literal = sheet.detailRecords.every((_, i) => typeof sheet.rows[i + 1]?.[column] === 'string');
    const parts = sheet.detailRecords.map(record => literal ? excelTextParts(record.contents[index]) : [record.contents[index]]);
    const count = Math.max(1, ...parts.map(value => value.length));
    for (let part = 0; part < count; part++) {
      let target = column;
      if (part) {
        target = sheet.widths.length;
        sheet.widths.push(40);
        sheet.hiddenColumns.push(target);
        sheet.previewHiddenColumns.push(target);
      }
      columns.push(target);
      expandedLabels.push(part ? `${label} (vervolg ${part + 1})` : label);
      parts.forEach((value, i) => {
        const text = value[part] ?? '';
        contents[i].push(text);
        if (count > 1) set(i + 2, target, text);
      });
    }
  });
  sheet.detailRecords.forEach((record, i) => { record.contents = contents[i]; });
  labels.splice(0, labels.length, ...expandedLabels);
  return columns;
}
