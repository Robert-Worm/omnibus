import assert from 'node:assert/strict';
import test from 'node:test';
import {leesbareVindplaats} from './vindplaats.mjs';

test('korte codes van de makers worden een leesbare vindplaats', () => {
  const gevallen = [
    [{id: 'DORA-SECTOR-CRA-EXCEPT', locator: '2(2),(4)'}, 'Verordening (EG) nr. 1060/2009, artikel 2, lid 2 en 4'],
    [{locator: 'artikel 35, 1-d-iv-voorwaarde-1'}, 'artikel 35, lid 1, onder d, iv, 1'],
    [{locator: 'artikel 35, 3-al2-gelegenheid'}, 'artikel 35, lid 3, tweede alinea'],
    [{locator: 'Artikel 2 lid 1 b viii 1)'}, 'Artikel 2, lid 1, onder b, viii, 1'],
    [{locator: 'Artikel 50 / 2 / b / i'}, 'Artikel 50, lid 2, onder b, i'],
    [{locator: 'BRRD-4-8-10 / BRRD-4-8-10'}, 'Richtlijn 2014/59/EU, artikel 4, lid 8 tot en met 10'],
    [{locator: 'PSD2-5-1-j'}, 'Richtlijn (EU) 2015/2366, artikel 5, lid 1, onder j'],
    [{locator: 'Art. 7(5) → 2015/2366 96(7)'}, 'Artikel 7, lid 5 → Richtlijn (EU) 2015/2366, artikel 96, lid 7'],
    [{locator: 'Richtsnoer11.1a derde bullet'}, 'Richtsnoer 11.1, onder a, derde punt'],
    [{locator: 'NL:GL34-C-TITLE:1'}, 'Titel'],
    [{locator: 'supp:R-E01'}, 'Aanvullende passage uit de bron'],
  ];
  for (const [record, verwacht] of gevallen) assert.equal(leesbareVindplaats(record), verwacht);
});

test('gewone vindplaatsen blijven ongewijzigd', () => {
  for (const locator of ['Artikel 5, lid 2, onder a', 'Overweging 12', 'Bijlage I'])
    assert.equal(leesbareVindplaats({locator}), locator);
});
