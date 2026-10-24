import assert from 'node:assert/strict';
import test from 'node:test';
import {voorcontrole} from './claim-certainty.mjs';

// Fixed synthetic calibration set, not excerpts or a representative production sample.
// reviewHold is the human-review target; knownMiss makes the limited recall visible.
export const voorbeelden = [
  {id:'H01', tekst:'De directie heeft geen vastgesteld risicoregister.', bron:'In 2020 had de directie geen vastgesteld risicoregister.', codes:['historisch-als-actueel']},
  {id:'H02', tekst:'De formele taakverdeling ontbreekt.', bron:'De formele taakverdeling ontbrak.', codes:['historisch-als-actueel']},
  {id:'H03', tekst:'In 2020 had de directie geen vastgesteld risicoregister.', bron:'In 2020 had de directie geen vastgesteld risicoregister.', codes:[]},
  {id:'H04', tekst:'Volgens het rapport heeft de directie geen vastgesteld risicoregister.', bron:'In 2020 had de directie geen vastgesteld risicoregister.', codes:[]},
  {id:'H05', tekst:'De directie moet een vastgesteld risicoregister hebben.', bron:'De directie had een vastgesteld risicoregister.', codes:[]},
  {id:'H06', tekst:'De directeur heeft een vastgesteld risicoregister.', bron:'De leverancier had een goedgekeurd contract.', codes:[]},
  {id:'H07', tekst:'In 2020 was een onderzoek uitgevoerd. De directie heeft geen vastgesteld risicoregister.', bron:'In 2020 had de directie geen vastgesteld risicoregister.', codes:['historisch-als-actueel']},
  {id:'A01', tekst:'De registratie is volledig.', bron:'De registratie is vermoedelijk volledig.', codes:['aanname-als-feit']},
  {id:'A02', tekst:'De registratie is waarschijnlijk volledig.', bron:'De registratie is vermoedelijk volledig.', codes:[]},
  {id:'A03', tekst:'De registratie moet volledig zijn.', bron:'De registratie is vermoedelijk volledig.', codes:[]},
  {id:'A04', tekst:'De registratie is volledig.', bron:'De contractcontrole is mogelijk onvoldoende.', codes:[]},
  {id:'A05', tekst:'Mogelijk volgt een evaluatie. De registratie is volledig.', bron:'De registratie is vermoedelijk volledig.', codes:['aanname-als-feit']},
  {id:'A06', tekst:'De registratie is volledig?', bron:'De registratie is vermoedelijk volledig.', codes:[]},
  {id:'N01', tekst:'De bewaartermijn bedraagt 7 dagen.', bron:'De bewaartermijn bedraagt 30 dagen.', codes:['tegenstrijdige-getallen']},
  {id:'N02', tekst:'De bewaartermijn bedraagt 7 dagen.', bron:'De directie stelt de bewaartermijn vast.', codes:['getal-zonder-bron']},
  {id:'N03', tekst:'De bewaartermijn bedraagt 7 dagen.', bron:'De bewaartermijn bedraagt 7 dagen.', codes:[]},
  {id:'N04', tekst:'De bewaartermijn bedraagt 7 dagen.', bron:'De reactietermijn bedraagt 7 dagen.', codes:['getal-zonder-bron']},
  {id:'N05', tekst:'Het foutenpercentage bedraagt 12,5 procent.', bron:'Het foutenpercentage bedraagt 12.5%.', codes:[]},
  {id:'N06', tekst:'Het budget bedraagt 1.000 euro.', bron:'Het budget bedraagt 1000 EUR.', codes:[]},
  {id:'N07', tekst:'De bewaartermijn bedraagt 2 jaar.', bron:'De bewaartermijn bedraagt 2 maanden.', codes:['getal-zonder-bron']},
  {id:'N08', tekst:'De bewaartermijn bedraagt minimaal 7 dagen.', bron:'De bewaartermijn bedraagt minimaal 7 dagen.', codes:[]},
  {id:'N09', tekst:'De bewaartermijn bedraagt 7 dagen.', bron:'De bewaartermijn bedraagt minimaal 7 dagen.', codes:['getal-zonder-bron']},
  {id:'N10', tekst:'De organisatie heeft 2020 medewerkers.', bron:'De organisatie heeft 2020 medewerkers.', codes:[]},
  {id:'N11', tekst:'De organisatie heeft 2020 medewerkers.', bron:'De organisatie heeft medewerkers.', codes:['getal-zonder-bron']},
  {id:'N12', tekst:'In 2024 bedraagt het budget 10 euro.', bron:'In 2023 bedraagt het budget 20 euro.', codes:['getal-zonder-bron']},
  {id:'N13', tekst:'De bewaartermijn bedraagt 7 dagen.', bronnen:['De bewaartermijn bedraagt 7 dagen.','De bewaartermijn bedraagt 30 dagen.'], codes:['tegenstrijdige-getallen']},
  {id:'N14', tekst:'Voorstel: selecteer 12 dossiers.', bron:'Selecteer passende dossiers.', codes:[]},
  {id:'N15', tekst:'Selecteer 12 dossiers.', bron:'Selecteer passende dossiers.', basis:'ANALYST_PROPOSAL', codes:[]},
  {id:'N16', tekst:'De bewaartermijn bedraagt 7 dagen.', codes:['getal-zonder-bron']},
  {id:'R01', tekst:'Volg artikel 5, lid 2, van de regeling uit 2024.', bron:'Volg de regeling.', codes:[]},
  {id:'R02', tekst:'Volg ISO 27001:2022 en paragraaf 4.2.', bron:'Volg de toepasselijke standaard.', codes:[]},
  {id:'R03', tekst:'1. Controleer de registratie. 2. Vergelijk de uitkomst.', bron:'Controleer de registratie.', codes:[]},
  {id:'L01', tekst:'De directie mist een risicoregister.', bron:'In 2020 had de directie geen vastgesteld risicoregister.', codes:[], knownMiss:true},
  {id:'L02', tekst:'De bewaartermijn bedraagt zeven dagen.', bron:'De bewaartermijn bedraagt dertig dagen.', codes:[], knownMiss:true},
];

