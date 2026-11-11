export const PRODUCT_NAME = 'Project Omnibus';
// Eén versienummer voor alles: de voettekst, de uitroltag (Docker) en package.json.
// Verhoog het met `node scripts/set-version.mjs 0.1.21`; uitrol.ps1 weigert een tag die afwijkt.
// Het releasenummer telt door: 120 -> 0.1.20, 200 -> 0.2.0.
export const PRODUCT_RELEASE_NUMBER = 121;
export function formatProductVersion(releaseNumber) {
  if (!Number.isSafeInteger(releaseNumber) || releaseNumber < 0)
    throw new Error('Het releasenummer moet een niet-negatief geheel getal zijn.');
  return `0.${Math.floor(releaseNumber / 100)}.${releaseNumber % 100}`;
}
export const PRODUCT_VERSION = formatProductVersion(PRODUCT_RELEASE_NUMBER);
export const PRODUCT_TITLE = `${PRODUCT_NAME} · versie ${PRODUCT_VERSION}`;
export const PRODUCT_FILE_STEM = `${PRODUCT_NAME} v${PRODUCT_VERSION}`;
export const PRODUCT_HTML_FILENAME = `${PRODUCT_FILE_STEM}.html`;
