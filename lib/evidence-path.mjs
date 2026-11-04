import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

// These are evidence locations, never citations, question text or source hashes.
// The digest covers the exact original UTF-8 spelling, including its directory.
export const evidencePathFields = new Set([
  'localPdf', 'pdf_path', 'image_path', 'file', 'base_source_bank_file',
  'assessment_file', 'supplementary_reading_file', 'page_text_file', 'document',
  'original_path', 'path', 'source_base_directory', 'source_bank_file',
  'reviewFile', 'baseDirectory',
]);
export const isAbsoluteEvidencePath = value => typeof value === 'string' && /^(?:[a-z]:[\\/]|\\\\)/i.test(value);
export const isEvidenceAlias = value => typeof value === 'string' && /^evidence\/sha256-[a-f0-9]{64}\/[^/\\]+$/.test(value);

export function evidencePathAlias(path) {
  if (!isAbsoluteEvidencePath(path)) throw Error('Expected an absolute evidence location.');
  const name = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
  if (!name || name === '.' || name === '..') throw Error('Invalid evidence location.');
  return `evidence/sha256-${bytesToHex(sha256(new TextEncoder().encode(path)))}/${name}`;
}

// Compare an old project's metadata with a portable release without ignoring it.
// An altered directory, filename, quote, offset or any other value still differs.
// Current aliases need no hashing; this does not resolve or fetch evidence files.
export function evidenceMetadataJson(value) {
  return JSON.stringify(value, (key, child) =>
    evidencePathFields.has(key) && isAbsoluteEvidencePath(child) ? evidencePathAlias(child) : child);
}
