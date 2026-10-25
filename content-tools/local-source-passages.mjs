// Exact passages in the existing report-kit/CIO formats, not a substitute for
// source reading, semantic review, custody or admission. No filesystem access.
import { lawReaderPassages } from "../lib/law-source-reader.mjs";
import { indexPages } from "../lib/source-text-blocks.mjs";

const requireValue = (ok, message) => { if (!ok) throw Error("Source passages: " + message); };
const text = value => typeof value === "string" && Boolean(value.trim());
const array = (value, label) => { requireValue(Array.isArray(value), label + " must be an array"); return value; };
const inside = (start, end, lower, upper) => Number.isSafeInteger(start) && Number.isSafeInteger(end) &&
  lower <= start && start < end && end <= upper;
function identities(rows, key, label) {
  const ids = array(rows, label).map(row => row?.[key]);
  requireValue(ids.every(text) && new Set(ids).size === ids.length, label + " identities are missing or duplicated");
  return new Set(ids);
}
function exact(chars, start, end, quote, label) {
  requireValue(inside(start, end, 0, chars.length) && typeof quote === "string" &&
    chars.slice(start, end).join("") === quote, label + " is not an exact Unicode-codepoint passage");
}
function pagesChecked(pages) {
  requireValue(Array.isArray(pages) && pages.length > 0 && pages.every((page, i) =>
    page?.page === i + 1 && typeof page.text === "string"), "pages must be consecutive, unique and ordered from 1");
  return indexPages(pages);
}

function reportPassages({ read, lookup, packageId }) {
  const source = read("SOURCE.json"), app = read("APP-FINAL.json"), framework = app.framework;
  let original;
  try { original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(lookup("source.txt").bytes); }
  catch { throw Error("Source passages: source.txt must be exact UTF-8"); }
  requireValue(text(source.source_id) && source.quote === original, "SOURCE.json and source.txt differ");
  requireValue(app.source?.id === packageId && framework.report.id === packageId &&
    framework.report.source_hash === source.text_sha256 && framework.report.pdf_hash === source.pdf_sha256,
  "report viewer source identity or edition differs");
  const pages = pagesChecked(app.source.pages), chars = Array.from(original);
  requireValue(pages.map(page => page.text).join("") === original, "viewer text differs from source.txt");
  requireValue(Array.isArray(source.pages) && source.pages.length === pages.length &&
    source.pages.every((page, i) => page?.page === pages[i].page && page.start === pages[i].start && page.end === pages[i].end),
  "source page boundaries differ from the exact viewer pages");
  let recordPassages = 0, qualifications = 0, supplementaryPassages = 0;
  for (const name of ["extractor/output/result.json", "inventory/output/result.json", "RECONCILED-SOURCE.json"]) {
    const bank = read(name);
    requireValue(bank.source_id === source.source_id, name + " has a different source identity");
    identities(bank.records, "record_id", name);
    for (const record of bank.records) {
      const context = record.source;
      requireValue(context?.source_id === source.source_id, name + " record has a different source identity");
      exact(chars, context.context_start, context.context_end, context.context_quote, name + " context");
      requireValue(inside(context.target_start, context.target_end, context.context_start, context.context_end),
        name + " target is outside its source context");
      recordPassages++;
      for (const finding of array(record.findings, name + " findings")) {
        exact(chars, finding.result_start, finding.result_end, finding.result_quote, name + " finding");
        requireValue(inside(finding.result_start, finding.result_end, context.context_start, context.context_end) &&
          finding.result_start < context.target_end && finding.result_end > context.target_start,
        name + " finding is outside its context or does not overlap its target");
        recordPassages++;
        for (const qualification of array(finding.qualifications, name + " qualifications")) {
          exact(chars, qualification.start, qualification.end, qualification.quote, name + " qualification");
          requireValue(inside(qualification.start, qualification.end, context.context_start, context.context_end) &&
            ["ESSENTIAL", "OPTIONAL_CONTEXT"].includes(qualification.role), name + " qualification role or context is invalid");
          if (qualification.role === "ESSENTIAL") requireValue(inside(qualification.start, qualification.end,
            finding.result_start, finding.result_end), name + " essential qualification is outside the finding");
          qualifications++;
        }
      }
    }
    identities(bank.supplementary_sources, "id", name + " supplementary sources");
    for (const span of bank.supplementary_sources) {
      exact(chars, span.start, span.end, span.quote, name + " supplementary source"); supplementaryPassages++;
    }
  }
  const evidenceIds = identities(framework.evidence, "id", "report evidence");
  requireValue(evidenceIds.size > 0, "report evidence is empty");
  for (const span of framework.evidence) {
    requireValue(span.report_id === packageId && ["RESULT", "CONTEXT"].includes(span.role), "evidence source or role differs");
    exact(chars, span.start, span.end, span.quote, "report evidence");
    const touched = pages.filter(page => page.start < span.end && page.end > span.start);
    requireValue(touched.length > 0 && span.page === touched[0].page &&
      (span.page_end === undefined ? span.page : span.page_end) === touched.at(-1).page, "evidence page range differs from its passage");
  }
  for (const line of framework.lines) {
    requireValue(line.report_id === packageId, "line refers to another report");
    for (const key of ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"]) {
      const ids = array(line[key]?.evidence_ids, "line " + key + " evidence");
      requireValue(ids.every(id => evidenceIds.has(id)) && (key === "owner" || ids.length > 0), "line has missing or unknown evidence");
    }
    requireValue(framework.evidence.some(span => span.role === "RESULT" && line.finding.evidence_ids.includes(span.id) &&
      span.quote === line.finding.text), "finding text is not a linked literal RESULT");
  }
  return { pages: pages.length, sourceBanks: 3, recordPassages, qualifications, supplementaryPassages,
    viewerPassages: framework.evidence.length, coordinates: "document-global-codepoints" };
}

