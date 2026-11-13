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
// De opgeslagen voorkeur wordt meteen bij de eerste weergave gelezen. Zo verschijnt een overzicht direct in de gekozen
// vorm (bijvoorbeeld Lijst) en niet eerst kort in de standaardvorm.
function readSaved<T extends object>(key: string, defaults: T, storage: 'session'|'local'): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = (storage==='local'?localStorage:sessionStorage).getItem("rijksmap-view-" + key);
    return raw ? cleanSaved(defaults, JSON.parse(raw)) : defaults;
  } catch {
    /* View preferences are optional. */
    return defaults;
  }
}
export function useBrowseState<T extends object>(key: string, initial: T, storage: 'session'|'local'='session') {
  const [defaults] = useState(initial), slot = storage + ':' + key;
  const [value, setValue] = useState(() => readSaved(key, initial, storage)),
    [loaded, setLoaded] = useState(typeof window === 'undefined' ? '' : slot);
  const ready = loaded === slot;
  useEffect(() => {
    if (loaded === slot) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setValue(readSaved(key, defaults, storage));
      setLoaded(slot);
    });
    return () => {
      cancelled = true;
    };
  }, [key, defaults, storage, slot, loaded]);
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
