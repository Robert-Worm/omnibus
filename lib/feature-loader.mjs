// Reuse an in-flight/completed code load, but allow a failed request to retry.
/** @template T @param {(attempt:number)=>Promise<T>} importModule @returns {()=>Promise<T>} */
export function featureLoader(importModule) {
  let pending,attempt=0;
  return () => pending ??= Promise.resolve().then(()=>importModule(attempt++)).catch(error => {
    pending = undefined;
    throw error;
  });
}
