// Shared normalization. The caller supplies its existing SHA-256 implementation:
// browser hashing or Node's built-in crypto, without server package dependencies.
export const evidencePathFields = new Set([
  'localPdf', 'pdf_path', 'image_path', 'file', 'base_source_bank_file',
  'assessment_file', 'supplementary_reading_file', 'page_text_file', 'document',
  'original_path', 'path', 'source_base_directory', 'source_bank_file',
  'reviewFile', 'baseDirectory',
]);
export const isAbsoluteEvidencePath = value => typeof value === 'string' && /^(?:[a-z]:[\\/]|\\\\)/i.test(value);
export const isEvidenceAlias = value => typeof value === 'string' && /^evidence\/sha256-[a-f0-9]{64}\/[^/\\]+$/.test(value);

export function evidencePathAlias(path,hashString) {
  if (!isAbsoluteEvidencePath(path)) throw Error('Expected an absolute evidence location.');
  const name = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
  if (!name || name === '.' || name === '..') throw Error('Invalid evidence location.');
  return `evidence/sha256-${hashString(path)}/${name}`;
}

// Een absoluut pad staat in JSON altijd als "X:\\…", "X:/…" of "\\\\…". Zonder zo'n tekenreeks verandert de
// vervanger niets en is de gewone (veel snellere) serialisatie precies hetzelfde resultaat.
const ABSOLUTE_IN_JSON = /"[a-z]:(?:\\\\|\/)|"\\\\\\\\/i;
export function evidenceMetadataJson(value,hashString) {
  const plain = JSON.stringify(value);
  if (plain === undefined || !ABSOLUTE_IN_JSON.test(plain)) return plain;
  return JSON.stringify(value, (key, child) =>
    evidencePathFields.has(key) && isAbsoluteEvidencePath(child) ? evidencePathAlias(child,hashString) : child);
}
