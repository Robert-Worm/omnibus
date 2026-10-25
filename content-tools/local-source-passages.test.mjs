import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkLocalSourceReview } from "./local-source-review.mjs";
import { checkLocalSourcePassages } from "./local-source-passages.mjs";
import { sourceReviewFixture } from "./test-support/local-source-review-fixture.mjs";
import { refreshSyntheticReviewHashes } from "./test-support/local-source-passages-fixture.mjs";
import { lawReaderPassages } from "../lib/law-source-reader.mjs";

const edit = (f, name, change) => { const data = f.read(name); change(data); f.set(name, data); };
const reportBank = (f, change, name = "RECONCILED-SOURCE.json") => edit(f, name, bank => change(bank.records[0]));
const frameworkBank = (f, change, name = "RECONCILED-SOURCE.json") => edit(f, name, bank => change(bank.records[0].source_spans[0]));
const app = (f, change) => edit(f, "APP-FINAL.json", data => change(data));
const run = f => checkLocalSourceReview(f.manifest, f.files, f.authorIds);

for (const kind of ["report", "framework"]) test(`${kind}: exact mixed-Unicode/CRLF/BOM and blank-page passages remain unchanged`, () => {
  const f = sourceReviewFixture(kind), before = [...f.files].map(([id, bytes]) => [id, Buffer.from(bytes)]);
  const result = run(f);
  assert.equal(result.sourcePassagesValidated, true);
  assert.deepEqual(result.passages, kind === "report"
    ? { pages: 3, sourceBanks: 3, recordPassages: 6, qualifications: 3, supplementaryPassages: 3,
      viewerPassages: 1, coordinates: "document-global-codepoints" }
    : { pages: 3, sourceBanks: 3, recordPassages: 6, sourceLinks: 1, coordinates: "page-local-codepoints" });
  for (const flag of ["sourceMethodValidated", "reviewValidated", "viewerShapeValidated", "newContentApproval", "publishable"])
    assert.equal(result[flag], false);
  assert.deepEqual([...f.files], before);
});

