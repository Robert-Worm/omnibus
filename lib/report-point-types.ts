import type { Element, Line, Report } from './framework-types.js';

export type ReportPhase = {
  status: string;
  procedure?: string;
  evidence?: string;
  boundary?: string;
  reason?: string;
};
export type ReportPointLink = {
  material_id: string;
  evidence_id: string;
  role: string;
  reason?: string;
};
export type ReportPoint = {
  id: string;
  legacy_line_id: string;
  report_id: string;
  title: string;
  text: string;
  phases: Record<string, ReportPhase>;
  source_context: {report: string; local: string};
  source_links: ReportPointLink[];
  context_source_links: ReportPointLink[];
  detail_level?: string;
  variant_available?: boolean;
  practical_revision?: string;
  review_status?: string;
  generic_variant?: {title: string; text: string; phases: Record<string, ReportPhase>};
  generic_control?: string;
};
export type ReportBlock = {
  id: string;
  report_id: string;
  line: Line;
  objective: Pick<Element, 'text' | 'basis' | 'reason'>;
  criterion: Pick<Element, 'text' | 'basis' | 'reason'>;
};
export type ReportPointSource = {
  id: string;
  report_id: string;
  evidence_ids: string[];
  source_hash: string;
  quote: string;
  start: number;
  end: number;
  page: number;
  page_end?: number;
  locator_status: string;
};
export type ReportPointQuestion = {id: string; text: string; point_ids: string[]};
export type ReportVisual = {
  id: string;
  page: number;
  observation: string;
  interpretation_limit: string;
  supports_point_ids?: string[];
  context_line_ids?: string[];
};
export type ReportPointCatalogue = {
  fingerprint: string;
  blocks: ReportBlock[];
  points: ReportPoint[];
  sources: ReportPointSource[];
  reports: Report[];
  interview_questions?: ReportPointQuestion[];
  visual_sources?: ReportVisual[];
};
export type ReportPointTrace = {
  version: number;
  point_id: string;
  report_id: string;
  source_hash: string;
  pdf_hash?: string;
  relations: (ReportPointLink & Omit<ReportPointSource, 'id' | 'report_id' | 'evidence_ids'>)[];
  questions: ReportPointQuestion[];
  visuals: ReportVisual[];
  source_context: ReportPoint['source_context'];
  limitations: string[];
};
