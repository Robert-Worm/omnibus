import { readdirSync, readFileSync, lstatSync, realpathSync, createReadStream } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { responseEncoding, createResponseCompressor } from './response-compression.mjs';
import { pipeline } from 'node:stream';
import { createHash } from 'node:crypto';
import { readRuntimePublication } from './runtime-publication.mjs';
import { publicationReadScope } from './web-resources.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';

const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };

/** Identify served bytes, not readiness. Only allowlisted hashes leave the server. */
export function publicBuildIdentity(manifest, files) {
  const revision = manifest.codeRevision ?? null;
  if (revision !== null && (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision)))
    throw Error('Invalid web code revision');
  const entries = [...files].map(([url, file]) => [url, file.sha256])
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return Object.freeze({ schema: 1,
    code: Object.freeze({ revision, webSha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex') }),
    data: Object.freeze({ release: manifest.release, publication: manifest.publication }),
  });
}

// Only the explicit compiled output is served. No source checkout, PDFs,
// directories, database, environment files, symlinks or arbitrary paths.
export function createStaticWeb(root, repository) {
  root = realpathSync(root);
  const files = new Map();
  function add(path, url) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) throw Error('Invalid public build file');
    if (!types[extname(path)]) return;
    const bytes = readFileSync(path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    files.set(url, { path, sha256, bytes: bytes.length, type: types[extname(path)], etag: 'W/"' + sha256 + '"' });
  }
  const manifest = JSON.parse(readFileSync(join(root, 'omnibus-release.json'), 'utf8'));
  if (manifest.schema !== 1 || manifest.contract !== runtimeContractHash)
    throw Error('The web build requires its exact runtime contract.');
  // Every web entry point, including the standalone server CLI, validates both
  // pins before listening. Missing/legacy pins never fall back to catalogue mode.
  const publication = readRuntimePublication(repository, {
    release: manifest.release, publication: manifest.publication, contract: runtimeContractHash,
  });
  const readScope = publicationReadScope(repository, publication);
  add(join(root, 'database.html'), '/');
  function walk(dir) {
    if (lstatSync(dir).isSymbolicLink()) throw Error('Symlink in public assets');
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error('Symlink in public assets');
      if (entry.isDirectory()) walk(path);
      else add(path, '/' + relative(root, path).replaceAll('\\', '/'));
    }
  }
  walk(join(root, 'assets'));
  const version = publicBuildIdentity(manifest, files);
  const serve = (pathname, req, res) => {
    const file = files.get(pathname);
    if (!file) return false;
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', pathname === '/' ? 'no-cache' : 'private, max-age=86400');
    res.setHeader('ETag', file.etag);
    res.setHeader('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === file.etag) { res.writeHead(304); res.end(); return true; }
    const encoding = responseEncoding(req.headers['accept-encoding'], file.bytes);
    if (!encoding) { res.writeHead(406); res.end(); return true; }
    const stream = createReadStream(file.path);
    if (encoding !== 'identity') {
      res.setHeader('Content-Encoding', encoding);
      pipeline(stream, createResponseCompressor(encoding, file.bytes), res, () => {});
    } else pipeline(stream, res, () => {});
    return true;
  };
  return { serve, readScope, version, pins: Object.freeze({ release: manifest.release,
    publication: manifest.publication, contract: manifest.contract }) };
}
