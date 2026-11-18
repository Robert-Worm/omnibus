/**
 * Telefoon en tablet tonen de desktopweergave (database.html zet de paginabreedte vast op 1280 px).
 * De bezoeker zoomt en schuift dan binnen een pagina die breder is dan het scherm. Dit bestand vangt
 * drie dingen op die daarbij misgaan (B-067):
 *
 * 1. Een venster (dialoog, zijpaneel) opent op een vaste plek van de pagina. Wie is ingezoomd, ziet dat
 *    venster soms niet. We zetten het venster daarom in het zichtbare deel: een dialoog leesbaar in het
 *    midden, een zijpaneel zoals op de uitgezoomde pagina. Het beeld zelf verschuift niet.
 * 2. Een melding die onderaan de pagina vastzit, valt buiten beeld. CSS-variabelen met de plek en de
 *    schaal van het zichtbare deel laten zo'n melding meelopen (zie touch-viewport.css).
 * 3. Bij het eerste bezoek op een smal scherm is de tekst klein. Eén korte, leesbare aanwijzing zegt
 *    dat inzoomen en draaien kan. Ze verdwijnt bij de eerste zoom of na sluiten en komt niet terug.
 *
 * Op een computer met muis doet dit bestand niets.
 */
import {dialogWidth, fitOverlay} from '../lib/touch-view.mjs';

const panelSelector = '[data-slot="sheet-content"]';
const overlaySelector = panelSelector + ',[data-slot="dialog-content"],[data-slot="alert-dialog-content"],.norm-link-picker';
const hintKey = 'omnibus-touch-hint';

type View = {left: number; top: number; width: number; height: number; scale: number};
export function installTouchViewport(win: Window = window): () => void {
  const vv = win.visualViewport, doc = win.document, root = doc.documentElement;
  const touch = typeof win.matchMedia === 'function' && win.matchMedia('(pointer: coarse)').matches;
  if (!vv || !touch) return () => {};
  root.dataset.touch = 'true';
  const view = (): View => ({left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height, scale: vv.scale});

  let frame = 0;
  const firstScale = vv.scale;
  const write = () => {
    frame = 0;
    const v = view(), style = root.style;
    style.setProperty('--vv-left', `${v.left}px`);
    style.setProperty('--vv-top', `${v.top}px`);
    style.setProperty('--vv-width', `${v.width}px`);
    style.setProperty('--vv-height', `${v.height}px`);
    style.setProperty('--vv-scale', String(v.scale));
    if (hint && v.scale > firstScale * 1.2) closeHint();
  };
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(write); };
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);

  // 1. Zet een nieuw venster in het zichtbare deel. De plek en maat liggen vast op het moment van openen:
  //    daarna kan de bezoeker gewoon in- en uitzoomen. Draait het scherm, dan passen we opnieuw.
  const fitted = new Set<HTMLElement>();
  const fit = (element: HTMLElement) => {
    if (!element.isConnected) { fitted.delete(element); return; }
    const kind = element.matches(panelSelector) ? 'panel' : 'dialog', style = element.style;
    for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height', 'maxWidth', 'maxHeight', 'overflowY', 'transformOrigin'] as const) style[key] = '';
    style.translate = 'none'; style.transform = 'none';
    const now = view();
    let rect = element.getBoundingClientRect();
    if (kind === 'dialog') {
      const width = dialogWidth(rect.width, now);
      if (width < rect.width) { style.width = `${width}px`; style.maxWidth = `${width}px`; rect = element.getBoundingClientRect(); }
    }
    const place = fitOverlay(kind, rect, now);
    style.left = `${place.x}px`; style.top = `${place.y}px`; style.right = 'auto'; style.bottom = 'auto';
    if (place.kind === 'panel') {
      style.width = `${place.width}px`; style.maxWidth = 'none'; style.height = `${place.height}px`;
      style.transformOrigin = '0 0';
      style.transform = `scale(${place.scale})`;
    } else {
      style.maxHeight = `${place.maxHeight}px`; style.overflowY = 'auto';
      style.transform = `translate(-50%, -50%) scale(${place.scale})`;
    }
    fitted.add(element);
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      const overlay = node.matches(overlaySelector) ? node : node.querySelector<HTMLElement>(overlaySelector);
      if (overlay && !fitted.has(overlay)) fit(overlay);
    }
    for (const element of fitted) if (!element.isConnected) fitted.delete(element);
  });
  observer.observe(doc.body, {childList: true, subtree: true});
  const refit = () => { for (const element of fitted) fit(element); };
  win.addEventListener('resize', refit);

  // 3. Eenmalige aanwijzing op een smal scherm.
  let hint: HTMLElement | null = null;
  const closeHint = () => {
    hint?.remove(); hint = null;
    try { win.localStorage.setItem(hintKey, '1'); } catch { /* opslag is geen voorwaarde */ }
  };
  let seen = false;
  try { seen = win.localStorage.getItem(hintKey) === '1'; } catch { seen = false; }
  if (!seen && firstScale < .45) {
    hint = doc.createElement('div');
    hint.className = 'touch-hint';
    hint.setAttribute('role', 'status');
    const text = doc.createElement('p');
    text.textContent = 'Je ziet de volledige versie. Zoom in met twee vingers, of draai je scherm voor een groter beeld.';
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = 'Begrepen';
    button.addEventListener('click', closeHint);
    hint.append(text, button);
    doc.body.append(hint);
  }
  write();
  return () => {
    vv.removeEventListener('resize', schedule);
    vv.removeEventListener('scroll', schedule);
    observer.disconnect();
    win.removeEventListener('resize', refit);
    if (frame) win.cancelAnimationFrame(frame);
    hint?.remove();
    delete root.dataset.touch;
  };
}