/** @type {[string, (f: ReturnType<typeof sourceReviewFixture>) => void, RegExp][]} */
const reports = [
  ["renamed source record identity", f => reportBank(f, r => { r.id = r.record_id; delete r.record_id; }), /source bank has missing/],
  ["different SOURCE quote", f => edit(f, "SOURCE.json", s => { s.quote += " "; }), /SOURCE.json and source.txt/],
  ["stripped source BOM", f => app(f, a => { a.source.pages[0].text = a.source.pages[0].text.slice(1); }), /viewer text differs/],
  ["normalized line endings", f => app(f, a => { a.source.pages[0].text = a.source.pages[0].text.replaceAll("\r\n", "\n"); }), /viewer text differs/],
  ["different viewer source identity", f => app(f, a => { a.source.id = "OTHER"; }), /identity or edition/],
  ["different text edition", f => app(f, a => { a.framework.report.source_hash = "0".repeat(64); }), /identity or edition/],
  ["different PDF edition", f => app(f, a => { a.framework.report.pdf_hash = "0".repeat(64); }), /identity or edition/],
  ["wrong page boundary", f => edit(f, "SOURCE.json", s => { s.pages[0].end++; }), /page boundaries/],
  ["duplicate viewer page", f => app(f, a => { a.source.pages[1].page = 1; }), /consecutive, unique/],
  ["reordered pages", f => app(f, a => { a.source.pages.reverse(); }), /consecutive, unique/],
  ["missing source page", f => edit(f, "SOURCE.json", s => { s.pages.pop(); }), /page boundaries/],
  ["foreign bank source", f => edit(f, "RECONCILED-SOURCE.json", b => { b.source_id = "OTHER"; }), /different source identity/],
  ["foreign record source", f => reportBank(f, r => { r.source.source_id = "OTHER"; }), /different source identity/],
  ["context quote mismatch", f => reportBank(f, r => { r.source.context_quote += " "; }), /context is not an exact/],
  ["target beyond context", f => reportBank(f, r => { r.source.target_end = r.source.context_end + 1; }), /target is outside/],
  ["UTF-16 instead of codepoints", f => reportBank(f, r => { r.findings[0].result_end = r.findings[0].result_start + r.findings[0].result_quote.length; }), /finding is not an exact/],
  ["finding misses target", f => reportBank(f, r => { r.source.target_start = r.findings[0].result_end; r.source.target_end = r.source.context_end; }), /does not overlap/],
  ["essential qualification outside finding", f => reportBank(f, r => {
    r.findings[0].result_end = r.findings[0].qualifications[0].start;
    r.findings[0].result_quote = Array.from(r.source.context_quote).slice(1, r.findings[0].result_end).join("");
  }), /essential qualification is outside/],
  ["qualification quote mismatch", f => reportBank(f, r => { r.findings[0].qualifications[0].quote += " "; }), /qualification is not an exact/],
  ["invalid qualification role", f => reportBank(f, r => { r.findings[0].qualifications[0].role = "IGNORED"; }), /qualification role/],
  ["missing qualifications array", f => reportBank(f, r => { delete r.findings[0].qualifications; }), /qualifications must be an array/],
  ["supplement mismatch", f => edit(f, "RECONCILED-SOURCE.json", b => { b.supplementary_sources[0].quote += " "; }), /supplementary source is not an exact/],
  ["duplicate evidence identity", f => app(f, a => { a.framework.evidence.push(a.framework.evidence[0]); }), /evidence identities/],
  ["wrong evidence start page", f => app(f, a => { a.framework.evidence[0].page = 2; }), /page range differs/],
  ["missing cross-page end", f => app(f, a => { delete a.framework.evidence[0].page_end; }), /page range differs/],
  ["invented evidence end page", f => app(f, a => { a.framework.evidence[0].page_end = 9; }), /page range differs/],
  ["foreign evidence source", f => app(f, a => { a.framework.evidence[0].report_id = "OTHER"; }), /evidence source/],
  ["evidence quote mismatch", f => app(f, a => { a.framework.evidence[0].quote += " "; }), /report evidence is not an exact/],
  ["missing field evidence", f => app(f, a => { a.framework.lines[0].risk.evidence_ids = []; }), /missing or unknown evidence/],
  ["unknown field evidence", f => app(f, a => { a.framework.lines[0].criterion.evidence_ids = ["UNKNOWN"]; }), /missing or unknown evidence/],
  ["finding differs from RESULT", f => app(f, a => { a.framework.lines[0].finding.text += " "; }), /not a linked literal RESULT/],
  ["CONTEXT promoted to RESULT", f => app(f, a => { a.framework.evidence[0].role = "CONTEXT"; }), /not a linked literal RESULT/],
];
for (const name of ["extractor/output/result.json", "inventory/output/result.json"])
  reports.push(["invalid first reading: " + name, f => reportBank(f, r => { r.source.context_start++; }, name), /context is not an exact/]);

