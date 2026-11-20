import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeliveryBudget} from './check-delivery-budget.mjs';

const publication = ({inline = 'x', packed = true, bytes = 1000} = {}) => ({
  modules: {'lib/topical-reviewed.json': {packages: [{id: 'KADER', ...(packed ? {pointCounts: {}} : {})}], filler: inline}},
  refs: {'foundation:KADER:local:lib/topical-reviewed.json:0': {bytes}, 'archive:KADER:local:lib/topical-reviewed.json:1': {bytes: 10 ** 9}},
  registrations: {'lib/topical-reviewed.json': ['foundation:KADER:local:lib/topical-reviewed.json:0', 'archive:KADER:local:lib/topical-reviewed.json:1']}});

test('binnen de grenzen: geen problemen; het archief telt niet mee', () => {
  assert.deepEqual(checkDeliveryBudget(publication()).problems, []);
});
test('te veel bij openen, een te grote bron of een onverpakt kader stopt de release', () => {
  const budget = {inlineBytes: 500, topicalInlineBytes: 400, sourceBytes: 2000};
  assert.match(checkDeliveryBudget(publication({inline: 'x'.repeat(600)}), budget).problems.join(' '), /Bij openen/u);
  assert.match(checkDeliveryBudget(publication({bytes: 5000}), budget).problems.join(' '), /Bron KADER/u);
  assert.match(checkDeliveryBudget(publication({packed: false}), budget).problems.join(' '), /niet verpakt/u);
});
