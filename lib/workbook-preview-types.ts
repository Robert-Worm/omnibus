/** Shared read-only projection of the workbook generator's browser preview. */
export type WorkbookCell = string | number | boolean | Date | null | undefined |
  {formula: string; value?: string | number | boolean};
export type WorkbookPreviewStyle = {fill: string; color: string; border?: string; fontFamily?: string};
export type WorkbookSheet = {
  name: string;
  rows: WorkbookCell[][];
  widths: number[];
  merges: string[];
  rowStyles: Record<number, number>;
  cellStyles: Record<number, Record<number, number>>;
  headerRow?: number;
  columnIds?: string[];
  hiddenColumns?: number[];
  previewHiddenColumns?: number[];
  templateStyles?: boolean;
  registerKind?: string;
  entries?: {row: number; endRow?: number; pointId?: string; lineId?: string; templateId?: string; title?: string; parent?: string}[];
  viewer?: {labels: string[]};
  detailRecords?: {pointId: string; contents: string[]}[];
};
export type WorkbookPreview = {
  title: string;
  selection: {norms: number; links: number; themeIds: string[]};
  sheets: WorkbookSheet[];
  previewStyles?: WorkbookPreviewStyle[];
};
