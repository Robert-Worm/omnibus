import {mkdirSync, mkdtempSync, readFileSync, writeFileSync, renameSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DatabaseSync, backup} from 'node:sqlite';
import {build} from 'vite';
import {publishedCataloguePlugin} from './published-catalogue.mjs';
import {parseDatabaseBuildArgs} from './database-build-options.mjs';
import {AgentIndex, createIndex, insertEntry} from '../agent-tools/index-store.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const {release,publication,database:databasePath}=parseDatabaseBuildArgs(process.argv.slice(2));
mkdirSync(resolve(root, 'agent-build'), {recursive: true});
const output = mkdtempSync(resolve(root, 'agent-build/release-'));
const database = join(output, 'catalogue.sqlite');
const source = new DatabaseSync(databasePath, {readOnly: true});
try { await backup(source, database); } finally { source.close(); }
await build({root, configFile: false, logLevel: 'warn', resolve:{alias:{'@':root}}, plugins: [publishedCataloguePlugin({release,publication, databasePath: database,
  transportModule: resolve(root, 'agent-tools/catalogue-transport.mjs')})],
  build: {ssr: resolve(root, 'agent-tools/workflow.mjs'), outDir: output, emptyOutDir: false, emitAssets: true,
    rolldownOptions: {output: {entryFileNames: 'workflow.mjs'}}}});
const writer = new DatabaseSync(database);
writer.exec('PRAGMA journal_mode=WAL');
createIndex(writer, release);
const reader = new AgentIndex(database, release);
const workflow = await import(pathToFileURL(join(output, 'workflow.mjs')).href);
workflow.configureCatalogueReader(ref => reader.content(ref));
let count = 0, selectableItems = 0;
try {
  writer.exec('BEGIN');
  for await (const entry of workflow.indexEntries()) {
    insertEntry(writer, entry); count++;
    if (entry.selectionStatus === 'SELECTABLE') selectableItems++;
  }
  writer.exec('COMMIT');
} catch (error) { writer.exec('ROLLBACK'); throw error; }
finally { reader.close(); writer.close(); }
// Publish the pointer only after a complete, validated build; previous builds survive failures.
const manifest = {schema: 1, release, publication, directory: output, readableItems: count, selectableItems, createdAt: new Date().toISOString()};
JSON.parse(readFileSync(join(output, 'omnibus-release.json'), 'utf8'));
writeFileSync(resolve(root, 'agent-build/current.next.json'), JSON.stringify(manifest, null, 2));
renameSync(resolve(root, 'agent-build/current.next.json'), resolve(root, 'agent-build/current.json'));
console.log(JSON.stringify(manifest, null, 2));
