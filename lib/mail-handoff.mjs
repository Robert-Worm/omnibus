/**
 * Opent een mailto-koppeling en zegt of dat iets deed.
 *
 * Er is geen manier om een browser te vragen óf er een mailprogramma aan het
 * mailto-schema hangt. Het enige betrouwbare signaal is dat het venster de
 * aandacht verliest zodra er een programma opent. Blijft dat uit, dan is er
 * vrijwel zeker niets gebeurd en moet het scherm een andere weg aanbieden.
 *
 * Alleen een overgang telt, niet de toestand: een tabblad dat al op de
 * achtergrond stond is geen bewijs dat er zojuist iets opende.
 *
 * Het signaal is bewust eenzijdig gelezen: alleen een echte `blur` telt als
 * geopend. Wie binnen de wachttijd zelf van venster wisselt krijgt de keuzehulp
 * niet te zien, en dat is de minst hinderlijke vergissing van de twee.
 *
 * @param {string} href
 * @param {{window?:any, document?:any, addEventListener?:Function, setTimeout?:Function}} [scope] injecteerbaar voor de test
 * @param {number} [waitMs]
 * @returns {Promise<boolean>} true zodra er iets opende
 */
export function openMailto(href, scope = globalThis, waitMs = 800) {
  const win = scope?.window ?? scope;
  const doc = scope?.document;
  const wait = scope?.setTimeout ?? setTimeout;
  return new Promise((resolve) => {
    let opened = false;
    const note = () => { opened = true; };
    win?.addEventListener?.('blur', note);
    doc?.addEventListener?.('visibilitychange', note);
    try {
      if (win?.location) win.location.href = href;
    } catch {
      // Een geweigerde koppeling telt als niets geopend.
    }
    wait(() => {
      win?.removeEventListener?.('blur', note);
      doc?.removeEventListener?.('visibilitychange', note);
      resolve(opened);
    }, waitMs);
  });
}
