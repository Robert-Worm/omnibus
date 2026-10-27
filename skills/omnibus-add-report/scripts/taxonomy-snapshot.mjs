// Data only. Never import or evaluate a taxonomy module supplied with a packet.
export function taxonomySnapshot(data, path, fileSha256) {
  const need = (ok, message) => { if (!ok) throw Error("Taxonomy snapshot: " + message); };
  need(typeof path === "string" && path.startsWith("baseline/") && path.endsWith(".json") &&
    /^[a-f0-9]{64}$/.test(fileSha256), "frozen JSON identity required");
  need(Array.isArray(data?.processes) && data.processes.length > 0 && data.processes.length <= 10000, "complete nonempty process list required");
  const ids = new Set();
  for (const row of data.processes) {
    need(row && typeof row.id === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(row.id) &&
      !["__proto__", "constructor", "prototype"].includes(row.id) && !ids.has(row.id) &&
      typeof row.title === "string" && row.title.trim(), "invalid or duplicate process definition");
    ids.add(row.id);
  }
  return { path, file_sha256: fileSha256, processes: Object.fromEntries(data.processes.map(row => [row.id, row])),
    scope: "Editorial discovery only; reviewers assess definitions and per-item scope." };
}
