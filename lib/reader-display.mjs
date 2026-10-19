// Presentation only. Keep the independently reviewed parser and its source
// coordinates unchanged. Adjacent extracted lines share a visual container;
// blank lines, headings and paragraphs retain their existing boundaries.
/** @param {import('./source-text-blocks.mjs').ReadingBlock[]} blocks @param {{readable?:boolean}} options */
export function displayReadingBlocks(blocks, { readable = false } = {}) {
  /** @type {import('./source-text-blocks.mjs').ReadingBlock[]} */
  const result = [];
  for (const block of blocks) {
    const previous = result.at(-1);
    if (
      block.kind === "verbatim" &&
      previous?.kind === "verbatim" &&
      block.start === previous.end + 1
    ) {
      previous.units.push({ char: "\n", start: previous.end, end: block.start }, ...block.units);
      previous.end = block.end;
      previous.text += "\n" + block.text;
    } else result.push({ ...block, units: [...block.units] });
  }
  return readable
    ? result.map((block) => {
        const units = readableUnits(block.units);
        return { ...block, units, text: units.map((unit) => unit.char).join("") };
      })
    : result;
}

// A discretionary PDF hyphen is not a literal compound hyphen. Retain a unit
// for EVERY original span (including suppressed glyphs), so mark boundaries and
// source navigation remain identical. Never change the stored/extracted text.
/** @param {import('./source-text-blocks.mjs').Unit[]} units */
export function readableUnits(units) {
  const result = units.map((unit) => ({ ...unit }));
  for (let i = 0; i < units.length; i++) {
    if (units[i].char !== "\u00ad") continue;
    result[i].char = "";
    let next = i + 1;
    while (next < units.length && /^\s+$/u.test(units[next].char)) next++;
    // Only join whitespace when letters on both sides prove a word continuation.
    // Do not join across paragraph/page boundaries or infer hard-hyphen spelling.
    if (/\p{L}/u.test(units[i - 1]?.char ?? "") && /\p{L}/u.test(units[next]?.char ?? "")) {
      for (let j = i + 1; j < next; j++) result[j].char = "";
    }
  }
  return result;
}
