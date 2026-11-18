/** Desktopweergave op telefoon en tablet (B-067): is het begin van een venster zichtbaar in het ingezoomde beeld?
 * `rect` en `view` tellen allebei vanaf de linkerbovenhoek van de pagina-uitsnede (layout viewport). */
export function startVisible(rect, view, margin = 8) {
  const right = view.left + view.width, bottom = view.top + view.height;
  const startsInside = rect.left >= view.left - margin && rect.left <= right - 48 && rect.top >= view.top - margin && rect.top <= bottom - 48;
  const fits = rect.left >= view.left - margin && rect.right <= right + margin && rect.top >= view.top - margin && rect.bottom <= bottom + margin;
  return startsInside || fits;
}

/** Slepen met een vinger begint niet in een invoerveld of op een onderdeel dat zelf niet sleepbaar is
 * (data-no-drag, zoals de knop Koppelen). Op de titelknop van een bouwsteen mag het wel: kort tikken opent,
 * vasthouden pakt op. Zo werkt het met de muis ook. */
export function dragStartAllowed(target) {
  return !target.closest('input,select,textarea,[contenteditable="true"],[data-no-drag]');
}

/** Stap in pagina-pixels om mee te schuiven als de vinger bij de boven- of onderrand van het zichtbare deel is. */
export function edgeScroll(y, top, height, scale) {
  const zone = 56 / scale, speed = 9 / scale;
  if (y < top + zone) return -speed;
  if (y > top + height - zone) return speed;
  return 0;
}

/** Waar en hoe groot opent een venster op een aanraakscherm?
 * Een dialoog komt midden in het zichtbare deel, zo breed als het scherm toelaat en nooit groter dan iets boven
 * ware grootte. Een zijpaneel vult de breedte en hoogte van het zichtbare deel (rechts uitgelijnd als het scherm
 * breder is dan het paneel op ware grootte), zodat het hele paneel in beeld is en de tekst zo groot mogelijk. */
export function fitOverlay(kind, rect, view) {
  if (kind === 'panel') {
    const scale = Math.min(view.width / rect.width, 1.15 / view.scale);
    return {kind, scale, x: view.left + view.width - rect.width * scale, y: view.top, width: rect.width, height: view.height / scale};
  }
  const scale = Math.min(.94 * view.width / rect.width, 1.15 / view.scale);
  return {kind, scale, x: view.left + view.width / 2, y: view.top + view.height / 2, maxHeight: .92 * view.height / scale};
}

/** Op een smal scherm (telefoon staand) krijgt een dialoog een smallere maat, zodat de tekst groter in beeld komt. */
export function dialogWidth(naturalWidth, view) {
  return view.width * view.scale < 600 ? Math.min(naturalWidth, 420) : naturalWidth;
}
