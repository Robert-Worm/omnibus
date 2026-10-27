import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestRateLimit, createVisitorRequestRateLimit, publicRequestRateLimits, publicVisitorLimits, requestVisitorAddress } from './request-rate-limit.mjs';

const allowed = { allowed: true, retryAfter: 0 };
const denied = retryAfter => ({ allowed: false, retryAfter });

const proxyRequest = (peer, address, rawHeaders = ['X-Forwarded-For', address]) =>
  ({ socket: { remoteAddress: peer }, headers: { 'x-forwarded-for': address }, rawHeaders });

test('only the explicitly configured Sliplane gateway supplies visitor identity', () => {
  const address = requestVisitorAddress({ publicMode: true, sliplaneGateway: '10.1.0.0/24' });
  for (const peer of ['10.1.0.2', '::ffff:10.1.0.2', '::ffff:a01:2']) {
    assert.equal(address(proxyRequest(peer, '192.0.2.1')), '192.0.2.1');
    assert.equal(address(proxyRequest(peer, '2001:db8::1')), '2001:db8::1');
  }
  for (const peer of ['10.1.1.2', '10.4.0.2', '10.9.0.2', '127.0.0.1', '192.0.2.2'])
    assert.equal(address(proxyRequest(peer, '192.0.2.1')), peer, 'direct clients cannot select an identity');
  assert.equal(requestVisitorAddress({publicMode:true})(proxyRequest('10.1.0.2', '192.0.2.1')), '10.1.0.2');
});

test('a trusted gateway must supply exactly one unambiguous IP header', () => {
  const address = requestVisitorAddress({ publicMode: true, sliplaneGateway: '10.1.0.0/24' });
  for (const value of [undefined, '', '192.0.2.1, 192.0.2.2', ['192.0.2.1'], 'unknown',
    '192.0.2.1:80', '[2001:db8::1]', 'fe80::1%eth0', ' 192.0.2.1', 'x'.repeat(10000)])
    assert.equal(address(proxyRequest('10.1.0.2', value)), null);
  assert.equal(address(proxyRequest('10.1.0.2', '192.0.2.1', [])), null);
  assert.equal(address(proxyRequest('10.1.0.2', '192.0.2.1', ['X-Forwarded-For','192.0.2.1','x-forwarded-for','192.0.2.1'])), null);
});

test('two visitors behind one gateway have separate budgets; direct spoofing does not', () => {
  const address = requestVisitorAddress({ publicMode: true, sliplaneGateway: '10.1.0.0/24' });
  const limiter = createVisitorRequestRateLimit({ capacity: 1, now: () => 0 });
  const take = (peer, ip) => limiter.take(address(proxyRequest(peer, ip)));
  assert.deepEqual(take('10.1.0.2', '192.0.2.1'), allowed);
  assert.deepEqual(take('10.1.0.2', '192.0.2.1'), denied(1));
  assert.deepEqual(take('10.1.0.2', '192.0.2.2'), allowed);
  assert.deepEqual(take('10.9.0.2', '192.0.2.3'), allowed);
  assert.deepEqual(take('10.9.0.2', '192.0.2.4'), denied(1));
});

test('proxy trust cannot be enabled locally or widened to arbitrary private networks', () => {
  for (const value of ['', '*', '10.0.0.0/8', '0.0.0.0/0', '10.1.0.2', '10.1.0.0/24,10.4.0.0/24', null])
    assert.throws(() => requestVisitorAddress({publicMode:true, sliplaneGateway:value}));
  assert.throws(() => requestVisitorAddress({sliplaneGateway:'10.1.0.0/24'}));
});

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

function visitors(options = {}) {
  let time = 0;
  return {
    limiter: createVisitorRequestRateLimit({ ...options, now: () => time }),
    at: value => { time = value; },
  };
}

test('one busy transport peer cannot spend another peer or listener budget', () => {
  const { limiter, at } = visitors({ capacity: 2, refillPerSecond: 1 });
  for (let i = 0; i < 2; i++) assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  for (let i = 0; i < 1000; i++) assert.deepEqual(limiter.take('192.0.2.1'), denied(1));
  assert.deepEqual(limiter.take('192.0.2.2'), allowed);
  assert.deepEqual(limiter.take('192.0.2.2'), allowed);
  assert.deepEqual(limiter.take('192.0.2.2'), denied(1));
  assert.deepEqual(visitors().limiter.take('192.0.2.1'), allowed);
  at(1000);
  for (const address of ['192.0.2.1', '192.0.2.2']) {
    assert.deepEqual(limiter.take(address), allowed);
    assert.deepEqual(limiter.take(address), denied(1));
  }
});

