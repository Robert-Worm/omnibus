import assert from 'node:assert/strict';
import test from 'node:test';
import {sourceQuestionSubject,planVraagOnderwerp,planRouteScope,DORA_ROUTE_SCOPE} from './source-question-subject.mjs';

test('in DORA-plannen wordt {{onderwerp}} de entiteit, niet het intakeonderwerp (#311)', () => {
  const tekst = 'Hoe borgt het bestuur bij {{onderwerp}} het ICT-risicobeheer?';
  for (const id of ['DORA-2022-2554', 'DORA-2024-1774', 'NOREA-DORA-3-2'])
    assert.equal(sourceQuestionSubject(tekst, planVraagOnderwerp(id, 'de samenwerking tussen teams')), 'Hoe borgt het bestuur bij de entiteit het ICT-risicobeheer?');
  assert.equal(sourceQuestionSubject(tekst, planVraagOnderwerp('CIO-2026', 'de samenwerking tussen teams')), 'Hoe borgt het bestuur bij de samenwerking tussen teams het ICT-risicobeheer?');
});

test('de afbakening van een DORA-route is een gewone zin zonder werktaal (#311)', () => {
  assert.equal(planRouteScope('DORA-2024-1772', 'Entiteitsroute artikel45; route.scope'), DORA_ROUTE_SCOPE);
  assert.doesNotMatch(DORA_ROUTE_SCOPE, /route|artikel\d|[A-Z]{2,}_/);
  assert.equal(planRouteScope('WWKE', 'Eigen afbakening'), 'Eigen afbakening');
});
