/**
 * Slepen met een vinger (B-067). De bouwstenen in stap 3 gebruiken de gewone sleepgebeurtenissen van de
 * browser (dragstart, dragover, drop). Op een aanraakscherm komen die niet of per browser anders. Dit
 * bestand vertaalt een vinger naar dezelfde gebeurtenissen, zodat de bestaande sleepcode ongewijzigd
 * werkt:
 *
 *   vinger ± een kwart seconde stilhouden op iets sleepbaars  →  dragstart, er verschijnt een kopie onder de vinger
 *   vinger bewegen                                             →  dragenter / dragover / dragleave op wat eronder ligt
 *   vinger loslaten                                            →  drop (als de plek het aanneemt) en dragend
 *
 * Beweegt de vinger eerder, dan is het gewoon schuiven. Twee vingers is zoomen; dat breekt het slepen af.
 * Het eigen slepen van de browser bij lang indrukken wordt tijdens aanraken onderdrukt, zodat er maar
 * één manier van slepen is. Met een muis doet dit bestand niets.
 */
import {dragStartAllowed, edgeScroll} from '../lib/touch-view.mjs';

const holdMs = 260, slop = 10;

type Session = {
  id: number; source: HTMLElement; startX: number; startY: number; x: number; y: number;
  timer: number; active: boolean; data: DataTransfer | TransferShim; ghost: HTMLElement | null;
  over: Element | null; accepted: boolean; offsetX: number; offsetY: number; scroll: number;
};
type TransferShim = {effectAllowed: string; dropEffect: string; types: string[]; setData(type: string, value: string): void; getData(type: string): string; clearData(): void; setDragImage(): void; files: never[]; items: never[]};

function transfer(): TransferShim {
  const store = new Map<string, string>();
  return {
    effectAllowed: 'all', dropEffect: 'none', files: [], items: [],
    get types() { return [...store.keys()]; },
    setData(type, value) { store.set(type, value); },
    getData(type) { return store.get(type) ?? ''; },
    clearData() { store.clear(); },
    setDragImage() { /* de kopie onder de vinger is de sleepafbeelding */ },
  };
}

