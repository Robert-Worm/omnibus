import childProcess from 'node:child_process';
import {publicRuntimePins} from './read-only-http-config.mjs';

export const readOnlyWorkLimits = Object.freeze({
  concurrentReads: 4, readMs: 5000, responseBytes: 256 * 1024, oldSpaceMiB: 128,
});
const unavailable = () => Error('Leesverzoek niet uitgevoerd.');
const publicReaders = new WeakMap();
export const publicReadIdentity = service => publicReaders.get(service);

// One disposable process per read, no queue or automatic restart. Unlike a
// timer on the SQLite thread, the parent can kill synchronous native work.
// The heap limit is not an OS/native-memory quota. Never use this as a public
// hosting boundary. Only capped JSON crosses back into the HTTP process.
export async function openIsolatedReadOnlyService({buildDirectory, publicRuntime}) {
  const pins = publicRuntime === undefined ? undefined : publicRuntimePins(publicRuntime);
  const running = new Set();
  let closed = false, identity;
  function run(method, args, {signal, responseBytes = readOnlyWorkLimits.responseBytes} = {}) {
    if (closed || signal?.aborted || running.size >= readOnlyWorkLimits.concurrentReads ||
        !Number.isSafeInteger(responseBytes) || responseBytes < 1024 || responseBytes > readOnlyWorkLimits.responseBytes)
      return Promise.reject(unavailable());
    return new Promise((resolve, reject) => {
      const child = childProcess.fork(new URL('./read-only-http-child.mjs', import.meta.url), [], {
        windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        env: {...process.env, NODE_OPTIONS: ''},
        execArgv: [`--max-old-space-size=${readOnlyWorkLimits.oldSpaceMiB}`],
      });
      let text, failed = false;
      const stop = () => {
        if (failed) return;
        failed = true;
        child.kill('SIGKILL');
      };
      const done = new Promise(resolve => child.once('close', resolve));
      const work = {stop, done};
      running.add(work);
      const timer = setTimeout(stop, readOnlyWorkLimits.readMs);
      signal?.addEventListener('abort', stop, {once: true});
      child.on('error', stop);
      child.on('message', message => {
        if (text !== undefined || typeof message?.text !== 'string' || Buffer.byteLength(message.text) > responseBytes) stop();
        else text = message.text;
      });
      child.once('close', code => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', stop);
        running.delete(work); // A killed child still owns its slot until reaped.
        if (failed || code !== 0 || text === undefined) return reject(unavailable());
        try { resolve(JSON.parse(text)); } catch { reject(unavailable()); }
      });
      child.send({buildDirectory, method, args, responseBytes, identity, publicRuntime: pins}, error => { if (error) stop(); });
    });
  }
  const service = Object.fromEntries(['guide', 'sources', 'search', 'get'].map(method =>
    [method, (args, options) => run(method, args, options)]));
  service.close = async () => {
    closed = true;
    const pending = [...running];
    for (const work of pending) work.stop();
    await Promise.all(pending.map(work => work.done));
  };
  try {
    const {release, publication} = await service.guide();
    identity = {release, publication}; // Reopening must not silently switch builds.
    if (pins) publicReaders.set(service, pins);
  } catch { await service.close(); throw unavailable(); }
  return pins ? Object.freeze(service) : service;
}
