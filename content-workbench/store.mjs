import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  initializeEvidence,
  evidenceSummary,
  sourceEvidence,
  evidenceKinds,
} from "./evidence-store.mjs";

export const stages = Object.freeze({
  new: "Te beoordelen",
  assessed: "Beoordeeld",
  queued: "In wachtrij",
  extracting: "In verwerking",
  reviewing: "In review",
  candidate: "Kandidaat gemeld",
});
export const workflowStages = Object.freeze({ ...stages, published: "Actief in Omnibus" });
// A presentation-only lane. Explicit rework and HOLD remain visible; no stored
// progress or history is rewritten when publication evidence arrives or expires.
const workflowStageSql = `CASE WHEN p.disposition='active'
  AND p.stage IN ('new','assessed','candidate')
  AND EXISTS(SELECT 1 FROM current_evidence e WHERE e.source_id=s.id AND e.kind='active')
  THEN 'published' ELSE p.stage END`;
export const dispositions = Object.freeze({
  active: "Actief",
  blocked: "Geblokkeerd",
  revision: "Herstel nodig",
  excluded: "Niet geschikt",
});
export const priorities = Object.freeze({
  unknown: "Nog niet bepaald",
  high: "Hoog",
  normal: "Normaal",
  low: "Laag",
});
const hash = (value) => createHash("sha256").update(value).digest("hex");
export class WorkbenchError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const required = z.string().trim().min(1).max(2000);
export const changeSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    stage: z.enum(Object.keys(stages)),
    disposition: z.enum(Object.keys(dispositions)),
    priority: z.enum(Object.keys(priorities)),
    note: required,
    reference: z.string().trim().max(2000),
  })
  .strict()
  .refine(
    (value) => !["reviewing", "candidate"].includes(value.stage) || value.reference.length > 0,
    { message: "Verwijs bij review of kandidaat naar het betreffende dossier." },
  );

