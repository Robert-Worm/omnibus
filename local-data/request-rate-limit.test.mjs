import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestRateLimit, publicRequestRateLimits } from './request-rate-limit.mjs';

const allowed = { allowed: true, retryAfter: 0 };
const denied = retryAfter => ({ allowed: false, retryAfter });

function fixture(options = {}, initialTime = 0) {
  let time = initialTime;
  return {
    limiter: createRequestRateLimit({ ...options, now: () => time }),
    at: value => { time = value; },
  };
}

test('defaults admit exactly 120 immediate requests and refill 60 per second', () => {
  assert.deepEqual(publicRequestRateLimits, { capacity: 120, refillPerSecond: 60 });
  assert(Object.isFrozen(publicRequestRateLimits));
  const { limiter, at } = fixture();
  for (let i = 0; i < 120; i++) assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
  at(1000);
  for (let i = 0; i < 60; i++) assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('fractional milliseconds and denied attempts retain partial refill', () => {
  const { limiter, at } = fixture({ capacity: 2, refillPerSecond: 2 });
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
  at(249.5);
  assert.deepEqual(limiter.take(), denied(1));
  at(499.5);
  assert.deepEqual(limiter.take(), denied(1));
  at(500);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
  at(1000);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('fractional rates return whole positive retry seconds rounded upward', () => {
  const { limiter, at } = fixture({ capacity: 1, refillPerSecond: 0.25 });
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(4));
  at(1000);
  assert.deepEqual(limiter.take(), denied(3));
  at(2000);
  assert.deepEqual(limiter.take(), denied(2));
  at(3999);
  assert.deepEqual(limiter.take(), denied(1));
  at(4000);
  assert.deepEqual(limiter.take(), allowed);
});

test('long idle time caps the burst and discards overflow including fractional credit', () => {
  const { limiter, at } = fixture({ capacity: 3, refillPerSecond: 1 });
  for (let i = 0; i < 3; i++) assert.deepEqual(limiter.take(), allowed);
  at(1_000_500);
  for (let i = 0; i < 3; i++) assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
  at(1_000_999);
  assert.deepEqual(limiter.take(), denied(1));
  at(1_001_500);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('repeated identical timestamps do not refill or postpone the next token', () => {
  const { limiter, at } = fixture({ capacity: 1, refillPerSecond: 1 }, 42);
  assert.deepEqual(limiter.take(), allowed);
  for (let i = 0; i < 4; i++) assert.deepEqual(limiter.take(), denied(1));
  at(1042);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('backward time denies even a remaining burst without losing its balance', () => {
  const { limiter, at } = fixture({ capacity: 2, refillPerSecond: 1 }, 1000);
  assert.deepEqual(limiter.take(), allowed);
  at(999.5);
  assert.deepEqual(limiter.take(), denied(1));
  at(0);
  assert.deepEqual(limiter.take(), denied(1));
  at(1000);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('backward time never moves the refill baseline or earns duplicate credit', () => {
  const { limiter, at } = fixture({ capacity: 1, refillPerSecond: 1 }, 2000);
  assert.deepEqual(limiter.take(), allowed);
  for (const time of [0, 1000, 1999, 2000, 2500]) {
    at(time);
    assert.deepEqual(limiter.take(), denied(1));
  }
  at(3000);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('invalid clock readings fail closed without coercion, loss or extra credit', () => {
  for (const value of [NaN, Infinity, -Infinity, -1, Number.MAX_SAFE_INTEGER + 1,
    undefined, null, true, '1000', 1000n, {}, { valueOf() { throw Error('must not coerce'); } }]) {
    const { limiter, at } = fixture({ capacity: 2, refillPerSecond: 1 }, 1000);
    assert.deepEqual(limiter.take(), allowed);
    at(value);
    assert.deepEqual(limiter.take(), denied(1));
    at(1000);
    assert.deepEqual(limiter.take(), allowed);
    assert.deepEqual(limiter.take(), denied(1));
    at(2000);
    assert.deepEqual(limiter.take(), allowed);
    assert.deepEqual(limiter.take(), denied(1));
  }
});

test('an invalid first reading delays the initial burst until a valid clock reading', () => {
  const { limiter, at } = fixture({ capacity: 1, refillPerSecond: 1 }, NaN);
  assert.deepEqual(limiter.take(), denied(1));
  assert.deepEqual(limiter.take(), denied(1));
  at(5000);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('throwing clocks deny safely and preserve the last valid baseline', () => {
  let throws = true;
  let time = 1000;
  const limiter = createRequestRateLimit({ capacity: 1, refillPerSecond: 1, now() {
    if (throws) throw Error('clock failure');
    return time;
  } });
  assert.deepEqual(limiter.take(), denied(1));
  throws = false;
  assert.deepEqual(limiter.take(), allowed);
  throws = true;
  assert.deepEqual(limiter.take(), denied(1));
  throws = false;
  assert.deepEqual(limiter.take(), denied(1));
  time = 2000;
  assert.deepEqual(limiter.take(), allowed);
});

test('large valid timestamps and refill rates saturate at capacity without overflow', () => {
  const { limiter, at } = fixture({ capacity: 2, refillPerSecond: Number.MAX_SAFE_INTEGER });
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
  at(Number.MAX_SAFE_INTEGER);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(1));
});

test('valid numeric extremes preserve a finite safe retry interval', () => {
  const { limiter } = fixture({ capacity: 1, refillPerSecond: 1 / 2 ** 52 });
  assert.deepEqual(limiter.take(), allowed);
  assert.deepEqual(limiter.take(), denied(2 ** 52));
  const large = fixture({ capacity: Number.MAX_SAFE_INTEGER }).limiter;
  assert.deepEqual(large.take(), allowed);
  assert.deepEqual(large.take(), allowed);
});

test('capacity rejects non-positive, fractional, non-finite and unsafe numbers', () => {
  for (const capacity of [0, -0, -1, 0.5, 1.5, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, null, true, '120', 120n, {}]) {
    assert.throws(() => createRequestRateLimit({ capacity }), RangeError);
  }
});

test('refill rejects non-positive, non-finite and numerically unsafe rates', () => {
  for (const refillPerSecond of [0, -0, -1, NaN, Infinity, -Infinity, Number.MIN_VALUE,
    1 / 2 ** 53, Number.MAX_SAFE_INTEGER + 1, null, true, '60', 60n, {}]) {
    assert.throws(() => createRequestRateLimit({ refillPerSecond }), RangeError);
  }
});

test('clock must be a function and configuration errors do not sample it', () => {
  for (const now of [null, true, 0, 'clock', {}]) {
    assert.throws(() => createRequestRateLimit({ now }), TypeError);
  }
  let calls = 0;
  const now = () => { calls++; return 0; };
  assert.throws(() => createRequestRateLimit({ capacity: 0, now }), RangeError);
  assert.throws(() => createRequestRateLimit({ refillPerSecond: 0, now }), RangeError);
  assert.equal(calls, 0);
});

test('instances have separate budgets and callers cannot refill by mutating a result', () => {
  const first = fixture({ capacity: 1, refillPerSecond: 1 }).limiter;
  const second = fixture({ capacity: 1, refillPerSecond: 1 }).limiter;
  const result = first.take();
  assert.deepEqual(result, allowed);
  result.allowed = false;
  result.retryAfter = 999;
  assert.deepEqual(first.take(), denied(1));
  assert.deepEqual(second.take(), allowed);
  assert.deepEqual(second.take(), denied(1));
});
