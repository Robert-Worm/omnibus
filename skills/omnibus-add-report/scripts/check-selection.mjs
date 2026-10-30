// Cheap, read-only check before source rendering or independent readers start.
// Uses the same registry validation as the later mandatory baseline freeze.
import { open } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { baselineRegistryCounts } from "./baseline-registry-counts.mjs";

export async function checkReportSelection(registry, expectedSha256, reportId) {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256 ?? "")) throw Error("Expected independently supplied registry SHA-256");
  if (typeof reportId !== "string" || !reportId.trim() || reportId !== reportId.trim()) throw Error("Exact report identity required");
  const handle = await open(registry, "r");
  let bytes;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > 64 * 1024 * 1024) throw Error("Registry must be a file of at most 64 MiB");
    // One extra byte detects growth without reading an unbounded file.
    const buffer = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset !== stat.size) throw Error("Registry changed while reading");
    bytes = buffer.subarray(0, offset);
  } finally { await handle.close(); }
  if (createHash("sha256").update(bytes).digest("hex") !== expectedSha256) throw Error("Registry SHA-256 mismatch");
  return {
    status: "REPORT_NOT_ACTIVE_NOT_APPROVED",
    reportId, registrySha256: expectedSha256,
    counts: baselineRegistryCounts(bytes, reportId),
    publishable: false, contentValidated: false, reviewValidated: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 6 || args[0] !== "--registry" || args[2] !== "--expect-sha256" || args[4] !== "--report") {
      throw Error("Usage: node check-selection.mjs --registry <registry.json> --expect-sha256 <received-hash> --report <report-id>");
    }
    console.log(JSON.stringify(await checkReportSelection(args[1], args[3], args[5]), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "HOLD", message: error.message }));
    process.exitCode = 1;
  }
}
