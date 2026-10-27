import { BlockList, isIP } from 'node:net';

// Explicit, region-specific Sliplane ingress contract; never trust all private
// peers. https://docs.sliplane.io/services/reverse-proxy/ (2026-10-27).
const sliplaneGateways = new Set(['10.1.0.0/24', '10.4.0.0/24', '10.6.0.0/24',
  '10.7.0.0/24', '10.8.0.0/24', '10.10.0.0/24']);

export function requestVisitorAddress({publicMode = false, sliplaneGateway} = {}) {
  const trusted = new BlockList();
  if (sliplaneGateway !== undefined) {
    if (!publicMode || !sliplaneGateways.has(sliplaneGateway))
      throw Error('Choose one documented Sliplane gateway range in public mode');
    trusted.addSubnet(sliplaneGateway.split('/')[0], 24, 'ipv4');
  }
  return req => {
    const peer = req.socket.remoteAddress, family = isIP(peer ?? '');
    if (!family) return null;
    if (!trusted.check(peer, family === 4 ? 'ipv4' : 'ipv6')) return peer;
    // Sliplane overwrites XFF with ONE client IP. Ambiguous or missing data
    // fails closed; Forwarded, X-Real-IP and caller-selected ports are ignored.
    let count = 0;
    for (let i = 0; i < req.rawHeaders.length; i += 2)
      if (req.rawHeaders[i].toLowerCase() === 'x-forwarded-for') count++;
    const address = req.headers['x-forwarded-for'];
    return count === 1 && typeof address === 'string' && address.length <= 64 && !address.includes('%') && isIP(address)
      ? address : null;
  };
}

// Per-peer admission budget for explicit public mode. These initial values
// leave room for viewer bursts; they are not hosted sizing or a rate/fairness SLA.
export const publicRequestRateLimits = Object.freeze({ capacity: 120, refillPerSecond: 60 });
export const publicVisitorLimits = Object.freeze({ maxVisitors: 4096, idleMs: 60_000 });

/** One shared token bucket: constant memory, no client identity, timers or queue. */
export function createRequestRateLimit({
  capacity = publicRequestRateLimits.capacity,
  refillPerSecond = publicRequestRateLimits.refillPerSecond,
  now = () => performance.now(),
} = {}) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new RangeError('capacity must be a positive safe integer');
  }
  // Bound both arithmetic and the largest possible integer Retry-After value.
  if (!Number.isFinite(refillPerSecond) || refillPerSecond <= 0 ||
      refillPerSecond > Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(Math.ceil(1 / refillPerSecond))) {
    throw new RangeError('refillPerSecond must be positive with a safe finite rate and retry interval');
  }
  if (typeof now !== 'function') throw new TypeError('now must be a function');

  let tokens = capacity;
  let lastTime;
  return {
    take() {
      let time;
      try { time = now(); } catch { return { allowed: false, retryAfter: 1 }; }
      // Clock faults deny even an unspent burst. Keep the last valid high-water
      // mark and balance, so rewinding cannot mint credit or consume the burst.
      if (!Number.isFinite(time) || time < 0 || time > Number.MAX_SAFE_INTEGER ||
          (lastTime !== undefined && time < lastTime)) {
        return { allowed: false, retryAfter: 1 };
      }
      if (lastTime !== undefined) {
        tokens = Math.min(capacity, tokens + (time - lastTime) / 1000 * refillPerSecond);
      }
      lastTime = time;
      if (tokens < 1) {
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((1 - tokens) / refillPerSecond)) };
      }
      tokens -= 1;
      return { allowed: true, retryAfter: 0 };
    },
  };
}

// Only accept the transport's address, never a request header or socket port.
// Canonicalize IPv6 and mapped IPv4 so alternate spellings share one budget.
function peerKey(address) {
  if (typeof address !== 'string' || address.length > 64) return null;
  const family = isIP(address);
  if (!family) return null;
  try { return new URL(`http://[${family === 4 ? '::ffff:' : ''}${address}]/`).hostname; }
  catch { return null; }
}

/** Bounded, idle-expiring peer buckets; a full table never evicts an active peer. */
export function createVisitorRequestRateLimit({
  capacity = publicRequestRateLimits.capacity,
  refillPerSecond = publicRequestRateLimits.refillPerSecond,
  maxVisitors = publicVisitorLimits.maxVisitors,
  idleMs = publicVisitorLimits.idleMs,
  now = () => performance.now(),
} = {}) {
  // Reuse the single-bucket configuration checks without sampling the clock.
  createRequestRateLimit({ capacity, refillPerSecond, now });
  if (!Number.isSafeInteger(maxVisitors) || maxVisitors < 1)
    throw new RangeError('maxVisitors must be a positive safe integer');
  // Expiry must not restore credit sooner than a complete natural refill.
  if (!Number.isSafeInteger(idleMs) || idleMs < 1 || idleMs < capacity / refillPerSecond * 1000)
    throw new RangeError('idleMs must be a positive safe integer covering a full refill');
  const visitors = new Map();
  let lastTime;
  return {
    get size() { return visitors.size; },
    take(address) {
      const key = peerKey(address);
      if (key === null) return { allowed: false, retryAfter: 1 };
      let time;
      try { time = now(); } catch { return { allowed: false, retryAfter: 1 }; }
      if (!Number.isFinite(time) || time < 0 || time > Number.MAX_SAFE_INTEGER ||
          (lastTime !== undefined && time < lastTime)) return { allowed: false, retryAfter: 1 };
      lastTime = time;
      // Map order follows last access. Cleanup touches only expired entries,
      // never scans the entire active table on each request; no timers/queue.
      for (const [oldKey, visitor] of visitors) {
        if (time - visitor.lastSeen < idleMs) break;
        visitors.delete(oldKey);
      }
      let visitor = visitors.get(key);
      if (!visitor) {
        if (visitors.size >= maxVisitors) {
          const oldest = visitors.values().next().value;
          return { allowed: false, retryAfter: Math.max(1, Math.ceil((idleMs - (time - oldest.lastSeen)) / 1000)) };
        }
        visitor = { bucket: createRequestRateLimit({ capacity, refillPerSecond, now: () => lastTime }) };
      }
      visitor.lastSeen = time;
      visitors.delete(key); visitors.set(key, visitor);
      return visitor.bucket.take();
    },
  };
}
