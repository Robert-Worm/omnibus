import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'vite';
import {CatalogueRepository, digest} from '../local-data/repository.mjs';
import {webResource} from '../local-data/web-resources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildReportOverviews({release, publication, databasePath}, content, publishedCataloguePlugin) {
  // The temporary module is private build output; only the verified publication's
  // allowlisted resources are read. Never copy, migrate or write the database.
  const output = mkdtempSync(join(tmpdir(), 'omnibus-report-overviews-'));
  let repository;
  try {
    repository = new CatalogueRepository(resolve(databasePath), {readOnly: true});
    await build({root, configFile: false, logLevel: 'silent', resolve: {alias: {'@': root}},
      plugins: [publishedCataloguePlugin({release, publication, databasePath,
        transportModule: resolve(root, 'agent-tools/catalogue-transport.mjs')})],
      build: {ssr: resolve(root, 'scripts/report-overview-entry.mjs'), outDir: output, emptyOutDir: false,
        rolldownOptions: {output: {entryFileNames: 'overview.mjs'}}}});
    const projectionModule = await import(pathToFileURL(join(output, 'overview.mjs')).href);
    const allowed = new Set(Object.values(content.refs).map(ref => ref.hash));
    projectionModule.configureCatalogueReader(ref => {
      if (ref.release !== release || !allowed.has(ref.hash)) throw Error('Overview resource outside publication.');
      const value = webResource(repository, release, ref.hash);
      if (digest(JSON.stringify(value)) !== ref.hash) throw Error('Overview resource integrity mismatch.');
      return value;
    });
    return await projectionModule.reportOverviews();
  } finally {
    repository?.close();
    // Exact freshly-created temporary directory, never a supplied content path.
    rmSync(output, {recursive: true, force: true});
  }
}
