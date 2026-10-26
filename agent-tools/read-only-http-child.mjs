import {isMainThread, Worker, workerData, parentPort} from 'node:worker_threads';
import {readOnlyWorkLimits} from './read-only-http-service.mjs';

// The process owns one worker so its watchdog and IPC disconnect handler keep
// running during native SQLite. It kills itself if the HTTP parent disappears;
// neither cancellation nor an abruptly stopped parent leaves orphaned work.
if (isMainThread) {
  const kill = () => process.kill(process.pid, 'SIGKILL');
  let finished = false;
  const timer = setTimeout(kill, readOnlyWorkLimits.readMs);
  process.once('disconnect', () => { if (!finished) kill(); });
  if (!process.connected) kill();
  process.once('message', input => {
    let text;
    const worker = new Worker(new URL(import.meta.url), {workerData: input});
    worker.once('message', result => { text = result.text; });
    worker.once('error', () => { text = undefined; });
    worker.once('exit', code => {
      if (code !== 0) text = undefined;
      process.send({text}, error => {
        if (error) return kill();
        finished = true;
        clearTimeout(timer);
        process.disconnect();
      });
    });
  });
} else {
  const {openReadOnlyAgentService} = await import('./read-service.mjs');
  const {buildDirectory, method, args, responseBytes, identity, publicRuntime} = workerData;
  let service, text;
  try {
    if (!['guide', 'sources', 'search', 'get'].includes(method) || !Number.isSafeInteger(responseBytes) ||
        responseBytes < 1024 || responseBytes > readOnlyWorkLimits.responseBytes) throw Error();
    service = openReadOnlyAgentService({buildDirectory, publicRuntime});
    const guide = service.guide();
    if (identity && (identity.release !== guide.release || identity.publication !== guide.publication)) throw Error();
    text = JSON.stringify(service[method](args));
    if (Buffer.byteLength(text) > responseBytes) text = undefined;
  } catch { text = undefined; }
  finally {
    try { service?.close(); } catch { text = undefined; }
  }
  parentPort.postMessage({text});
}
