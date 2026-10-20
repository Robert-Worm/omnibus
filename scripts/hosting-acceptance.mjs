// Operator smoke check; never starts, deploys or changes a runtime. No npm dependencies.
import http from 'node:http';
import https from 'node:https';
import {createHash} from 'node:crypto';
import {Transform, Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyRuntimePackage, fileBytes} from '../local-data/runtime-package.mjs';
import {createHostingPolicy} from '../local-data/hosting-policy.mjs';

export const limits = Object.freeze({requests: 16, requestMs: 3000, totalMs: 30000,
  bodyBytes: 8 * 1024 * 1024, totalBytes: 24 * 1024 * 1024, headerBytes: 16384});
export const help = `Read-only operator smoke check (Node 24). No arguments: help, no connections.
Usage: node scripts/hosting-acceptance.mjs --run --target <origin> --public-origin <https-origin>
  --package <trusted-runtime-folder> --release <sha256> --publication <sha256>
  --approved-resource <sha256> --excluded-resource <sha256> [--allow-external]
Default target policy: explicit http://127.0.0.1:<port>, with the configured public Host.
External HTTPS requires --allow-external and target exactly equal to public-origin.
Use an approved resource in the package manifest and a known existing excluded resource.
No credentials, URL queries, redirects, retries, crawling or environment configuration.
At most 16 sequential GETs; 3s/request, 30s total, 8 MiB/body, 24 MiB total.
Byte limits apply separately to received and decoded bytes. The bundle sample
must use gzip and decode to the trusted package bytes; other samples use identity.
Outputs only check labels, status, byte counts and HTTP timings; no response content.
Exit 0: sampled checks passed; 1: check failed; 2: input/package refused.
This is not browser performance, provider-probe acceptance or public release approval.`;

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const refused = () => { throw Error('Hosting acceptance input or package refused; use --help.'); };

export function parseArgs(args) {
  const values = ['target', 'public-origin', 'package', 'release', 'publication',
    'approved-resource', 'excluded-resource'];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || Object.hasOwn(options, key)) refused();
    if (key === 'run' || key === 'allow-external') options[key] = true;
    else if (values.includes(key) && args[i + 1] && !args[i + 1].startsWith('--'))
      options[key] = args[++i];
    else refused();
  }
  if (!options.run || values.some(key => !options[key])) refused();
  return options;
}

// Complete validation and package verification happen before the first connection.
function prepare(options) {
  const policy = createHostingPolicy({publicOrigin: options['public-origin'], webRoot: options.package});
  if (!options.run || !policy.publicMode ||
      !['release', 'publication', 'approved-resource', 'excluded-resource'].every(key => hash(options[key]))) refused();
  const target = new URL(options.target);
  if (target.origin !== options.target || target.username || target.password ||
      target.pathname !== '/' || target.search || target.hash) refused();
  const loopback = target.protocol === 'http:' && target.hostname === '127.0.0.1' &&
    target.port && target.port !== '0';
  if (!loopback && !(options['allow-external'] === true && target.protocol === 'https:' &&
      options.target === policy.publicOrigin)) refused();
  const receipt = verifyRuntimePackage(options.package);
  if (receipt.release !== options.release || receipt.publication !== options.publication) refused();
  const manifest = JSON.parse(fileBytes(options.package, 'database-build/omnibus-release.json'));
  const refs = Object.values(manifest.refs || {});
  if (!refs.some(ref => ref?.hash === options['approved-resource'] && ref.release === options.release &&
      Number.isInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= limits.bodyBytes) ||
      refs.some(ref => ref?.hash === options['excluded-resource'])) refused();
  const bundle = Object.keys(receipt.files).find(path => /^database-build\/assets\/.+\.js$/.test(path));
  if (!bundle) refused();
  for (const path of ['database-build/database.html', bundle])
    if (receipt.files[path].bytes > limits.bodyBytes) refused();
  const content = id => `/api/v1/content/${id}?release=${options.release}`;
  const otherRelease = (options.release[0] === '0' ? '1' : '0') + options.release.slice(1);
  const checks = [
    {id: 'health', path: '/api/v1/health', status: 200, probe: 'ok'},
    {id: 'readiness', path: '/api/v1/ready', status: 200, probe: 'ready'},
    {id: 'web-entry', path: '/', status: 200, type: 'text/html', cache: 'no-cache',
      digest: receipt.files['database-build/database.html'].sha256},
    {id: 'bundle-sample', path: '/' + bundle.slice('database-build/'.length), status: 200,
      type: 'text/javascript', cache: 'private, max-age=86400', encoding: 'gzip',
      digest: receipt.files[bundle].sha256},
    {id: 'approved-resource', path: content(options['approved-resource']), status: 200,
      digest: options['approved-resource']},
    {id: 'other-release-denied', path: `/api/v1/content/${options['approved-resource']}?release=${otherRelease}`, status: 404},
    {id: 'excluded-resource-denied', path: content(options['excluded-resource']), status: 404},
    ...[
      ['release-list-denied', '/api/v1/releases'],
      ['catalogue-denied', '/api/v1/catalogue'],
      ['document-list-denied', '/api/v1/documents'],
      ['package-records-denied', `/api/v1/packages/${options['excluded-resource']}/records`],
      ['environment-denied', '/.env'],
      ['package-receipt-denied', '/runtime-package.json'],
      ['build-manifest-denied', '/omnibus-release.json'],
      ['database-path-denied', '/local-data/runtime/catalogue.sqlite'],
      ['operator-script-denied', '/scripts/start-runtime-package.mjs'],
    ].map(([id, path]) => ({id, path, status: 404})),
  ];
  if (checks.length !== limits.requests) refused();
  return {target, policy, checks, loopback};
}

