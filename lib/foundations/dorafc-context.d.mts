import type { FoundationDocument, FoundationReference, FoundationPassage } from '../foundation-reader.mjs';
export const doraFrameworkContextDocument: FoundationDocument;
export const doraFrameworkLawContextRefs: Record<string, string[]>;
export const doraFrameworkCellContextRefs: Record<string, {sheet: string; cell: string}[]>;
export const doraFrameworkContextData: unknown;
export function doraFrameworkContextHashes(code: string): Record<string, string>;
export function doraFrameworkContextLocation(code: string): string;
export function doraFrameworkContextIndex(document: FoundationDocument, reference?: FoundationReference): {
  pdfHash?: string; sourceHash?: string; textHash: string; entries: Record<string, FoundationPassage[]>;
} | null;
export function doraFrameworkContextDocumentAllowed(document: FoundationDocument, reference?: FoundationReference): boolean;
export function doraFrameworkContextNotice(document: FoundationDocument, reference?: FoundationReference): string;
