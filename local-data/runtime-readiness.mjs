const READY = Object.freeze({ ready: true });
const UNAVAILABLE = Object.freeze({ ready: false, reason: "unavailable" });
const RESTART = Object.freeze({ ready: false, reason: "restart-required" });
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/**
 * Bracket the EXISTING synchronous startup validator, before listening.
 * initialize() must fully validate the publication/resources and web read scope,
 * then return { pins: { release, publication, contract }, value: initializedWeb }.
 * This trusted callback is not a substitute for readRuntimePublication or
 * createStaticWeb; no additional publication approval is conferred here.
 *
 * Returns { value, probe() }. probe is synchronous, takes no caller pins, exposes
 * only fixed states, and never reruns initialize. It reads constant-size metadata
 * on the same read-only connection with no SQLite lock wait. OS I/O is not timed
 * out. data_version detects SQLite commits, NOT every backing-file failure.
 * An observed revision change is terminal, even if the old bytes are restored.
 * Recovery then requires a fresh validated startup with explicit pins.
 */
export function createRuntimeReadiness(repository, initialize) {
  let pins, baseline, value;
  try {
    const before = repository.runtimeReadinessSnapshot();
    if (!before?.present || before.before !== before.after) throw Error();
    const initialized = initialize();
    // Async validators are not supported: no ready handle before validation ends.
    if (!initialized || typeof initialized.then === "function") throw Error();
    const { release, publication, contract } = initialized.pins ?? {};
    if (![release, publication, contract].every(hash)) throw Error();
    pins = Object.freeze({ release, publication, contract });
    baseline = before.after;
    const after = repository.runtimeReadinessSnapshot(pins);
    if (!after?.present || after.before !== baseline || after.after !== baseline) throw Error();
    value = initialized.value;
  } catch {
    // Never include SQLite errors, source data, paths or the callback's exception.
    throw Error("Runtime readiness startup refused");
  }

  let restartRequired = false;
  return Object.freeze({
    value,
    probe() {
      if (restartRequired) return RESTART;
      try {
        const current = repository.runtimeReadinessSnapshot(pins);
        if (!current?.present || current.before !== baseline || current.after !== baseline) {
          restartRequired = true;
          return RESTART;
        }
        return READY;
      } catch {
        // A lock/read error may recover, but baseline and pins NEVER advance.
        return UNAVAILABLE;
      }
    },
  });
}
