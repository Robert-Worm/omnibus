/**
 * Kopieert tekst naar het klembord, zonder netwerk en zonder e-mailprogramma.
 *
 * Geeft false terug wanneer de browser het weigert, zodat het scherm dat kan
 * zeggen. Stil falen is precies wat een mailto-koppeling doet zodra er geen
 * e-mailprogramma is ingesteld; dat mag hier niet opnieuw gebeuren. De oudere
 * `execCommand`-weg vangt de browser op die de klembord-API niet aanbiedt,
 * bijvoorbeeld wanneer het bestand van een netwerkschijf wordt geopend.
 *
 * @param {string} text
 * @param {{navigator?:any, document?:any}} [scope] injecteerbaar voor de test
 * @returns {Promise<boolean>}
 */
export async function copyText(text, scope = globalThis) {
  const clipboard = scope?.navigator?.clipboard;
  if (typeof clipboard?.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Geweigerd of geen toestemming: onderstaande weg krijgt nog een kans.
    }
  }
  const doc = scope?.document;
  if (typeof doc?.createElement !== 'function' || typeof doc.execCommand !== 'function') return false;
  const field = doc.createElement('textarea');
  field.value = text;
  field.setAttribute?.('readonly', '');
  if (field.style) {
    field.style.position = 'fixed';
    field.style.opacity = '0';
  }
  doc.body?.appendChild?.(field);
  try {
    field.select?.();
    return doc.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    try { doc.body?.removeChild?.(field); } catch { /* al weg */ }
  }
}
