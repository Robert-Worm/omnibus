import { canonical, digest } from "../content-tools/identity.mjs";

const fail = (label) => {
  throw Error("Release content verification failed: " + label);
};
const same = (actual, expected, label) => {
  if (canonical(actual) !== canonical(expected)) fail(label);
};
const parse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    fail("invalid stored JSON");
  }
};

/** Read-only acceptance check. Process one package/document at a time, not a second
 * complete database in memory. This verifies identities, never substantive approval.
 * The caller supplies a read transaction so all rows belong to one consistent view.
 */
export function verifyReleaseContent(repository, release) {
  const db = repository.db;
  const row = db.prepare("SELECT manifest FROM releases WHERE id=?").get(release);
  if (!row) fail("missing release");
  const manifest = parse(row.manifest);
  same(digest(manifest), release, "manifest identity");
  if (!manifest.inventory) fail("missing inventory");
  const inventory = { packages: [], documents: [], artifacts: [] };
  const totals = { packages: 0, records: 0, documents: 0, sourcePages: 0, sourceArtifacts: 0 };
  const records = db.prepare("SELECT * FROM records WHERE version=? ORDER BY position");
  for (const item of db
    .prepare(`SELECT p.* FROM packages p
    JOIN release_packages r ON r.version=p.version WHERE r.release_id=? ORDER BY p.version`)
    .iterate(release)) {
    const header = parse(item.payload),
      values = [];
    same(
      [item.source_id, item.kind, item.title],
      [header.id, header.kind, header.title],
      "package search fields",
    );
    for (const record of records.iterate(item.version)) {
      const value = parse(record.payload);
      same(
        [record.id, record.kind, record.title, record.status, record.position],
        [value.id, value.kind, value.title || value.id, value.status ?? null, values.length],
        "record search fields or position",
      );
      values.push(value);
    }
    same(digest({ ...header, records: values }), item.version, "package contents");
    inventory.packages.push(item.version);
    totals.packages++;
    totals.records += values.length;
  }
  const pages = db.prepare("SELECT * FROM pages WHERE document_version=? ORDER BY number");
  for (const document of db
    .prepare(`SELECT d.* FROM documents d
    JOIN release_documents r ON r.version=d.version WHERE r.release_id=? ORDER BY d.version`)
    .iterate(release)) {
    const metadata = parse(document.metadata),
      values = [];
    same(document.id, metadata.id, "document identity");
    let offset = 0;
    for (const page of pages.iterate(document.version)) {
      const value = parse(page.payload);
      if (typeof value?.text !== "string") fail("source page text");
      const end = offset + Array.from(value.text).length;
      same(
        [page.number, page.start_cp, page.end_cp, page.sha256],
        [values.length + 1, offset, end, digest(page.payload)],
        "source page coordinates or checksum",
      );
      same(value.page, page.number, "source page identity");
      values.push(value);
      offset = end;
    }
    same(document.page_count, values.length, "source page count");
    same(digest({ ...metadata, pages: values }), document.version, "document contents");
    inventory.documents.push(document.version);
    totals.documents++;
    totals.sourcePages += values.length;
  }
  for (const artifact of db
    .prepare(`SELECT a.payload,a.sha256,r.name FROM artifacts a
    JOIN release_artifacts r ON r.sha256=a.sha256 WHERE r.release_id=? ORDER BY r.name`)
    .iterate(release)) {
    same(digest(parse(artifact.payload)), artifact.sha256, "artifact contents");
    inventory.artifacts.push({ name: artifact.name, sha256: artifact.sha256 });
    totals.sourceArtifacts++;
  }
  // Match the existing import identity algorithm, including its artifact ordering.
  inventory.artifacts.sort((a, b) => a.name.localeCompare(b.name));
  same(inventory, manifest.inventory, "release inventory");
  return totals;
}
