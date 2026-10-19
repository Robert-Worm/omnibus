export const PRODUCT_NAME = 'Project Omnibus';
// Increase the release number for each new file. Every 100 releases advances
// the middle part; the final part always has three digits (113 -> 0.1.013).
export const PRODUCT_RELEASE_NUMBER = 185;
export function formatProductVersion(releaseNumber) {
  if (!Number.isSafeInteger(releaseNumber) || releaseNumber < 0)
    throw new Error('Het releasenummer moet een niet-negatief geheel getal zijn.');
  return `0.${Math.floor(releaseNumber / 100)}.${String(releaseNumber % 100).padStart(3, '0')}`;
}
export const PRODUCT_VERSION = formatProductVersion(PRODUCT_RELEASE_NUMBER);
export const PRODUCT_TITLE = `${PRODUCT_NAME} · versie ${PRODUCT_VERSION}`;
export const PRODUCT_FILE_STEM = `${PRODUCT_NAME} v${PRODUCT_VERSION}`;
export const PRODUCT_HTML_FILENAME = `${PRODUCT_FILE_STEM}.html`;