export function installTouchDrag(win: Window = window): () => void {
  const doc = win.document;
  if (typeof win.matchMedia !== 'function' || !win.matchMedia('(pointer: coarse)').matches) return () => {};
  let session: Session | null = null, touching = false;

  const fire = (type: string, target: Element, s: Session, related: Element | null = null) => {
    const event = new Event(type, {bubbles: true, cancelable: true, composed: true});
    for (const [key, value] of Object.entries({dataTransfer: s.data, clientX: s.x, clientY: s.y, pageX: s.x + win.scrollX, pageY: s.y + win.scrollY,
      screenX: s.x, screenY: s.y, relatedTarget: related, button: 0, buttons: 1, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false}))
      Object.defineProperty(event, key, {value, enumerable: true});
    target.dispatchEvent(event);
    return event;
  };
  const under = (s: Session) => doc.elementFromPoint(s.x, s.y);
  const place = (s: Session) => { if (s.ghost) s.ghost.style.transform = `translate(${s.x - s.offsetX}px, ${s.y - s.offsetY}px)`; };

  const begin = (s: Session) => {
    s.timer = 0;
    if (!s.source.isConnected) { session = null; return; }
    const started = fire('dragstart', s.source, s);
    if (started.defaultPrevented) { session = null; return; }
    s.active = true;
    const rect = s.source.getBoundingClientRect();
    s.offsetX = s.startX - rect.left; s.offsetY = s.startY - rect.top;
    const ghost = s.source.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true'); ghost.classList.add('touch-drag-ghost');
    Object.assign(ghost.style, {position: 'fixed', left: '0', top: '0', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', pointerEvents: 'none', zIndex: '90'});
    doc.body.append(ghost); s.ghost = ghost; place(s);
    doc.documentElement.dataset.touchDragging = 'true';
    try { win.navigator.vibrate?.(12); } catch { /* trillen is extra */ }
  };
  const hover = (s: Session) => {
    const target = under(s);
    if (target !== s.over) {
      if (s.over?.isConnected) fire('dragleave', s.over, s, target);
      if (target) fire('dragenter', target, s, s.over);
      s.over = target;
    }
    s.accepted = target ? fire('dragover', target, s).defaultPrevented : false;
  };
  const finish = (s: Session, drop: boolean) => {
    if (s.timer) win.clearTimeout(s.timer);
    if (s.scroll) win.cancelAnimationFrame(s.scroll);
    session = null;
    if (!s.active) return;
    s.ghost?.remove();
    delete doc.documentElement.dataset.touchDragging;
    if (drop) hover(s);
    if (drop && s.over && s.accepted) fire('drop', s.over, s);
    else if (s.over?.isConnected) fire('dragleave', s.over, s);
    if (s.source.isConnected) fire('dragend', s.source, s); else fire('dragend', doc.body, s);
  };
  // Schuif de pagina mee als de vinger bij de rand van het zichtbare deel komt.
  const autoScroll = (s: Session) => {
    s.scroll = 0;
    if (session !== s || !s.active) return;
    const vv = win.visualViewport;
    const step = edgeScroll(s.y, vv ? vv.offsetTop : 0, vv ? vv.height : win.innerHeight, vv ? vv.scale : 1);
    if (step) { win.scrollBy(0, step); hover(s); }
    s.scroll = win.requestAnimationFrame(() => autoScroll(s));
  };

  const find = (touches: TouchList, id: number) => { for (const touch of touches) if (touch.identifier === id) return touch; return null; };
  const onStart = (event: TouchEvent) => {
    touching = true;
    if (session) { finish(session, false); return; }
    if (event.touches.length !== 1 || !(event.target instanceof Element)) return;
    const source = event.target.closest<HTMLElement>('[draggable="true"]');
    if (!source || !dragStartAllowed(event.target)) return;
    const touch = event.touches[0];
    const s: Session = {id: touch.identifier, source, startX: touch.clientX, startY: touch.clientY, x: touch.clientX, y: touch.clientY,
      timer: 0, active: false, data: transfer(), ghost: null, over: null, accepted: false, offsetX: 0, offsetY: 0, scroll: 0};
    s.timer = win.setTimeout(() => { begin(s); if (session === s && s.active) { hover(s); s.scroll = win.requestAnimationFrame(() => autoScroll(s)); } }, holdMs);
    session = s;
  };
  const onMove = (event: TouchEvent) => {
    const s = session; if (!s) return;
    const touch = find(event.touches, s.id);
    if (!touch || event.touches.length !== 1) { finish(s, false); return; }
    s.x = touch.clientX; s.y = touch.clientY;
    if (!s.active) { if (Math.hypot(s.x - s.startX, s.y - s.startY) > slop) finish(s, false); return; }
    if (event.cancelable) event.preventDefault();
    place(s); hover(s);
  };
  const onEnd = (event: TouchEvent) => {
    if (!event.touches.length) win.setTimeout(() => { touching = false; }, 400);
    const s = session; if (!s || find(event.touches, s.id)) return;
    const touch = find(event.changedTouches, s.id);
    if (touch) { s.x = touch.clientX; s.y = touch.clientY; }
    const wasActive = s.active;
    finish(s, event.type === 'touchend');
    if (wasActive && event.cancelable) event.preventDefault();
  };
  // Eén manier van slepen: het eigen slepen van de browser bij lang indrukken hoort hier niet doorheen te lopen.
  const onNativeDrag = (event: Event) => { if (event.isTrusted && touching) { event.preventDefault(); event.stopPropagation(); } };
  const onMenu = (event: Event) => { if (session) event.preventDefault(); };

  const passive = {passive: true, capture: true} as const, active = {passive: false, capture: true} as const;
  doc.addEventListener('touchstart', onStart, passive);
  doc.addEventListener('touchmove', onMove, active);
  doc.addEventListener('touchend', onEnd, active);
  doc.addEventListener('touchcancel', onEnd, active);
  doc.addEventListener('dragstart', onNativeDrag, true);
  doc.addEventListener('contextmenu', onMenu, true);
  return () => {
    if (session) finish(session, false);
    doc.removeEventListener('touchstart', onStart, passive);
    doc.removeEventListener('touchmove', onMove, active);
    doc.removeEventListener('touchend', onEnd, active);
    doc.removeEventListener('touchcancel', onEnd, active);
    doc.removeEventListener('dragstart', onNativeDrag, true);
    doc.removeEventListener('contextmenu', onMenu, true);
  };
}
