// Retain the real workbook cells and file metadata. The browser needs only these
// entry labels/ranges, not the preparation functions or duplicate source objects
// captured by those functions. Evidence remains in the workbook's evidence field.
/** @param {ReturnType<typeof import('./creator-model.mjs').creatorWorkbookModel> | null} model */
export function workbookPreviewSnapshot(model) {
  if(!model)return null;
  return {...model,sheets:model.sheets.map(sheet=>({...sheet,
    ...(sheet.entries?{entries:sheet.entries.map(({row,endRow,pointId,lineId,templateId,title,parent})=>
      ({row,endRow,pointId,lineId,templateId,title,parent}))}:{}),
  }))};
}
