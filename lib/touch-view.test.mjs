import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dialogWidth, dragStartAllowed, edgeScroll, fitOverlay, startVisible} from './touch-view.mjs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const dialog = {left: 336, top: 771, right: 944, bottom: 1409};

test('telefoon en tablet krijgen de desktopbreedte en mogen vrij zoomen (B-067)', () => {
  const meta = read('database.html').match(/<meta name="viewport" content="([^"]*)">/)?.[1];
  assert.equal(meta, 'width=1280');
  assert.doesNotMatch(read('database.html'), /user-scalable|maximum-scale/);
});

test('uitgezoomd is een venster al in beeld; ingezoomd linksboven niet', () => {
  assert.equal(startVisible(dialog, {left: 0, top: 0, width: 1280, height: 2180}), true);
  assert.equal(startVisible(dialog, {left: 0, top: 0, width: 390, height: 664}), false);
});

test('het begin van het venster telt, niet een rand ervan', () => {
  assert.equal(startVisible(dialog, {left: 336, top: 771, width: 390, height: 664}), true);
  assert.equal(startVisible(dialog, {left: 702, top: 509, width: 390, height: 664}), false, 'alleen de rechterhelft is te zien');
  assert.equal(startVisible(dialog, {left: 300, top: 1380, width: 390, height: 664}), false, 'alleen de onderrand is te zien');
});

test('de aanraakcode doet niets zonder aanraakscherm en raakt de mobiele stijlen niet', () => {
  const source = read('app/touch-viewport.ts');
  assert.match(source, /\(pointer: coarse\)/);
  assert.match(source, /if \(!vv \|\| !touch\) return/);
  assert.match(read('app/touch-viewport.css'), /text-size-adjust: 100%/);
  assert.match(read('app/styles.ts'), /touch-viewport\.css/);
});

const fitPhone = {left: 0, top: 0, width: 1280, height: 2180, scale: 390 / 1280}, zoomed = {left: 500, top: 900, width: 390, height: 664, scale: 1};

test('een dialoog opent midden in het zichtbare deel en past in de breedte van het scherm', () => {
  for (const view of [fitPhone, zoomed]) {
    const width = dialogWidth(608, view), place = fitOverlay('dialog', {width, left: 0, top: 0}, view);
    assert.equal(width, 420, 'staande telefoon: smallere dialoog, grotere tekst');
    assert.equal(place.x, view.left + view.width / 2);
    assert.equal(place.y, view.top + view.height / 2);
    const onScreen = width * place.scale * view.scale;
    assert.ok(onScreen <= 390 && onScreen > 330, 'bijna schermbreed: ' + onScreen);
    assert.ok(14 * place.scale * view.scale >= 12, 'tekst van 14 px blijft leesbaar');
    assert.ok(place.maxHeight * place.scale <= view.height);
  }
});

test('op een tablet wordt een dialoog niet groter dan iets boven ware grootte', () => {
  const view = {left: 0, top: 0, width: 1280, height: 1707, scale: .6}, width = dialogWidth(608, view);
  assert.equal(width, 608);
  assert.ok(Math.abs(fitOverlay('dialog', {width}, view).scale * view.scale - 1.15) < 1e-9);
});

test('een zijpaneel vult het zichtbare deel, ook als de bezoeker is ingezoomd', () => {
  const rect = {left: 542, top: 0, width: 738};
  for (const view of [fitPhone, zoomed]) {
    const place = fitOverlay('panel', rect, view);
    assert.ok(Math.abs(place.scale * rect.width - view.width) < 1e-9, 'vult de breedte');
    assert.ok(Math.abs(place.height * place.scale - view.height) < 1e-9, 'vult de hoogte');
    assert.ok(Math.abs(place.x - view.left) < 1e-9 && place.y === view.top, 'begint linksboven in het zichtbare deel');
  }
  const tablet = {left: 0, top: 0, width: 1280, height: 960, scale: .8}, place = fitOverlay('panel', rect, tablet);
  assert.ok(Math.abs(place.scale * tablet.scale - 1.15) < 1e-9, 'niet groter dan iets boven ware grootte');
  assert.ok(Math.abs(place.x + rect.width * place.scale - 1280) < 1e-9, 'rechts uitgelijnd');
});

test('slepen begint niet in een invoerveld en de pagina schuift mee bij de rand', () => {
  const on = selector => ({closest: () => selector});
  assert.equal(dragStartAllowed(on(null)), true);
  assert.equal(dragStartAllowed(on({})), false);
  assert.ok(edgeScroll(905, 900, 664, 1) < 0);
  assert.ok(edgeScroll(1560, 900, 664, 1) > 0);
  assert.equal(edgeScroll(1200, 900, 664, 1), 0);
  assert.match(read('offline.tsx'), /installTouchDrag\(\)/);
});
