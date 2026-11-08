import test from 'node:test';
import assert from 'node:assert/strict';
import {rcmToetsaanpak, rcmBewijs} from './rcm-fasen.mjs';
const m = {testDesign: 'Vergelijk de inrichting.\n\nVerwacht bewijs: Beleid.', testExistence: 'Volg een geval.\n\nVerwacht bewijs: Dossier van het geval.'};

test('RCM: toetsaanpak per fase gelabeld zonder dubbel bewijs; bewijs per fase gelabeld', () => {
  assert.equal(rcmToetsaanpak(m, m.testDesign + '\n\n' + m.testExistence), 'Opzet: Vergelijk de inrichting.\n\nBestaan: Volg een geval.');
  const w={...m,testOperation:'Kies een periode.\n\nVerwacht bewijs: Lijst.'};
  assert.equal(rcmToetsaanpak(w, [w.testDesign,w.testExistence,w.testOperation].join('\n\n')), 'Opzet: Vergelijk de inrichting.\n\nBestaan: Volg een geval.\n\nWerking: Kies een periode.\n\nVerwacht bewijs: Lijst.');
  assert.equal(rcmBewijs(m, 'Beleid.\n\nDossier van het geval.'), 'Opzet: Beleid.\n\nBestaan: Dossier van het geval.');
});

test('RCM: eigen tekst van de gebruiker blijft letterlijk', () => {
  assert.equal(rcmToetsaanpak(m, 'Mijn eigen aanpak'), 'Mijn eigen aanpak');
  assert.equal(rcmBewijs(m, 'Mijn bewijs'), 'Mijn bewijs');
  assert.equal(rcmToetsaanpak({}, 'x'), 'x');
});

test('RCM: het werkvoorvoegsel Voorstel: verhindert de fasekoppen niet', () => {
  const m = {testDesign: 'A.\n\nVerwacht bewijs: B.', testExistence: 'C.\n\nVerwacht bewijs: D.'};
  assert.equal(rcmToetsaanpak(m, 'Voorstel: A.\n\nVerwacht bewijs: B.\n\nC.\n\nVerwacht bewijs: D.'), 'Opzet: A.\n\nBestaan: C.');
});
