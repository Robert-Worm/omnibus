import type { IndexedPage, ReadingBlock } from "./report-reader.mjs";

export type SourcePage = { page: number; text: string };
export type RenderedPage<T extends SourcePage> = T & IndexedPage & {
  blocks: ReadingBlock[];
};

export function createSourceReaderDocument<T extends SourcePage>(
  sourcePages: T[],
  options?: { cacheSize?: number },
): {
  pages: (T & IndexedPage)[];
  contents: { page: number; start: number; text: string }[];
  read(number: number): RenderedPage<T> | undefined;
};