/** @type {[string, (f: ReturnType<typeof sourceReviewFixture>) => void, RegExp][]} */
const frameworks = [
  ["foreign framework identity", f => edit(f, "SOURCE-MANIFEST.json", m => { m.source_id = "OTHER"; }), /identity or page count/],
  ["wrong page count", f => edit(f, "SOURCE-MANIFEST.json", m => { m.page_count++; }), /identity or page count/],
  ["duplicate page", f => edit(f, "source/pages.json", p => { p[1].page = 1; }), /consecutive, unique/],
  ["different PDF edition", f => edit(f, "RECONCILED-SOURCE.json", b => { b.source_pdf_sha256 = "0".repeat(64); }), /source identity or edition/],
  ["different page edition", f => edit(f, "RECONCILED-SOURCE.json", b => { b.source_pages_sha256 = "0".repeat(64); }), /source identity or edition/],
  ["negative offset", f => frameworkBank(f, s => { s.start = -1; }), /not an exact page-local/],
  ["noninteger offset", f => frameworkBank(f, s => { s.start = 0.5; }), /missing or malformed/],
  ["string offset", f => frameworkBank(f, s => { s.start = "1"; }), /missing or malformed/],
  ["zero width span", f => frameworkBank(f, s => { s.end = s.start; s.quote = ""; }), /not an exact page-local/],
  ["unknown page", f => frameworkBank(f, s => { s.page = 9; }), /not an exact page-local/],
  ["invalid span on empty page", f => frameworkBank(f, s => { s.page = 2; }), /not an exact page-local/],
  ["UTF-16 offset", f => frameworkBank(f, s => { s.end = s.start + s.quote.length; }), /not an exact page-local/],
  ["normalized accented quotation", f => frameworkBank(f, s => { s.quote = s.quote.normalize("NFC"); }), /not an exact page-local/],
  ["absent source span", f => edit(f, "RECONCILED-SOURCE.json", b => { b.records[0].source_spans = []; }), /missing or malformed/],
  ["null source span", f => edit(f, "RECONCILED-SOURCE.json", b => { b.records[0].source_spans = [null]; }), /missing or malformed/],
  ["stale catalogue bank", f => edit(f, "CATALOGUE.json", c => { c.source_bank_sha256 = "0".repeat(64); }), /another source bank/],
  ["unknown point source", f => edit(f, "CATALOGUE.json", c => { c.points[0].source_links[0].record_id = "UNKNOWN"; }), /unknown source records/],
];
for (const name of ["reader-a/result.json", "reader-b/result.json"])
  frameworks.push(["invalid first reading: " + name, f => frameworkBank(f, s => { s.quote += " "; }, name), /not an exact page-local/]);

/** @type {[string, typeof reports][]} */
const suites = [["report", reports], ["framework", frameworks]];
for (const [kind, cases] of suites)
  for (const [label, change, message] of cases) test(`${kind}: ${label} fails even with matching synthetic review hashes`, () => {
    const f = sourceReviewFixture(kind); change(f); refreshSyntheticReviewHashes(f);
    const before = [...f.files].map(([id, bytes]) => [id, Buffer.from(bytes)]);
    assert.throws(() => run(f), message);
    assert.deepEqual([...f.files], before);
  });

test("framework: all goal/objective/criterion references use the bound bank and DIRECT_SOURCE remains literal", () => {
  for (const key of ["goals", "objectives", "criteria"]) {
    const f = sourceReviewFixture("framework");
    const quote = f.read("RECONCILED-SOURCE.json").records[0].source_spans[0].quote;
    const check = () => checkLocalSourcePassages("framework", { read: f.read, packageId: "FICTIEF",
      lookup: name => ({ file: f.paths.get(name), bytes: f.files.get(f.paths.get(name).id) }) });
    edit(f, "CATALOGUE.json", c => { c[key] = [{ id: "G1", basis: "DIRECT_SOURCE", source_record_ids: ["R1"], text: quote }]; });
    assert.equal(check().sourceLinks, 2);
    edit(f, "CATALOGUE.json", c => { c[key][0].text += " "; });
    assert.throws(check, /not a linked literal/);
    edit(f, "CATALOGUE.json", c => { c[key][0].source_record_ids = ["UNKNOWN"]; });
    assert.throws(check, /unknown source records/);
  }
});

test("framework: shared reader conversion stays standalone and keeps page-local Unicode offsets", () => {
  const f = sourceReviewFixture("framework"), pages = f.read("source/pages.json");
  const spans = f.read("RECONCILED-SOURCE.json").records[0].source_spans;
  const result = lawReaderPassages(pages, spans);
  assert.equal(result.length, 2);
  assert.equal(result[1].start, Array.from(pages[0].text).length);
  assert.deepEqual(result.map(s => s.quote), spans.map(s => s.quote));
  const code = readFileSync(new URL("../lib/law-source-reader.mjs", import.meta.url), "utf8");
  assert.match(code, /from '\.\/source-text-blocks\.mjs'/);
  assert.doesNotMatch(code, /from '\.\/report-reader\.mjs'/);
});
