// Explicit scenario for a pre-existing publication, never an import or approval.
import {readFileSync, statSync} from 'node:fs';
import {bytesHash} from './local-privacy-fixture.mjs';

export function privacyProbe(file, pins) {
  if (!file) return {kind:'report',criterionId:'CIBGBIO24-K01',pointId:'CIBGBIO24-K01/TP01',sourceTextMarker:'',identity:null};
  if (!statSync(file).isFile() || statSync(file).size > 16384) throw Error('Invalid private privacy probe');
  const value=JSON.parse(readFileSync(file,'utf8'));
  const fields=['schema','release','publication','criterionId','pointId','sourceTextMarker',
    ...(value?.schema===2 ? ['kind','sourceId'] : [])];
  if (!value || Array.isArray(value) || Object.keys(value).length!==fields.length ||
      fields.some(k=>!Object.hasOwn(value,k)) || ![1,2].includes(value.schema) ||
      (value.schema===2 && (!['report','framework'].includes(value.kind) ||
        typeof value.sourceId!=='string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value.sourceId))) ||
      value.release!==pins.release || value.publication!==pins.publication ||
      typeof value.criterionId!=='string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value.criterionId) ||
      typeof value.pointId!=='string' || !/^[A-Za-z0-9_/-]{1,180}$/.test(value.pointId) ||
      (value.kind!=='framework' && !value.pointId.startsWith(value.criterionId+'/')) ||
      typeof value.sourceTextMarker!=='string' || value.sourceTextMarker.trim().length<8 ||
      value.sourceTextMarker.length>256 || Array.from(value.sourceTextMarker).some(c=>c.codePointAt(0)<32)) throw Error('Invalid private privacy probe or mismatched publication');
  return {kind:'report',...value,identity:bytesHash(JSON.stringify(value))};
}

export function containsProbe(text, marker) {
  if (!marker) return false;
  // Test both ordinary strings and percent-encoded URL/header content.
  if(text.includes(marker))return true;
  try {return decodeURIComponent(text).includes(marker);} catch {return false;}
}

// Framework source pages use the same pinned content transport as catalogue edits.
// Only the requested source's exact resource hashes count as source delivery.
export function requestedSourceHashes(url, release, expected) {
  if(url.searchParams.get('release')!==release)return [];
  const hashes=url.pathname==='/api/v1/content-batch'?url.searchParams.getAll('hash'):
    url.pathname.startsWith('/api/v1/content/')?[url.pathname.slice('/api/v1/content/'.length)]:[];
  return hashes.filter(hash=>expected.has(hash));
}
