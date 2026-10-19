import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');

// A release-scoped, disposable read projection. Search never scans the original
// source packages or loads the whole catalogue into an agent's context.
export function createIndex(db, release) {
  db.exec(`CREATE TABLE agent_meta(release TEXT NOT NULL, schema_version INTEGER NOT NULL);
    CREATE TABLE agent_items(key TEXT PRIMARY KEY, kind TEXT NOT NULL, source_id TEXT NOT NULL,
      source_title TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL, sha256 TEXT NOT NULL);
    CREATE VIRTUAL TABLE agent_search USING fts5(key UNINDEXED, text, tokenize='unicode61 remove_diacritics 2');`);
  db.prepare('INSERT INTO agent_meta VALUES(?,1)').run(release);
}
export function insertEntry(db, entry) {
  const payload = JSON.stringify(entry);
  db.prepare('INSERT INTO agent_items VALUES(?,?,?,?,?,?,?)').run(entry.key, entry.kind, entry.sourceId,
    entry.sourceTitle, entry.material.title, payload, sha256(payload));
  const fields = ['title', 'body', 'parentCriterion', 'rationale', 'risk', 'controlObjective', 'control', 'question', 'sourceText', 'location'];
  const searchText = [entry.sourceTitle, entry.pointId, ...fields.map(k => entry.material[k] || '')].join('\n');
  db.prepare('INSERT INTO agent_search(key,text) VALUES(?,?)').run(entry.key, searchText);
}

export class AgentIndex {
  constructor(path, release) {
    this.db = new DatabaseSync(path, {readOnly: true});
    this.db.exec('PRAGMA query_only=ON');
    const meta = this.db.prepare('SELECT * FROM agent_meta').get();
    if (meta?.release !== release || meta.schema_version !== 1) {
      this.db.close();
      throw Error('De agentcatalogus hoort niet bij deze release.');
    }
    this.release = release;
  }
  sources() {
    return this.db.prepare(`SELECT source_id AS id, kind, source_title AS title, COUNT(*) AS selectableItems
      FROM agent_items GROUP BY source_id,kind,source_title ORDER BY kind,title`).all();
  }
  search({query = '', sourceId = '', kind = '', limit = 20, offset = 0}) {
    // Never pass agent-authored FTS syntax, SQL or column names through.
    const tokens = [...new Set(query.match(/[\p{L}\p{N}]+/gu) ?? [])].slice(0, 16);
    const match = tokens.map(token => '"' + token + '"*').join(' OR ');
    const where = [sourceId ? 'i.source_id = ?' : '', kind ? 'i.kind = ?' : ''].filter(Boolean);
    const params = [sourceId, kind].filter(Boolean);
    const from = match ? 'agent_search s JOIN agent_items i ON i.key=s.key' : 'agent_items i';
    if (match) { where.unshift('agent_search MATCH ?'); params.unshift(match); }
    const condition = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const total = this.db.prepare('SELECT COUNT(*) AS n FROM ' + from + condition).get(...params).n;
    const items = this.db.prepare(`SELECT i.key,i.kind,i.source_id AS sourceId,i.source_title AS sourceTitle,i.title,
      ${match ? "snippet(agent_search,1,'[',']',' … ',32)" : "substr(json_extract(i.payload,'$.material.body'),1,350)"} AS excerpt
      FROM ${from}${condition} ORDER BY ${match ? 'bm25(agent_search),' : ''}i.key LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
    return {release: this.release, total, items, nextOffset: offset + items.length < total ? offset + items.length : null,
      retrieval: 'Lexicale kandidaten, geen garantie van inhoudelijke relevantie of volledige dekking. Gebruik verschillende zoektermen en controleer de brongegevens.'};
  }
  get(key) {
    const row = this.db.prepare('SELECT payload,sha256 FROM agent_items WHERE key=?').get(key);
    if (!row) throw Error('Onbekende of niet vrijgegeven bouwsteen: ' + key);
    if (sha256(row.payload) !== row.sha256) throw Error('Integriteitscontrole van de bouwsteen mislukt.');
    return JSON.parse(row.payload);
  }
  content(ref) {
    if (ref.release !== this.release || !/^[a-f0-9]{64}$/.test(ref.hash)) throw Error('Onbekende bronrelease.');
    const row = this.db.prepare('SELECT payload FROM web_resources WHERE release_id=? AND hash=?').get(ref.release, ref.hash);
    if (!row || sha256(row.payload) !== ref.hash || Buffer.byteLength(row.payload) !== ref.bytes)
      throw Error('De databasebron ontbreekt of is gewijzigd.');
    return JSON.parse(row.payload);
  }
  close() { this.db.close(); }
}
