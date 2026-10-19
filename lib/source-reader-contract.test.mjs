import test from "node:test";
import assert from "node:assert/strict";
import { indexPages, rawUnits, readingBlocks, markedSegments } from "./source-text-blocks.mjs";
import { displayReadingBlocks, readableUnits } from "./reader-display.mjs";
import { createSourceReaderDocument } from "./source-reader-document.mjs";

test("Unicode source offsets count codepoints, not UTF-16 units or displayed characters", () => {
  const pages = indexPages([
    { page: 1, text: "A😀é" },
    { page: 2, text: "e\u0301 Z" },
  ]);
  assert.deepEqual(
    pages.map(({ start, end }) => ({ start, end })),
    [
      { start: 0, end: 3 },
      { start: 3, end: 7 },
    ],
  );
  const units = rawUnits(pages[1].text, pages[1].start);
  assert.deepEqual(
    units.map(({ start, end }) => [start, end]),
    [
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  );
  assert.deepEqual(markedSegments(rawUnits("A😀B"), { start: 1, end: 2 }), [
    { text: "A", marked: false, start: 0, end: 1 },
    { text: "😀", marked: true, start: 1, end: 2 },
    { text: "B", marked: false, start: 2, end: 3 },
  ]);
});

test("overlapping marks, exclusive ends and absent evidence preserve every source span", () => {
  const units = rawUnits("abcdef", 10);
  const marked = markedSegments(units, [
    { start: 11, end: 13 },
    { start: 12, end: 15 },
  ]);
  assert.deepEqual(
    marked.map(({ text, marked }) => [text, marked]),
    [
      ["a", false],
      ["bcde", true],
      ["f", false],
    ],
  );
  for (const empty of [undefined, null, []])
    assert.deepEqual(markedSegments(units, empty), [
      { text: "abcdef", marked: false, start: 10, end: 16 },
    ]);
  assert.deepEqual(markedSegments([], { start: 0, end: 10 }), []);
});

test("readable soft hyphens retain their source spans; hard hyphens and original text stay untouched", () => {
  const source = "tegen\u00ad\nspraak en risico-analyse";
  const units = rawUnits(source),
    before = structuredClone(units),
    display = readableUnits(units);
  assert.equal(display.map((unit) => unit.char).join(""), "tegenspraak en risico-analyse");
  assert.deepEqual(
    display.map(({ start, end }) => [start, end]),
    units.map(({ start, end }) => [start, end]),
  );
  assert.deepEqual(units, before);
  assert.equal(
    markedSegments(display, { start: 0, end: 13 })
      .filter((part) => part.marked)
      .map((part) => part.text)
      .join(""),
    "tegenspraak",
  );
});

test("source layout retains legal headings, paragraphs, lists and contiguous table rows", () => {
  const legal = indexPages([
    {
      page: 1,
      readingLayout: "prose",
      text: "Artikel 2\n1. Een voorwaarde.\na. Een uitzondering.",
    },
  ])[0];
  const blocks = readingBlocks(legal);
  assert.equal(blocks[0].kind, "heading");
  assert.equal(blocks[0].text, "Artikel 2");
  assert.deepEqual(
    blocks.slice(1).map((block) => block.text),
    ["1. Een voorwaarde.", "a. Een uitzondering."],
  );
  const page = indexPages([{ page: 1, text: "A    B\nC    D\n\n• Controle" }])[0];
  const raw = readingBlocks(page),
    before = structuredClone(raw),
    display = displayReadingBlocks(raw);
  assert.equal(display[0].text, "A    B\nC    D");
  assert.equal(display.at(-1).kind, "list");
  assert.deepEqual(raw, before);
});

test("bounded page cache preserves metadata, contents and reparsed display without changing source pages", () => {
  const source = Array.from({ length: 4 }, (_, i) => ({
    page: i + 1,
    text: `${i + 1} Onderdeel\n\nVoorbeeld 😀 ${i}.`,
    incompleteText: i === 3,
  }));
  const before = structuredClone(source),
    reader = createSourceReaderDocument(source, { cacheSize: 2 });
  const expected = indexPages(source).map((page) => ({
    ...page,
    blocks: displayReadingBlocks(readingBlocks(page), { readable: true }),
  }));
  const first = reader.read(1),
    second = reader.read(2);
  assert.equal(reader.read(1), first);
  reader.read(3);
  assert.equal(reader.read(1), first);
  assert.notEqual(reader.read(2), second);
  for (const page of [4, 1, 3, 2, 4]) assert.deepEqual(reader.read(page), expected[page - 1]);
  assert.deepEqual(
    reader.contents,
    expected.flatMap((page) =>
      page.blocks
        .filter((block) => block.kind === "heading")
        .map((block) => ({ page: page.page, start: block.start, text: block.text })),
    ),
  );
  assert.equal(reader.read(4).incompleteText, true);
  assert.deepEqual(reader.read(999), expected[0]);
  assert.deepEqual(source, before);
});

test("empty readers and invalid cache sizes have explicit boundaries", () => {
  assert.equal(createSourceReaderDocument([]).read(1), undefined);
  for (const cacheSize of [0, -1, 11, 0.5, NaN, Infinity])
    assert.throws(
      () => createSourceReaderDocument([], { cacheSize }),
      /Invalid source reader cache size/,
    );
});
