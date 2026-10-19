import type { Framework, Evidence } from "./framework-types";
export type Unit = { char: string; start: number; end: number };
export type IndexedPage = { page: number; text: string; start: number; end: number; incompleteText?: boolean };
export type ReadingBlock = {
  kind: "heading" | "paragraph" | "list" | "verbatim";
  start: number;
  end: number;
  units: Unit[];
  text: string;
};
export function indexPages(pages: { page: number; text: string }[]): IndexedPage[];
export function rawUnits(text: string, start?: number): Unit[];
export function readingBlocks(page: IndexedPage): ReadingBlock[];
export function markedSegments(
  units: Unit[],
  evidence?: Evidence | {start:number;end:number}[] | null,
): { text: string; marked: boolean; start:number; end:number }[];
export function referenceLabel(framework: Framework, id: string): string;
export const roleLabels: Record<string, string>;
