import { readFileSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogueRepository, digest } from '../local-data/repository.mjs';

export function databaseReportSource(referenceSource, reportId, repository, release) {
  const source = { ...referenceSource, id: referenceSource.id || reportId };
  const version = digest(source);
  const index = repository.documentIndex(release, version);
  if (!index) throw Error(`Exact source missing in pinned database release: ${reportId}`);
  if (!index.pages.length || index.pages.some((p, i) => p.page !== i + 1))
    throw Error(`Non-sequential report pages need an explicit navigation adapter: ${reportId}`);
  const { pages, ...metadata } = referenceSource;
  return { ...metadata, pages: [], databaseSource: {
    schema: 1, release, version, indexHash: digest(JSON.stringify(index)),
  } };
}

export function databaseReportSourcesPlugin({ release, databasePath } = {}) {
  if (!/^[a-f0-9]{64}$/.test(release || '')) throw Error('An explicit database release is required.');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = new Set(['trial-corpus', 'reviewed-reports', 'report-additions'].map(n => resolve(root, 'app', n + '.json')));
  const modePath = resolve(root, 'lib/application-mode.mjs');
  const prefix = '\0omnibus-database-report:';
  let repository;
  const counts = new Map();
  return {
    name: 'omnibus-database-report-sources', enforce: 'pre',
    buildStart() {
      repository = new CatalogueRepository(databasePath || resolve(root, 'local-data/runtime/catalogue.sqlite'), { readOnly: true });
      if (!repository.hasRelease(release))
        throw Error('Pinned database release not available.');
    },
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('.') && !isAbsolute(source))) return null;
      const path = resolve(dirname(importer), source);
      return path === modePath || files.has(path) ? prefix + path + '.mjs' : null;
    },
    load(id) {
      if (!id.startsWith(prefix)) return null;
      const path = id.slice(prefix.length, -4);
      if (path === modePath) return 'export const databaseSourcesEnabled = true;';
      const bundle = JSON.parse(readFileSync(path, 'utf8'));
      for (const entry of bundle.corpus) {
        const source = entry.source;
        counts.set(entry.framework.report.id, { pages: source.pages.length,
          removedSourceBytes: Buffer.byteLength(JSON.stringify(source)) });
        entry.source = databaseReportSource(source, entry.framework.report.id, repository, release);
      }
      return 'export default ' + JSON.stringify(bundle) + ';';
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'omnibus-release.json', source: JSON.stringify({
        schema: 1, release, scope: 'report-source-pages-only', reports: counts.size,
        pages: [...counts.values()].reduce((n, r) => n + r.pages, 0),
        removedSourceBytes: [...counts.values()].reduce((n, r) => n + r.removedSourceBytes, 0),
      }, null, 2) });
    },
    closeBundle() { repository?.close(); },
  };
}
