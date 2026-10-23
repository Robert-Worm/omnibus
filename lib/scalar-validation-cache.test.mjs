import test from 'node:test';
import assert from 'node:assert/strict';
import {createScalarValidationCache} from './scalar-validation-cache.mjs';

test('unchanged records and normalized copies reuse validation without sharing mutable output', () => {
  let calls = 0;
  const validate = createScalarValidationCache(value => { calls++; return {text: value.text.trim()}; });
  const input = {text: ' evidence '}, first = validate(input), second = validate(input);
  assert.notEqual(first, second);
  assert.deepEqual(validate(second), {text: 'evidence'});
  assert.equal(calls, 1);
  first.text = 'edited';
  assert.deepEqual(validate(input), {text: 'evidence'});
  assert.deepEqual(validate(first), {text: 'edited'});
  assert.equal(calls, 2);
});

test('field, shape and catalogue changes all force validation', () => {
  let calls = 0, revision = 0;
  const validate = createScalarValidationCache(value => { calls++; return {text: value.text}; }, () => revision);
  const input = {text: 'one'};
  validate(input);
  input.text = 'two'; validate(input);
  input.extra = ''; validate(input);
  delete input.extra; validate(input);
  revision++; validate(input);
  assert.equal(calls, 5);
});

test('rejections are not cached and in-place evidence tampering is rejected', () => {
  let calls = 0;
  const validate = createScalarValidationCache(value => {
    calls++;
    if (value.trace !== 'verified') throw Error('Invalid evidence');
    return {...value};
  });
  const input = {trace: 'verified'}, normalized = validate(input);
  normalized.trace = 'tampered';
  assert.throws(() => validate(normalized), /Invalid evidence/);
  assert.throws(() => validate(normalized), /Invalid evidence/);
  assert.equal(calls, 3);
  assert.deepEqual(validate(input), {trace: 'verified'});
});

test('accessors, nested values, symbols and non-plain records are never trusted cache inputs', () => {
  let calls = 0;
  const validate = createScalarValidationCache(value => { calls++; return {text: String(value.text)}; });
  for (const input of [{get text() {return 'getter';}}, {text: {}},
    {text: 'symbol', [Symbol('hidden')]: 1}, Object.assign(Object.create({}), {text: 'prototype'})]) {
    const before = calls;
    validate(input); validate(input);
    assert.equal(calls - before, 2);
  }
  const input = {text: 'ordinary'};
  validate(input);
  Object.defineProperty(input, 'text', {get: () => 'accessor'});
  assert.deepEqual(validate(input), {text: 'accessor'});
});

test('normalization retains scalar values and an ordinary mutable return object', () => {
  const validate = createScalarValidationCache(value => ({...value}));
  const input = {empty: '', optional: undefined, absent: null, flag: false, count: 0};
  validate(input);
  const result = validate(input);
  assert.deepEqual(result, input);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  result.flag = true;
  assert.equal(validate(input).flag, false);
});

test('special property names stay data and cannot change the prototype or poison later copies', () => {
  let calls = 0;
  const validate = createScalarValidationCache(value => {calls++; return {...value};});
  const input = JSON.parse('{"__proto__":"evidence","constructor":"source","toString":"text","toJSON":"not a function"}');
  const first = validate(input), second = validate(input);
  assert.equal(calls,1);
  assert.deepEqual(second,input);
  assert.equal(Object.getPrototypeOf(second),Object.prototype);
  assert.equal(Object.getOwnPropertyDescriptor(second,'__proto__').value,'evidence');
  first.__proto__ = 'changed';
  assert.deepEqual(validate(input),input);
  assert.equal(validate(first).__proto__,'changed');
  assert.equal(calls,2);
});

test('snapshots use inspected data descriptors without re-reading proxy properties', () => {
  let calls = 0, reads = 0;
  const input = new Proxy({text:'evidence'},{get(){reads++; return 'different';}});
  const validate = createScalarValidationCache(() => {calls++; return {text:'normalized'};});
  validate(input);
  assert.deepEqual(validate(input),{text:'normalized'});
  assert.equal(calls,1);
  assert.equal(reads,0);
});

test('null-prototype and read-only scalar inputs retain independent mutable results', () => {
  let calls = 0;
  const validate = createScalarValidationCache(value => {calls++; return {...value};});
  const input = Object.freeze(Object.assign(Object.create(null),{text:'source',count:-0,invalid:NaN}));
  validate(input);
  const result = validate(input);
  assert.equal(calls,1);
  assert.equal(Object.getPrototypeOf(result),Object.prototype);
  assert.equal(Object.getOwnPropertyDescriptor(result,'text').writable,true);
  assert.ok(Object.is(result.count,-0));
  assert.ok(Number.isNaN(result.invalid));
  result.text = 'own wording';
  assert.equal(validate(input).text,'source');
});
