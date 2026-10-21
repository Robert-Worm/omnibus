import type {Framework, Line} from './framework-types';
export type ReportOverviewMetadata = Pick<Framework, 'report' | 'scope' | 'limitations' | 'gaps'>;
export function reportOverviewKey(id: string): string;
export function reportOverviewCatalogue(reportIds: string[]): null | {
  lines: Line[]; blocks: Line[];
  points: {id: string; legacy_line_id: string; title: string; text: string}[];
  reports: ReportOverviewMetadata[];
};
