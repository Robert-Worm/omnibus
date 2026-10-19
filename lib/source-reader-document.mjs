import { indexPages, readingBlocks } from "./source-text-blocks.mjs";
import { displayReadingBlocks } from "./reader-display.mjs";

/**
 * Retain source text and compact contents, but only three rendered pages.
 * Previously every page's per-character display objects lived as long as the
 * viewer. Parsing and coordinates stay unchanged; this is not remote loading.
 * @template {import('./source-text-blocks.mjs').SourcePage} T
 * @param {T[]} sourcePages
 * @param {{cacheSize?:number}} options
 */
export function createSourceReaderDocument(sourcePages, { cacheSize = 3 } = {}) {
  if (!Number.isSafeInteger(cacheSize) || cacheSize < 1 || cacheSize > 10)
    throw new Error("Invalid source reader cache size");
  const pages = indexPages(sourcePages);
  const byNumber = new Map(pages.map((page) => [page.page, page]));
  const contents = [];
  for (const page of pages) {
    // Only headings contribute to the contents. Do not retain the full page's
    // display units or transform paragraphs merely to obtain their headings.
    const headings = readingBlocks(page).filter((block) => block.kind === "heading");
    for (const block of displayReadingBlocks(headings, { readable: true }))
      contents.push({ page: page.page, start: block.start, text: block.text });
  }
  /** @type {Map<number,T & import('./source-text-blocks.mjs').IndexedPage & {blocks:import('./source-text-blocks.mjs').ReadingBlock[]}>} */
  const rendered = new Map();
  return {
    pages,
    contents,
    /** @param {number} number */
    read(number) {
      const page = byNumber.get(number) ?? pages[0];
      if (!page) return undefined;
      let result = rendered.get(page.page);
      if (result) rendered.delete(page.page);
      else
        result = { ...page, blocks: displayReadingBlocks(readingBlocks(page), { readable: true }) };
      rendered.set(page.page, result);
      const oldest = rendered.keys().next().value;
      if (rendered.size > cacheSize && oldest !== undefined) rendered.delete(oldest);
      return result;
    },
  };
}
