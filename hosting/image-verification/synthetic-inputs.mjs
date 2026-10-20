import {mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {runtimeFixture} from '../../local-data/test-support/runtime-fixture.mjs';
import {CatalogueRepository} from '../../local-data/repository.mjs';
import {readRuntimePublication} from '../../local-data/runtime-publication.mjs';
import {prepareWebResources} from '../../local-data/web-resources.mjs';
import {runtimeContractHash} from '../../lib/runtime-contract-identity.mjs';
import {bytesHash} from '../../local-data/runtime-package.mjs';
import {packageRuntime} from '../../scripts/package-runtime.mjs';
import {prepareImageContext} from '../release-delivery/prepare-image-context.mjs';

export const origin = 'https://image-verification.example.invalid';
export const canary = 'OMNIBUS_SYNTHETIC_CONTEXT_EXCLUSION_CANARY';
export const validImage = value => /^node:24\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-bookworm-slim@sha256:[a-f0-9]{64}$/.test(value || '');
export const dataHashes = data => Object.fromEntries(readdirSync(data).sort()
  .map(name => [name, bytesHash(readFileSync(join(data, name)))]));

// No database or settings input: this route can only generate its own synthetic data.
export async function prepareSyntheticInputs(out, nodeImage) {
  if (!validImage(nodeImage)) throw Error('Explicit Node 24 patch and digest required');
  mkdirSync(out, {mode: 0o700}); // Never replace an existing run.
  /** @type {undefined | (() => Promise<void>)} */
  let cleanup;
  try {
    const f = runtimeFixture({after(fn) { cleanup = fn; }});
    const repository = new CatalogueRepository(f.databasePath);
    let publication, excluded;
    try {
      publication = readRuntimePublication(repository, {...f, contract: runtimeContractHash});
      excluded = prepareWebResources(repository, f.release, {excluded: {text: 'Synthetic excluded resource'}}).excluded.hash;
    } finally { repository.close(); }
    const data = join(out, 'synthetic-data'), web = join(out, 'synthetic-web');
    const packageRoot = join(out, 'runtime'), context = join(out, 'context');
    mkdirSync(data, {mode: 0o700});
    const databasePath = join(data, 'catalogue.sqlite');
    copyFileSync(f.databasePath, databasePath);
    const settings = {database: 'catalogue.sqlite', release: f.release, publication: f.publication};
    const otherHash = hash => (hash[0] === '0' ? '1' : '0') + hash.slice(1);
    for (const [name, value] of Object.entries({
      'local-build.json': settings,
      'wrong-release.json': {...settings, release: otherHash(f.release)},
      'wrong-publication.json': {...settings, publication: otherHash(f.publication)},
      'missing-database.json': {...settings, database: 'absent.sqlite'},
      'wrong-database.json': {...settings, database: 'other.sqlite'},
      'invalid-database.json': {...settings, database: 'invalid.sqlite'},
    })) writeFileSync(join(data, name), JSON.stringify(value), {flag: 'wx', mode: 0o600});
    writeFileSync(join(data, 'invalid.sqlite'), 'Synthetic invalid database', {flag: 'wx', mode: 0o600});
    const other = new CatalogueRepository(join(data, 'other.sqlite'));
    try {
      other.importRelease({manifest: {baselineVersion: 'different-synthetic-image-release'},
        packages: [], documents: [], artifacts: []});
    } finally { other.close(); }
    mkdirSync(join(web, 'assets'), {recursive: true});
    writeFileSync(join(web, 'database.html'), '<!doctype html><title>Synthetic image verification only</title>');
    writeFileSync(join(web, 'assets/app-12345678.js'), '// Synthetic image verification only');
    writeFileSync(join(web, 'omnibus-release.json'), JSON.stringify({schema: 1,
      runtimeTarget: 'portable-local', release: f.release, publication: f.publication,
      contract: runtimeContractHash, refs: publication.refs}));
    packageRuntime({webRoot: web, databasePath, out: packageRoot});
    prepareImageContext({packageRoot, nodeImage, out: context});
    // Deliberate synthetic pollution AFTER staging tests the actual builder's ignore parser.
    for (const name of ['.env', 'catalogue.sqlite', 'local-build.json', 'private-author.mjs'])
      writeFileSync(join(context, 'runtime', name), canary, {flag: 'wx'});
    writeFileSync(join(context, 'adjacent-private.txt'), canary, {flag: 'wx'});
    return {data, databasePath, packageRoot, context, release: f.release, publication: f.publication,
      databaseHash: bytesHash(readFileSync(databasePath)),
      dataHashes: dataHashes(data),
      acceptance: {run: true, 'public-origin': origin, package: packageRoot,
        release: f.release, publication: f.publication,
        'approved-resource': publication.refs.test.hash, 'excluded-resource': excluded}};
  } finally { if (cleanup) await cleanup(); }
}
