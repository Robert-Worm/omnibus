import { digest } from "./repository.mjs";

/** Metadata only, read inside the caller's verified database transaction.
 * Norms, source text and review payloads never appear in this comparison output. */
export function publicationInventory(repository, release, publication) {
  const db = repository.db;
  return {
    packages: db
      .prepare(`SELECT p.kind, p.source_id AS id, p.version, p.title,
      (SELECT count(*) FROM records r WHERE r.version=p.version) AS records
      FROM packages p JOIN release_packages r ON r.version=p.version
      WHERE r.release_id=? ORDER BY p.kind,p.source_id`)
      .all(release)
      .map((row) => ({ ...row })),
    documents: db
      .prepare(`SELECT d.id,d.version,d.page_count AS pages FROM documents d
      JOIN release_documents r ON r.version=d.version WHERE r.release_id=? ORDER BY d.id`)
      .all(release)
      .map((row) => ({ ...row })),
    artifacts: db
      .prepare("SELECT name AS id,sha256 FROM release_artifacts WHERE release_id=? ORDER BY name")
      .all(release)
      .map((row) => ({ ...row })),
    modules: Object.keys(publication.modules)
      .sort()
      .map((id) => ({ id, sha256: digest(publication.modules[id]) })),
    resources: Object.keys(publication.refs)
      .sort()
      .map((id) => ({ id, sha256: publication.refs[id].hash, bytes: publication.refs[id].bytes })),
    metadata: ["registrations", "routing", "summary"].map((id) => ({
      id,
      sha256: digest(publication[id]),
    })),
  };
}

/** Compare stable identities, not titles or array positions. Duplicate identities
 * are ambiguous and must not silently collapse to the last row. */
export function comparePublicationInventories(before, after) {
  const changes = {};
  for (const category of [
    "packages",
    "documents",
    "artifacts",
    "modules",
    "resources",
    "metadata",
  ]) {
    const index = (rows) => {
      const map = new Map();
      for (const row of rows) {
        const key = JSON.stringify(category === "packages" ? [row.kind, row.id] : [row.id]);
        if (map.has(key))
          throw Error("Ambiguous publication inventory: duplicate " + category + " identity");
        map.set(key, row);
      }
      return map;
    };
    const left = index(before[category]),
      right = index(after[category]);
    const added = [],
      removed = [],
      changed = [];
    let unchanged = 0;
    for (const key of [...new Set([...left.keys(), ...right.keys()])].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      const previous = left.get(key),
        next = right.get(key);
      if (!previous) added.push(next);
      else if (!next) removed.push(previous);
      else if (digest(previous) !== digest(next)) changed.push({ before: previous, after: next });
      else unchanged++;
    }
    changes[category] = { added, removed, changed, unchanged };
  }
  return changes;
}
