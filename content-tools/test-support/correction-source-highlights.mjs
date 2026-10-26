// Independent browser assertion over original source coordinates, not the
// viewer's own marking algorithm. Contiguous DOM parts may split one passage.
import assert from "node:assert/strict";

export function assertExactSourceHighlights(expected, observed) {
  assert(expected.length > 0, "The source fixture must contain expected passages");
  const characters = (rows, field) => rows.flatMap(row => {
    assert(Number.isSafeInteger(row.page) && row.page > 0 &&
      Number.isSafeInteger(row.start) && row.start >= 0 &&
      Number.isSafeInteger(row.end) && row.end > row.start, "Invalid source highlight coordinates");
    assert.equal(typeof row[field], "string");
    const text = Array.from(row[field]);
    assert.equal(text.length, row.end - row.start, "Highlight text must cover its exact Unicode range");
    return text.map((character, index) => [row.page, row.start + index, character]);
  });
  assert.deepEqual(characters(observed, "text"), characters(expected, "quote"),
    "Every highlighted character, page and position must match the complete pinned source evidence");
}
