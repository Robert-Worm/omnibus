import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileBytes, inventory, isWebFile } from '../local-data/runtime-package.mjs';
import { publicBuildIdentity } from '../local-data/static-web.mjs';

/** Same fingerprints as the server, without opening or changing a database. */
export function expectedWebVersion(webRoot) {
  const manifest = JSON.parse(fileBytes(webRoot, 'omnibus-release.json'));
  const files = Object.entries(inventory(webRoot, isWebFile))
    .filter(([name]) => name !== 'omnibus-release.json')
    .map(([name, file]) => [name === 'database.html' ? '/' : '/' + name, file]);
  return publicBuildIdentity(manifest, files);
}

export function compareWebVersion(expected, actual) {
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const revision = actual?.code?.revision;
  if (actual?.schema !== 1 || !hash(actual?.code?.webSha256) ||
      !hash(actual?.data?.release) || !hash(actual?.data?.publication) ||
      (revision !== null && (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision))))
    throw Error('No valid web version received. An older deployment may not support this check.');
  const webMatches = expected.code.webSha256 === actual.code.webSha256;
  const dataMatches = expected.data.release === actual.data.release && expected.data.publication === actual.data.publication;
  const revisionMatches = expected.code.revision && revision ? expected.code.revision === revision : null;
  return { status: webMatches && dataMatches && revisionMatches !== false ? 'MATCH' : 'MISMATCH',
    webMatches, dataMatches, revisionMatches };
}

export async function checkWebVersion({ url, webRoot }) {
  const origin = new URL(url);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      !(origin.protocol === 'https:' || (origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname))))
    throw Error('Use an HTTPS origin or a local loopback preview, without credentials or a path.');
  const expected = expectedWebVersion(webRoot);
  const response = await fetch(new URL('/api/v1/version', origin), {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 200) throw Error('Web version unavailable (HTTP ' + response.status + '). Readiness alone does not identify a deployment.');
  return compareWebVersion(expected, await response.json());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--url' || args[2] !== '--web-root')
      throw Error('Usage: node scripts/check-web-version.mjs --url <origin> --web-root <expected-build>');
    const result = await checkWebVersion({ url: args[1], webRoot: args[3] });
    console.log(JSON.stringify(result));
    if (result.status !== 'MATCH') process.exitCode = 1;
  } catch {
    console.error('Version check failed. Check the origin, expected web build and whether the host supports /api/v1/version. No deployment was changed.');
    process.exitCode = 1;
  }
}
