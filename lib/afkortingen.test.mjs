import test from 'node:test';import assert from 'node:assert/strict';
import {afkortingDelen,afkortingen} from './afkortingen.mjs';
test('afkortingen worden herkend zonder de tekst te veranderen',()=>{
 const tekst='Bij toetsing van DORA-artikel 31 beoordelen de ETA’s eerst; daarna de ETA’s en EBA. Geen DORA2 of HOLDs.';
 const delen=afkortingDelen(tekst);
 assert.equal(delen.map(d=>d.text).join(''),tekst);
 const gevonden=delen.filter(d=>d.afkorting).map(d=>[d.text,d.eerste]);
 assert.deepEqual(gevonden,[['DORA',true],['ETA’s',true],['ETA’s',false],['EBA',true]]);
});
test('elke afkorting heeft een uitgeschreven vorm',()=>{for(const a of afkortingen)assert.ok(a.voluit&&a.afkorting);});
