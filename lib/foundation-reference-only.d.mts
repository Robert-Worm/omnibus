import type { FoundationReference } from './foundation-reader.mjs';
export type ExternalFoundationReference = {
  sourceId: string; documentId: string; documentHash: string;
  title: string; edition: string; pages: number[]; section: string; reason: string; url: string;
  additionalReferences?: {url: string; title: string}[];
};
export function externalFoundationReference(reference?: FoundationReference): ExternalFoundationReference | null;
export const referenceOnlySources: Record<string, {
  sourceId: string; id: string; pdf_hash: string; title: string; edition: string;
  reason: string; url: string; pageAnchor?: boolean;
  references: {code: string; pages: number[]; section: string; additionalReferences?: {url: string; title: string}[]}[];
}>;
