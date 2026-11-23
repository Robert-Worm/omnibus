import test from 'node:test';
import assert from 'node:assert/strict';
import {exportOrigin} from './export-origin.mjs';
import {PRODUCT_VERSION} from './product-release.mjs';

test('de export noemt de versie van Omnibus en de peildatum per bron',()=>{
  const record=(sourceTitle,statusAsOf)=>({material:{sourceTitle,statusAsOf}});
  const regels=exportOrigin([record('DORA','2026-11-01'),record('DORA','2026-11-01'),record('RTS 2025/301','2026-10-15T08:00:00Z'),record('Zonder datum',''),record('','2026-01-01'),{},{material:{sourceTitle:'Vrije tekst',statusAsOf:'onbekend'}}]);
  assert.equal(regels.length,2);
  assert(regels[0].includes('Project Omnibus versie '+PRODUCT_VERSION));
  assert.equal(regels[1],'Peildatum per bron, de datum waarop de status van de bron is nagegaan: DORA: 1 november 2026 · RTS 2025/301: 15 oktober 2026.');
  // Zonder bron met een peildatum blijft alleen de versie staan.
  assert.deepEqual(exportOrigin([{material:{sourceTitle:'Eigen norm'}}]),[regels[0]]);assert.equal(exportOrigin().length,1);
});
