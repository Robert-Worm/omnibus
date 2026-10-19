import { readdirSync, readFileSync, lstatSync, realpathSync, createReadStream } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';
import { createHash } from 'node:crypto';
import { readRuntimePublication } from './runtime-publication.mjs';
import { publicationReadScope } from './web-resources.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';

const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };

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
    files.set(url, { path, type: types[extname(path)], etag: 'W/"' + createHash('sha256').update(bytes).digest('hex') + '"' });
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
    const stream = createReadStream(file.path);
    if ((req.headers['accept-encoding'] || '').split(',').some(value => {
      const match = value.trim().match(/^gzip(?:\s*;\s*q=([\d.]+))?$/);
      return match && (match[1] === undefined || Number(match[1]) > 0);
    })) {
      res.setHeader('Content-Encoding', 'gzip');
      pipeline(stream, createGzip(), res, () => {});
    } else pipeline(stream, res, () => {});
    return true;
  };
  return { serve, readScope, pins: Object.freeze({ release: manifest.release,
    publication: manifest.publication, contract: manifest.contract }) };
}
