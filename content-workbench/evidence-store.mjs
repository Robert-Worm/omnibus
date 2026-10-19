// Separate observed evidence from manually recorded workflow progress.
export const evidenceKinds = Object.freeze({
  active: "In actieve publicatie",
  candidate: "In kandidaatpublicatie",
  intake: "Ontvangst gecontroleerd",
  review: "Reviewbinding gecontroleerd",
  none: "Geen gekoppeld bewijs",
});
export function initializeEvidence(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS evidence_runs(
    id INTEGER PRIMARY KEY,checked_at TEXT NOT NULL,plan_hash TEXT NOT NULL,results TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS evidence_links(
    run_id INTEGER NOT NULL REFERENCES evidence_runs(id),source_id TEXT NOT NULL REFERENCES sources(id),
    kind TEXT NOT NULL,facts TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS evidence_source ON evidence_links(run_id,source_id,kind);
    CREATE VIEW IF NOT EXISTS current_evidence AS SELECT * FROM evidence_links
    WHERE run_id=(SELECT max(id) FROM evidence_runs);`);
}
export function saveEvidence(db, batch) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const run = db
      .prepare("INSERT INTO evidence_runs(checked_at,plan_hash,results) VALUES(?,?,?)")
      .run(new Date().toISOString(), batch.planHash, JSON.stringify(batch.results));
    const insert = db.prepare("INSERT INTO evidence_links VALUES(?,?,?,?)");
    for (const link of batch.links)
      insert.run(run.lastInsertRowid, link.sourceId, link.kind, JSON.stringify(link.facts));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return evidenceSummary(db);
}
export function evidenceSummary(db) {
  const row = db.prepare("SELECT * FROM evidence_runs ORDER BY id DESC LIMIT 1").get();
  return row
    ? {
        id: row.id,
        checkedAt: row.checked_at,
        planHash: row.plan_hash,
        results: JSON.parse(row.results),
        counts: Object.fromEntries(
          db
            .prepare("SELECT kind,count(DISTINCT source_id) n FROM current_evidence GROUP BY kind")
            .all()
            .map((r) => [r.kind, r.n]),
        ),
      }
    : null;
}
export function sourceEvidence(db, sourceId) {
  return db
    .prepare(
      "SELECT e.facts,r.checked_at FROM current_evidence e JOIN evidence_runs r ON r.id=e.run_id WHERE source_id=? ORDER BY kind",
    )
    .all(sourceId)
    .map((r) => ({ ...JSON.parse(r.facts), checkedAt: r.checked_at }));
}
