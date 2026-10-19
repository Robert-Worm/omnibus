import type { Draft } from './framework-types.js';
import type { ReportPoint, ReportPointCatalogue } from './report-point-types.js';
export type ReportWordingMode = 'generic' | 'source';
// Saved project wording is validated by the adapter; invalid modes throw.
export function pointWording(point: ReportPoint, mode?: string): ReportPoint;
export function makeReportPointMaterial(catalogue: ReportPointCatalogue, id: string, mode: ReportWordingMode): Record<string, string>;
export function adoptReportPoints(draft: Draft, catalogue: ReportPointCatalogue, ids: string[], mode: ReportWordingMode): Draft;
export function setReportPointSelection(draft: Draft, catalogue: ReportPointCatalogue, ids: string[], selected: boolean, mode?: ReportWordingMode): Draft;
export function selectReportRows(draft: Draft, catalogue: ReportPointCatalogue, rowIds: string[], selected: boolean): Draft;
