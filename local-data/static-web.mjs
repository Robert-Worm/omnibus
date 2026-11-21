import { readdirSync, readFileSync, lstatSync, realpathSync, createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { responseEncoding, createResponseCompressor } from './response-compression.mjs';
import { pipeline, Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { readRuntimePublication } from './runtime-publication.mjs';
import { publicationReadScope } from './web-resources.mjs';
import { runtimeContractHash } from '../lib/runtime-contract-identity.mjs';
import { createContentTransportCache } from './content-transport-cache.mjs';

// De webbestanden veranderen niet zolang de server draait. Ze werden bij elk verzoek opnieuw gecomprimeerd; met een
// zaal vol bezoekers tegelijk liep de server daarop vast (gemeten op 21 november 2026: vijf bezoekers tegelijk gaven
// al weigeringen). Het gecomprimeerde bestand wordt nu één keer gemaakt en daarna gedeeld.
export const staticTransportLimits = Object.freeze({ bytes: 24 * 1024 * 1024, entryBytes: 8 * 1024 * 1024 });

const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' };

/** Identify served bytes, not readiness. Only allowlisted hashes leave the server. */
export function publicBuildIdentity(manifest, files) {
  const revision = manifest.codeRevision ?? null;
  if (revision !== null && (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision)))
    throw Error('Invalid web code revision');
  const entries = [...files].flatMap(([url, file]) => [[url, file.sha256], ...(file.brotli ? [[url + '.br', file.brotli.sha256]] : [])])
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
    const reportContent = url.match(/^\/assets\/report-content-([a-f0-9]{64})\.js$/);
    if (reportContent && stat.size > 4 * 1024 * 1024) throw Error('Invalid report delivery asset');
    const bytes = readFileSync(path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (reportContent && (reportContent[1] !== sha256 || bytes.length > 4 * 1024 * 1024)) throw Error('Invalid report delivery asset');
    let brotli;
    if (reportContent) {
      const compressedPath = path + '.br';
      let compressedStat;
      try { compressedStat = lstatSync(compressedPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (compressedStat) {
        if (!compressedStat.isFile() || compressedStat.isSymbolicLink() || compressedStat.size > bytes.length)
          throw Error('Invalid compressed report asset');
        const compressed = readFileSync(compressedPath);
        if (compressed.length > bytes.length) throw Error('Invalid compressed report asset');
        // Bound decompression by the already verified original, not a claim in
        // the compressed input. A malformed or mismatched sidecar fails closed.
        let decoded;
        try { decoded = brotliDecompressSync(compressed, {info: true, maxOutputLength: bytes.length}); }
        catch { throw Error('Invalid compressed report asset'); }
        if (decoded.engine.bytesWritten !== compressed.length || !decoded.buffer.equals(bytes)) throw Error('Invalid compressed report asset');
        brotli = {path: compressedPath, bytes: compressed.length, sha256: createHash('sha256').update(compressed).digest('hex')};
      }
    }
    files.set(url, { path, sha256, brotli, verifiedContent: Boolean(reportContent), bytes: bytes.length, type: types[extname(path)], etag: 'W/"' + sha256 + '"' });
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
  const packedCache = createContentTransportCache(staticTransportLimits), reading = new Map();
  // Lees het bestand opnieuw en vergelijk het met het controlegetal van de start: alleen gecontroleerde bytes worden
  // gecomprimeerd en bewaard. Gelijktijdige verzoeken om hetzelfde bestand delen één lezing en één compressie.
  const packed = (file, encoding) => {
    const id = encoding + '|' + file.sha256;
    let job = reading.get(id);
    if (!job) {
      job = readFile(file.path).then(bytes => {
        if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256)
          throw Error('Public build file changed');
        return packedCache.compress(file.sha256, encoding, bytes);
      }).finally(() => reading.delete(id));
      reading.set(id, job);
    }
    return job;
  };
  // Een antwoord uit gedeelde bytes kost per bezoeker geen eigen geheugen of rekentijd.
  const sharedBytes = (file, encoding) => Boolean(file) && !file.verifiedContent && (encoding === 'br' || encoding === 'gzip');
  const shared = (pathname, header) => {
    const file = files.get(pathname);
    return sharedBytes(file, file ? responseEncoding(header, file.bytes) : null);
  };
  /** Maak de gecomprimeerde bestanden vooraf klaar, één tegelijk; een fout hier raakt geen verzoek. */
  const warm = async () => {
    for (const file of files.values()) {
      if (!sharedBytes(file, responseEncoding('br', file.bytes))) continue;
      try { await packed(file, 'br'); } catch { /* het verzoek zelf meldt de fout */ }
    }
  };
  const serve = (pathname, req, res, requestFailed = () => {}) => {
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
    // A disconnected reader is not an application fault. Never pass paths,
    // request headers or raw errors to the request-scoped, fixed-shape logger.
    const completed = error => {
      if (error && !['ERR_STREAM_PREMATURE_CLOSE', 'ECONNRESET'].includes(error.code)) requestFailed();
    };
    const send = stream => {
      if (encoding !== 'identity') {
        res.setHeader('Content-Encoding', encoding);
        pipeline(stream, createResponseCompressor(encoding, file.bytes), res, completed);
      } else pipeline(stream, res, completed);
    };
    if (sharedBytes(file, encoding)) {
      const sendPacked = buffer => {
        if (res.destroyed || res.headersSent) return;
        res.setHeader('Content-Encoding', encoding); res.setHeader('Content-Length', String(buffer.length));
        res.writeHead(200); res.end(buffer);
      };
      const ready = packedCache.get(file.sha256, encoding);
      if (ready) { sendPacked(ready); return true; }
      packed(file, encoding).then(sendPacked, () => {
        if (res.destroyed) return;
        requestFailed();
        if (res.headersSent) { res.destroy(); return; }
        res.setHeader('Cache-Control', 'no-store'); res.removeHeader('ETag'); res.writeHead(500); res.end();
      });
      return true;
    }
    if (file.verifiedContent) {
      // Derived report parts retain the original content route's fail-closed
      // byte check, including changes after startup. Send the checked buffer,
      // not a second file read that could race with replacement.
      const fail = () => {
        if (res.destroyed || res.writableEnded) return;
        requestFailed();
        res.setHeader('Cache-Control', 'no-store'); res.removeHeader('ETag'); res.writeHead(500); res.end();
      };
      const readVerified = (input, done) => {
        const stream = createReadStream(input.path, {start: 0, end: input.bytes}), chunks = [];
        const cancel = () => stream.destroy();
        const release = () => res.off('close', cancel);
        // One extra byte detects growth without ever reading an unbounded file.
        stream.on('data', chunk => chunks.push(chunk));
        stream.once('error', () => { release(); fail(); });
        stream.once('close', release);
        res.once('close', cancel);
        stream.once('end', () => {
          release();
          if (res.destroyed) return;
          const bytes = Buffer.concat(chunks);
          if (bytes.length !== input.bytes || createHash('sha256').update(bytes).digest('hex') !== input.sha256) { fail(); return; }
          done(bytes);
        });
      };
      readVerified(file, bytes => {
        if (encoding !== 'br' || !file.brotli) { send(Readable.from([bytes])); return; }
        // Verify BOTH original and compressed bytes on each uncached response.
        // Precompression cannot conceal a changed/deleted original source asset.
        readVerified(file.brotli, compressed => {
          res.setHeader('Content-Encoding', 'br'); res.setHeader('Content-Length', compressed.length);
          pipeline(Readable.from([compressed]), res, completed);
        });
      });
    } else send(createReadStream(file.path));
    return true;
  };
  return { serve, shared, warm, readScope, version, pins: Object.freeze({ release: manifest.release,
    publication: manifest.publication, contract: manifest.contract }) };
}
