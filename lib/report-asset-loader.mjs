import {featureLoader} from './feature-loader.mjs';

// Native module imports deduplicate bytes, but HTTP/2 need not limit their
// concurrency. Share one retryable loader per build URL across data modules and
// admit at most six report transfers, just like the original content client.
export function createReportAssetLoader(importAsset = url => import(/* @vite-ignore */ url)) {
  const loaders = new Map(), queue = [];
  let active = 0;
  const drain = () => {
    while (active < 6 && queue.length) {
      const {task, resolve, reject} = queue.shift(); active++;
      void Promise.resolve().then(task).then(resolve, reject).finally(() => { active--; drain(); });
    }
  };
  const run = task => new Promise((resolve, reject) => { queue.push({task, resolve, reject}); drain(); });
  return url => {
    if (!loaders.has(url)) loaders.set(url, featureLoader(attempt => run(() => importAsset(attempt ? url + '?retry=' + attempt : url))));
    return loaders.get(url);
  };
}
export const reportAssetLoader = createReportAssetLoader();
