// Per-listener admission budget for explicit public mode. These initial values
// leave room for viewer bursts; they are not hosted sizing or a rate/fairness SLA.
export const publicRequestRateLimits = Object.freeze({ capacity: 120, refillPerSecond: 60 });

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
