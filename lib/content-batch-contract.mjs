// One bounded read, not an alternate publication or a broader catalogue query.
export const contentBatchLimits = Object.freeze({entries:6,bytes:2*1024*1024,overhead:1024});
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function parseContentBatchQuery(query) {
  const releases=query.getAll('release'),hashes=query.getAll('hash');
  if([...query.keys()].some(key=>!['release','hash'].includes(key)) ||
    releases.length!==1 || !hash(releases[0]) || !hashes.length ||
    hashes.length>contentBatchLimits.entries || hashes.some(value=>!hash(value)) ||
    new Set(hashes).size!==hashes.length) throw Error('Invalid content batch');
  return {release:releases[0],hashes};
}