test('mapped IPv4 and equivalent IPv6 spellings cannot mint new budgets', () => {
  const { limiter } = visitors({ capacity: 1 });
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  for (const address of ['::ffff:192.0.2.1', '::FFFF:C000:201', '0:0:0:0:0:ffff:c000:0201'])
    assert.deepEqual(limiter.take(address), denied(1));
  assert.deepEqual(limiter.take('2001:db8::1'), allowed);
  assert.deepEqual(limiter.take('2001:DB8:0:0:0:0:0:0001'), denied(1));
  assert.equal(limiter.size, 2);
});

test('unusable transport identities fail closed without retaining input', () => {
  const { limiter } = visitors();
  for (const address of [undefined, null, true, 42, {}, '','unknown','192.0.2.1:80',
    '192.0.2.1, 192.0.2.2','for=192.0.2.1','[::1]','fe80::1%eth0','x'.repeat(10000)]) {
    assert.deepEqual(limiter.take(address), denied(1));
    assert.equal(limiter.size, 0);
  }
});

test('a full table denies new peers without evicting or charging existing peers', () => {
  const { limiter, at } = visitors({ capacity: 2, refillPerSecond: 1, maxVisitors: 2 });
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  assert.deepEqual(limiter.take('192.0.2.2'), allowed);
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  for (let i = 3; i < 1000; i++) {
    assert.deepEqual(limiter.take(`2001:db8::${i.toString(16)}`), denied(60));
    assert.equal(limiter.size, 2);
  }
  assert.deepEqual(limiter.take('192.0.2.1'), denied(1), 'no eviction grants a fresh burst');
  assert.deepEqual(limiter.take('192.0.2.2'), allowed, 'existing peer retains its credit');
  at(1000);
  assert.deepEqual(limiter.take('192.0.2.3'), denied(59));
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  at(60_000);
  assert.deepEqual(limiter.take('192.0.2.3'), allowed, 'idle peer frees one slot');
  assert.equal(limiter.size, 2);
});

test('idle cleanup follows access order, including denials, and restores no early credit', () => {
  const { limiter, at } = visitors({ capacity: 1, refillPerSecond: 0.25, maxVisitors: 2, idleMs: 4000 });
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  at(1);
  assert.deepEqual(limiter.take('192.0.2.2'), allowed);
  at(1000);
  assert.deepEqual(limiter.take('192.0.2.1'), denied(3));
  at(4000);
  assert.deepEqual(limiter.take('192.0.2.3'), denied(1));
  at(4001);
  assert.deepEqual(limiter.take('192.0.2.3'), allowed);
  assert.equal(limiter.size, 2);
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  at(8001);
  assert.deepEqual(limiter.take('192.0.2.4'), allowed);
  assert.equal(limiter.size, 1, 'all idle identities are removed on the next valid request');
});

test('clock faults never expire peers or admit a fresh identity', () => {
  const { limiter, at } = visitors({ capacity: 1, maxVisitors: 1 });
  at(1000); assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  for (const time of [999, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined, '60000']) {
    at(time);
    assert.deepEqual(limiter.take('192.0.2.1'), denied(1));
    assert.deepEqual(limiter.take('192.0.2.2'), denied(1));
    assert.equal(limiter.size, 1);
  }
  at(1000);
  assert.deepEqual(limiter.take('192.0.2.1'), denied(1));
  assert.deepEqual(limiter.take('192.0.2.2'), denied(60));
  const throwing = createVisitorRequestRateLimit({ now() { throw Error('synthetic clock failure'); } });
  assert.deepEqual(throwing.take('192.0.2.1'), denied(1));
  assert.equal(throwing.size, 0);
});

test('visitor storage defaults are fixed and configuration cannot shorten natural refill', () => {
  assert.deepEqual(publicVisitorLimits, { maxVisitors: 4096, idleMs: 60000 });
  assert(Object.isFrozen(publicVisitorLimits));
  for (const maxVisitors of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, true, '2'])
    assert.throws(() => createVisitorRequestRateLimit({ maxVisitors }), RangeError);
  for (const idleMs of [0, 1999, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, true, '60000'])
    assert.throws(() => createVisitorRequestRateLimit({ idleMs }), RangeError);
  assert.throws(() => createVisitorRequestRateLimit({ capacity: 1, refillPerSecond: 0.25, idleMs: 3999 }), RangeError);
  assert.throws(() => createVisitorRequestRateLimit({ capacity: 0 }), RangeError);
  assert.throws(() => createVisitorRequestRateLimit({ refillPerSecond: 0 }), RangeError);
  assert.throws(() => createVisitorRequestRateLimit({ now: null }), TypeError);
});

test('high-cardinality synthetic peers never exceed the default storage ceiling', () => {
  const { limiter, at } = visitors();
  for (let i = 0; i < 8192; i++) {
    assert.deepEqual(limiter.take(`2001:db8::${i.toString(16)}`), i < 4096 ? allowed : denied(60));
    assert(limiter.size <= 4096);
  }
  assert.equal(limiter.size, 4096);
  at(60000);
  assert.deepEqual(limiter.take('192.0.2.1'), allowed);
  assert.equal(limiter.size, 1);
});
