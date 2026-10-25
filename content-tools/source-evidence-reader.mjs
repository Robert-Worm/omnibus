// Frozen historical paths are labels, never filesystem/URL access. The caller
// supplies separately retained receipt hashes; package bytes alone cannot do so.
import { createHash } from "node:crypto";
import { canonical } from "./identity.mjs";

export const text = value => typeof value === "string" && Boolean(value.trim());
export const need = (ok, message) => { if (!ok) throw Error("Source method: " + message); };
export const same = (a, b) => canonical(a) === canonical(b);
export const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const object = value => value && typeof value === "object" && !Array.isArray(value);
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const exactKeys = (value, keys, label) => need(object(value) &&
  same(Object.keys(value).sort(order), [...keys].sort(order)), "unexpected fields in " + label);
export function time(value) {
  need(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
    Number.isFinite(Date.parse(value)), "missing/invalid recorded time");
  return Date.parse(value);
}
export function cover(rows, expected, key, label) {
  need(Array.isArray(rows), label + " is missing");
  const ids = rows.map(row => key ? row?.[key] : row);
  need(same([...ids].sort(order), [...expected].sort(order)), label + " is incomplete or duplicated");
}

export function sourceEvidenceReader(context, proof) {
  const { manifest, files, lookup } = context;
  exactKeys(proof, ["firstReceipt", "finalReceipt", "paths", "contracts", ...(manifest.package.kind === "report" ? ["release"] : [])], "sourceEvidence");
  need(Array.isArray(proof.paths) && proof.paths.length <= manifest.files.length, "invalid evidence path map");
  const mapped = new Map(), byId = new Map(manifest.files.map(file => [file.id, file]));
  const normalize = name => {
    need(text(name) && name.length <= 2048 && Array.from(name).every(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127), "invalid evidence path label");
    return name.replaceAll("\\", "/");
  };
  for (const entry of proof.paths) {
    exactKeys(entry, ["original", "fileId"], "evidence path mapping");
    const name = normalize(entry.original);
    need(!mapped.has(name) && byId.has(entry.fileId), "duplicate/unknown evidence path mapping");
    mapped.set(name, entry.fileId);
  }
  function byFile(id) {
    const file = byId.get(id), bytes = files.get(id);
    need(file && Buffer.isBuffer(bytes) && file.bytes === bytes.length &&
      createHash("sha256").update(bytes).digest("hex") === file.sha256, "evidence differs from checked intake");
    return { file, bytes };
  }
  function find(name) {
    const normalized = normalize(name);
    // A relative packet path cannot be redirected to a different object.
    if (!normalized.startsWith("/") && !normalized.includes(":") &&
        normalized.split("/").every(part => part && part !== "." && part !== "..")) {
      const result = lookup(normalized);
      need(!mapped.has(normalized) || mapped.get(normalized) === result.file.id, "relative dependency cannot be redirected");
      return result;
    }
    need(mapped.has(normalized), "historical evidence path has no explicit intake mapping");
    return byFile(mapped.get(normalized));
  }
  const digest = (name, expected) => {
    const result = find(name);
    need(hash(expected) && result.file.sha256 === expected, "changed evidence: " + name);
    return result;
  };
  const parse = ({ bytes }) => {
    need(bytes.length <= 8 * 1024 * 1024, "evidence JSON exceeds 8 MiB");
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw Error("Source method: invalid evidence JSON"); }
  };
  const pinBytes = pin => {
    exactKeys(pin, ["fileId", "sha256"], "externally retained evidence pin");
    const value = byFile(pin.fileId);
    need(hash(pin.sha256) && value.file.sha256 === pin.sha256, "externally retained evidence hash differs");
    return value;
  };
  const pinned = pin => parse(pinBytes(pin));
  const hashes = (values, required = [], exact = false) => {
    need(object(values) && Object.keys(values).length > 0 && required.every(name => Object.hasOwn(values, name)), "missing required evidence hashes");
    if (exact) cover(Object.keys(values), required, null, "evidence file set");
    for (const [name, expected] of Object.entries(values)) digest(name, expected);
  };
  const pointer = pin => { exactKeys(pin, ["path", "sha256"], "original receipt pointer"); return parse(digest(pin.path, pin.sha256)); };
  need(object(proof.contracts), "externally retained contract hashes required");
  const contracts = manifest.package.kind === "report" ? ["CONTRACT.md", "record_contract.py"] : ["CONTRACT.txt", "CONTRACT-ADDENDUM-01.txt"];
  exactKeys(proof.contracts, contracts, "contract pins");
  need(Object.values(proof.contracts).every(hash), "invalid contract pins");
  return { ...context, proof, find, digest, parse, pinBytes, pinned, hashes, pointer,
    first: pinned(proof.firstReceipt), final: pinned(proof.finalReceipt) };
}
