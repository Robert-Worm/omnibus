"use client";
import { useEffect, useState } from "react";
// Optional device-local view preferences; never stores audit data.
export function useBrowseState<T extends object>(key: string, initial: T, storage: 'session'|'local'='session') {
  const [defaults] = useState(initial);
  const [value, setValue] = useState(initial),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = (storage==='local'?localStorage:sessionStorage).getItem("rijksmap-view-" + key);
        if (raw) {
          const saved = JSON.parse(raw);
          const clean = { ...defaults };
          for (const k of Object.keys(defaults) as (keyof T)[]) {
            if (
              Array.isArray(defaults[k])
                ? Array.isArray(saved[k]) && saved[k].every((x: unknown) => typeof x === "string")
                : typeof saved[k] === typeof defaults[k]
            )
              clean[k] = saved[k];
          }
          setValue(clean);
        }
      } catch {
        /* View preferences are optional. */
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, defaults,storage]);
  useEffect(() => {
    if (ready)
      try {
        (storage==='local'?localStorage:sessionStorage).setItem("rijksmap-view-" + key, JSON.stringify(value));
      } catch {
        /* Working draft has independent guarded storage. */
      }
  }, [value, key, ready,storage]);
  return [value, setValue, ready] as const;
}
