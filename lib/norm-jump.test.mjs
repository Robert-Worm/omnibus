import assert from 'node:assert/strict';
import test from 'node:test';
import {requestNormJump, takeNormJump} from './norm-jump.mjs';

test('een sprong wordt één keer opgehaald, door het juiste kader', () => {
  requestNormJump('KADER-A', {norm: 'N1'});
  assert.equal(takeNormJump('KADER-B'), null);
  assert.equal(takeNormJump('KADER-A').norm, 'N1');
  assert.equal(takeNormJump('KADER-A'), null);
});

test('een verwijzing zonder norm of groep gaat over het hele kader', () => {
  requestNormJump('KADER-A', {});
  const jump = takeNormJump('KADER-A');
  assert.ok(jump);
  assert.equal(jump.norm, undefined);
  assert.equal(jump.groep, undefined);
});
