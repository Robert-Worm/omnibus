// Local migration foundation. No dependency on a hosting provider or UI modules.
import { DatabaseSync } from "node:sqlite";
import { canonical, digest } from "../content-tools/identity.mjs";
import { readingBlocks } from "../lib/source-text-blocks.mjs";
import { displayReadingBlocks } from "../lib/reader-display.mjs";
export { canonical, digest } from "../content-tools/identity.mjs";
const schema = `
CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY CHECK(version=1));
INSERT OR IGNORE INTO schema_version VALUES(1);
CREATE TABLE IF NOT EXISTS releases(id TEXT PRIMARY KEY, manifest TEXT NOT NULL CHECK(json_valid(manifest)));
CREATE TABLE IF NOT EXISTS packages(version TEXT PRIMARY KEY, source_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE IF NOT EXISTS release_packages(release_id TEXT REFERENCES releases(id), version TEXT REFERENCES packages(version), PRIMARY KEY(release_id,version));
CREATE TABLE IF NOT EXISTS records(version TEXT REFERENCES packages(version), kind TEXT NOT NULL, id TEXT NOT NULL, title TEXT NOT NULL, status TEXT, position INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(version,kind,id));
CREATE INDEX IF NOT EXISTS record_kind ON records(version,kind);
CREATE TABLE IF NOT EXISTS documents(version TEXT PRIMARY KEY, id TEXT NOT NULL, metadata TEXT NOT NULL CHECK(json_valid(metadata)), page_count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS pages(document_version TEXT REFERENCES documents(version), number INTEGER NOT NULL, start_cp INTEGER NOT NULL, end_cp INTEGER NOT NULL, sha256 TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(document_version,number));
CREATE TABLE IF NOT EXISTS release_documents(release_id TEXT REFERENCES releases(id), version TEXT REFERENCES documents(version), PRIMARY KEY(release_id,version));
CREATE TABLE IF NOT EXISTS artifacts(sha256 TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE IF NOT EXISTS release_artifacts(release_id TEXT REFERENCES releases(id), name TEXT NOT NULL, sha256 TEXT REFERENCES artifacts(sha256), PRIMARY KEY(release_id,name));
`;
function text(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 1000)
    throw Error("Invalid " + label);
  return value;
}
function bounds(limit = 25, offset = 0) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 1000000
  )
    throw Error("Invalid pagination");
  return [limit, offset];
}
export class CatalogueRepository {
  #runtimeDatabase;
  constructor(path, { readOnly = false } = {}) {
    this.db = new DatabaseSync(path, {
      readOnly,
      enableForeignKeyConstraints: true,
      enableDoubleQuotedStringLiterals: false,
    });
    this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    if (!readOnly) this.db.exec(schema);
    if (this.db.prepare("SELECT version FROM schema_version").get()?.version !== 1)
      throw Error("Unsupported schema");
    if (readOnly) this.db.exec("PRAGMA query_only=ON");
    if (readOnly) this.#runtimeDatabase = this.db;
  }
  close() {
    this.#runtimeDatabase = undefined;
    this.db.close();
  }
  // Internal, bounded metadata read for runtime-readiness.mjs. This is not an
  // integrity check. Never use a writable/replaced/closed connection or an old
  // transaction snapshot. No payloads, document scans or persistent writes.
  runtimeReadinessSnapshot(pins) {
    const db = this.#runtimeDatabase;
    if (!db || this.db !== db || !db.isOpen || db.isTransaction) return null;
    const timeout = db.prepare("PRAGMA busy_timeout").get().timeout;
    // Synchronous and restored before returning: no other handler can inherit
    // this setting. A readiness request must not wait the normal five seconds.
    db.exec("PRAGMA busy_timeout=0");
    try {
      if (db.prepare("PRAGMA query_only").get().query_only !== 1) return null;
      const before = db.prepare("PRAGMA main.data_version").get().data_version;
      const schema = db.prepare("SELECT version FROM main.schema_version WHERE version=1").get();
      const present = !pins || Boolean(db.prepare(`SELECT 1 FROM main.runtime_publications p
        JOIN main.releases r ON r.id=p.release_id WHERE p.release_id=? AND p.hash=?`)
        .get(pins.release, pins.publication));
      const after = db.prepare("PRAGMA main.data_version").get().data_version;
      return { before, after, present: schema?.version === 1 && present };
    } finally {
      db.exec(`PRAGMA busy_timeout=${timeout}`);
    }
  }
  hasRelease(release) {
    return Boolean(this.db.prepare("SELECT id FROM releases WHERE id=?").get(release));
  }
  importRelease({ manifest, packages, documents, artifacts = [] }) {
    // Immutable content-addressed releases: retry is safe, updates create a new version.
    if (new Set(packages.map((p) => p.kind + ":" + p.id)).size !== packages.length)
      throw Error("Duplicate source identity");
    manifest = {
      ...manifest,
      inventory: {
        packages: packages.map(digest).sort(),
        documents: documents.map(digest).sort(),
        artifacts: artifacts
          .map((a) => ({ name: a.name, sha256: digest(a.data) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    };
    const release = digest(manifest);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      // Compile each insert once per transaction, not once per record/page.
      // Keep statements local: the read-only API never needs writable statements.
      const insertPackage = this.db.prepare("INSERT OR IGNORE INTO packages VALUES(?,?,?,?,?)");
      const insertRecord = this.db.prepare("INSERT INTO records VALUES(?,?,?,?,?,?,?)");
      const linkPackage = this.db.prepare("INSERT OR IGNORE INTO release_packages VALUES(?,?)");
      const insertDocument = this.db.prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?,?)");
      const insertPage = this.db.prepare("INSERT INTO pages VALUES(?,?,?,?,?,?)");
      const linkDocument = this.db.prepare("INSERT OR IGNORE INTO release_documents VALUES(?,?)");
      const insertArtifact = this.db.prepare("INSERT OR IGNORE INTO artifacts VALUES(?,?)");
      const linkArtifact = this.db.prepare("INSERT OR IGNORE INTO release_artifacts VALUES(?,?,?)");
      this.db
        .prepare("INSERT OR IGNORE INTO releases VALUES(?,?)")
        .run(release, JSON.stringify(manifest));
      for (const p of packages) {
        text(p.id, "source id");
        text(p.kind, "kind");
        text(p.title, "title");
        const { records, ...header } = p,
          version = digest(p);
        const inserted = insertPackage.run(version, p.id, p.kind, p.title, canonical(header));
        if (inserted.changes) {
          for (const [position, r] of records.entries()) {
            text(r.id, "record id");
            text(r.kind, "record kind");
            insertRecord.run(
              version,
              r.kind,
              r.id,
              r.title || r.id,
              r.status ?? null,
              position,
              canonical(r),
            );
          }
        }
        linkPackage.run(release, version);
      }
      for (const d of documents) {
        text(d.id, "document id");
        if (!Array.isArray(d.pages) || !d.pages.length) throw Error("Missing document pages");
        const version = digest(d),
          { pages, ...metadata } = d;
        const inserted = insertDocument.run(version, d.id, JSON.stringify(metadata), pages.length);
        if (inserted.changes) {
          let start = 0;
          for (const p of pages) {
            if (!Number.isSafeInteger(p.page) || p.page < 1 || typeof p.text !== "string")
              throw Error("Invalid source page");
            const end = start + Array.from(p.text).length,
              raw = JSON.stringify(p);
            insertPage.run(version, p.page, start, end, digest(raw), raw);
            start = end;
          }
        }
        linkDocument.run(release, version);
      }
      for (const a of artifacts) {
        const raw = canonical(a.data),
          hash = digest(raw);
        text(a.name, "artifact name");
        insertArtifact.run(hash, raw);
        linkArtifact.run(release, a.name, hash);
      }
      const fk = this.db.prepare("PRAGMA foreign_key_check").all();
      if (fk.length) throw Error("Broken database references");
      this.db.exec("COMMIT");
      return release;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  releases({ limit = 25, offset = 0 } = {}) {
    bounds(limit, offset);
    return this.db
      .prepare("SELECT id,manifest FROM releases ORDER BY id LIMIT ? OFFSET ?")
      .all(limit, offset)
      .map((r) => ({ ...r, manifest: JSON.parse(r.manifest) }));
  }
  catalogue({ release, query = "", kind = "", limit = 25, offset = 0 }) {
    bounds(limit, offset);
    if (query.length > 200 || kind.length > 50) throw Error("Invalid search");
    return this.db
      .prepare(
        `SELECT p.version,p.source_id AS id,p.kind,p.title,(SELECT COUNT(*) FROM records r WHERE r.version=p.version) AS recordCount FROM packages p JOIN release_packages rp ON rp.version=p.version WHERE rp.release_id=? AND (?='' OR p.kind=?) AND (?='' OR instr(lower(p.title),lower(?))>0 OR instr(lower(p.source_id),lower(?))>0) ORDER BY p.source_id,p.version LIMIT ? OFFSET ?`,
      )
      .all(release, kind, kind, query, query, query, limit, offset);
  }
  records(version, { kind = "", limit = 25, offset = 0 } = {}) {
    bounds(limit, offset);
    return this.db
      .prepare(
        `SELECT kind,id,title,status FROM records WHERE version=? AND (?='' OR kind=?) ORDER BY kind,id LIMIT ? OFFSET ?`,
      )
      .all(version, kind, kind, limit, offset);
  }
  record(version, kind, id) {
    const r = this.db
      .prepare("SELECT payload FROM records WHERE version=? AND kind=? AND id=?")
      .get(version, kind, id);
    return r ? JSON.parse(r.payload).data : null;
  }
  documents(release, { limit = 25, offset = 0 } = {}) {
    bounds(limit, offset);
    return this.db
      .prepare(
        "SELECT d.version,d.id,d.page_count AS pageCount FROM documents d JOIN release_documents rd ON rd.version=d.version WHERE rd.release_id=? ORDER BY d.id,d.version LIMIT ? OFFSET ?",
      )
      .all(release, limit, offset);
  }
  documentIndex(release, version) {
    // A small navigation projection, not a complete source download. Iterate
    // one page at a time; original page payloads and release hashes never change.
    const document = this.db.prepare(
      "SELECT d.metadata FROM documents d JOIN release_documents rd ON rd.version=d.version WHERE rd.release_id=? AND d.version=?",
    ).get(release, version);
    if (!document) return null;
    const pages = [], contents = [];
    for (const row of this.db.prepare(
      "SELECT number,start_cp,end_cp,sha256,payload FROM pages WHERE document_version=? ORDER BY number",
    ).iterate(version)) {
      const page = JSON.parse(row.payload);
      pages.push({ page: row.number, start: row.start_cp, end: row.end_cp, sha256: row.sha256 });
      const headings = readingBlocks({ ...page, start: row.start_cp, end: row.end_cp })
        .filter(block => block.kind === "heading");
      for (const block of displayReadingBlocks(headings, { readable: true }))
        contents.push({ page: row.number, start: block.start, text: block.text });
    }
    return { version, metadata: JSON.parse(document.metadata), pages, contents };
  }
  page(version, number) {
    const p = this.db
      .prepare(
        "SELECT start_cp AS start,end_cp AS end,sha256,payload FROM pages WHERE document_version=? AND number=?",
      )
      .get(version, number);
    return p ? { start: p.start, end: p.end, sha256: p.sha256, page: JSON.parse(p.payload) } : null;
  }
  exportRelease(release) {
    const r = this.db.prepare("SELECT manifest FROM releases WHERE id=?").get(release);
    if (!r) return null;
    const packages = this.db
      .prepare(
        "SELECT p.version,p.payload FROM packages p JOIN release_packages rp ON rp.version=p.version WHERE rp.release_id=? ORDER BY p.version",
      )
      .all(release)
      .map((r) => ({
        ...JSON.parse(r.payload),
        records: this.db
          .prepare("SELECT payload FROM records WHERE version=? ORDER BY position")
          .all(r.version)
          .map((r) => JSON.parse(r.payload)),
      }));
    const documents = this.db
      .prepare(
        "SELECT d.* FROM documents d JOIN release_documents rd ON rd.version=d.version WHERE rd.release_id=? ORDER BY d.version",
      )
      .all(release)
      .map((d) => ({
        ...JSON.parse(d.metadata),
        pages: this.db
          .prepare("SELECT payload FROM pages WHERE document_version=? ORDER BY number")
          .all(d.version)
          .map((p) => JSON.parse(p.payload)),
      }));
    const artifacts = this.db
      .prepare(
        "SELECT a.payload,ra.name FROM artifacts a JOIN release_artifacts ra ON ra.sha256=a.sha256 WHERE ra.release_id=? ORDER BY ra.name",
      )
      .all(release)
      .map((a) => ({ name: a.name, data: JSON.parse(a.payload) }));
    return { manifest: JSON.parse(r.manifest), packages, documents, artifacts };
  }
  integrity() {
    return this.db.prepare("PRAGMA integrity_check").all();
  }
}
