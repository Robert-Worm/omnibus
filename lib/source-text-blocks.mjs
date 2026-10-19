// Pure source layout. No catalogue, UI, database or hosting dependencies.
/**
 * @typedef {{char:string,start:number,end:number}} Unit
 * @typedef {{page:number,text:string,readingLayout?:string}} SourcePage
 * @typedef {SourcePage & {start:number,end:number}} IndexedPage
 * @typedef {{kind:'verbatim'|'heading'|'list'|'paragraph',start:number,end:number,units:Unit[],text:string}} ReadingBlock
 * @typedef {{start:number,end:number}} SourceRange
 * @typedef {{text:string,marked:boolean,start:number,end:number}} MarkedSegment
 */

/** @template {SourcePage} T @param {T[]} pages @returns {(T & {start:number,end:number})[]} */
export function indexPages(pages) {
  let offset = 0;
  return pages.map((page) => {
    const start = offset;
    offset += Array.from(page.text).length;
    return { ...page, start, end: offset };
  });
}
/** @param {string} text @param {number} start @returns {Unit[]} */
export function rawUnits(text, start = 0) {
  return Array.from(text, (char, i) => ({ char, start: start + i, end: start + i + 1 }));
}
/** @param {Unit[]} units @returns {Unit[]} */
function compact(units) {
  /** @type {Unit[]} */
  const result = [];
  for (const unit of units) {
    if (/\s/u.test(unit.char)) {
      const previous = result.at(-1);
      if (previous && previous.char !== " ") result.push({ ...unit, char: " " });
      else if (previous) previous.end = unit.end;
    } else result.push(unit);
  }
  if (result.at(-1)?.char === " ") result.pop();
  return result;
}
/** @param {string} text */
function heading(text) {
  return (
    (/^(?:[1-9]\d?(?:\.\d+){0,3})\s+[A-ZÀ-ÖØ-Þ]/u.test(text) && !/\.{3}|\s\d+\s*$/u.test(text)) ||
    /^(Vooraf|Inhoud|Samenvatting|Literatuur|Bijlagen)$/u.test(text)
  );
}
/** @param {IndexedPage} page @returns {ReadingBlock[]} */
export function readingBlocks(page) {
  let offset = page.start;
  const lines = page.text.split("\n").map((text) => {
    const units = rawUnits(text, offset);
    const start = offset;
    offset += units.length + 1;
    return { text, clean: text.trim(), units, start, end: start + units.length };
  });
  /** @type {ReadingBlock[]} */
  const blocks = [];
  /** @type {ReadingBlock|null} */
  let pending = null;
  let previous = "";
  let bodyStarted = false;
  function flush() {
    if (pending) {
      pending.text = pending.units.map((u) => u.char).join("");
      blocks.push(pending);
      pending = null;
    }
  }
  for (const [i, line] of lines.entries()) {
    if (
      !bodyStarted &&
      (line.clean === `===== PAGE ${page.page} =====` || line.clean === String(page.page))
    )
      continue;
    if (!line.clean) {
      flush();
      previous = "";
      continue;
    }
    bodyStarted = true;
    const legalHeading =
      page.readingLayout === "prose" &&
      /^(?:Artikel \d+(?: (?:bis|ter|quater|quinquies))?|BIJLAGE [IVX]+)$/u.test(line.clean);
    const numberedHeading = heading(line.clean) || legalHeading;
    const legalParagraph =
      page.readingLayout === "prose" &&
      /^(?:\d+(?:\s*(?:bis|ter))?[.)]|[a-z][.)])\s+/u.test(line.clean);
    const list = /^[•●▪]\s|^[-–]\s/u.test(line.clean);
    const table =
      /^(Tabel|Figuur)\s+\d/u.test(line.clean) ||
      (page.readingLayout !== "prose" && /\S[ \t]{3,}\S/u.test(line.text));
    /** @type {boolean} */
    const shortHeading =
      /** @type {ReadingBlock|null} */ (pending)?.kind !== "verbatim" &&
      /[.!?]$/u.test(previous) &&
      line.clean.length < 78 &&
      /^[A-ZÀ-ÖØ-Þ]/u.test(line.clean) &&
      !/[.!?:;]$/u.test(line.clean);
    const newParagraph =
      /[.!?]$/u.test(previous) && previous.length < 85 && /^[A-ZÀ-ÖØ-Þ]/u.test(line.clean);
    if (numberedHeading || legalParagraph || list || table || shortHeading || newParagraph) flush();
    if (!pending)
      pending = {
        kind: table
          ? "verbatim"
          : numberedHeading || shortHeading
            ? "heading"
            : list
              ? "list"
              : "paragraph",
        start: line.start,
        end: line.end,
        units: [],
        text: "",
      };
    const units = pending.kind === "verbatim" ? line.units : compact(line.units);
    const previousUnit = pending.units.at(-1);
    if (previousUnit) {
      // Keep compound hyphens. Do not guess which words should be dehyphenated.
      if (pending.kind === "verbatim" || previousUnit.char !== "-")
        pending.units.push({
          char: pending.kind === "verbatim" ? "\n" : " ",
          start: previousUnit.end,
          end: units[0]?.start ?? line.start,
        });
    }
    pending.units.push(...units);
    pending.end = line.end;
    previous = line.clean;
    const next = lines[i + 1];
    if (legalHeading || (pending.kind === "heading" && next && /^[A-ZÀ-ÖØ-Þ]/u.test(next.clean)))
      flush();
  }
  flush();
  return blocks;
}

/** @param {Unit[]} units @param {SourceRange|SourceRange[]|null|undefined} evidence @returns {MarkedSegment[]} */
export function markedSegments(units, evidence) {
  /** @type {MarkedSegment[]} */
  const result = [];
  const ranges = Array.isArray(evidence) ? evidence : evidence ? [evidence] : [];
  for (const unit of units) {
    const marked = ranges.some((range) => unit.start < range.end && unit.end > range.start);
    const previous = result.at(-1);
    if (previous?.marked === marked) {
      previous.text += unit.char;
      previous.end = unit.end;
    } else result.push({ text: unit.char, marked, start: unit.start, end: unit.end });
  }
  return result;
}