// RFC-style quoted fields with a deliberately explicit delimiter. No evaluation,
// spreadsheet formula execution or network fetching occurs during import.
export function parseCsv(text, delimiter = ";") {
  if (typeof text !== "string" || Buffer.byteLength(text) > 32 * 1024 * 1024)
    throw new WorkbenchError("CSV overschrijdt de limiet van 32 MB.");
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  const cell = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const line = () => {
    cell();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === delimiter) cell();
    else if (c === "\r" || c === "\n") {
      line();
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else if (c === '"' && field === "" && !closed) quoted = true;
    else if (closed || c === '"') throw new WorkbenchError("Ongeldige CSV-aanhalingstekens.");
    else field += c;
    if (field.length > 100000 || row.length > 80 || rows.length > 50000)
      throw new WorkbenchError("CSV overschrijdt de veld- of rijlimiet.");
  }
  if (quoted) throw new WorkbenchError("CSV bevat een onafgesloten veld.");
  if (field || row.length || closed) line();
  const headers = rows.shift();
  if (
    !headers?.includes("titel") ||
    new Set(headers).size !== headers.length ||
    headers.some((v) => !v || v.length > 100)
  )
    throw new WorkbenchError("CSV vereist unieke kolommen en een titelkolom.");
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new WorkbenchError(`Afwijkend kolomaantal in gegevensrij ${index + 1}.`);
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function safeWebUrl(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function sourceRecord(row) {
  const title = row.titel?.trim();
  if (!title || title.length > 2000)
    throw new WorkbenchError("Elke bron vereist een geldige titel.");
  const url = safeWebUrl(row.url) || safeWebUrl(row.url_bestand);
  if (!url)
    throw new WorkbenchError("Elke bron vereist een http(s)-bronverwijzing zonder credentials.");
  const date = row.datum ?? "";
  // URL alone is NOT a document identity: a shared landing page may describe
  // several reports. Title/date variants stay separate and are flagged for review.
  const id = hash(JSON.stringify([url, title.normalize("NFC"), date]));
  return {
    id,
    title,
    url,
    date,
    ministry: row.ministerie || "",
    theme: row.primair_risico || "",
    kind: "report",
  };
}

const schema = `
CREATE TABLE IF NOT EXISTS workbench_schema(version INTEGER PRIMARY KEY CHECK(version=1));
INSERT OR IGNORE INTO workbench_schema VALUES(1);
CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,date TEXT NOT NULL,ministry TEXT NOT NULL,theme TEXT NOT NULL,kind TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS source_url ON sources(url);
CREATE TABLE IF NOT EXISTS imports(id TEXT PRIMARY KEY,label TEXT NOT NULL,path TEXT NOT NULL,sha256 TEXT NOT NULL,rows INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS import_rows(import_id TEXT NOT NULL REFERENCES imports(id),row_number INTEGER NOT NULL,source_id TEXT NOT NULL REFERENCES sources(id),raw TEXT NOT NULL,PRIMARY KEY(import_id,row_number));
CREATE INDEX IF NOT EXISTS import_source ON import_rows(source_id,import_id);
CREATE TABLE IF NOT EXISTS progress(source_id TEXT PRIMARY KEY REFERENCES sources(id),stage TEXT NOT NULL DEFAULT 'new',disposition TEXT NOT NULL DEFAULT 'active',priority TEXT NOT NULL DEFAULT 'unknown',revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,source_id TEXT NOT NULL REFERENCES sources(id),revision INTEGER NOT NULL,stage TEXT NOT NULL,disposition TEXT NOT NULL,priority TEXT NOT NULL,note TEXT NOT NULL,reference TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(source_id,revision));
`;

export class WorkbenchStore {
  constructor(path) {
    this.db = new DatabaseSync(path, {
      enableForeignKeyConstraints: true,
      enableDoubleQuotedStringLiterals: false,
    });
    const existing = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    if (existing.length && !existing.some((v) => v.name === "workbench_schema")) {
      this.db.close();
      throw new WorkbenchError(
        "Dit is geen Workbench-database. De broncatalogus mag niet worden gebruikt.",
      );
    }
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.db.exec(schema);
    if (this.db.prepare("SELECT version FROM workbench_schema").get()?.version !== 1) {
      this.db.close();
      throw new WorkbenchError("Onbekende Workbench-versie.");
    }
    initializeEvidence(this.db);
  }
  close() {
    this.db.close();
  }
  importCsv(bytes, { label, path }) {
    if (!required.safeParse(label).success || !required.safeParse(path).success)
      throw new WorkbenchError("Ongeldige importomschrijving.");
    const rows = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!rows.length) throw new WorkbenchError("CSV bevat geen bronrecords.");
    const records = rows.map(sourceRecord);
    const sha256 = hash(bytes),
      id = hash(JSON.stringify([label, sha256]));
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db.prepare("SELECT * FROM imports WHERE id=?").get(id);
      if (existing) {
        this.db.exec("COMMIT");
        return { ...existing, repeated: true };
      }
      this.db
        .prepare("INSERT INTO imports VALUES(?,?,?,?,?,?)")
        .run(id, label, path, sha256, rows.length, new Date().toISOString());
      const insert = this.db.prepare("INSERT OR IGNORE INTO sources VALUES(?,?,?,?,?,?,?)");
      const raw = this.db.prepare("INSERT INTO import_rows VALUES(?,?,?,?)");
      const progress = this.db.prepare("INSERT OR IGNORE INTO progress(source_id) VALUES(?)");
      for (let i = 0; i < rows.length; i++) {
        const r = records[i];
        insert.run(r.id, r.title, r.url, r.date, r.ministry, r.theme, r.kind);
        raw.run(id, i + 1, r.id, JSON.stringify(rows[i]));
        progress.run(r.id);
      }
      this.db.exec("COMMIT");
      return { id, sha256, rows: rows.length, repeated: false };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  filters(input = {}) {
    const parsed = z
      .object({
        q: z.string().max(200).default(""),
        collection: z.string().max(2000).default(""),
        stage: z.enum(["", ...Object.keys(workflowStages)]).default(""),
        disposition: z.enum(["", ...Object.keys(dispositions)]).default(""),
        priority: z.enum(["", ...Object.keys(priorities)]).default(""),
        evidence: z.enum(["", ...Object.keys(evidenceKinds)]).default(""),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      })
      .strict()
      .safeParse(input);
    if (!parsed.success) throw new WorkbenchError("Ongeldig zoekfilter.");
    return parsed.data;
  }
  where(f, includeStage = true) {
    const clauses = [],
      values = [];
    if (f.q) {
      clauses.push(
        "(instr(lower(s.title),lower(?))>0 OR instr(lower(s.ministry),lower(?))>0 OR instr(lower(s.theme),lower(?))>0)",
      );
      values.push(f.q, f.q, f.q);
    }
    if (f.collection) {
      clauses.push(
        "EXISTS(SELECT 1 FROM import_rows r JOIN imports i ON i.id=r.import_id WHERE r.source_id=s.id AND i.label=?)",
      );
      values.push(f.collection);
    }
    for (const key of ["stage", "disposition", "priority"])
      if (f[key] && (includeStage || key !== "stage")) {
        clauses.push(`${key === "stage" ? workflowStageSql : `p.${key}`}=?`);
        values.push(f[key]);
      }
    if (f.evidence === "none")
      clauses.push("NOT EXISTS(SELECT 1 FROM current_evidence e WHERE e.source_id=s.id)");
    else if (f.evidence) {
      clauses.push("EXISTS(SELECT 1 FROM current_evidence e WHERE e.source_id=s.id AND e.kind=?)");
      values.push(f.evidence);
    }
    return { sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "", values };
  }
  list(input) {
    const f = this.filters(input),
      { sql, values } = this.where(f);
    const from = " FROM sources s JOIN progress p ON p.source_id=s.id";
    const rows = this.db
      .prepare(`SELECT s.*,p.stage,p.disposition,p.priority,p.revision,${workflowStageSql} AS workflowStage,
      (SELECT count(*) FROM sources d WHERE d.url=s.url) AS shared_url_count${from}${sql}
      ORDER BY CASE p.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 WHEN 'low' THEN 3 ELSE 2 END,s.date DESC,s.title,s.id LIMIT ? OFFSET ?`)
      .all(...values, f.limit, f.offset);
    for (const row of rows) row.evidence = sourceEvidence(this.db, row.id);
    const total = this.db.prepare(`SELECT count(*) AS n${from}${sql}`).get(...values).n;
    const board = this.where(f, false);
    const counts = this.db
      .prepare(
        `SELECT ${workflowStageSql} AS stage,count(*) AS count${from}${board.sql} GROUP BY ${workflowStageSql}`,
      )
      .all(...board.values);
    return { rows, total, counts, offset: f.offset, limit: f.limit };
  }
  overview() {
    return {
      stages,
      workflowStages,
      dispositions,
      priorities,
      evidenceKinds,
      evidence: evidenceSummary(this.db),
      collections: this.db
        .prepare(
          "SELECT label,count(*) AS snapshots,sum(rows) AS imported_rows FROM imports GROUP BY label ORDER BY label",
        )
        .all(),
      sources: this.db.prepare("SELECT count(*) AS n FROM sources").get().n,
      imports: this.db
        .prepare("SELECT id,label,sha256,rows,created_at FROM imports ORDER BY created_at DESC")
        .all(),
      publicationLinked: Boolean(
        evidenceSummary(this.db)?.results.some(
          (r) => r.type === "active" && r.status === "verified",
        ),
      ),
    };
  }
  detail(id) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new WorkbenchError("Onbekende bron.", 404);
    const row = this.db
      .prepare(
        "SELECT s.*,p.stage,p.disposition,p.priority,p.revision FROM sources s JOIN progress p ON p.source_id=s.id WHERE s.id=?",
      )
      .get(id);
    if (!row) throw new WorkbenchError("Onbekende bron.", 404);
    return {
      ...row,
      evidence: sourceEvidence(this.db, id),
      evidenceWarnings:
        evidenceSummary(this.db)?.results.filter(
          (r) => r.sourceId === id && r.status === "failed",
        ) || [],
      origins: this.db
        .prepare(
          "SELECT i.label,i.path,i.sha256,r.row_number,r.raw FROM import_rows r JOIN imports i ON i.id=r.import_id WHERE r.source_id=? ORDER BY i.created_at DESC,r.row_number",
        )
        .all(id)
        .map((r) => ({ ...r, raw: JSON.parse(r.raw) })),
      history: this.db
        .prepare("SELECT * FROM events WHERE source_id=? ORDER BY revision DESC")
        .all(id),
      related: this.db
        .prepare("SELECT id,title,date FROM sources WHERE url=? AND id<>? ORDER BY title")
        .all(row.url, id),
    };
  }
  change(id, input) {
    const parsed = changeSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkbenchError(
        "Vul een geldige stap, reden en waar nodig een dossierverwijzing in.",
      );
    const v = parsed.data;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.detail(id);
      const updated = this.db
        .prepare(
          "UPDATE progress SET stage=?,disposition=?,priority=?,revision=revision+1 WHERE source_id=? AND revision=?",
        )
        .run(v.stage, v.disposition, v.priority, id, v.revision);
      if (!updated.changes)
        throw new WorkbenchError(
          "Deze bron is intussen gewijzigd. Heropen de bron vóór je opslaat.",
          409,
        );
      this.db
        .prepare(
          "INSERT INTO events(source_id,revision,stage,disposition,priority,note,reference,created_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          v.revision + 1,
          v.stage,
          v.disposition,
          v.priority,
          v.note,
          v.reference,
          new Date().toISOString(),
        );
      this.db.exec("COMMIT");
      return this.detail(id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