function frameworkPassages({ read, lookup, packageId }) {
  const manifest = read("SOURCE-MANIFEST.json"), pages = pagesChecked(read("source/pages.json"));
  requireValue(manifest.source_id === packageId && manifest.page_count === pages.length,
    "framework source identity or page count differs");
  const spans = [];
  for (const name of ["reader-a/result.json", "reader-b/result.json", "RECONCILED-SOURCE.json"]) {
    const bank = read(name);
    requireValue(bank.source_id === packageId && bank.source_pdf_sha256 === lookup("source/source.pdf").file.sha256 &&
      bank.source_pages_sha256 === lookup("source/pages.json").file.sha256, name + " source identity or edition differs");
    requireValue(identities(bank.records, "id", name).size > 0, name + " source bank is empty");
    for (const record of bank.records) {
      const recordSpans = array(record.source_spans, name + " source spans");
      requireValue(recordSpans.length > 0 && recordSpans.every(span => span && Number.isSafeInteger(span.page) &&
        Number.isSafeInteger(span.start) && Number.isSafeInteger(span.end) && typeof span.quote === "string"),
      name + " source span is missing or malformed");
      for (const span of recordSpans) spans.push(span);
    }
  }
  // Same exact page-local → document-global conversion as the shared CIO viewer.
  // An invalid span must fail the whole check, not silently disappear from it.
  requireValue(lawReaderPassages(pages, spans).length === spans.length,
    "framework span is not an exact page-local Unicode-codepoint passage");
  const bank = read("RECONCILED-SOURCE.json"), catalogue = read("CATALOGUE.json");
  requireValue(catalogue.source_bank_sha256 === lookup("RECONCILED-SOURCE.json").file.sha256,
    "catalogue refers to another source bank");
  const ids = new Set(bank.records.map(record => record.id));
  let sourceLinks = 0;
  for (const key of ["goals", "objectives", "criteria", "points"]) for (const item of catalogue[key]) {
    const links = key === "points" ? array(item.source_links, "point source links").map(link => link?.record_id)
      : array(item.source_record_ids, key + " source references");
    requireValue(links.length > 0 && links.every(id => ids.has(id)), "catalogue has missing or unknown source records");
    if (item.basis === "DIRECT_SOURCE") requireValue(bank.records.some(record => links.includes(record.id) &&
      record.source_spans.some(span => span.quote === item.text)), "DIRECT_SOURCE text is not a linked literal quotation");
    sourceLinks += links.length;
  }
  return { pages: pages.length, sourceBanks: 3, recordPassages: spans.length, sourceLinks,
    coordinates: "page-local-codepoints" };
}

/** Called only with the immutable, hash-checked snapshot of the review basis. */
export function checkLocalSourcePassages(kind, snapshot) {
  requireValue(["report", "framework"].includes(kind), "unsupported source contract");
  return kind === "report" ? reportPassages(snapshot) : frameworkPassages(snapshot);
}
