"use client";
import { useEffect, useState } from "react";
/** Only saved values of the expected type survive; anything else falls back to the default. */
export function cleanSaved<T extends object>(defaults: T, saved: unknown): T {
  const clean = { ...defaults };
  if (!saved || typeof saved !== "object") return clean;
  const s = saved as Record<keyof T, unknown>;
  for (const k of Object.keys(defaults) as (keyof T)[]) {
    const ok = Array.isArray(defaults[k])
      ? Array.isArray(s[k]) && (s[k] as unknown[]).every((x) => typeof x === "string")
      : typeof s[k] === typeof defaults[k];
    if (ok) clean[k] = s[k] as T[keyof T];
  }
  return clean;
}
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
        if (raw) setValue(cleanSaved(defaults, JSON.parse(raw)));
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