const input = v => ({tekst:v.tekst, basis:v.basis,
  passages:(v.bronnen || (v.bron ? [v.bron] : [])).map((tekst,i) => ({id:'S'+i,tekst})),
});
for (const v of voorbeelden) test('vaste synthetische casus ' + v.id, () => {
  const uit = voorcontrole(input(v));
  const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  assert.deepEqual([...new Set(uit.meldingen.map(m => m.code))].sort(order), [...v.codes].sort(order));
});

test('meet de vaste set inclusief bekende gemiste signalen', t => {
  const meting = {TP:0,FP:0,TN:0,FN:0};
  for (const v of voorbeelden) {
    const reviewHold = v.knownMiss || v.codes.length > 0;
    const hold = voorcontrole(input(v)).uitkomst === 'HOLD';
    meting[hold ? reviewHold ? 'TP' : 'FP' : reviewHold ? 'FN' : 'TN']++;
  }
  assert.equal(meting.FP, 0);
  assert.equal(meting.FN, 2);
  t.diagnostic(JSON.stringify({set:'synthetisch-v1',n:voorbeelden.length,...meting}));
});

test('signalen bevatten geen tekst, waarden of wijzigingen aan de invoer', () => {
  const invoer = input(voorbeelden.find(v => v.id === 'N01'));
  const origineel = structuredClone(invoer);
  const uit = voorcontrole(invoer);
  assert.deepEqual(invoer, origineel);
  assert.deepEqual(uit.meldingen[0].bronIds, ['S0']);
  assert.doesNotMatch(JSON.stringify(uit), /bewaartermijn|30|7 dagen/);
});

test('geen bron of lege tekst is niet beoordeeld; ontbrekende binding blijft HOLD', () => {
  assert.equal(voorcontrole({tekst:'De registratie is volledig.'}).uitkomst, 'NIET_BEOORDEELD');
  assert.equal(voorcontrole({tekst:''}).uitkomst, 'NIET_BEOORDEELD');
  assert.equal(voorcontrole({tekst:'De registratie is volledig.', ontbrekendeBinding:true}).uitkomst, 'HOLD');
  assert.throws(() => voorcontrole({tekst:null}), /Ongeldige invoer/);
});

test('synonieme ondergrens houdt dezelfde hoeveelheid, geen aanscherping', () => {
  assert.equal(voorcontrole({tekst:'De bewaartermijn bedraagt ten minste 7 dagen.',
    passages:[{id:'S',tekst:'De bewaartermijn bedraagt minimaal 7 dagen.'}]}).uitkomst,'geen-signaal');
});

test('grote getallen worden niet door afronding gelijk verklaard', () => {
  const uit = voorcontrole({tekst:'Het budget bedraagt 9007199254740993 euro.',
    passages:[{id:'S',tekst:'Het budget bedraagt 9007199254740992 euro.'}]});
  assert.equal(uit.meldingen[0].code,'tegenstrijdige-getallen');
});
