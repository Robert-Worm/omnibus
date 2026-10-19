import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, posix, resolve, win32 } from 'node:path';

// Relocate sealed evidence, not its identities or approval decisions. The caller
// must still verify the original receipt's hash against the returned file bytes.
const hasControlCharacters = value => [...value].some(character => character.codePointAt(0) < 32);
function historicalKey(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || hasControlCharacters(value))
    throw new Error('Invalid historical evidence path');
  if (/^[a-z]:[/\\]/i.test(value)) return win32.normalize(value).replaceAll('\\', '/').toLowerCase();
  if (posix.isAbsolute(value)) return posix.normalize(value);
  throw new Error('Historical evidence paths must be absolute');
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function createEvidencePathResolver(manifestPath) {
  const absolute = resolve(manifestPath), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
    throw new Error('Evidence path map must be a regular file of at most 1 MiB');
  const manifest = JSON.parse(readFileSync(absolute, 'utf8'));
  if (!exactKeys(manifest, ['format', 'schemaVersion', 'files']) ||
      manifest.format !== 'omnibus-evidence-paths' || manifest.schemaVersion !== 1 ||
      !Array.isArray(manifest.files) || manifest.files.length > 4096)
    throw new Error('Invalid evidence path map');
  const root = realpathSync(dirname(absolute)), files = new Map();
  for (const entry of manifest.files) {
    if (!exactKeys(entry, ['original', 'path']) || typeof entry.path !== 'string' || entry.path.length > 1024)
      throw new Error('Invalid evidence path entry');
    const key = historicalKey(entry.original), parts = entry.path.split('/');
    if (files.has(key)) throw new Error('Duplicate historical evidence path');
    if (!parts.every(part => part && part !== '.' && part !== '..' && !/[\\:<>"|?*]/.test(part) && !hasControlCharacters(part) &&
        !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)))
      throw new Error('Unsafe evidence destination');
    files.set(key, parts);
  }
  return original => {
    const parts = files.get(historicalKey(original));
    if (!parts) throw new Error('Unmapped historical evidence path: ' + original);
    let target = root;
    for (const [i, part] of parts.entries()) {
      target = join(target, part);
      const entry = lstatSync(target);
      if (entry.isSymbolicLink() || (i === parts.length - 1 ? !entry.isFile() : !entry.isDirectory()))
        throw new Error('Evidence destination is not a regular contained file');
    }
    return target;
  };
}

// An explicit map fails closed: missing entries never fall back to the old PC.
let currentMap, currentResolver, capture;
export function captureEvidencePaths(verify) {
  if (capture) throw new Error('Evidence collection is already active');
  capture = new Map();
  try {
    const result = verify();
    if (result?.then) throw new Error('Evidence collection requires a synchronous verification');
    return { result, files: [...capture.values()] };
  } finally { capture = undefined; }
}

export function evidencePath(original) {
  const map = process.env.OMNIBUS_EVIDENCE_MAP;
  let target = original;
  if (map !== undefined) {
    if (!map.trim()) throw new Error('OMNIBUS_EVIDENCE_MAP must name a path map');
    if (map !== currentMap) { currentResolver = createEvidencePathResolver(map); currentMap = map; }
    target = currentResolver(original);
  }
  // Historical relocations belong in the explicit private map, never in a
  // machine-specific code fallback. The caller still verifies sealed hashes.
  capture?.set(historicalKey(original), { original, target });
  return target;
}
