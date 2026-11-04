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

export function evidenceMetadataJson(value,hashString) {
  return JSON.stringify(value, (key, child) =>
    evidencePathFields.has(key) && isAbsoluteEvidencePath(child) ? evidencePathAlias(child,hashString) : child);
}