// Node's direct HTTP clients do not follow Location or manage cookies. One socket
// per request, explicit encoding/TLS, no proxy/credential options. Hash decoded
// bytes without retaining response bodies; bound both sides of decompression.
function request(target, authority, check, timeoutMs, maxBytes, maxDecodedBytes) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const controller = new AbortController();
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request({protocol: target.protocol, hostname: target.hostname.replace(/^\[|\]$/g, ''),
      port: target.port || undefined, path: check.path, method: 'GET', agent: false,
      rejectUnauthorized: true, maxHeaderSize: limits.headerBytes,
      headers: {Host: authority, Accept: '*/*', 'Accept-Encoding': check.encoding || 'identity'}}, res => {
      const headersMs = performance.now() - started;
      const digest = createHash('sha256');
      let bytes = 0, decodedBytes = 0;
      const received = new Transform({
        transform(chunk, _encoding, done) {
          bytes += chunk.length;
          done(bytes > maxBytes ? Error('Response limit') : null, chunk);
        },
      });
      const decoded = new Writable({
        write(chunk, _encoding, done) {
          decodedBytes += chunk.length;
          if (decodedBytes > maxDecodedBytes) return done(Error('Decoded response limit'));
          digest.update(chunk);
          done();
        },
      });
      const streams = check.encoding === 'gzip' && res.headers['content-encoding'] === 'gzip'
        ? [res, received, createGunzip(), decoded] : [res, received, decoded];
      pipeline(streams, {signal: controller.signal}).then(() => {
        clearTimeout(timer);
        resolve({status: res.statusCode, headers: res.headers, bytes, decodedBytes,
          sha256: digest.digest('hex'), headersMs, totalMs: performance.now() - started});
      }, error => { clearTimeout(timer); reject(error); });
    });
    const timer = setTimeout(() => {
      controller.abort();
      req.destroy(Error('Request deadline'));
    }, timeoutMs);
    req.on('error', error => { clearTimeout(timer); reject(error); });
    req.end();
  });
}

const digest = value => createHash('sha256').update(value).digest('hex');
function responseFailure(response, check, origin) {
  if (response.status !== check.status) return 'status';
  const headers = response.headers;
  const csp = check.type
    ? "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    : "default-src 'none'; frame-ancestors 'none'";
  const expected = {'access-control-allow-origin': origin, 'x-content-type-options': 'nosniff',
    'content-security-policy': csp, 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
    'cross-origin-resource-policy': 'same-origin', 'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'x-robots-tag': 'noindex, nofollow', 'cache-control': check.cache || 'no-store',
    'content-type': (check.type || 'application/json') + '; charset=utf-8'};
  if (Object.entries(expected).some(([key, value]) => headers[key] !== value) ||
      ['access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers',
        'set-cookie', 'location'].some(key => headers[key] !== undefined) ||
      headers['content-encoding'] !== check.encoding ||
      !String(headers.vary || '').toLowerCase().split(',').map(v => v.trim()).includes('accept-encoding')) return 'headers';
  const expectedDigest = check.digest || digest(JSON.stringify(check.probe
    ? {status: check.probe, mode: 'public-read-only', schema: 1} : {error: 'Not found'}));
  return response.sha256 === expectedDigest ? null : 'body-digest';
}

export async function runAcceptance(options) {
  let prepared;
  try { prepared = prepare(options); } catch { refused(); }
  const {target, policy, checks, loopback} = prepared;
  const started = performance.now();
  let received = 0, decoded = 0;
  const result = {schema: 1, scope: 'bounded HTTP sample; not hosted or human acceptance',
    transport: loopback ? 'loopback' : 'https', localPackagePinsVerified: true,
    remotePinsAttested: false, limits, checks: []};
  for (const check of checks) {
    const remaining = limits.totalMs - (performance.now() - started);
    if (remaining <= 0 || received >= limits.totalBytes || decoded >= limits.totalBytes) break;
    try {
      const response = await request(target, policy.authority, check,
        Math.min(limits.requestMs, remaining), Math.min(limits.bodyBytes, limits.totalBytes - received),
        Math.min(limits.bodyBytes, limits.totalBytes - decoded));
      received += response.bytes;
      decoded += response.decodedBytes;
      const failure = responseFailure(response, check, policy.publicOrigin);
      result.checks.push({check: check.id, passed: failure === null, failure,
        status: response.status, bodyBytes: response.bytes, decodedBodyBytes: response.decodedBytes,
        headersMs: Number(response.headersMs.toFixed(2)), totalMs: Number(response.totalMs.toFixed(2))});
      if (failure) break;
    } catch {
      // Never copy server content, URL, headers, local paths or transport errors.
      result.checks.push({check: check.id, passed: false, failure: 'transport-or-limit'});
      break;
    }
  }
  result.notRun = checks.length - result.checks.length;
  result.passed = result.notRun === 0 && result.checks.every(check => check.passed);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && args[0] === '--help')) console.log(help);
  else {
    try {
      const result = await runAcceptance(parseArgs(args));
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.passed ? 0 : 1;
    } catch {
      console.error('Hosting acceptance input or package refused; use --help.');
      process.exitCode = 2;
    }
  }
}
