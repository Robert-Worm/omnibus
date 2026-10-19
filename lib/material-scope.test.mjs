import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnchangedScopeRationale} from './material-scope.mjs';

const original = {rationale: 'Applicability boundary', sourceContext: 'Applicability boundary'};
const material = {...original, foundationId: 'BVA2021'};

test('unchanged BVA applicability is not displayed as an organizational goal', () => {
  assert.equal(isUnchangedScopeRationale(material, original), true);
  const extended = {...original, sourceContext: 'Context: Applicability boundary.'};
  assert.equal(isUnchangedScopeRationale({...extended, foundationId: 'BVA2021'}, extended), true);
});

test('user goal edits and unknown source versions remain literal', () => {
  assert.equal(isUnchangedScopeRationale({...material, rationale: 'My own goal'}, original), false);
  assert.equal(isUnchangedScopeRationale(material, undefined), false);
  assert.equal(isUnchangedScopeRationale(material, {...original, rationale: 'Revised scope'}), false);
  assert.equal(isUnchangedScopeRationale({...material, sourceContext: 'My own context'}, original), false);
});

test('existing scope adapters retain behavior and other sources remain untouched', () => {
  for (const foundationId of ['WOO','WDO','WBK','ARCHIEF2026','WWKE','WPG','WJSG'])
    assert.equal(isUnchangedScopeRationale({...material, foundationId}, original), true);
  for (const foundationId of ['OTHER', undefined, ''])
    assert.equal(isUnchangedScopeRationale({...material, foundationId}, original), false);
  assert.equal(isUnchangedScopeRationale({...material, rationale: ''}, {...original, rationale: ''}), false);
});
