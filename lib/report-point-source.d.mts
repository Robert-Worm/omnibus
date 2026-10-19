import type { ReportPointCatalogue, ReportPointTrace } from './report-point-types.js';
export const reportDownloadUrls: Record<string, string>;
export function reportPointTrace(catalogue: ReportPointCatalogue, pointId: string): ReportPointTrace;
export function validateReportTrace(material: Record<string, string>): ReportPointTrace;
