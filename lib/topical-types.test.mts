// Compile-only shapes: no source text or private framework data.
import type {TopicalPoint} from './topical-content.mjs';

export const syntheticLink: TopicalPoint['source_links'][number] = {
  record_id: 'synthetic-record', supported_clause: 'synthetic clause',
  contribution: 'PRIMARY', explanation: 'synthetic explanation',
  derivation: 'PARAPHRASE', unresolved_interpretation: false,
};
export function optionalCrossReferences(point: TopicalPoint): string[] {
  return point.source_cross_references ?? [];
}
// @ts-expect-error An interpretation flag or explanation cannot be a numeric score.
export const invalidFlag: TopicalPoint['source_links'][number]['unresolved_interpretation'] = 7;
// @ts-expect-error Missing optional source references cannot be promised as an array.
export function missingReferences(point: TopicalPoint): string[] { return point.source_cross_references; }
