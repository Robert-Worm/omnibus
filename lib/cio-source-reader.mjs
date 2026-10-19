import {lawReaderPassages} from './law-source-reader.mjs';

/** The reviewed CIO spans are page-local codepoints; the reader uses document-global codepoints. */
export function cioReaderPassages(pages, record) {
  return lawReaderPassages(pages,record.source_spans,record.locator);
}

/** A familiar document title alone is insufficient to bind a reviewed source version. */
export function cioReaderDocument(documents, pages, pdfHash) {
  return documents.find(document => document.pdf_hash === pdfHash &&
    document.pages.length === pages.length &&
    document.pages.every((page, i) => page.page === pages[i].page && page.text === pages[i].text)) || null;
}

/** Focus the explicitly named list item, keeping its introductory span available. */
export function cioReaderFocus(passages, locator='') {
  const item=locator.match(/onderdeel\s+([a-z])\b/i)?.[1];
  return (item ? passages.find(p=>new RegExp(`^\\s*${item}\\.`,'i').test(p.quote)) : null) || passages[0];
}
