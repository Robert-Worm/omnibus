import type { Point, Criterion, RecordEntry } from '../app/cio-law-workspace';
import type { LawReaderDocument } from '../app/law-point-source';
import type { Line } from './framework-types.js';
// Topical packages use an interpretation flag, while CIO links may carry text.
// Their optional cross-references must not be invented to fit the CIO schema.
export type TopicalPoint = Omit<Point, 'source_links' | 'source_cross_references'> & {
  source_links: (Omit<Point['source_links'][number], 'unresolved_interpretation'> & {unresolved_interpretation?: boolean | string})[];
  source_cross_references?: string[];
};
export type TopicalPackage = {
  id: string;
  context: {
    title: string; intro: string; edition: string; effective_from: string; as_of: string;
    applicability: string; status: string;
    audience: string[]; use_cases: string[];
    documents: {id: string; role: string}[];
    limitations: {title: string; text: string}[];
  };
  status: {official_url: string; publication_rights: string};
  catalogue: {criteria: Criterion[]; points: TopicalPoint[]};
  bank: {records: RecordEntry[]};
  documents: (LawReaderDocument & {packageDocumentId: string})[];
};
export const topicalPackages: TopicalPackage[];
export const topicalIds: string[];
export function topicalPackage(id: string): TopicalPackage | undefined;
export const topicalMetadata: {id: string; title: string; kind: string; url: string; edition: string; usage: string; readiness: string; coverage: string; context: string}[];
export function topicalGoal(bundle: TopicalPackage, objectiveId: string): {text: string};
export function topicalRows(bundle: TopicalPackage): (Line & {criterionId: string; groupId: string; pointIds: string[]; navigationSubjects: string[]})[];
export function topicalGroups(bundle: TopicalPackage): {id: string; title: string}[];
export function topicalMeasure(bundle: TopicalPackage, criterionId: string): {text: string};
export function topicalPhaseText(plan?: Point['phase_plans']['opzet']): string;
export function makeTopicalMaterial(bundle: TopicalPackage, point: TopicalPoint): Record<string, string>;
export function validateTopicalMaterial(material: Record<string, string>): void;
