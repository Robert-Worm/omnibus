import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import {evidencePathAlias as pathAlias,evidenceMetadataJson as metadataJson} from './evidence-path-core.mjs';
export {evidencePathFields,isAbsoluteEvidencePath,isEvidenceAlias} from './evidence-path-core.mjs';

// These are evidence locations, never citations, question text or source hashes.
// The digest covers the exact original UTF-8 spelling, including its directory.
export const evidenceStringHash=value=>bytesToHex(sha256(new TextEncoder().encode(value)));
export const evidencePathAlias=path=>pathAlias(path,evidenceStringHash);

// Compare an old project's metadata with a portable release without ignoring it.
// An altered directory, filename, quote, offset or any other value still differs.
// Current aliases need no hashing; this does not resolve or fetch evidence files.
export function evidenceMetadataJson(value) {
  return metadataJson(value,evidenceStringHash);
}
